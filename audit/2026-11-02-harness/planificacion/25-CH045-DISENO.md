# CH-045 (P5) — Handoff de sesión: diseño

**Fecha:** 2026-11-06 · **Estado:** DISEÑO (implementación no iniciada) · **Base:** `origin/master` = `0d1f50007f`, worktree `.worktrees/ch045`, rama local `feat/ch045-session-handoff` · **Regla:** un change a la vez; gates medidos; sin push.

## 1 · Objetivo y gate

P5 = **D-1 (`/handoff <goal>`)** + **D-2 (enlace padre→hijo por tool)**:

- **D-1:** un comando humano que construye un **checkpoint estructurado orientado al objetivo** (goal, último intercambio, working set, tokens medidos, sesión padre) y crea una **sesión nueva enlazada** (`header.parentSession`) cuyo primer mensaje contiene el checkpoint y una guía fija.
- **D-2:** el hijo recibe el **ID de la sesión padre** y guía fija para las tools existentes `session_event_search` / `session_trace`; no se oculta ni duplica la tool de búsqueda de sesiones.
- **Gate falsable:** tarea continuada con **menos pasos de recuperación** en la sesión nueva que sin handoff. Medición sin modelo: fixture de 3 tareas con 5 hechos cada una; con handoff, los hechos están en el checkpoint → **0 pasos de recuperación**; sin handoff, el hijo no conoce los hechos → **≥5 pasos** (una búsqueda por hecho) y **recall de hechos en el checkpoint = 1,00**. Se publica el número y el límite del proxy.

## 2 · Seams verificados en `origin/master`

| Seam | Evidencia | Uso |
|---|---|---|
| Comandos humanos | `ctx.commands.register({definitionId,name,description,handler})` (`packages/compaction/command-compact/src/index.ts:101-110`) | Registrar `/handoff` |
| Creación de sesión hija enlazada | `ctx.sessions.create(id?, {meta})` con `meta.parentSession` (`packages/core/session/src/index.ts:1037`) | D-1/D-2: header con padre |
| Lectura de estado actual | `session.deriveMessages()` (proyección viva, sin JSDoc de deprecación) + `session.header` | Checkpoint sin lecturas históricas deprecadas |
| Tokens medidos | `ctx.tokenMeter.measure(session).totalTokens` (CH-042) | Working set con cifra real |
| Tools de enlace | `session_event_search`, `session_trace` (`packages/session-query/tool-session-query/src/index.ts:75-95`) | Guía fija en el mensaje del hijo |
| Fuente de mensaje nueva | `MessageSourceMap` merge-extensible (`packages/llm/llm/src/message.ts:104`) | Marcar el mensaje como checkpoint de handoff |

## 3 · Diseño

### Paquete `@deepseek-ai/dsh-handoff` (`packages/session/handoff`)

**Configuración** (opt-in, todo desplegable): `checkpointAssistantChars` (2000, recorte del último texto del asistente), `maxToolCalls` (8, tool calls recientes en el working set), `maxArgumentChars` (200, recorte de argumentos).

**Constructor de checkpoint (`checkpoint.ts`).** Deriva del estado vivo de la sesión:
- `goal` = argumento del comando (obligatorio; comando sin argumento devuelve error de uso);
- `parent` = `session.id`, `cwd`, `tokens` = `tokenMeter.measure(session).totalTokens`;
- `lastUser` = último texto directo del usuario; `lastAssistant` = último texto del asistente (recortado);
- `workingSet` = últimas `maxToolCalls` tool calls (nombre + argumentos recortados) y los nombres de ficheros citados en el último mensaje (extraídos con regex de rutas), para que el hijo sepa qué releer;
- render fenced: encabezado `## Handoff checkpoint`, goal, datos medidos, working set, y la **guía fija** con el id del padre y las tools `session_event_search`/`session_trace`.

**Comando `/handoff`.** `ctx.commands.register` con `name: 'handoff'`; crea la sesión hija con `ctx.sessions.create(undefined, { meta: { parentSession: source.id, cwd } })`, le añade `turn/start` + `user/message` con `source: { kind: 'handoff-checkpoint', version: 1, parentSession, goal }` y `surfaceOp: 'append'`, y devuelve un resultado con el id del hijo y los tokens medidos. La sesión original **no se modifica** (no se compacta ni se borra).

**D-2.** El mensaje del hijo contiene el id del padre y la guía fija; el enlace también queda en el header `parentSession`, de modo que `session_trace` muestra la lineage sin estado adicional.

## 4 · Gate y verificación

- Fixture: 3 tareas de continuación, 5 hechos por tarea (en el último intercambio del padre). Medición: recall de hechos en el checkpoint ≥0,90; pasos de recuperación con handoff = 0 y sin handoff ≥5 (proxy determinista: cada hecho ausente exige una búsqueda). Se publica el número.
- Tests: construcción del checkpoint (goal obligatorio, recortes, tokens), creación de la hija (header `parentSession`, primer mensaje, padre intacto), comando registrado y ejecutable, y la medición del gate. Sin activación en presets → snapshots sin diffs.
- `pnpm run typecheck`, `pnpm run test:docs`; Agent Note bilingüe `proposed/feature/2026-11-06-session-handoff.md`; commits locales; expediente 15/19/25 actualizado; **sin push**.

## 5 · Riesgos

| Riesgo | Mitigación |
|---|---|
| Checkpoint que pierde detalle | Working set acotado + tokens medidos + guía `session_event_search` al padre; recall medido en fixture |
| Handoff disfrazado de cancelación | El resultado es explícito (id del hijo, tokens) y nunca se reporta como error |
| Duplicar la sesión padre | No se fork-ea ni se compacta: se crea una hija con header enlazado |
| Coste del mensaje | Configuración de recortes; el checkpoint sustituye el historial completo |

## 6 · Medición del gate (2026-11-06)

**Fixture:** 3 tareas de continuación (`migration`, `deploy`, `audit`) × 5 hechos cada una en el último intercambio del padre.

| Métrica | Sin handoff | Con handoff |
|---|---|---|
| Hechos presentes en el contexto del hijo | 0/15 | **15/15** (recall 1,00) |
| Pasos de recuperación necesarios | **15** (una búsqueda por hecho) | **0** |

Seis tests focados verdes (`checkpoint`, límites, creación enlazada, inmutabilidad del padre, uso, tokens) además del gate. `pnpm run typecheck` exit 0 y `pnpm run test:docs` 20/20.

**Límite declarado:** el gate es un **proxy determinista** (hechos ausentes ⇒ una búsqueda de recuperación necesaria por hecho), no una medición con modelo real; la activación queda condicionada a una evaluación en vivo.

## 7 · Implementación y cierre (2026-11-06)

- **Implementado opt-in, sin activar en presets.** Paquete `@deepseek-ai/dsh-handoff` (`packages/session/handoff`): constructor de checkpoint, comando `/handoff`, hija enlazada por `header.parentSession`, mensaje `handoff-checkpoint` registrado, guía fija a `session_event_search`/`session_trace`; el padre no se fork-ea ni se compacta. Agent Note bilingüe `proposed/feature/2026-11-06-session-handoff`.
- **Sin push ni PR.** **Pendiente de decisión del propietario:** montar el comando en presets/composiciones y evaluar la continuación con modelo real antes de activarlo.

## 8 · Remediación de auditoría (2026-11-06)

La auditoría `/auditoria-dev` de P6 encontró un **CRITICAL**: la primera versión de este change añadía `turn/start` + `user/message` a la superficie de la hija, de modo que el system prompt del bucle quedaba **después** del checkpoint (orden `user,system`), y el `turn/start` se duplicaba al arrancar.

**Corrección aplicada (rama `feat/ch045-session-handoff`):** el comando ya no escribe en la superficie; registra el checkpoint como evento **log-only `handoff/checkpoint`** (texto exacto, padre, goal, tokens). Un listener `agent/pre-step` del paquete inyecta ese texto como **mensaje de petición** (source `handoff-checkpoint`) en el primer paso del hijo y lo consume una sola vez. Verificado por ejecución: superficie de la hija **0 mensajes** antes del bucle; tras arrancar, `system` es el nodo 0; el checkpoint llega como mensaje de petición. Tests (6) y gates de docs (20/20) verdes; gate proxy 15/15 hechos sin cambios.
