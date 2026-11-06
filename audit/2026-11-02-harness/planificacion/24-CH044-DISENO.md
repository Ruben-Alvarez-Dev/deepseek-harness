# CH-044 (P4) — Memoria pasiva híbrida: diseño

**Fecha:** 2026-11-06 · **Estado:** DISEÑO (implementación no iniciada) · **Base:** `origin/master` = `0d1f50007f`, worktree `.worktrees/ch044`, rama local `feat/ch044-passive-memory` · **Regla:** un change a la vez; gates medidos; sin push.

## 1 · Objetivo y gate

P4 = **C-2 (CaptureBridge)**, **C-3 (inyector pasivo)**, **C-5 (índice con límite de carga)** y **E-2 (fencing)** sobre los seams de DSH, **sin dependencia de cortex** (C-1: backend externo fuera de alcance; esto es la capa local que el backend canónico consumiría). **C-4 (DreamScheduler) se difiere** en este change: requiere programación durable (`packages/schedule`) y consolidación fuera del turno; no forma parte del gate y se documenta como trabajo posterior.

Gate falsable:

| Métrica | Objetivo | Cómo se mide |
|---|---|---|
| Recall@k de la inyección | **≥ 0,80** | 30 queries etiquetadas sobre 40 memorias; k = entradas realmente inyectadas (≤ `injectLimit`) |
| Llamadas explícitas del agente | **0** | el paquete no registra tools; test de composición verifica que el conjunto de tools no cambia |
| Inyección ≤ cuota | **sí** | chars del bloque inyectado ≤ `injectQuotaChars` en todos los casos del fixture |
| Redacción verificada | **sí** | fixture con PEM, `sk-…`, Bearer, `API_KEY=…`, JWT y GitHub token; 0 apariciones tras captura e inyección |

## 2 · Seams verificados en `origin/master`

| Seam | Evidencia | Uso |
|---|---|---|
| `session/event` | `packages/core/session/src/index.ts:395-419`: emit post-commit, listener snapshot resuelto antes del push y fallos contenidos | Captura barata sin llamadas al agente (C-2) |
| `session/disposed` | `:60` y dispatch contenido en `:1157`; `session_shutdown` no existe | Punto de volcado de la captura |
| `agent/pre-step` | payload `{agent, messages, turn, step, signal}` (CH-042 lo usa); precedente de inyección volátil en `packages/context/session-reference/src/index.ts:135-160` | Inyector (C-3) |
| Valla de no-instrucciones | `session-reference/src/index.ts:58-66`: prefijo «untrusted, read-only» + delimitadores | E-2 |
| Control de líneas del índice | no hay convención `MEMORY.md` en DSH; patrón Claude C-5 | Límite de carga (C-5) |
| Redacción | `settings/src/redact.ts:105` es estructural (schema), no texto libre | Reglas fijas propias para la captura |

## 3 · Diseño

### Paquete `@deepseek-ai/dsh-memory-passive` (`packages/context/memory-passive`)

**Configuración** (todo desplegable, validada; montaje opt-in):

| Campo | Default | Significado |
|---|---|---|
| `memoryDir` | — (requerido) | Directorio de memoria: `MEMORY.md` + un fichero por tema |
| `injectLimit` | `5` | Máximo de entradas por inyección |
| `injectQuotaChars` | `4000` | Cuota de caracteres del bloque inyectado |
| `maxIndexLines` | `200` | Líneas máximas del índice cargadas (C-5) |
| `injectOncePerTurn` | `true` | Inyectar solo en el primer pre-step de cada turno |
| `capture` | `true` | Activar CaptureBridge local |

**Almacén (C-5).** `MEMORY.md` con líneas canónicas `- <id> — <title> — <keywords>`; `maxIndexLines` recorta y reporta el resto como diferido. Cada `<id>.md` se carga al seleccionar. La selección es léxica determinista (overlap de tokens sobre id/título/keywords, desempate por id) — sin embeddings ni modelo.

**Inyector (C-3).** Listener `agent/pre-step` (prepend): si `injectOncePerTurn` y `step !== 1`, delega sin tocar; si no, construye la query con el último mensaje directo del usuario, selecciona top-K, redacta, renderiza un bloque **fenced y volátil** (valla tipo session-reference: información de fondo, no instrucciones) y lo inserta en los mensajes de la petición. La inyección **no altera el prefijo estable** ni el ensamblado de system prompt; no registra tools.

**Registro (model-visible ⟺ logged).** Evento log-only `memory/injected` en `SessionEventMap` con `ignorable: true`: ids, digest del contenido, chars y turno. Permite reconstruir qué memoria entró en la petición y detectar desvíos; el contenido completo vive en el almacén local.

**CaptureBridge local (C-2).** En `session/disposed`, toma el último mensaje de usuario y el último texto del asistente, aplica **redacción previa** con reglas fijas (bloques PEM, `sk-…`, Bearer, `API_KEY=`/`password=`, JWT compacto, GitHub token), recorta a una cuota por registro y añade una línea JSON a `inbox.jsonl` con `{ts, sessionId, redactions, user, assistant}`. **Nunca hay red externa**: no se llama a MCP ni a cortex desde este paquete.

**Valla (E-2).** El bloque inyectado usa el mismo patrón de valla que session-reference (prefijo untrusted + delimitadores + recordatorio de no seguir instrucciones) y se aplica también en la captura.

## 4 · Gate y medición

- Fixture: **40 memorias** (índice + temas) y **30 queries etiquetadas** con ids esperados; corpus sintético, sin datos de usuario.
- Cálculo: recall@k = media de `|inyectadas ∩ relevantes| / |relevantes|` con k = inyectadas; se publica el número medido en este documento y en 15-PLAN.
- Verificación adicional: cuota (ningún bloque > `injectQuotaChars`), cero tools registradas por el paquete, y 0 secretos tras captura/inyección.
- Límite declarado: el fixture es sintético; no mide calidad de memoria a largo plazo ni consolidación (C-4 diferido).

## 5 · Proceso

Worktree `.worktrees/ch044` desde `origin/master`; implementación **opt-in** sin montar en presets (0 diffs de snapshots esperados); tests enfocados, `pnpm run typecheck`, `pnpm run test:docs`; Agent Note bilingüe `proposed/feature/2026-11-06-passive-memory.md`; commits locales; actualizar 15/19 y este diseño con el número medido. **Sin push ni PR.**

## 6 · Riesgos

| Riesgo | Mitigación |
|---|---|
| Fuga de contenido privado a un proceso externo | Captura local a fichero, sin red, con redacción previa; montaje opt-in |
| Envenenamiento de memoria (prompt injection persistida) | Valla untrusted + «no instrucciones» en cada inyección; el agente debe verificar |
| Pérdida de recall por cuota | Selección léxica con desempate determinista y k reportado; la cuota es configurable |
| Replay incompleto | Evento `memory/injected` con ids+digest; el almacén sigue en disco |
| Coste de captura | Solo en `session/disposed`; trabajo acotado por registro |

## 7 · Medición del gate (2026-11-06)

**Corpus:** 39 memorias (índice `MEMORY.md` + 39 temas) y **39 queries etiquetadas** sintéticas.

| Métrica | Objetivo | Medido |
|---|---|---|
| recall@5 | ≥ 0,80 | **1,000** (39/39 queries; 0 fallos) |
| Inyección ≤ cuota | sí | máx. **1.033 chars** con cuota 4.000 en todo el fixture |
| Tools registradas | 0 | 0 (test contra `ToolRuntime`) |
| Redacción | verificada | 6 reglas (PEM, `sk-`, Bearer, JWT, GitHub, AWS + asignaciones); 0 secretos en captura e inyección |

**Límite declarado:** el fixture es sintético y la queries comparten vocabulario con los títulos/keywords; el 1,000 es una señal de regresión interna, no una promesa de recall sobre memorias reales. C-4 (consolidación) sigue diferido.

## 8 · Implementación y cierre (2026-11-06)

- **Implementado opt-in, sin activar en presets.** Paquete `@deepseek-ai/dsh-memory-passive`: almacén acotado, inyector volátil en `agent/pre-step` con evento log-only `memory/injected`, captura local en `session/disposed` mediante estado incremental desde `session/event` (sin lecturas síncronas deprecadas de historial), redacción fija y valla untrusted; 13 tests focados.
- **Verificación:** 13 tests verdes, `pnpm run typecheck` exit 0, `pnpm run test:docs` 20/20. Sin activación → snapshots sin diffs.
- **Agent Note bilingüe:** `.agents/notes/proposed/feature/2026-11-06-passive-memory.md`.
- **Pendiente de decisión del propietario:** montar el plugin en presets (cambia el contexto model-visible y requiere re-grabar snapshots) y decidir la ruta de captura (directorio local a elegir).
