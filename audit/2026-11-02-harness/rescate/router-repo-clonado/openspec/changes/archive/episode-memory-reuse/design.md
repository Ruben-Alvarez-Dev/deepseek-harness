# Design — episódio reutilizable (nivel B)

**Estado: DOCUMENTAL SOLO.** No hay código, tests ni estado escritos por este change (acogido
a la regla de `proposal.md`: "no diferencias en `src/`, `tests/` ni ficheros de estado").

## Hechos observados que anclan el diseño
- El verificador determinista ya existe (`npm run verify*`, OpenSpec specs 4/4). El productor
  natural de episodios etiquetados es **L3** (regeneración selectiva): cada ciclo produce
  `(input, intento, veredicto, lección)`.
- El hook estándar de Pi 1.1.0 (`before_agent_start`, `systemPromptOptions`) está documentado en
  el Pi local (S9): "Prefer changing prompt sections, selected tools, or guidelines so Pi can
  append a transcript delta. Returning `systemPrompt`…replaces the whole prompt" → **se inyecta
  modificando una sección, nunca con `forceSystemPrompt`**.
- SOTA de "guardar y reusar experiencia" = P18 (Voyager: skill library), P19 (ExpeL:
  experiencias→insights sin fine-tuning), P20/P23 (retrieval), P21 (memory stream), P24
  (jerarquía), P25/P27 (autocorrección solo con señal externa), S10 (los labs lo productizan).

## Esquema de episodio (JSON, privado, 0600)
```json
{
  "id": "uuid",
  "taskClass": "tool|build|refactor|prose|other",
  "context": "<excerpt redactado, ≤ 300 tokens>",
  "attemptSummary": "<qué intentó el paso, sin salidas de herramientas completas>",
  "verdict": "pass|fail",
  "verifier": "verify-full|spec|typecheck|…",
  "lesson": "<una oración única y accionable>",
  "shadowUsed": 0 | 1,
  "accountPressure": 0.0,
  "ts": 1234567890123
}
```
- **Redacción obligatoria**: sin credenciales, sin headers, sin salidas de herramientas
  completas; solo `context`/`attemptSummary` resueltos. (ToS S1 §8.2 y regla de privacidad del
  proyecto.)
- Solo se crea episodio con **veredicto determinista** (P25/P27: sin señal externa no hay
  aprendizaje confiable).

## Retention / dedupe (política documentada)
- Tope por `taskClass` (p. ej. 50 episodios) + tope global (p. ej. 500). Al rebasarse, se
  descartan los de mayor edad (FIFO) dentro de cada clase.
- Dedupe por similaridad de `lesson` (hash de normalizado en fase 1; embeddings en fase 2).
- El store es el mismo patrón que el estado del router (JSON atómico + lock + fs.watch entre
  procesos), para que dos Pi no se pisoteen.

## Retrieval → inyección
- **Fase 1 (documentada)**: top-K (K=3) por `taskClass` + coincidencia de tokens de
  `context`/`lesson` (BM25 simple, sin embeddings → cero dependencia y determinista).
- **Presupuesto**: ≤ 300 tokens de inyección por run; se recorta por `lesson` + `context`
  truncado. El hook **modifica la sección de sistema "lecciones previas"** del prompt (Pi:
  secciones estructuradas + transcript delta), **opt-in por sesión** (`/router-memory on|off`),
  y **NO toca** modelos no-router ni sessions headless sin UI que no lo pidan.
- Métrica: el footer no añade nada en fase 1 (tope de 24 col ya usado); la visibilidad va por
  `/router-memory` (nuevo comando, lista los K inyectados y el store).

## Tests planificados (NO escritos en este change)
- Capture: episodio solo si hay veredicto; redacción de secretos (fixture con API key →
  assert no aparece).
- Retention/dedupe: rebase de topes y merge de lecciones duplicadas.
- Inyección: hook modifica la sección (no `forceSystemPrompt`); K=3; presupuesto ≤ 300 tokens;
  off → cero cambios; no-router → cero cambios.
- Multi-proceso: dos PIs escriben el store a la vez (pattern ya probado en `file-state`).

## Decisión explícita (documental)
Queda **fuera** de este change: el nivel A (juez local entrenado, P26/nanochat S9), el nivel C
estadística (L1/EWMA), y cualquier reentrenamiento del proveedor (imposible: S1 closed-weight).
