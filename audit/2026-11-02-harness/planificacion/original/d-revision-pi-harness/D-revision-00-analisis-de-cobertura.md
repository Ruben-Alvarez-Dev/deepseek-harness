# 01 — Análisis profundo (base del autor ‖ suite propia ‖ canon)

> Fecha: 2026-10-10 · Método: lectura completa de los ficheros clave (señalados con ●),
> lectura de API/docs completa de UPSTREAM, tests re-ejecutados en vivo (418/418 ✅).
> Lo que NO se leyó línea a línea está marcado explícamente (§E), para no fingir cobertura.

---

## A. LA BASE QUE PROPONE EL AUTOR (UPSTREAM-autor/pi, v1.1.0)

Monorepo `earendil-works/pi` (MIT, autor Mario Zechner). **Filosofía declarada**:
*"Pi is a minimal, extensible agent harness that you can make your own"* — el autor propone
**componer** (extensiones, paquetes, SDK, modelos virtuales), no forkear. 14 paquetes npm:

| Paquete | LOC (src) | Rol en nuestro plano |
|---|---|---|
| `coding-agent` | 86 152 | El producto: CLI/TUI/RPC/SDK, sesiones JSONL, compaction, extensiones, MCP, skills |
| `ai` | 27 242 | Proveedores, modelos, streaming, usage/cost, `createProvider`, `registerVirtualModel` |
| `durable` | 22 433 | **Otro harness** experimental sobre `pi-ai`+`chord`: commits atómicos, reanudación, task graph, child tasks |
| `tui` | 19 505 | Terminal UI (reusable) |
| `chord` | 8 817 | Estado documental transaccional (la base de `durable`) |
| `codemode` | 2 597 | Ejecución de scripts LLM (QuickJS WASM) |
| `agent` | 2 519 | **`pi-agent-core`: EL núcleo del bucle** (`Agent` + `agentLoop`) |
| `mcp` | 3 244 | Cliente/servidor MCP |
| `server`/`client`/`protocol`/`env`/`telemetry` | ~6 k | Soporte |

### A.1 ● `pi-agent-core` (leído completo: agent.ts 613 l., agent-loop.ts 949 l., types.ts 539 l.)

La pieza que define «la base del autor» y sobre la que se construye cualquier harness propio:

- **`runAgentLoop` / `runAgentLoopContinue`**: bucle doble (externo: follow-ups; interno:
  tool calls + steering). Event-driven: `agent_start → turn_start → message_* → tool_execution_* →
  turn_end → agent_end`, con `message_update` de streaming en vivo.
- **`AgentLoopConfig` = la superficie de inyección del harness**:
  - `transformContext(messages, signal)` → nuestro **Token Ring** (compresión reversa por presupuesto)
  - `prepareRequest(ctx)` / `prepareNextTurn(ctx)` → cambiar modelo/esfuerzo **por turno**
    (cache-friendly: solo el par physical, no el prefix), insertar mensajes, swap context
  - `finishTurn(turn)` → decidir `end` / `continue` (supervisor de por qué continuar)
  - `beforeToolCall` / `afterToolCall` → **PEP** (gate fail-closed, redacción, sandbox)
  - `getSteeringMessages` / `getFollowUpMessages` → colas de intervención del usuario
  - `streamFn` + `transport` + `getApiKey` → **nuestro provider de router** (pools de cuentas)
  - `convertToLlm` → nuestro proyección de transcript→LLM
- **`Agent`** (stateful): estado (model, thinkingLevel, tools, messages), queues
  (steering/follow-up, modos `one-at-a-time`|`all`), `subscribe()` de eventos **awaited**
  (listener tardío = settlement tardío), `waitForIdle()`, `reset()`, `abort()`.
- **Detalle fino de `declareToolChanges`**: las diferencias de loadout de tools se declaran
  como deltas en system messages (`toolsAdded`/`toolsRemoved`) → re-play estable y
  no rompe el prefix cacheado. Es el mecanismo por el que el Selection Plane puede
  cambiar el top-K sin reescribir historia.
- **`runToolCall` exportado**: herramientas que llaman a otras herramientas pasan por los
  mismos hooks (PDP) que las llamadas del modelo.
- Tool calls truncados por límite de output → **fail-fast** (todo el batch marcado error,
  sin ejecutar argumentos incompletos).

### A.2 ● Superficie de extensiones de `coding-agent` (docs/extensions.md + types)

- Eventos transformables: `before_agent_start` (secciones del system prompt + tools activos),
  `context` / `context_with_system`, `message_end` (reemplazo de mensaje finalizado),
  `tool_call` (mutar/bloquear), `tool_result` (componen, se ven los cambios previos),
  `user_bash` (handler undefined pasa al siguiente y luego a ejecución local; fallo **bloquea**),
  `session_before_compact`, `turn_end`/`agent_before_settle` (bordes accionables: pueden encadenar
  entradas `custom`/`compaction` y pedir 1 continuación), `agent_settled` (notificativo final),
  `cache_warming_decision`, `provider_stream_event` (read-only, pre-normalización).
- `pi.registerProvider` / `pi.registerVirtualModel` → routing **nuestro** por request
  (seleccion (virtual, level) → dispatch (physical, level); Pi registra ambas pares y replay
  funciona tras cambio de modelo físico).
- State management: tool-result `details` (state de rama), `pi.appendEntry()` (durable, fuera
  del modelo), `pi.sendMessage()` (dentro del modelo), storage externo (fuera de sesión).
- `exposure` de tools: `direct` / `model-only` / `codemode` / `deferred` / `hidden`
  → el Selection Plane de `pi-intermediate` es literalmente esto hecho por fuera y antes.

### A.3 ● `durable` (README + API)

Harness alternativo **experimental** (API cambia sin aviso): `Harness.open(storage)`,
conversaciones de entradas inmutables, `submit()` durable, wait/reanudación tras caída,
child tasks, compaction, hooks. **Sin journal de decisiones** (lo excluye su especificación;
lo confirmó el change 024). Conclusiones para nosotros: es *almacen de conversaciones
reanudables*, no *control de política*. No es la base del harness; es un candidato de
referencia para el plano `control/` (S3).

### A.4 Riesgo transversal del autor

Pi upstream se mueve a diario (6 releases 1.0.0→1.1.0 en una semana; `pi-durable` apareció
anunciado en la portada de pi.dev, no en nuestro corpus). **Nuestro harness debe fijar
versiones (pinned) + tests de conformance contra la superficie exacta de extensiones que
usamos**, y releer el upstream al empezar cada fase.

---

## B. NUESTRA SUITE (SUITE-nuestra)

### B.1 ● `pi-intermediate` (leído: index.ts, core.ts, README, package.json; specs en CANON)

`SelectionCore` = fachada determinista 0-deps: `ConfigStore`(SQLite `meta`) ·
`SourceRegistry`(fuentes T0–T3) · `CapabilityIndex`(FTS5+trust) · `Governance`
(políticas allow/deny/auto/quarantine, journal hash-chained) · `KeyStore` ·
`ExecutionGate`(sandbox SPI: bwrap/seatbelt/srt/gondolin, fail-closed) ·
`TokenRing`(presupuesto 6000 tok/turno, caveman, knapsack+MMR) ·
`Router`(2 etapas `P(fam|q)·P(cap|fam)` + RRF + trust boost β + escape hatches).
17 tests + 113/113 ✅. **Frontera limpia**: no conoce memoria.

### B.2 ● `pi-memory` (leído: index.ts, core.ts, extension.ts, fabric.ts, §memory-control)

`PiCore` = `SelectionCore` + `MemoryStack` + `MemoryFabric`:
- **Fabric = «memoria como vista materializada síncrona del ledger»** (fabric.ts):
  `save = append(ledger) + update(vista)` atómico, read-your-writes, `replay` recomputa
  la vista desde el ledger (fuente durable), redacción **antes** de apendar.
- `MemoryControl` (PMO): A-MAC (5 factores) → admit/discard/merge; DMAA
  (recall cache-aware, marcado UNTRUSTED, con presupuesto); `reconstructSession`
  (**DEFECTO N3: `text.slice(0, 4000)` — conserva la cabecera, no lo reciente**);
  `MemorySigner` (Ed25519); checkpoints/rollback.
- `RetrievalFabric`: RRF (FTS5+vector+entidad) + rerank pluggable + `CanonClient`
  key-pinned (CANON es la única autoridad de verdad; la memoria nunca certifica).
- Capas L0–L3, olvido por saliencia (Ebbinghaus), consolidación sleep-time,
  memoria procedural, embeddings pluggables (hash/ONNX/HTTP), transporte MCP,
  backend cloud (SQL+RLS), gateway normalizado (OpenAPI 3.1 ‖ MCP ‖ OpenAI-compat).
- **`extension.ts` (190 l.) = adaptador delgao**: traduce eventos reales de
  `@earendil-works/pi-coding-agent` a datos planos y registra `memory` (1 tool
  dispatcher ~200 tokens) + `find_capability` + `/caps` + `/caveman` + puertos duros
  (`tool_call`/`user_bash` fail-closed, sandbox OS con `PI_CORE_SANDBOX_ALL=1`).
  Toda la lógica vive en `hooks.ts` (testeable sin runtime). 41 tests, 181/181 ✅.

### B.3 ● `pi-agnes-router` (leído: extension.ts 263 l., application/router.ts, README, package.json)

Hexagonal: `domain`(política) → `application`(reservas) → `ports` → `adapters`.
- Provider nativo `account-router` vía `createProvider` (pi-ai): **no proxy, no parchea Pi**;
  la selección de cuenta pasa en `stream/streamSimple` (routing proactivo pre-output,
  never retry on another account tras partial output).
- Estado compartido entre procesos: JSON atómico privado + `proper-lockfile` +
  file-watcher de siblings; leases vivos no expiran solos (crash → reclaim).
- Polaris scheduling: **least-pressure** (headroom rolling + concurrencia in-flight),
  rotación solo entre pools equipresurizados, tickets justos, cooldown de grupo
  (Respeta `Retry-After`), 401/403 deshabilita solo la cuenta.
- Footer label event-driven (sin polling): rampa verde→roja por RPM del pool,
  ancho ≤24 col, se refresca solo en commits propios/ajenos/fin de cooldown.
- 124/124 ✅ + verificación en vivo con 2 procesos Pi reales.

### B.4 Modo de integración actual (la clave para el replanteo)

Hoy todo se compone **como extensiones de Pi stock**: `pi-memory/extension.ts` y
`pi-agnes-router/extension.ts` se cargan en el proceso de Pi. **No existe runtime propio**:
la arquitectura (docs P5) y la auditoría (reviews/12) lo declaran pieza faltante:
*«governance del agente — perfiles agénticos, workflows de memoria, supervisión
cross-plane, harness»* no existe como módulo coherente en ningún repo.

---

## C. CANON (lo que se decidió)

- **P0–P7** (arquitectura-sistema-cognitivo, 2026-09-29): anillo 8 módulos + 3 SPIs +
  runtime + evidence plane; **P4 (adapter CORTEX→MemorySPI vía MCP) = puerta de seguridad**
  antes de cualquier migración. D1: no fusionar CORTEX↔π-memory ahora. D10: no publicar SPIs
  antes que CORTEX los implante.
- **S0–S6** (reviews/12, la corrección de la Ronda 5): rebajar de 13 piezas a
  4 paquetes + 2 servers Python externos; **`control/` ANTES que ningún porting**
  (PDP hot-swap + workflow mínimo con guardas/saga/replay); medir (S1) antes de portar (P2);
  S6 = 2 semanas de uso real con kill-criteria. **≈20–25 días hasta S5.**
- **reviews/14** (lo abierto, medido 2026-10-09): N1 captura L0 parada (CRÍTICO) ·
  N2 pi-memory no cargada en Pi (CRÍTICO) · N3 cabecera vs reciente (ALTO) · N4 thinking no
  portable (ALTO) · V1 contexto >100k en 34/55 turnos (ALTO) · V2 sin regla de cambio
  de modelo (ALTO) · V3 esfuerzo fijo en `max` (MEDIO) · E1–E3 (research: esfuerzo
  adaptativo, router de modelo/esfuerzo).
- Estado de tests (re-medido hoy): **418/418 ✅** (181+113+124). Badges de READMEs desfasados.
- Higiene abierta (S0): sin git en raíz, `.DS_Store`/`node_modules` en árbol, mp4 de 104 MB,
  placeholder `example.internal`, extensiones rotas en `~/.pi/agent/extensions`.

---

## D. GAP: «extensiones sobre Pi stock» → «nuestro harness desde cero»

| Pieza | Hoy (extensiones) | Objetivo (runtime propio) |
|---|---|---|
| Bucle del agente | Pi stock (agent-loop + session manager) | **Nuestro runtime sobre `Agent`/`agentLoop` (pi-agent-core)** con los hooks nuestra |
| Selección de capacidades | `find_capability` tool + top-K materializado | `transformContext`/`prepareNextTurn` → ring + Selection Plane como **primarios** (no escape) |
| Memoria | `context` handler (DMAA pull) + `before_agent_start` | Idem, pero **dentro del runtime** (same process, DI, supervisión) |
| Routing de cuentas | provider nativo (extensión) | Provider **del runtime** (mismo código, `createProvider` de pi-ai) |
| Control (PDP/PEP) | hard-gates + sandbox (PEP sin PDP) | **`control/`: PDP hot-swap + workflow (guardas/saga/replay) + journal de decisiones** (S3) |
| Supervisor | No existe | **Verificación horizontal cross-plane** (CORTEX↔fabric↔CANON) + SLO tokens/tarea (S4) |
| Perfiles agénticos | No existe | Profiles YAML+schema (workflows de memoria + política) |
| Reanudación/decisiones | JSONL de Pi (+durable fuera) | **journal de decisiones propio** (lo que durable excluye) |
| Medición | No existe (M1–M3 abiertos) | **harness eval**: B1/B2/B3 + recall@k/nDCG como gates (S1) |

Decisiones de diseño que emergen del análisis (no de la moda):
- **Componer sobre `Agent` (pi-agent-core), no forkear el bucle**: 2.5k LOC estables, la
  superficie de hooks es exactamente lo que nuestro runtime necesita, y el fork costaría
  mantener el bucle cada día que el autor mueva Pi. El «desde cero» es **nuestro runtime**,
  no nuestro bucle.
- **El JSONL de Pi sigue siendo flight recorder canónico** (N1 depende de él); nuestro
  journal de decisiones **no lo reescribe**, lo acompaña.
- **El control (`control/`) es bloqueante para todo lo demás** (S3 de reviews/12 y veredicto
  de la Ronda 5): sin PDP no hay política hot-swappable; sin workflow no hay replay de
  decisiones; sin journal no hay forense.
- **Medir antes de portar** (S1 antes de P2): el porting de RRF/fuzzy de CORTEX solo si
  recall@k paritario o superior **medido**.
- **Puerta P4**: CORTEX expuesto como MemorySPI vía MCP antes de reescrituras.

---

## E. Cobertura honesta de la lectura

- **Leído completo / profundo**: agent-core (4/6 ficheros), extensiones propias
  (pi-memory/extension.ts, pi-agnes-router/extension.ts), facades (core.ts ×2),
  fabric.ts (API+semántica), docs de extensiones/virtual-models/how-pi-works/durable,
  README de los 3 paquetes, HANDOFF (íntegro), reviews 12 y 14 (íntegros),
  arquitectura-sistema-cognitivo (§0–§5), P0–P7 + S0–S6.
- **Leído por módulos (API + README + specs)**: resto de `pi-memory` (memory.ts,
  memory-spi.ts, memory-stack.ts, retrieval-fabric.ts, memory-gateway.ts…), resto de
  `pi-intermediate` (router.ts, token-ring.ts, governance.ts, sandbox.ts…),
  resto de `pi-agnes-router` (domain/policy.ts, adapters/*), `pi` upstream
  (package level + agent-core + durable + docs).
- **NO leído línea a línea**: `coding-agent/src/core/agent-session.ts` (4398 l.) y
  sus 20+ vecinos (session-manager, model-runtime, compaction…) — suficiente con la
  superficie de extensiones ya que **no los vamos a forkear**; 18 módulos <100 l. de
  pi-memory (fragmentación identificada en reviews/12 A1, sin impacto funcional);
  Jart-CORTEX/CANON (claims `[claim]` desde aquí; sus suites están en sus repos).
- **A leer antes de cada fase** (no ahora): los ficheros del upstream de la superficie
  exacta que toque la fase (conformance).
