# CH-047 (P7) — Evaluación longitudinal: diseño

**Fecha:** 2026-11-06 · **Estado:** DISEÑO (implementación no iniciada) · **Base:** `origin/master` = `0d1f50007f`, worktree `.worktrees/ch047`, rama local `feat/ch047-longitudinal-eval` · **Regla:** un change a la vez; gates medidos; sin push.

## 1 · Objetivo y gate

P7 = **F-1 (harness de recall/inyección)** + **F-2 (métrica longitudinal con kill-criteria)**:

- **F-1:** una librería de métricas reproducible (`recall@k`, `nDCG@k`) sobre muestras etiquetadas, compartida por el router (CH-043) y la memoria (CH-044) cuando integren; sin dependencias de esos paquetes (la rama parte de `origin/master`).
- **F-2:** un resumen longitudinal calculado desde logs de sesión: sesiones, peticiones, uso de skills, inyecciones de memoria, días activos; y un evaluador de **kill-criteria** explícito (si la memoria pasiva no se usa en la ventana, se apaga).
- **Gate falsable:** (a) métricas verificadas contra valores calculados a mano en fixtures (error 0); (b) baseline real medido sobre las 3 sesiones de CH-040: sesiones/peticiones, tool-calls de skill, **0 inyecciones de memoria** (no activada), ventana observada y decisión de kill-criteria aplicada. **El gate completo exige 30 días de calendario**: este change entrega el instrumento, el baseline y la regla; el número a 30 días queda programado como re-ejecución y se declara como límite temporal, no como cumplimiento.

## 2 · Seams y datos verificados

| Elemento | Evidencia | Uso |
|---|---|---|
| Logs de sesión | `~/.dsh/sessions/<proyecto>/<session>/session.v4.jsonl.zstd` (formato ya usado en CH-040/041) | Entrada del resumen longitudinal |
| Eventos de uso | `assistant/message.message.content` con bloques `tool-call` (`name: 'skill'`, `'session_search'`, …) y evento `memory/injected` (CH-044) | Contadores de uso real |
| Fixtures etiquetadas | CH-043 (`router-quality.spec.ts`, 59 queries) y CH-044 (`memory-passive.spec.ts`, 39 queries) | Formato de muestra que la librería consume |
| Kill-criteria | `planificacion/13-PLAN-SOTA-DSH.md` P7: «si no hay señal → apagar C-2» | Regla medible en la ventana |

## 3 · Diseño

### Paquete `@deepseek-ai/dsh-longitudinal-eval` (`packages/experimental/longitudinal-eval`, privado)

Librería pura, sin servicios ni Config (no se monta en composiciones):

- `recallAtK(ranked, relevant, k)` y `ndcgAtK(ranked, gradedRelevance, k)`: métricas graduadas con desempate documentado y `k` validado.
- `summarizeUsage(sessions: readonly SessionUsageSample[]): UsageSummary`: agrega sesiones, peticiones, tool-calls por nombre, inyecciones de memoria y días activos; entrada explícita (el llamador lee los logs), sin rutas de host dentro del paquete.
- `evaluateKillCriteria(summary, criteria): KillDecision[]`: criterios declarativos (p. ej. `memoryInjections.minPerWindow`, `skillCalls.minSessionsRatio`) con decisión `keep | disable` y la razón medida.
- Tests: métricas contra valores a mano (incluido `nDCG` con relevancia graduada y `k` mayor que la lista), resumen con fixture de eventos, y las dos ramas del kill-criteria.

### Medición base (ejecutada ahora, publicada en este diseño)

Un script de medición (no commiteado, `/tmp`) lee las 3 sesiones de CH-040 y aplica `summarizeUsage` con la ventana observada. Números esperados a confirmar: 3 sesiones, 582 peticiones; tool-calls de `skill` contadas desde los `tool-call` blocks; `memory/injected` = 0 (no activada); días activos ≤ 2; decisión de kill-criteria para memoria: **sin señal ⇒ no activar C-2** (la regla se aplica, no se espera).

## 4 · Verificación y proceso

- Tests focados, `pnpm run typecheck`, `pnpm run test:docs`; README EN/ZH + i18n; allowlist de Model Experience (paquete sin superficie de modelo: `NO_MODEL_EXPERIENCE_SECTION`).
- Agent Note bilingüe `proposed/feature/2026-11-06-longitudinal-eval.md`; commits locales en `feat/ch047-longitudinal-eval`; **sin push**.
- Actualizar 15/19/27 con el baseline y la decisión aplicada; declarar explícitamente que la ventana de 30 días no ha transcurrido y que la re-ejecución es el gate pendiente.

## 5 · Riesgos

| Riesgo | Mitigación |
|---|---|
| Métrica de 30 días no medible ahora | Instrumento + baseline + regla publicados; re-ejecución programada y límite declarado |
| Datos de logs ajenos al repo | El paquete es puro; la medición corre localmente y sólo se publican agregados |
| Kill-criteria mal calibrado | Umbrales declarativos en el resumen y decisión con la razón medida; ajustables por el propietario |
| Dependencia futura de CH-043/044 | La rama parte de `origin/master`; la integración de CH-050 conecta ambos fixtures al harness sin reescribir métricas |
