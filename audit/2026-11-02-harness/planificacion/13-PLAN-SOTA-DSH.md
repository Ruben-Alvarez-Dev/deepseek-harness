# Plan maestro SOTA para DeepSeek Harness — hoja de ruta estructurada de mejoras

**Fecha:** 2026-11-02 · **Protocolo:** `/auditoria-dev` (multidisciplinar + adversarial + Dementor).
**Base:** informes 00–12 de este expediente (auditoría PI-agent, dossier QWEN de anillos, forense, SOTA de handoff, frontera académica/industrial, cortex/pi-memory, propuesta de integración).
**Estado:** plan propuesto; los 6 pases línea por línea en curso (`14-AUDITORIA-LINEA-POR-LINEA.md`, pendiente) pueden afinar fases y costes, no la dirección.

---

## 0 · Veredicto central

**DSH no necesita una reescritura: necesita siete mejoras estructuradas sobre los seams que ya posee, en un orden con gates numéricos — y la pieza que más lo eleva es la que ya está medio instalada: la memoria pasiva híbrida alimentando cortex.**

## 1 · Principios rectores (destilados del expediente)

1. **Enforce en el seam** (nunca un monolito): presupuesto, selección y recorte en los puntos por los que ya pasa todo.
2. **Medir, no estimar** (token-meter replay-aware; prohibido `ceil(len/4)`).
3. **Búsqueda sin embeddings en el camino crítico** (KG + FTS5 + Fuzzy). Matiz verificado: cortex NO es embedding-free (vector_store en L0 WORKING, `pi_flightrecorder` con dim 384); la apuesta real es que la *búsqueda* no dependa de vectores.
4. **Pasivo por defecto, activo bajo demanda**: el harness captura/consolida/inyecta; el modelo solo busca.
5. **Sleep-time compute**: toda consolidación fuera del turno.
6. **Model-visible ⟺ logged** y **untrusted por defecto** en todo lo inyectado.
7. **Presupuesto impuesto y atribuido por capa** (el governor de pi era inerte: aquí no).

## 2 · Backlog maestro (20 mejoras, 7 frentes)

### A · Economía de contexto — el anillo de negociación (outbound e inbound)

| ID | Mejora | Origen SOTA | En DSH | Coste | Riesgo |
|---|---|---|---|---|---|
| A-1 | **Governor de petición (N1)**: top-K de skills, schemas MCP acotados (sumario de los no seleccionados), inyecciones solo en cola y con cuota | pi selection plane · OpenViking tiered loading · token-meter | Construir sobre el waterfall **`system-prompt/assemble`** (verificado: `system-prompt/src/index.ts:617-620`, único punto donde las tools finales son mutables; `agent/request` NO sirve — `llm/src/call-config.ts:23-30` no lleva tools) | medio | esconder la tool correcta → mitigado por escape hatch y gate de precisión |
| A-2 | **Dispatch gate (N2)**: vocabulario normalizado + deny-by-default con allowlist explícita, en modo *audit* una semana antes de *enforce* | pi hard-gates (lección corregida) | Construir | medio | romper tools legítimas el primer día → modo audit |
| A-3 | **ResultBudgeter (N3)**: recorte head/middle/tail por presión **por turno**, original siempre en el log | compaction-tool-result-pruner (extender) | Extender | bajo | perder detalle → original en log + replay |

### B · Selección — router de skills y MCP

| ID | Mejora | Origen SOTA | En DSH | Coste | Riesgo |
|---|---|---|---|---|---|
| B-1 | **Skill/MCPRouter (S1)**: ranking FTS5 zero-embeddings de skills y tools MCP por relevancia a la tarea | cortex zero-embedding · pi router (sin sus defectos) | Construir | medio | ranking débil en tareas nuevas → escape hatch permanente |
| B-2 | **Escape hatch garantizado**: búsqueda de skills y de sesiones siempre visible (find-skill + session-query) | Amp/openocode read_session | Existe (`tool-skill`, `tool-session-query`) | — | — |

### C · Memoria pasiva híbrida escalonada

| ID | Mejora | Origen SOTA | En DSH | Coste | Riesgo |
|---|---|---|---|---|---|
| C-1 | **Backend canónico de memoria para DSH** (decisión) | cortex v5.1.0 como referencia (fuera de alcance desde 2026-11-05) | — | — | sin backend elegido: C-2…C-5 se diseñan sobre los seams de DSH y no dependen de cortex |
| C-2 | **CaptureBridge (M1)**: `ctx.on('session/event')` → `L0_capture_memorize` sin llamadas del agente, con redacción previa y registro del reenvío. Verificado: `session/event` es emit-only (cero tokens al modelo) pero **síncrono en el append** (`core/session/src/index.ts:410-419`) → el listener debe ser barato y contenerse. `session_shutdown` NO existe: usar `session/disposed` | cortex L0 · pi-memory hooks · Claude auto memory | Construir | medio | fuga de contenido al proceso externo → redacción + registro |
| C-3 | **Inyectador (M2)**: `request_context` con cuota al inicio, en cola volátil, untrusted-fenced | cortex L5 · DMAA de pi | Construir | bajo | contaminar prefijo estable → solo cola |
| C-4 | **DreamScheduler (M3)**: consolidación L1→L3 fuera del turno | cortex dream · Letta sleep-time | Construir sobre **`packages/schedule/schedule`** (recordatorios one-shot + fixed-rate **durables sobre el session log**; `ctx.jobs` NO programa ni persiste — `jobs-local/src/index.ts:102,150-153`) | medio | consolidar basura → umbrales de admisión |
| C-5 | **Índice con límite de carga** (patrón MEMORY.md de Claude: índice ≤200 líneas, detalle en ficheros por tema) | Claude auto memory | Adaptar sobre cortex | bajo | — |

### D · Handoff de sesión

| ID | Mejora | Origen SOTA | En DSH | Coste | Riesgo |
|---|---|---|---|---|---|
| D-1 | **`/handoff <goal>` (M4)**: checkpoint estructurado orientado al objetivo + working-set revisable con tokens + sesión nueva enlazada | Amp → opencode-handoff → pi-amplike | Construir (reusa checkpoint + token-meter) | medio | fallo disfrazado de cancelación (defecto del ejemplo de pi) → no copiarlo |
| D-2 | **Enlace de padre a hijo por tool**: la sesión nueva recibe el ID de la padre y guía fija para `tool-session-query` | pi-amplike session_query · opencode read_session | Existe la tool; falta el enlace | bajo | — |

### E · Procedencia y confianza

| ID | Mejora | Origen SOTA | En DSH | Coste | Riesgo |
|---|---|---|---|---|---|
| E-1 | **Redacción por defecto en telemetría**: reglas en el waterfall `session-telemetry/record` (hoy vacío) | práctica OTel · lección pi | Construir (seam existe) | bajo | FP en telemetría |
| E-2 | **Fencing generalizado**: todo lo inyectado (memoria, referencias, MCP) con la valla de no-instrucciones | session-reference (ya existe) | Extender a M1/M2 | bajo | — |
| E-3 | **Pin de integridad de plugins** del perfil | supply-chain · SEC-2 del estudio | Construir si se acepta riesgo de terceros | medio | fricción de instalación |

### F · Evaluación continua (el hueco que la frontera llama "problema sin resolver")

| ID | Mejora | Origen SOTA | En DSH | Coste | Riesgo |
|---|---|---|---|---|---|
| F-1 | **Harness de recall/inyección**: recall@k sobre memorias propias + precisión de selección de skills (estilo A1 del dossier) | dossier QWEN A1 · benchmarks del survey | Construir | medio | crear fixtures honestos |
| F-2 | **Métrica longitudinal**: reutilización real de memorias/skills por sesión, en 30 días | OSSInsight "does this help over months" | Construir | bajo | si no hay señal → apagar C-2 (kill-criteria) |

### G · Hardening y diagnóstico

| ID | Mejora | Origen SOTA | En DSH | Coste | Riesgo |
|---|---|---|---|---|---|
| G-1 | **`context-doctor`**: auditoría de coste de AGENTS.md/skills/schemas + duplicados | Zhenyu98/dsh-context-doctor | **Instalable del mercado DSH** | bajo | — |
| G-2 | **`compaction-audit`**: qué perdió cada compactación | @bushizhanghan/dsh-compaction-audit | **Instalable** | bajo | — |
| G-3 | **Invariants por componente** derivados de incidentes reales (patrón `system_invariants` de cortex) | cortex 5.1.0 | Construir | bajo | — |

## 3 · Fases con gates falsables

| Fase | Contenido | Gate (número medido) | Semanas |
|---|---|---|---|
| **P0** | Decisiones (cuotas: K=8 skills, 3k schemas MCP, 1k inyección) + baseline con token-meter + versionar este plan + unificar homes de cortex | baseline publicado; plan en git | 0,5 |
| **P1** | A-1 (governor outbound) | tokens/petición −X % **sin** regresión en snapshots ni en tool-calls correctos | 0,5–1 |
| **P2** | A-2 (modo audit→enforce) + A-3 (pruner por presión) | 12 ataques de bypass bloqueados en enforce; resultados largos recortados con original en log | 0,5–1 |
| **P3** | B-1 (router skills/MCP) + B-2 | nDCG/recall@k ≥ umbral sobre ≥50 queries etiquetadas | 0,5–1 |
| **P4** | C-2/C-3/C-4/C-5 (memoria pasiva sobre cortex) + E-2 | recall@k propio ≥ umbral; 0 llamadas explícitas del agente; inyección ≤ cuota; redacción verificada | 1–1,5 |
| **P5** | D-1/D-2 (handoff) | tarea continuada en sesión nueva con menos pasos que sin handoff (medido) | 0,5–1 |
| **P6** | E-1/E-3 + G-1/G-2/G-3 | telemetría redactada por defecto; invariants 100 %; `/auditoria-dev` final con 0 BLOCKER/CRITICAL | 0,5 |
| **P7** | F-1/F-2 (evaluación) + revisión del plan | métrica longitudinal a 30 días con kill-criteria aplicados | 1 |

**Total: ~6–8 semanas**, con gates numéricos en cada fase.

## 4 · Pase adversarial

- **A1**: «El governor degradará tareas legítimas» → gate de P1/P3 mide precisión, no solo ahorro; escape hatch permanente.
- **A2**: «El router FTS falla en tareas sin léxico» → el ranking es poda, nunca cierre; la búsqueda cubre el resto.
- **A3**: «Reenviar el session log a cortex abre una fuga» → redacción en el puente, sin prompts/secrets, registro del reenvío en el log; mismo usuario/máquina.
- **A4**: «deny-by-default romperá el flujo el día 1» → modo audit 1 semana, allowlist explícita.
- **A5**: «Este plan será el decimotercer documento huérfano» → P0 incluye versionarlo y abrir el change de diseño antes de tocar código.
- **A6**: «No hay evaluación longitudinal» → F-2 con kill-criteria: sin señal a 30 días, se apaga C-2.

## 5 · Dementor

| Sospecha | Resultado |
|---|---|
| «DSH ya tiene casi todo y esto duplica» | **Parcial**: pruner/approval/token-meter/gradual disclosure existen. Lo nuevo es solo **imposición, selección y pasividad**. Si P1 no produce un número, se para |
| «El governor será tan inerte como el de pi» | N1 vive en el seam de ensamblado donde la petición se construye; su gate es un número, no salud |
| «Cortex ya es suficiente; el puente es invento» | Cortex hace el 80 %; **nada lo alimenta pasivamente**. El puente es la diferencia entre memoria *a petición* y memoria *pasiva* |
| «El router es optimización prematura» | El coste de schemas MCP crece por cada servidor montado; P3 lo decide con números |
| «Las fases son optimistas» | Los rangos son los del expediente (implementaciones análogas en pi/cortex medidas por su autor); P0 repite la medición antes de comprometer el resto |

## 6 · Correcciones de los auditores

1. En el informe 07 concluí que «el plan de anillos no transfiere»; correcto como código/estructura, **incompleto como función**: la negociación transfiere y es este plan.
2. La propuesta 12 decía «gateway enterizo»; este plan lo corrige a **políticas en los seams** — sin monolito.

## 7 · Esfuerzo total

**6–8 semanas** en 8 fases con gates numéricos; cada fase es opt-out independiente (si una no da número, no se continúa la siguiente).

## 8 · Decisiones del usuario (bloquean P0)

1. Cuotas iniciales: K=8 skills · 3k schemas MCP · 1k inyección de memoria/sesión (ajustables por config).
2. A-2 en modo audit 1 semana antes de enforce (recomendado).
3. ~~Cortex como backend canónico de memoria de DSH~~ — **retirada (2026-11-05)**: cortex sale del proyecto; el backend de memoria de DSH queda por decidir.
4. El código nuevo vive como paquetes de DSH (`packages/negotiation/*`, `packages/memory-bridge/*`) con opt-in por perfil (recomendado).
5. ¿Aceptas arrancar P0 (medición + versionado) y montar G-1/G-2 (los dos instalables) ya?

## 8-bis · Correcciones de los pases línea a línea (ya integradas arriba)

**Pase de seams de DSH (27 ficheros, ~14.700 líneas):**
- **M1 (MAJOR, confirmado)**: el cliente MCP registra **todas** las tools con `inputSchema` verbatim, sin límite (`mcp-client/src/tools.ts:144-203`) → A-1 en `system-prompt/assemble`.
- **M2 (MAJOR)**: `ctx.jobs` no programa ni persiste; el schedule durable está en `packages/schedule/schedule` → C-4 apunta allí.
- **M3 (MAJOR)**: `session_shutdown` no existe; es `session/disposed` → C-2 usa `session/event` + `session/disposed`.
- Patrón verificado para B-1: skills = catálogo nombre + descripción 500 chars + digest SHA-256, cuerpo bajo demanda (`tool-skill/src/index.ts:213-277`).

> **cortex — fuera del alcance de este plan desde 2026-11-05.** Sus hallazgos y su plan viven en `~/Code/Jart-CORTEX/audit/2026-11-02-cortex/` (`01-HALLAZGOS.md`, `02-PLAN.md`).

**Pase de pi-memory core (13 ficheros, HEAD vía `git show`):**
- **Reversiones de claims del dossier**: (1) el «olvido inmortal» (umbral 0.15) **ya está corregido en HEAD** — default 0.2 con comentario explícito (`memory-forget.ts:38`); el dossier describía el snapshot del 25-oct. (2) La «clave en la misma DB que firma» **ya está corregida**: custodia externa por defecto con migración que borra la meta (`memory-key-custody.ts:27-89`, `memory-stack.ts:157,40-41`). (3) El «replay destructivo» **ya está corregido**: replay diferencial con guard de integridad y `sinceCheckpoint` (`fabric.ts:273-323`). La ola W (E-063..E-066) arregló lo que el dossier señalaba.
- **Nuevo BLOCKER**: la métrica `merged` de consolidate es falsa (`merged = r.archived`, `memory-control.ts:242`) — engaña a tool/fabric/hooks.
- **CRITICAL**: ≥9 caminos de mutación de vista sin ledger (el claim de 11 escritores sigue vivo); las acciones `sessions/project/cross` están muertas por drift de esquema de tool (`extension.ts:101-103` vs `memory-tool.ts:7-10`); la doc canónica del orden de `save` está invertida (`fabric.ts:4,126` dicen append→update; el código hace update→append `:144-146`).
- **MAJOR**: governor a medio cablear (`quality` falsificado con `poolFraction`, `hooks.ts:85`); `dream-cycle` sin caller de producción (solo probe p055); `MemoryFabricMcpServer` muerto y su tool `propose` es un stub que devuelve `proposed:true` sin proponer (`fabric.ts:496`); `replaceAll` destructivo vivo como código muerto; el signer legacy (clave en meta) sigue exportado sin callers; `execCommand` devuelve `"[direct execution]"` sin ejecutar (`core.ts:142`).
- **Lo que funciona (verificado)**: savepoints atómicos reales, tenant fail-closed, cuarentena+redacción antes de hash, replay diferencial, custodia externa, firma v2 completa, FTS5 escapado, bitemporal.
- **Esfuerzo de remediación de pi-memory**: 1,5–2 semanas.


**Pase de pi-memory resto (30 ficheros):**
- **CRITICAL nuevos**: (C1) `memory.import` = bypass total de escritura expuesto por MCP (`memory-mcp-server.ts:252-255`); (C2) **fuga cross-tenant por el canal ANN** (`fabric.ts:107-113` filtra vecinos con `store.peek` sin guard de tenant; índice construido con vectores de todos los tenants) — el fix 062 perdido no era el único hueco de tenancy.
- Correcciones a claims: el «olvido inmortal» (umbral 0.15) se verificó contra **dos revisiones** — corregido en HEAD (0.2); «ANN sin llamadas» es cierto solo pre-047; el fan-out de 200 POST lo mató el change 032 (quedan `prefetch` y rank-embedBatch latentes).
- Lo que funciona: firma Ed25519 real por record y checkpoint encadenado; SAVEPOINTs; cuarentena + fencing en ambos flujos; tenant fencing con probe p039 (con la excepción C2); ledger idempotente con replay diferencial; admisión determinista; FTS5 con pesos y comodines neutralizados; mirror MCP con breaker.
- Esfuerzo: **7–10 días-dev**.


## 9 · Nota de método

- **M1 (MAJOR, confirmado)**: el cliente MCP registra **todas** las tools de cada servidor con `inputSchema` verbatim, sin límite ni lazy-loading (`packages/mcp/mcp-client/src/tools.ts:144-203`). El presupuesto de contexto no tiene seam hoy → A-1 es el fix correcto, en `system-prompt/assemble`.
- **M2 (MAJOR)**: `ctx.jobs` no programa ni persiste; el schedule durable está en `packages/schedule/schedule` → C-4 apunta allí.
- **M3 (MAJOR)**: `session_shutdown` no existe; es `session/disposed` (`core/session/src/index.ts:60`) → C-2 usa `session/event` + `session/disposed`.
- **Patrón verificado para B-1**: skills ya usan exactamente el modelo a imitar — catálogo con nombre + descripción truncada 500 chars + digest SHA-256, cuerpo bajo demanda (`tool-skill/src/index.ts:213-277`; `skill/src/index.ts:769-781`).
- Menores: schema MCP de entrada sin validar (`tools.ts:231-239`); `tool-skill` escanea el log completo en el primer pre-step (`:361-378`); jobs con ids reutilizados entre procesos.

**Pase de pi-memory core (13 ficheros, HEAD vía `git show`):**
- **Reversiones de claims del dossier**: (1) el «olvido inmortal» (umbral 0.15) **ya está corregido en HEAD** — default 0.2 con comentario explícito (`memory-forget.ts:38`); el dossier describía el snapshot del 25-oct. (2) La «clave en la misma DB que firma» **ya está corregida**: custodia externa por defecto con migración que borra la meta (`memory-key-custody.ts:27-89`, `memory-stack.ts:157,40-41`). (3) El «replay destructivo» **ya está corregido**: replay diferencial con guard de integridad y `sinceCheckpoint` (`fabric.ts:273-323`). La ola W (E-063..E-066) arregló lo que el dossier señalaba.
- **Nuevo BLOCKER**: la métrica `merged` de consolidate es falsa (`merged = r.archived`, `memory-control.ts:242`) — engaña a tool/fabric/hooks.
- **CRITICAL**: ≥9 caminos de mutación de vista sin ledger (el claim de 11 escritores sigue vivo); las acciones `sessions/project/cross` están muertas por drift de esquema de tool (`extension.ts:101-103` vs `memory-tool.ts:7-10`); la doc canónica del orden de `save` está invertida (`fabric.ts:4,126` dicen append→update; el código hace update→append `:144-146`).
- **MAJOR**: governor a medio cablear (`quality` falsificado con `poolFraction`, `hooks.ts:85`); `dream-cycle` sin caller de producción (solo probe p055); `MemoryFabricMcpServer` muerto y su tool `propose` es un stub que devuelve `proposed:true` sin proponer (`fabric.ts:496`); `replaceAll` destructivo vivo como código muerto; el signer legacy (clave en meta) sigue exportado sin callers; `execCommand` devuelve `"[direct execution]"` sin ejecutar (`core.ts:142`).
- **Lo que funciona (verificado)**: savepoints atómicos reales, tenant fail-closed, cuarentena+redacción antes de hash, replay diferencial, custodia externa, firma v2 completa, FTS5 escapado, bitemporal.
- **Esfuerzo de remediación de pi-memory**: 1,5–2 semanas.


**Pase de pi-memory resto (30 ficheros):**
- **CRITICAL nuevos**: (C1) `memory.import` = bypass total de escritura expuesto por MCP (`memory-mcp-server.ts:252-255`); (C2) **fuga cross-tenant por el canal ANN** (`fabric.ts:107-113` filtra vecinos con `store.peek` sin guard de tenant; índice construido con vectores de todos los tenants) — el fix 062 perdido no era el único hueco de tenancy.
- Correcciones a claims: el «olvido inmortal» (umbral 0.15) se verificó contra **dos revisiones** — corregido en HEAD (0.2); «ANN sin llamadas» es cierto solo pre-047; el fan-out de 200 POST lo mató el change 032 (quedan `prefetch` y rank-embedBatch latentes).
- Lo que funciona: firma Ed25519 real por record y checkpoint encadenado; SAVEPOINTs; cuarentena + fencing en ambos flujos; tenant fencing con probe p039 (con la excepción C2); ledger idempotente con replay diferencial; admisión determinista; FTS5 con pesos y comodines neutralizados; mirror MCP con breaker.
- Esfuerzo: **7–10 días-dev**.


## 9 · Nota de método

Este plan se revisa automáticamente contra los 6 pases línea por línea en curso (`14-AUDITORIA-LINEA-POR-LINEA.md`): si refutan algún claim heredado del dossier (olvido inmortal, 11 escritores, 74 tools de cortex, seams de DSH), las fases afectadas se ajustan antes de empezar.
