# S1 — Diseño de extracción: anillo-0 kernel · anillo-1 gateway · anillo-2 connections

**Encargo:** diseño de extracción por anillos del ecosistema Pi, con veredicto explícito sobre dónde debe vivir la suite de memoria.
**Fecha:** 2026-10-25 · **Rol:** arquitectura de software · **Estado:** PROPUESTA DE DISEÑO. No se ha modificado, compilado ni ejecutado nada.
**Objeto:** `/Users/ruben/Code/PI-agent` @ `7b0e0b3` (8 dirty), paquetes `src/pi-intermediate`, `src/pi-memory`, `src/pi-account-router`; 27 specs en `openspec/specs/`; dossier `src/pi-account-router/docs/audit-2026-10-18/arquitectura-ecosistema/`.

**Alias de evidencia** (todas las rutas relativas a `/Users/ruben/Code/PI-agent/`):

| Alias | Raíz |
|---|---|
| `I/` | `src/pi-intermediate/src/` |
| `M/` | `src/pi-memory/src/` |
| `P/` | `src/pi-account-router/src/` |
| `S/` | `openspec/specs/` |
| `D/` | `src/pi-account-router/docs/audit-2026-10-18/arquitectura-ecosistema/` |

**Veredicto en una línea:** los tres anillos son extraíbles sin reescribir nada, porque las costuras ya existen (`MemoryBackend` SPI, `SandboxProvider` SPI, `P/ports.ts`, `I/contract.ts`, `I/gateway.ts`); el anillo-0 no es un kernel nuevo sino **la parte pura que ya está dentro de `pi-intermediate`** (crypto, gates, trust/grade, álgebra de tokens, contrato, envelopes); y la memoria **no cabe en ningún anillo**: debe ser una pieza transversal de rango propio, porque tiene ciclo de vida independiente del turno, ya compone *sobre* el intermediate, y su esquema físico ya vive fuera de su paquete.

---

## 1. Inventario de responsabilidades reales hoy

### 1.1 Regla de lectura

Esta sección describe **lo que el código hace**, no lo que las specs prometen. La columna de contraste con specs va en §1.5. Nada de lo listado aquí se ha ejecutado: se lee del fuente.

### 1.2 `pi-intermediate` — 23 módulos, 3.614 líneas, cero dependencias de runtime

| Módulo | Responsabilidad real | Evidencia |
|---|---|---|
| `I/index.ts` | Barrel plano: reexporta los 22 módulos sin capas ni ACL interna | `I/index.ts:7-28`; declara «Sin capa de memoria» en `:5` |
| `I/types.ts` | Modelo de dominio de confianza/capacidades: `TrustTier` T0–T3, `Policy` allow/deny/auto/quarantine, `Source`, `Capability`, `SearchHit`, `RouteResult` | `I/types.ts:5-11`, `:13-26`, `:28-42`, `:53-58` |
| `I/db.ts` | **Esquema SQLite físico de TODO el ecosistema** + migraciones semver reversibles | `I/db.ts:7-93` (schema), `:96` (`SCHEMA_VERSION="1.6.0"`), `:104-242` (migraciones), `:263-273` (`migrate`), `:275-281` (`rollback`), `:283-288` (`openDb`) |
| `I/config.ts` | KV sobre tabla `meta`: β y ajustes (`ring.budgetPerTurn`, `quota.*`, `memory.*`) | `I/config.ts:14-18` (`getBeta`), `:26-35` (`get`/`getNumber`), `:37-41` (`set`) |
| `I/trust.ts` | Álgebra de confianza pura: rank de tier, boost normalizado 0..1, score combinado | `I/trust.ts:7`, `:9` (`DEFAULT_BETA = 0`), `:16-22`, `:25-27` |
| `I/grade.ts` | Grade operacional ponderado (firma 0.3 + resultados 0.4 + humano 0.3) con techo 60 sin firma verificada | `I/grade.ts:19`, `:21-32` |
| `I/provenance.ts` | Primitivas criptográficas: SHA-256, keypair Ed25519, sign/verify, huella canónica | `I/provenance.ts:7-9`, `:16-22`, `:24-27`, `:29-36`, `:39-41` |
| `I/keystore.ts` | Alta/import/revocación/verificación de claves públicas **en memoria** | `I/keystore.ts:14-15` (`Map` + `Set` privados), `:17-22`, `:28-34`, `:36-40` |
| `I/source-registry.ts` | CRUD de fuentes + setters de grade/tier/policy/peso + stats + re-graduación acotada (nunca promueve tier) | `I/source-registry.ts:45-58`, `:74-90`, `:92-101`, `:103-107`, `:111-124` |
| `I/capability-index.ts` | Alta de capacidades + búsqueda BM25 (FTS5) + recuento por fuente/familia + `recordOutcome` + borrado en FTS | `I/capability-index.ts:42-50` (`ftsQuery`), `:58-72`, `:85-98`, `:100-103`, `:109-117`, `:127-133` |
| `I/governance.ts` | Decisión de política por fuente; redacción de secretos; detección de inyección; journal hash-chained | `I/governance.ts:15-21` (patrones secreto), `:23-30` (patrones inyección), `:48-56` (`allowed`), `:58-60`, `:62-72` (`journal`), `:74-78` |
| `I/hard-gates.ts` | Puertas duras regex fail-closed sobre bash/rutas de escritura; envoltorio `failClosed` | `I/hard-gates.ts:12-23`, `:26-31`, `:34-37`, `:41-53`, `:55-61`, `:63-66`, `:68-72`, `:75-82` |
| `I/router.ts` | Routing en dos etapas (familia → capacidad) con saneo previo, normalización min-max, escape hatch, `explain`, `materialize` con esquemas comprimidos | `I/router.ts:40-103` (etapa 1 en `:83-88`, etapa 2 en `:90-95`), `:105-108`, `:111-113`, `:116-138`, `:141-161` |
| `I/token-ring.ts` | Economía de tokens completa: estimador, clasificador, compresión por tipo, CCR, compresión de schemas, knapsack 0/1 exacto, MMR, governor, máscara de contenido sagrado, Caveman, probe de preservación, compactación estructurada, compresión de prompt, PromptFoundry/GEPA, fachada `TokenRing` | `I/token-ring.ts:22-24`, `:26-44`, `:84-103`, `:106-122`, `:125-148`, `:161-196`, `:212-232`, `:235-253`, `:259-286`, `:345-374`, `:411-416`, `:444-467`, `:507-540`, `:555-598`, `:611-626`, `:636-683` |
| `I/sandbox.ts` | SPI de sandbox + 4 proveedores reales (`bwrap`, `seatbelt`, `srt`, `gondolin`) + selección fail-closed + perfiles deterministas + `ExecutionGate` | `I/sandbox.ts:37-45` (SPI), `:53-61`, `:63-93`, `:100-120`, `:175-217`, `:258-285`, `:288-296`, `:303-320`, `:323-342`, `:345-354`, `:356-372` |
| `I/bash-ops.ts` | Adaptador estructural `BashOperationsLike` que enruta el shell del host por el sandbox, con streaming/timeout/abort y fail-closed | `I/bash-ops.ts:21-27`, `:76-149` (rechazo sin invocación en `:86-90`) |
| `I/ingest.ts` | Federación de fuentes: parseo de frontmatter/skills/catálogos JSON, 4 fetchers (dir local, catálogo JSON, HTTP, git clone) y pipeline con fingerprint + cuarentena | `I/ingest.ts:31-44`, `:59-78`, `:80-108`, `:110-118`, `:123-145`, `:148-162`, `:170-216` |
| `I/contract.ts` | Contrato canónico: 12 JSON Schemas, validador determinista propio, modelo de error + status, paginación por cursor, idempotencia | `I/contract.ts:12`, `:34-225`, `:246-283`, `:286-290`, `:294-332`, `:348-359`, `:363-376` |
| `I/gateway.ts` | Gateway agnóstico de transporte: registro de rutas, dispatch, trace id, idempotencia, y **derivación** de OpenAPI 3.1 y de tools MCP desde las mismas rutas | `I/gateway.ts:44-54` (`Route`), `:84-96`, `:113-140`, `:142-178`, `:181-190` |
| `I/events.ts` | Envelope de evento + naming de subjects + codificación JSON determinista (claves ordenadas) | `I/events.ts:8-17`, `:31-39`, `:49-60`, `:75-77`, `:79-85` |
| `I/reliability.ts` | SLAs numéricos con alertas y factor de presupuesto, circuit breakers con suelo BM25-only, trazas/spans | `I/reliability.ts:10-24`, `:45-54`, `:57-59`, `:72-128`, `:137-148`, `:153-156`, `:160-…` |
| `I/eval.ts` | Arnés de evaluación de routing (precision/recall/MRR por β) y calibración con regla de promoción estricta | `I/eval.ts:19-36`, `:45-58` |
| `I/core.ts` | **Composition root** `SelectionCore`: cablea db+config+sources+index+governance+keystore+gate+ring+router; añade cuotas anti-gaming, decisión de ejecución, borrado en cascada, alerta de dominancia | `I/core.ts:31-56`, `:71-81`, `:84-89`, `:92-97`, `:100-107`, `:110-119` |

### 1.3 `pi-memory` — 38 módulos, 6.489 líneas (PALIMPSEST)

| Módulo | Responsabilidad real | Evidencia |
|---|---|---|
| `M/intermediate.ts` | Capa anticorrupción de una sola línea: reexporta el barrel del paquete hermano por **ruta física** | `M/intermediate.ts:11` (`export * from "../../pi-intermediate/src/index.ts"`) |
| `M/memory.ts` | Store bi-temporal + FTS5 + vectores por hashing, recuperación multi-señal con decay/salience, contradicción por precedencia, progressive disclosure, flush idempotente, `replaceAll` | `M/memory.ts:139`, `:370`, `:544` |
| `M/memory-vector.ts` | Álgebra vectorial determinista pura: shingles, hashing FNV-1a, coseno (`DIM = 1024`) | `M/memory-vector.ts:8`, `:16`, `:19`, `:34` |
| `M/memory-vector-index.ts` | Índice vectorial tras el SPI: suelo exacto + ANN por SimHash, medición de recall, (de)serialización | `M/memory-vector-index.ts:12`, `:40`, `:92`, `:181`, `:186`, `:197` |
| `M/memory-spi.ts` | **SPI de backend** (`MemoryBackend`, 13 métodos obligatorios + 12 opcionales), `LocalFirstBackend`, negociación de capacidades con degradación | `M/memory-spi.ts:20-47`, `:59-159`, `:161-…` |
| `M/memory-admission.ts` | Admisión A-MAC: puntuación determinista de 5 factores antes de persistir (persist/merge/discard) | `M/memory-admission.ts:19`, `:32`, `:72`, `:103` |
| `M/memory-dma.ts` | Inyección DMAA cache-aware: PUSH estable + PULL con knapsack/MMR y marcado UNTRUSTED | `M/memory-dma.ts:28`, `:32` |
| `M/memory-signer.ts` | Firma/verificación Ed25519 de recuerdos y checkpoints | `M/memory-signer.ts:10` |
| `M/memory-control.ts` | **PMO**: fachada de acciones; compone tenant, saneo, admisión, merge, firma, journal, search+rerank, nearest, timeline, recall, consolidación con checkpoint firmado, olvido, rollback con validación de firma y de tenant | `M/memory-control.ts:37-60`, `:66-78`, `:84-107`, `:109-120`, `:122-135`, `:136-138`, `:139-157`, `:166-168`, `:171-205`, `:208-212`, `:216-…` |
| `M/memory-stack.ts` | Factoría de ensamblado: backend + embeddings + reranker + tenant desde config, con negociación y `readiness()`; crea/carga la identidad Ed25519 **en la misma DB** | `M/memory-stack.ts:19-27`, `:61-74`, `:76-90`, `:92-111`, `:113-150` |
| `M/memory-ledger.ts` | Ledger de evidencia append-only hash-enlazado, UUID v7, identidad agent→session→turn→event, redacción antes de hashear, single-writer | `M/memory-ledger.ts:11`, `:74`, `:82`, `:115`, `:217-221` |
| `M/fabric.ts` | Memoria como vista materializada síncrona del ledger: save/forget/consolidate con recibo, recall, búsqueda unificada, propuesta a CANON, `replay`, linaje Merkle, verificación; **más** un segundo servidor MCP con sus 5 tools | `M/fabric.ts:61-102`, `:105-127`, `:130-145`, `:160-170`, `:183-193`, `:196-202`, `:208-228`, `:241-249`, `:260-270`, `:280-320`, `:322-382` |
| `M/retrieval-fabric.ts` | Recuperación unificada: RRF sobre señales léxica/densa/entidad + rerank final + harness de calidad (nDCG, recall@k) | `M/retrieval-fabric.ts:12`, `:61`, `:179`, `:187`, `:209` |
| `M/memory-layers.ts` | Capas temporales L0–L3: mapeo scope↔layer, frames y working set con TTL y ventana deslizante | `M/memory-layers.ts:8`, `:11-16`, `:33` |
| `M/memory-graph.ts` | Grafo bi-temporal de nodos/aristas, Personalized PageRank, multi-hop, backfill desde recuerdos | `M/memory-graph.ts:19`, `:96`, `:128`, `:139`, `:150` |
| `M/memory-consolidate.ts` | Consolidación sleep-time determinista sin LLM: dedupe exacto + Context Tree jerárquico | `M/memory-consolidate.ts:9`, `:21` |
| `M/memory-forget.ts` | Olvido por salience con curva tipo Ebbinghaus (recencia × frecuencia × importancia) | `M/memory-forget.ts:15`, `:31` |
| `M/memory-procedural.ts` | Memoria procedural: inducción, verificación y reuso de procedimientos | `M/memory-procedural.ts:8`, `:19`, `:28` |
| `M/memory-embeddings.ts` | Familia de proveedores de embedding y rerank pluggables (hash/ONNX/HTTP/cross-encoder/remote/noop) con `EmbeddingRegistry` y readiness | `M/memory-embeddings.ts:10`, `:22`, `:46`, `:71`, `:116`, `:125`, `:143`, `:154` |
| `M/models.ts` | **Segunda** familia de modelos: `Embedder`/`Reranker`/`NliChecker` con implementaciones hash, ONNX, lazy, command y OpenAI-compatible | `M/models.ts:11`, `:18`, `:33`, `:44`, `:49`, `:60`, `:66`, `:78`, `:126`, `:165` |
| `M/remote.ts` | Adaptadores remotos HTTP con fetch inyectable y fallback determinista: embedder multi-endpoint y con cache, reranker, NLI, decider | `M/remote.ts:25`, `:78`, `:123`, `:156`, `191` |
| `M/memory-mcp.ts` | Transporte MCP cliente: JSON-RPC 2.0 con correlación/timeouts/reintentos, transporte stdio, `McpMemoryRemote` y backend espejo síncrono | `M/memory-mcp.ts:39`, `:103`, `:124`, `:150`, `:242` |
| `M/memory-mcp-server.ts` | Servidor MCP de memoria (protocolo `2024-11-05`) con recall streaming y servido por stdio | `M/memory-mcp-server.ts:13`, `:117`, `:282` |
| `M/memory-cloud.ts` | Backend SQL tras el SPI con tenancy por RLS, DDL Postgres y migraciones versionadas | `M/memory-cloud.ts:46`, `:135`, `:169`, `:213`, `:219`, `:253` |
| `M/memory-adapters.ts` | Backends MCP de terceros (Mem0/Zep-Graphiti/Supermemory/MemOS) y migración UMP firmada | `M/memory-adapters.ts:25`, `:73`, `:77` |
| `M/canon-contract.ts` | Frontera de autoridad hacia CANON: proposición con cita literal y locator, huella canónica, verificación contra clave **pineada**, `accept`/`propose` | `M/canon-contract.ts:9-28`, `:40-47`, `:50-52`, `:55-57`, `:60-64`, `:67-76` |
| `M/memory-gateway.ts` | Rutas de memoria sobre el `Gateway` canónico: recall/save/get/search/consolidate, con binding MCP en 3 de ellas | `M/memory-gateway.ts:11-98` (save en `:37-56`, llamada directa a `control.save` en `:42`) |
| `M/openai-compat.ts` | Wire OpenAI-compatible: normaliza input y delega a engines inyectables de embeddings/chat | `M/openai-compat.ts:35-36`, `:38`, `:44`, `:52`, `:70` |
| `M/memory-tool.ts` | Tool única `memory` (dispatcher de 6 acciones) con esquema compacto y contrato mínimo `MemoryActions` | `M/memory-tool.ts:11-13`, `:29-35`, `:56-58`, `:69-…` |
| `M/plane.ts` | Plano de control Pi-independiente: codex de política estable, recall con knapsack, parseo de conversación serializada, flush pre-compaction | `M/plane.ts:10-18`, `:33-46`, `:54-62`, `:65-76` |
| `M/hooks.ts` | Lógica pura de los 8 handlers de ciclo de vida del host (gates, redacción, push/pull, session_start, before_compact, shutdown) | `M/hooks.ts:44-51`, `:54-57`, `:60-62`, `:65-67`, `:70-83`, `:94-108`, `:127-139`, `:142-148` |
| `M/extension.ts` | Adaptador delgado al runtime de Pi: registra 2 tools, 2 comandos y 8 hooks; cablea sandbox por env var | `M/extension.ts:30-53`, `:56-63`, `:66-73`, `:76-79`, `:82-91`, `:94-118`, `:120-126`, `:129-142`, `:145-189` |
| `M/core.ts` | **`PiCore`**: composition root que duplica `SelectionCore` y le añade memory + stack + fabric | `M/core.ts:33-66`, `:81-91`, `:94-99`, `:102-107`, `:110-117`, `:120-129` |
| `M/memory-eval.ts`, `M/regression.ts`, `M/benchmark.ts` | Probes funcionales, coste por capa, suite adversarial, benchmarks con control de backbone y deriva frente a baseline | `M/memory-eval.ts:23`, `:45`, `:70`; `M/regression.ts:57`, `:97`, `:190`; `M/benchmark.ts:31`, `:52` |

### 1.4 `pi-account-router` — el único que se ejecuta

Cargado por Pi desde fuente vía `~/.pi/agent/settings.json` → `packages: ["npm:pi-mcp-adapter", "../../Code/PI-agent/src/pi-account-router"]`.

| Módulo | Responsabilidad real | Evidencia |
|---|---|---|
| `P/ports.ts` | Cinco puertos limpios: `EpisodeStorePort`, `ExtensionBus`, `StateStore` (transaccional + `onChange`), `Clock` (now/sleep/isProcessAlive), `CredentialResolver` | `P/ports.ts:10-24`, `:27-29`, `:31-38`, `:40-44`, `:50-56` |
| `P/domain/policy.ts` | Política pura de cuota: preparación de estado, espera por grupo, presión de grupo/ventana, próximo cambio, selección por mínima presión con desempate por rotación, parseo seguro de `Retry-After` | `P/domain/policy.ts:9-41`, `:43-56`, `:62-72`, `:75-83`, `:86-101`, `:103-148`, `:150-161` |
| `P/application/router.ts` | Caso de uso: `acquire` con lease/ticket/cola y deadline, `release`, `feedback` por status HTTP, `enable`, `recordLatency` **inerte**, `shutdown`, `status` | `P/application/router.ts:20-28`, `:30-108`, `:110-114`, `:116-138`, `:140-146`, `:148-161`, `:163-168`, `:170-232` |
| `P/extension.ts` | Composition root + adaptador Pi: provider, saneo de transcripción, 3 comandos, footer reactivo event-driven con generaciones y watcher, 5 hooks de ciclo de vida | `P/extension.ts:39-55`, `:57-74`, `:85-116`, `:119`, `:140-164`, `:174-247`, `:255-284`, `:286-352`, `:353-374`, `:375-401`, `:406-408` |
| `P/adapters/routed-streams.ts` | Transporte enrutado (664 líneas): stream/streamSimple sobre el provider gestionado | `P/adapters/routed-streams.ts` (extensión; lectura parcial) |
| `P/adapters/episode-store.ts` | **Segunda suite de memoria**, independiente de PALIMPSEST: store de episodios en fichero JSON con `EpisodeStorePort`, caps por clase de tarea y TTL | `P/adapters/episode-store.ts:144`, `:148`, `:280-288` |
| `P/adapters/*` | Estado en fichero con lockfile, catálogo de providers/modelos, credenciales, saneo de mensajes, watcher, reloj, footer | `P/adapters/file-state-store.ts`, `provider-catalog.ts`, `model-catalog.ts`, `credentials.ts`, `message-safety.ts`, `file-watcher.ts`, `system-clock.ts`, `footer-label.ts`, `episode-capture.ts`, `episode-retriever.ts` |

### 1.5 Contraste con lo que las specs prometen

Las 27 specs de `S/` son coherentes entre sí en vocabulario y en la regla de «sin LLM generativo en el camino crítico». El desajuste no es de diseño sino de **cierre**: varias requisitos nombran un mecanismo que no existe como constructo, o existe sin consumidor.

| # | Spec / requisito | Estado real | Evidencia |
|---|---|---|---|
| G1 | `S/token-economy-ring` → «CacheAligner (no romper el prefijo KV)», primer requisito | **No existe ningún constructo con ese nombre** en los tres paquetes. El comportamiento está repartido y es contradictorio: la memoria inyecta en la cola (`M/hooks.ts:70-83`) pero el router inyecta en `systemPromptOptions.sections.experience`, es decir **en el prefijo estable** (`P/extension.ts:363-369`) | grep `CacheAligner` → 0 resultados en `I/`, `M/`, `P/` |
| G2 | `S/selection-router` → «Learning loop» | `recordOutcome` está definido en dos sitios y **no tiene ningún llamador** en `src/`: el bucle de aprendizaje está abierto | `I/capability-index.ts:100`, `I/source-registry.ts:92`; grep de llamadores → solo definiciones |
| G3 | `S/selection-router` → «Descripciones por tier de modelo» | Sin implementación | grep `descriptionForTier`/`tierDescription` → 0 |
| G4 | `S/capability-index` → «Embeddings locales y versionados» y «Búsqueda multi-señal» | El índice de capacidades es **BM25-only** por decisión explícita; los embeddings y la multi-señal solo existen en el lado memoria | `I/db.ts:3` («M1 es BM25-only (suelo determinista)»), `I/capability-index.ts:85-98` |
| G5 | `S/mcp-source-federation` → «Gateway con proxy perezoso» | No hay proxy perezoso de MCP en `pi-intermediate` | grep `lazy`/`proxy` en `I/*.ts` → 0 |
| G6 | `S/verification-evaluation` → revisión adversarial obligatoria, evaluación preregistrada, política two-key You.com | **No implementada en `src/` de ningún paquete** | grep `you.com`/`preregister`/`adversarial review` → 0 |
| G7 | `S/api-gateway` y `S/api-openai-compat` | Implementadas, pero **físicamente dentro del paquete de memoria**, no en el paquete que posee `Gateway` y el contrato | `M/memory-gateway.ts:11-98`, `M/openai-compat.ts:70`; el motor está en `I/gateway.ts:84-190` |
| G8 | `S/memory-runtime` → «Frontera de paquete única (anti-corrupción)» | Cumplido en forma (una sola línea de ACL) pero la línea resuelve por **layout físico**, no por nombre de dependencia declarado | `M/intermediate.ts:11` vs `src/pi-memory/package.json` → `"@pi-agent/intermediate": "file:../pi-intermediate"`; coincide con `D/08-delta-recomendado.md` D11 y `D/09-evidencia-delta.md:45` (V11) |
| G9 | `S/memory-fabric` → «Event ledger como sistema de registro» | El ledger existe y es correcto en forma, pero **no es el único escritor**: hay cuatro caminos de mutación, uno de ellos directo al store | ver §3.3 y H-07 |
| G10 | `S/hard-gates` → «Un fallo del gate SHALL resultar en bloqueo» | `failClosed` cumple (`I/hard-gates.ts:75-82`), pero el gate **solo conoce tres nombres de tool** y todo lo demás se permite | `I/hard-gates.ts:68-72` |

---

## 2. Fronteras de los tres anillos

### 2.1 Criterio aplicado

Tres reglas, en este orden de precedencia:

1. **Dependencia unidireccional 2 → 1 → 0.** El anillo N puede importar del N−1; nunca al revés. Cero ciclos, ni por barrel ni por tipo.
2. **INV-10 del dossier** (`D/05-arquitectura-propuesta.md:9` y `D/08-delta-recomendado.md` §1): el anillo-0 **no es un producto nuevo**. Es lo que ya existe, destilado. Si un módulo exige escribir lógica nueva para caber en el anillo-0, no es anillo-0: está mal clasificado.
3. **Pureza como test de pertenencia al anillo-0.** Un módulo es anillo-0 si es ejecutable sin red, sin filesystem, sin procesos hijo, sin reloj del sistema y sin base de datos. Todo lo que hace I/O es anillo-2. Todo lo que orquesta, expone o compone es anillo-1.

Corolario importante: **el ciclo de turno NO entra en el anillo-0.** El ciclo de turno es del host (`@earendil-works/pi-coding-agent`), que ya lo posee y ya lo ejecuta (`P/extension.ts:353-401`, `M/extension.ts:145-189`). Poner un loop propio en el anillo-0 sería exactamente el «otro kernel» que INV-10 prohíbe. El anillo-0 expone **puntos de decisión** que el host consulta; no un bucle que el host obedezca.

### 2.2 Diagrama de fronteras

```text
╔══════════════════════════════════════════════════════════════════════════════╗
║  ANILLO-2 · CONNECTIONS          (todo lo que toca el mundo exterior)         ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  Almacenamiento   I/db.ts (SQLite+migraciones) · P/adapters/file-state-store  ║
║                   P/adapters/episode-store · M/memory-cloud (SQL/RLS)        ║
║  Repositorios     I/capability-index · I/source-registry · I/config          ║
║                   M/memory (MemoryStore) · M/memory-ledger (LedgerStore)     ║
║  OS / aislamiento I/sandbox.ts → Bwrap·Seatbelt·Srt·Gondolin (spawnSync)      ║
║                   I/bash-ops.ts (streaming de procesos)                      ║
║  Red / transporte M/memory-mcp (stdio) · M/memory-mcp-server · M/remote      ║
║                   I/ingest.ts → HttpCatalogFetcher · GitRepoFetcher          ║
║                   P/adapters/routed-streams · P/adapters/credentials         ║
║  Custodia         I/keystore (persistido) · M/memory-signer (material)       ║
║  Host             M/extension.ts · P/extension.ts (adaptadores de Pi)        ║
║  Reloj            P/adapters/system-clock                                    ║
╚═══════════════════════════════════▲══════════════════════════════════════════╝
                                    │ implementa los puertos del anillo-0
                                    │ (nunca al revés)
╔═══════════════════════════════════╧══════════════════════════════════════════╗
║  ANILLO-1 · GATEWAY / SELECTION PLANE   (orquesta, compone, expone)           ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  Selección        I/router.ts (2 etapas, escape hatch, explain, materialize) ║
║  Gobierno         I/governance.ts (orquestación de decisión + journal)       ║
║                   I/core.ts → SelectionCore (composition root, cuotas)       ║
║  Economía         I/token-ring.ts → TokenRing (fachada + governor)           ║
║                   I/reliability.ts → SLA/breakers/modo degradado             ║
║  Federación       I/ingest.ts → IngestPipeline (orquestación, no fetchers)   ║
║  Exposición       I/gateway.ts (rutas→OpenAPI 3.1→tools MCP)                 ║
║                   M/memory-gateway.ts · M/openai-compat.ts · M/memory-tool   ║
║  Composición      M/memory-stack.ts · M/fabric.ts · M/core.ts (solo cableado)║
║  Evaluación       I/eval.ts · M/memory-eval.ts · M/regression.ts             ║
╚═══════════════════════════════════▲══════════════════════════════════════════╝
                                    │ importa solo tipos y funciones puras
╔═══════════════════════════════════╧══════════════════════════════════════════╗
║  ANILLO-0 · KERNEL   (puro, determinista, cero I/O, cero deps)                ║
║  ─────────────────────────────────────────────────────────────────────────── ║
║  Contrato         I/contract.ts (SCHEMAS, validate, ApiError, Page, Idem)    ║
║  Tipos            I/types.ts · I/events.ts (envelope + encoding determinista)║
║  Autoridad        I/provenance.ts (sha256, Ed25519, canonicalOf)             ║
║                   M/canon-contract.ts (verificación contra clave pineada)    ║
║  Gates            I/hard-gates.ts (regex + failClosed)                       ║
║                   I/sandbox.ts → solo SandboxProvider SPI + ExecutionGate    ║
║  Política         I/governance.ts → solo allowed() + sanitize()/redact()     ║
║  Confianza        I/trust.ts · I/grade.ts                                    ║
║  Álgebra tokens   I/token-ring.ts → todo salvo la fachada TokenRing          ║
║  Cripto           I/keystore.ts (lógica de revocación, no el almacén)        ║
║  Fiabilidad pura  I/reliability.ts → CircuitBreaker, checkSla, conservative  ║
║  Memoria (álgebra) M/memory-admission · memory-forget · memory-consolidate   ║
║                   memory-vector · memory-vector-index · retrieval-fabric     ║
║                   memory-graph (PPR) · memory-layers · memory-dma            ║
║  PUERTOS          StorePort · RepositoryPort · SandboxProvider · MemoryBackend║
║                   Clock · CredentialResolver · JournalPort · ContextBudgetPort║
╚══════════════════════════════════════════════════════════════════════════════╝

         ┌──────────────────────────────────────────────────────┐
         │  M · MEMORIA — pieza transversal de rango propio     │
         │  (ver §3). Atraviesa los tres anillos por puertos,   │
         │  no se aloja en ninguno.                             │
         └──────────────────────────────────────────────────────┘
```

### 2.3 Justificación módulo a módulo de las colocaciones no obvias

**`I/contract.ts` → anillo-0.** Es la única fuente de verdad declarada (`I/contract.ts:3-9`) y no tiene dependencias. El gateway deriva OpenAPI y MCP *desde* él (`I/gateway.ts:142-178`, `:181-190`), así que el contrato debe estar estrictamente por debajo del gateway. Si viviera en anillo-1, el anillo-2 (que serializa) no podría validar sin subir de anillo.

**`I/hard-gates.ts` → anillo-0 íntegro.** Son funciones puras de decisión sobre strings (`:55-61`, `:63-66`, `:68-72`) con un envoltorio fail-closed (`:75-82`). No hay ningún motivo para que un gate esté por encima del punto donde se decide. Además es el único módulo cuyo fallo debe bloquear aunque todo lo demás esté caído: pertenecer al anillo-0 le da esa independencia estructural.

**`I/sandbox.ts` → partido en dos.** El SPI (`:37-45`), `ExecDecision` (`:47-51`) y `ExecutionGate.decide` (`:356-372`) son anillo-0: son la *política*. Los cuatro proveedores (`:63-93`, `:100-120`, `:175-217`, `:258-285`) hacen `spawnSync` y `which`, escriben ficheros de settings (`:205`) y montan filesystems (`:233-252`): son anillo-2. Los perfiles deterministas `seatbeltProfile` (`:323-342`), `srtSettings` (`:138-154`) y `gondolinArgs` (`:233-252`) son **funciones puras que devuelven datos**, así que van a anillo-0: son la parte verificable sin ejecutar nada, que es justo lo que el dossier pide certificar (`D/08-delta-recomendado.md` D10).

**`I/token-ring.ts` → partido en dos.** Todo es puro salvo la fachada `TokenRing` (`:636-683`), que mantiene estado mutable (`CCR` en `:107`, `TokenGovernor` en `:236`) y lee configuración. La fachada es anillo-1; las 14 funciones y 4 clases restantes son anillo-0. Consecuencia útil: el knapsack exacto (`:161-196`), la máscara de contenido sagrado (`:259-286`) y el probe de preservación (`:411-416`) quedan disponibles para la memoria sin que la memoria importe el anillo-1.

**`I/db.ts` → anillo-2.** Es un adaptador a `node:sqlite`. Pero contiene el esquema de *todo* el ecosistema, incluidas las tablas de memoria (`:58-82`) y las migraciones de grafo, checkpoints, ledger y vectores (`:118-136`, `:151-161`, `:174-195`, `:208-217`). El **esquema como contrato** (qué tablas y columnas existen) debe subir a anillo-0 como declaración; el **ejecutor** (abrir, migrar, rodar DDL) se queda en anillo-2. Ver H-03.

**`I/governance.ts` → partido en dos.** `allowed()` (`:48-56`) y `sanitize()`/`redact()`/`detectInjection()` (`:32-40`, `:58-60`) son puros → anillo-0. `journal()` (`:62-72`) y `lastHash()` (`:74-78`) escriben y leen la tabla `journal` → anillo-2 tras un `JournalPort` declarado en anillo-0.

**`I/core.ts` y `M/core.ts` → anillo-1, y solo el cableado.** Las reglas de negocio que contienen (cuotas anti-gaming `I/core.ts:71-81`, decisión de ejecución `:92-97`, alerta de dominancia `:110-119`) son puras y bajan a anillo-0. Lo que queda en anillo-1 es el constructor (`:42-56`).

**`P/domain/policy.ts` → anillo-0.** Es el mejor ejemplo del repo de lo que significa anillo-0: política pura, inyectable, con `now` y `alive` como parámetros (`:9-14`), sin I/O. Ya está separado de su adaptador (`P/adapters/file-state-store.ts`) por un puerto (`P/ports.ts:31-38`). No se toca.

**`P/application/router.ts` → anillo-1.** Caso de uso que orquesta puertos. Ya está donde debe.

**`I/ingest.ts` → partido.** Los parsers (`:31-78`) son puros → anillo-0. Los cuatro fetchers hacen filesystem/red/`git clone` → anillo-2. `IngestPipeline` (`:170-216`) orquesta → anillo-1.

---

## 3. Veredicto sobre la suite de memoria

### 3.1 Las tres opciones y su coste

```text
OPCIÓN A — Memoria dentro de anillo-2 (un conector más)
  anillo-1 ──depende de──► anillo-2 (MemoryBackend, MemoryControl, MemoryStore)
  ✗ Invierte la dirección: el gateway de memoria (M/memory-gateway.ts:11) y la tool
    (M/memory-tool.ts) son superficie de anillo-1 y necesitarían importar anillo-2.
  ✗ El anillo-2 pasaría a contener política de admisión (M/memory-admission.ts:103)
    y firma de provenance (M/memory-signer.ts:10), que son autoridad, no transporte.

OPCIÓN B — Memoria dentro de anillo-1 (una capacidad del selection plane)
  anillo-1 = selección + gobierno + exposición + MEMORIA
  ✗ Ciclo: M/core.ts:33-66 (PiCore) compone SelectionCore Y la pila de memoria.
    Si ambos viven en el mismo anillo, la composición deja de tener dirección.
  ✗ El anillo-1 heredaría node:sqlite, HTTP de embeddings (M/memory-embeddings.ts),
    stdio MCP (M/memory-mcp.ts:124) y SQL Postgres (M/memory-cloud.ts:46).
  ✗ Rompería la misión declarada del intermediate: «Sin capa de memoria»
    (I/index.ts:5) y «Memory (belongs to @pi-agent/memory)» (I/docs/ARCHITECTURE.md:13).

OPCIÓN C — Pieza transversal de rango propio  ◄── RECOMENDADA
  M consume anillo-0 por puertos · expone su superficie por anillo-1 ·
  persiste y se transporta por anillo-2 · y NINGÚN anillo depende de M.
```

### 3.2 Recomendación: **Opción C — transversal, rango propio**

Cuatro razones, en el orden en que el encargo las pide.

**(1) Dependencia.** La memoria ya es, hoy, un consumidor del núcleo y no al revés: `M/core.ts:6-19` importa diez símbolos del intermediate y `M/fabric.ts:17-18` importa `Governance`, `redact` y `sha256`. La dirección real del grafo es `M → I`. Si M se aloja en un anillo, ese anillo tiene que estar **por encima** de todo lo que M importa, y M importa cosas de los tres niveles: álgebra pura (`I/token-ring.ts:161` vía `M/plane.ts:7,41`), orquestación (`I/governance.ts`) y almacenamiento (`node:sqlite` vía `I/db.ts`). Ningún anillo único satisface eso sin invertir alguna flecha. En cambio, como pieza transversal, M se limita a **consumir puertos** del anillo-0 (`MemoryBackend` ya lo es: `M/memory-spi.ts:20-47`) y a **registrar rutas** en el anillo-1 (`M/memory-gateway.ts:11` ya devuelve `Route[]` del contrato canónico). Las dos costuras ya existen con la forma correcta; no hay que inventarlas.

**(2) Ciclo de vida.** Es la razón decisiva. La consolidación sleep-time y el olvido **no ocurren dentro del turno**:
- `M/memory-consolidate.ts:3` declara explícitamente «fuera del turno»;
- `M/memory-control.ts:171-205` hace snapshot + checkpoint firmado + poda, una operación larga y transaccional;
- `M/memory-forget.ts:31` borra por salience;
- `M/hooks.ts:142-148` lo dispara en `session_shutdown`, y `M/hooks.ts:127-139` en `session_before_compact`.

El anillo-0 y el anillo-1 son, los dos, **de ámbito por petición**: el governor de tokens se construye con un presupuesto por turno (`I/core.ts:50-53`), el gateway atiende una petición y devuelve (`I/gateway.ts:113-140`), el tracing es por `traceId` (`I/reliability.ts:172-…`). Una pieza con reloj propio, que muta estado durable cuando nadie pide nada, no puede ser submódulo de un anillo por-petición sin arrastrar un planificador al kernel. Como rango propio, M declara su propio trigger (`session_shutdown`, `before_compact`, o un cron futuro) sin contaminar la semántica de los anillos.

**(3) Coste de tokens.** La memoria es simultáneamente la mayor *consumidora* y la mayor *productora* de presupuesto:
- produce el PUSH estable de ~5 líneas que entra en el prefijo cacheado (`M/plane.ts:10-18`, inyectado en `M/hooks.ts:65-67`);
- produce el PULL volátil con knapsack de presupuesto por defecto 800 (`M/plane.ts:34`, `M/hooks.ts:76`);
- consume esquema de tool en cada turno (`M/memory-tool.ts:56-58` mide su propio coste);
- consume embeddings y rerank, que son tokens de red (`M/memory-stack.ts:118-129`).

Si M vive dentro del anillo-1, el `TokenGovernor` (`I/token-ring.ts:235-253`) y su mayor cliente están en la misma frontera: el presupuesto se negocia en privado y la atribución por capa (`report()` en `:250-252`) deja de ser auditable desde fuera. Como pieza transversal, M **pide** presupuesto a través de un `ContextBudgetPort` del anillo-0, y cada inyección queda contada en el governor con su capa. Esto además cierra estructuralmente la clase de defecto que el dossier documenta en D07 (`D/08-delta-recomendado.md`: se empaqueta con un coste y se emite otro).

**(4) Evidencia de que el rango propio ya es el estado de hecho.** El esquema físico de la memoria **no vive en el paquete de memoria**: las tablas `memories` y `memories_fts` están en `I/db.ts:58-82`, y las migraciones 1.2.0 (grafo), 1.3.0 (checkpoints), 1.4.0 (`event_ledger`) y 1.5.0 (vectores) en `I/db.ts:118-136`, `:151-161`, `:174-195`, `:208-217`. Los schemas canónicos `MemoryRecord` y `RecallResult` están en `I/contract.ts:92-111` y `:112-123`. Y sin embargo `I/index.ts:5` declara «Sin capa de memoria». Esa contradicción no se resuelve moviendo la memoria a un anillo: se resuelve reconociendo que **el contrato y el esquema son del anillo-0, y el escritor es de M**. Que es exactamente la definición de pieza transversal.

### 3.3 Condición no negociable si se adopta C

Un rango propio solo es defendible con **una única frontera de escritura**. Hoy hay cuatro:

```text
HOY — cuatro escritores, un solo estado

  tool Pi ─────────► M/fabric.ts:105  save()  ─► control ─► backend  + ledger (:108)
  gateway /memory/save ─► M/memory-gateway.ts:42  control.save() ─────► backend   (sin ledger)
  hook session_start ───► M/hooks.ts:100  reconstructSession(control,…) ► backend (sin ledger)
  flush pre-compact ────► M/plane.ts:74  core.memory.flush() ──────────► store    (sin control, sin ledger)

  Consecuencia: M/fabric.ts:208-228 (replay) solo conoce memory.save y memory.forget,
  y termina en store.replaceAll() (:227) → reconstruye un estado que nunca existió.
```

Regla: **toda mutación durable pasa por el servicio de comandos de la fabric**; el ledger se apenda **antes** de actualizar la vista, no después (hoy el orden es `M/fabric.ts:106` → `:108`). Es el D01/D03/D04 del dossier (`D/08-delta-recomendado.md` §3), y es prerequisito de la extracción, no consecuencia: mover cuatro escritores a tres anillos distintos los hace cuatro veces más difíciles de reconciliar.

---

## 4. Qué se copia, qué se adapta, qué se descarta

### 4.1 Se copia TAL CUAL (12 piezas — ya cumplen el criterio de su anillo)

| Pieza | Destino | Razón |
|---|---|---|
| `I/contract.ts` | anillo-0 | Cero deps, determinista, ya es la fuente de verdad declarada (`:3-9`) |
| `I/types.ts`, `I/events.ts` | anillo-0 | Tipos y envelope puro con encoding estable (`I/events.ts:75-77`) |
| `I/trust.ts`, `I/grade.ts` | anillo-0 | Álgebra pura de 27 y 33 líneas; sin I/O |
| `I/provenance.ts` | anillo-0 | Primitivas criptográficas sobre `node:crypto` |
| `I/hard-gates.ts` | anillo-0 | Funciones puras + `failClosed` (`:75-82`) |
| `I/reliability.ts` (SLA + breakers) | anillo-0 | `checkSla`, `CircuitBreaker`, `routerMode` son puros; el suelo BM25-only (`:153-156`) es exactamente la degradación que un kernel debe garantizar |
| `I/token-ring.ts` (todo salvo `TokenRing`) | anillo-0 | Incluido el knapsack exacto con matriz `take` (`:161-196`), que el dossier manda conservar (`D/08` §1) |
| `I/sandbox.ts` (SPI + perfiles + `ExecutionGate`) | anillo-0 | `seatbeltProfile`/`srtSettings`/`gondolinArgs` son traducciones puras política→datos |
| `P/ports.ts` | anillo-0 | Los cinco puertos mejor diseñados del repo; promoverlos a puertos canónicos |
| `P/domain/policy.ts` | anillo-0 | Política pura con reloj y liveness inyectados (`:9-14`) |
| `M/memory-spi.ts` (interfaz + `negotiate`) | anillo-0 | `MemoryBackend` (`:20-47`) es el puerto de almacenamiento más completo que existe aquí |
| `M/canon-contract.ts`, `M/memory-admission.ts`, `M/memory-forget.ts`, `M/memory-consolidate.ts`, `M/memory-vector*.ts`, `M/retrieval-fabric.ts` (RRF/nDCG), `M/memory-graph.ts` (PPR), `M/memory-layers.ts`, `M/memory-dma.ts` | anillo-0 | Álgebra y autoridad puras; son el activo más valioso de PALIMPSEST |

### 4.2 Se ADAPTA (cambio de forma, no de misión)

| Pieza | Adaptación | Razón |
|---|---|---|
| `I/db.ts` | Separar el **esquema como declaración** (anillo-0) del **ejecutor/migrador** (anillo-2) | Hoy un mismo fichero es contrato y adaptador (`:7-93` vs `:283-288`) |
| `I/governance.ts` | `journal()` tras un `JournalPort` | Escribe en la misma DB que audita (`:62-72`) |
| `I/core.ts` + `M/core.ts` | Un solo composition root en anillo-1; las reglas (cuotas, dominancia, decisión de ejecución) bajan a anillo-0 como funciones puras | `M/core.ts:81-129` es copia literal de `I/core.ts:71-119` |
| `I/sandbox.ts` proveedores | `available()` deja de sondear el sistema (`which`, `:67`, `:105`, `:181`, `:263`) y pasa a ser una capacidad **declarada** por el anillo-2 | Si no, el anillo-0 depende de un hecho de I/O para decidir |
| `I/capability-index.ts`, `I/source-registry.ts`, `I/config.ts` | Extraer interfaz de repositorio a anillo-0; la implementación SQLite a anillo-2 | Son adaptadores con SQL incrustado (`I/capability-index.ts:59-71`, `:88-96`) |
| `I/gateway.ts` | Corregir `tracer.record(operationId, 0, 0)` (`:134`) para que atribuya tokens reales, y no devolver siempre 200 (`:135`) | El tracing por operación es nominal tal como está |
| `I/contract.ts` `validateNode` | Resolver `$ref` en lugar de ignorarlo (`:247`) | Hoy `RouteResult.selected[].capability` no se valida nunca |
| `I/hard-gates.ts` `gateToolCall` | Normalizar vocabulario antes de decidir, y decidir sobre operaciones semánticas | Solo reconoce `bash`/`edit`/`write` y lee `input.command`/`input.path` (`:68-71`); es el V08 del dossier |
| `M/memory-stack.ts` `loadOrCreateSigner` | El material privado sale de la DB editable y entra por un `KeyCustodyPort` | Hoy el PEM privado se guarda en `meta` de la misma DB que firma (`:20`, `:24`); es el D05.4 del dossier |
| `M/fabric.ts` `save`/`replay` | Ledger antes que vista; replay completo o inhabilitado | `:106`→`:108` y `:208-227` |
| `M/canon-contract.ts` `canonical` | Incluir `confidence` y `locator.payload` en la huella firmada | Hoy quedan fuera (`:50-52`); es el V04/D05.3 del dossier |
| `M/memory-control.ts` `get`/`forget` | Aplicar ámbito de tenant antes de delegar | `:136-138` y `:162-164` delegan sin comprobar scope, mientras `nearest` sí lo hace (`:149`); es el D02 del dossier |
| `I/ingest.ts` `GitRepoFetcher` | Propagar el fallo en lugar de devolver `[]` | `:158-160` convierte un error de red/git en «fuente vacía» |
| `M/intermediate.ts` | Sustituir la ruta física por el entrypoint público declarado | `:11` vs la dependencia `file:../pi-intermediate`; es el D11 del dossier |
| `P/extension.ts` `before_agent_start` | Mover la inyección de episodios del prefijo estable a la cola | `:363-369` rompe el requisito CacheAligner de `S/token-economy-ring` |

### 4.3 Se DESCARTA (con razón)

| Pieza | Razón del descarte |
|---|---|
| `M/core.ts` clase `PiCore` (`:33-134`) | Duplicado literal de `SelectionCore`. Mantenerlo crea **dos** composition roots con cuotas, dominancia y decisión de ejecución idénticas (`M/core.ts:81-129` ≡ `I/core.ts:71-119`). Se conserva el cableado de memoria (`:60`, `:63-65`) dentro del root único; la clase desaparece. |
| `M/models.ts` completo (206 líneas) | Segunda jerarquía paralela de `Embedder`/`Reranker`/`NliChecker` (`:11`, `:44`, `:60`) que **no es la que cablea la pila**: `M/memory-stack.ts:10-13,61-111` usa exclusivamente `M/memory-embeddings.ts`. Doble fuente de verdad sobre qué proveedor está activo. Se descarta `models.ts` y se conserva `memory-embeddings.ts`; si `NliChecker` hace falta, se migra esa interfaz (33 líneas) al paquete vivo. |
| `M/remote.ts` (235 líneas) | Mismo problema: `MultiEndpointEmbedder`/`CachedEmbedder`/`RemoteReranker`/`RemoteNli`/`RemoteDecider` (`:25`, `:78`, `:123`, `:156`, `:191`) solapan `M/memory-embeddings.ts`, que ya tiene `HttpEmbedding` y `RemoteReranker` y es lo que el stack selecciona. El índice de `M/index.ts:44-45` tiene que desambiguar `RemoteReranker`/`Reranker` a mano, síntoma de la colisión. |
| Uno de los dos servidores MCP | `M/memory-mcp-server.ts:13` declara `MCP_PROTOCOL_VERSION = "2024-11-05"` y `M/fabric.ts:323` declara `PROTOCOL_VERSION = "2026-09-28"`. Dos servidores, dos versiones de protocolo, dos catálogos de tools (`M/fabric.ts:280-320` vs `M/memory-mcp-server.ts:15`). Se conserva el de la fabric (está sobre el ledger, que es el sistema de registro) y se descarta el otro. |
| `M/fabric.ts:370-377` (tool `memory_fabric_propose`) | No propone nada: construye la proposición y devuelve `{ proposed: true, note: "async: use fabric.propose() for the sealed result" }`. Es una tool que anuncia un efecto que no produce. O se cablea al `propose` real (`:196-202`) o se retira del catálogo. |
| `I/keystore.ts` como autoridad (`:13-41`) | Claves públicas y revocaciones en un `Map`/`Set` en memoria (`:14-15`): un proceso que reinicia **olvida todas las revocaciones** y acepta firmas de claves revocadas. La lógica de verificación (`:36-40`) se conserva en anillo-0; el almacén pasa a anillo-2 con persistencia. |
| `I/core.ts:105` (`"[direct execution]"`) | `execCommand` devuelve `{ ok: true, output: "[direct execution]" }` cuando la capacidad no está en cuarentena: **fabrica un resultado de éxito sin ejecutar nada**. Es un stub que parece un efecto. Se descarta; el camino real es `I/bash-ops.ts:76-149`. |
| `I/contract.ts:363-376` `IdempotencyStore` | `Map` sin TTL ni cota (`:364`): crece indefinidamente en un proceso largo y pierde toda idempotencia al reiniciar. Se conserva la interfaz, se descarta la implementación en memoria como almacén de producción. |
| `I/token-ring.ts:106-122` `CCR` | Cache reversible en `Map` en memoria (`:107`). La «compresión reversible» deja de serlo en cuanto el proceso reinicia: el `ccrId` queda colgando en el contexto. O se persiste en anillo-2 o se renombra a lo que es (cache volátil de sesión). |
| `S/verification-evaluation` (spec completa) | Cuatro requisitos (revisión adversarial obligatoria, evaluación preregistrada, política two-key You.com) **sin una sola línea de implementación** en los tres paquetes. Una spec sin código no es una capacidad: o se retira de `openspec/specs/` o se marca explícitamente no implementada. Dejarla activa es lo que produce el 72 % de código sin consumidor. |
| `I/token-ring.ts:555-626` `PromptFoundry`/`gepaBatch` | No se descarta el código, se descarta **del camino de turno**: es optimización offline con promoción/rollback (`:568-597`). Debe quedar fuera de cualquier composición que atienda una petición, y el dossier ya lo trata como batch offline (`:610`). |
| `I/token-ring.ts:345-374` Caveman en modo automático | Ya es opt-in por comando (`M/extension.ts:129-142`) y el dossier valida conservar esa condición (`D/08` D07). Se descarta cualquier uso no opt-in: el probe mide preservación **léxica** (`:411-416`), no semántica (V06). |

---

## 5. Contratos entre anillos

### 5.1 Puertos que YA sirven (no inventar sustitutos)

| Puerto | Ubicación | Cubre | Estado |
|---|---|---|---|
| `MemoryBackend` | `M/memory-spi.ts:20-47` | anillo-0 ↔ anillo-2 (almacenamiento de memoria) | **Sirve.** 13 métodos obligatorios + 12 opcionales, con `capabilities()` (`:22`) y `negotiate()` para degradación declarada. Ya tiene 4 implementaciones: `LocalFirstBackend` (`:59`), `CloudBackend` (`M/memory-cloud.ts:46`), `McpBackend` (`M/memory-adapters.ts:25`), `MirrorMcpBackend` (`M/memory-mcp.ts:242`) |
| `SandboxProvider` | `I/sandbox.ts:37-45` | anillo-0 ↔ anillo-2 (aislamiento) | **Sirve.** Con `invocation()` determinista (`:42`) y `supports()` para fail-closed de política (`:44`). Cuatro implementaciones reales |
| `contract.ts` | `I/contract.ts:34-225`, `:286-290`, `:303-332`, `:336-359` | contrato canónico de los tres anillos | **Sirve** con dos correcciones: resolver `$ref` (`:247`) y acotar `IdempotencyStore` (`:363-376`) |
| `gateway.ts` `Route` | `I/gateway.ts:44-54` | anillo-1 ↔ mundo (OpenAPI + MCP derivados de la misma ruta) | **Sirve.** Es el contrato de exposición correcto: una ruta → un `operationId` → un schema de request/response → un binding MCP opcional. La derivación (`:142-178`, `:181-190`) evita la doble fuente de verdad |
| `StateStore` / `Clock` / `CredentialResolver` / `EpisodeStorePort` / `ExtensionBus` | `P/ports.ts:31-38`, `:40-44`, `:50-56`, `:10-24`, `:27-29` | anillo-0 ↔ anillo-2 (estado, tiempo, credenciales, memoria episódica, bus) | **Sirven y son el modelo a seguir.** `Clock` inyecta `now`/`sleep`/`isProcessAlive`, que es exactamente lo que necesita la política pura de `P/domain/policy.ts:9-14` |
| `MemoryActions` | `M/memory-tool.ts:29-35` | anillo-1 ↔ M (superficie mínima de la tool) | **Sirve.** Seis métodos, ningún tipo de transporte. Es el puerto estrecho que D01 pide |
| `CanonClient` | `M/canon-contract.ts:40-77` | M ↔ autoridad externa de verdad | **Sirve en forma**, con la corrección de `canonical()` (`:50-52`) |
| `BashOperationsLike` | `I/bash-ops.ts:21-27` | anillo-2 ↔ host | **Sirve.** Tipado estructural deliberado para no importar el SDK del host (`:6-7`) |

### 5.2 Puertos que FALTAN

| Puerto ausente | Entre qué anillos | Qué sustituye hoy | Por qué es imprescindible |
|---|---|---|---|
| `SchemaPort` / declaración de esquema en anillo-0 | 0 ↔ 2 | `I/db.ts:7-93` incrustado en el adaptador | Sin él, el anillo-2 es dueño del contrato de datos. Es la causa raíz de que las tablas de memoria vivan en `pi-intermediate` (§3.2 razón 4) |
| `CapabilityRepository` / `SourceRepository` / `ConfigPort` | 0 ↔ 2 | `I/capability-index.ts`, `I/source-registry.ts`, `I/config.ts` (SQL directo) | Hoy el anillo-1 no puede decidir nada sin SQLite. Bloquea cualquier backend alternativo y acopla selección a un motor concreto |
| `JournalPort` (evidencia) | 0 ↔ 2 | `I/governance.ts:62-72` y `M/memory-ledger.ts:115` por separado | Hay **dos** mecanismos hash-chained independientes (`journal` en `I/`, `event_ledger` en `M/`) con dos tablas distintas (`I/db.ts:43-50` y `:174-195`). Un solo puerto de evidencia evita la doble fuente de verdad sobre «qué pasó» |
| `ContextBudgetPort` | 0 ↔ M | `M/plane.ts:34` (800 hardcodeado) y `M/hooks.ts:76` (lee config) | Es el puerto que hace auditable el coste de tokens de la memoria desde fuera (§3.2 razón 3). Sin él, el governor (`I/token-ring.ts:235-253`) no ve la mayor inyección del sistema |
| `KeyCustodyPort` | 0 ↔ 2 | `I/keystore.ts:14-15` (Map) y `M/memory-stack.ts:20-24` (PEM en `meta`) | Autoridad de firma y revocación con persistencia y custodia fuera del almacén que firma. Es el D05.4 del dossier |
| `TurnContextPort` / adaptador de host | 1 ↔ 2 (host) | `M/extension.ts:8-28` y `P/extension.ts:4-8` importan tipos concretos de `@earendil-works/pi-coding-agent` | Hoy la portabilidad a otro runtime exige reescribir los dos `extension.ts`. `M/hooks.ts` ya demuestra el patrón correcto (lógica pura fuera del runtime, `:3-5`); falta el puerto que lo formalice |
| `MemoryCommandPort` (frontera única de escritura) | M interno, expuesto a 1 | cuatro escritores (§3.3) | Prerequisito de la extracción. Sin él, `replay` (`M/fabric.ts:208-228`) es destructivo sobre un historial incompleto |
| `VocabularyPort` (normalización de tools) | 1 ↔ 2 | `I/hard-gates.ts:68-72` decide sobre nombres crudos | Un gate que solo entiende `bash`/`edit`/`write` permite por omisión (`:71`) cualquier otro nombre. Es el V08/D09 del dossier |

---

## 6. Riesgos arquitectónicos de la extracción

Numerados como hallazgos, con severidad. **CRÍTICA** = puede producir un resultado falso presentado como correcto, o perder un control de seguridad. **ALTA** = rompe una invariante declarada. **MEDIA** = deuda que la extracción agrava.

---

### H-01 · CRÍTICA — Los gates solo existen donde el host los cablea, y el único paquete que se ejecuta no los cablea

`I/hard-gates.ts` y su envoltorio fail-closed (`:75-82`) solo se invocan desde `M/hooks.ts:44-57`, que solo se registra en `M/extension.ts:56-73`. `P/extension.ts` —el paquete que Pi carga realmente vía `~/.pi/agent/settings.json`— **no registra ningún gate**: no hay `tool_call` ni `user_bash` en sus cinco hooks (`:119`, `:353`, `:375`, `:388`, `:393`).

**Riesgo en la extracción:** al repartir gates en anillo-0 y adaptadores de host en anillo-2, la existencia del gate queda garantizada por el kernel pero su **ejecución** sigue dependiendo de que cada adaptador lo registre. La extracción puede dar la apariencia de «gates en el kernel, siempre activos» cuando el único runtime vivo no los llama. Es exactamente el aviso del dossier: «no presentar la extensión in-process como si ya fuera esa autoridad» (`D/08-delta-recomendado.md` D09).

**Mitigación:** el adaptador de host declara cobertura por canal y la extracción no se da por cerrada mientras exista un adaptador sin gates registrados. Prueba: `tool_call`/`user_bash`/MCP/subagente tienen pruebas separadas.

---

### H-02 · CRÍTICA — `gateToolCall` permite por omisión y decide sobre vocabulario sin normalizar

```ts
// I/hard-gates.ts:68-72
export function gateToolCall(toolName: string, input: Record<string, unknown>): GateDecision {
  if (toolName === "bash") return gateBash(String(input.command ?? ""));
  if (toolName === "edit" || toolName === "write") return gateWritePath(String(input.path ?? ""));
  return { allow: true };
}
```

Tres nombres reconocidos; todo lo demás, permitido. Y los dos que reconoce leen `input.command` y `input.path`, que no es el vocabulario universal del host (otros runtimes usan `file_path`). Un `write` con `file_path` pasa por `gateWritePath("")` → `{ allow: true }` (`:63-66`), es decir: **la protección de rutas no se aplica y no se denuncia**.

**Riesgo en la extracción:** un gate de anillo-0 con semántica «allow by default» convierte el anillo-0 en un sello de garantía que no garantiza. Al promocionarlo a kernel se amplía su superficie de confianza sin ampliar su cobertura.

**Mitigación:** `VocabularyPort` (§5.2) + decisión sobre operaciones semánticas, no sobre nombres. Fallo de normalización → bloqueo, no permiso.

---

### H-03 · CRÍTICA — Un solo fichero de anillo-2 es dueño del esquema de los tres anillos y de la memoria

`I/db.ts:7-93` crea, en una misma base: `sources`, `capabilities`, `capabilities_fts`, `journal`, `source_stats`, **`memories`**, **`memories_fts`**, `meta`, `schema_migrations`. Las migraciones añaden **`memory_nodes`/`memory_edges`** (`:118-136`), **`memory_checkpoints`** (`:151-161`), **`event_ledger`** (`:174-195`) y **`memory_vectors`** (`:208-217`). Todo ello en el paquete cuya cabecera dice «Sin capa de memoria» (`I/index.ts:5`).

**Riesgo en la extracción:** es la **doble fuente de verdad estructural** del sistema. Si el anillo-2 posee el DDL y el anillo-0/M poseen la semántica, cualquier cambio de modelo exige coordinar dos propietarios que hoy son el mismo fichero. Y si la extracción separa paquetes sin separar la base, el acoplamiento deja de ser visible en los imports y pasa a ser invisible: compartido por el fichero `.sqlite`.

**Mitigación:** `SchemaPort` en anillo-0; el DDL pasa a ser dato declarado, no código de adaptador. Decidir explícitamente si capabilities y memoria comparten base física (hoy sí) o solo contrato.

---

### H-04 · ALTA — Cuatro escritores de memoria y un `replay` destructivo

Documentado en §3.3. Cuatro caminos de mutación, tres de ellos sin pasar por el ledger (`M/memory-gateway.ts:42`, `M/hooks.ts:100`, `M/plane.ts:74`), y un `replay` que interpreta solo `memory.save`/`memory.forget` y termina en `store.replaceAll()` (`M/fabric.ts:208-228`).

**Riesgo en la extracción:** mover esos cuatro escritores a anillos distintos (gateway→1, hooks→2, plane→M) **institucionaliza** la divergencia en lugar de cerrarla. Y el `replay` es la única operación que puede borrar datos en masa: hacerlo desde un anillo distinto del que escribe es la receta para perder registros que nunca tuvieron evento.

**Mitigación:** `MemoryCommandPort` antes de mover nada. Es el orden del dossier: D02+protección de replay → D03 → D01 → D04 (`D/08-delta-recomendado.md` §5, pasos 1 y 2).

---

### H-05 · ALTA — Acoplamiento oculto por barrel: toda la frontera de paquete es una línea

`M/intermediate.ts:11` reexporta el barrel completo de `pi-intermediate` por ruta física, y `M/index.ts:41` lo reexporta a su vez. El resultado: **los 22 módulos del intermediate están en el espacio de nombres público del paquete de memoria**, y 40+ símbolos se consumen desde ahí (`M/core.ts:6-19`, `M/fabric.ts:17-18`, `M/memory-control.ts:9`, `M/plane.ts:7`, `M/hooks.ts:10-12`, `M/memory-tool.ts:8-9`, `M/memory-gateway.ts:6-7`, `M/canon-contract.ts:7`, `M/memory-stack.ts:7,15`).

**Riesgo en la extracción:** partir `pi-intermediate` en anillo-0/anillo-1/anillo-2 rompe `M/` en bloque y **no hay tests** (E-020 borró 526) que digan qué se rompió. El typecheck dirá «no compila», no «perdiste un gate».

**Mitigación:** la extracción empieza por `M/intermediate.ts` → importaciones nombradas por anillo, con el typecheck como única red. Es el D11 del dossier y debe ser el **paso 1**, no el último.

---

### H-06 · ALTA — Dos suites de memoria vivas, con semánticas incompatibles

PALIMPSEST (`M/`, 6.489 líneas, SQLite bi-temporal con admisión, firma, ledger y olvido por salience) y el store de episodios del router (`P/adapters/episode-store.ts:148`, JSON en fichero con caps por clase de tarea `:280-288` y TTL). La segunda es **la que se ejecuta**: `P/extension.ts:68-69` la construye, `:325-352` la expone como `/router-memory`, `:353-374` la inyecta en el prompt.

**Riesgo en la extracción:** si la memoria transversal (M) se diseña sin absorber ni declarar el store de episodios, el anillo-2 se queda con dos memorias y el usuario con dos `/wipe`. El `EpisodeStorePort` (`P/ports.ts:10-24`) ya es un puerto limpio: la convergencia es barata **ahora** y cara después.

**Mitigación:** o `EpisodeStore` se convierte en una implementación de `MemoryBackend` (anillo-2 tras el SPI de anillo-0), o se declara explícitamente memoria de transporte del router con su propio ciclo de vida y sin pretensiones de recall semántico.

---

### H-07 · ALTA — El ledger se apenda después de la vista, y la firma de checkpoint vive en la DB firmada

`M/fabric.ts:105-115`: primero `control.save(input)` (`:106`), después `ledger.append(...)` (`:108`). Un fallo entre ambas deja un recuerdo persistido sin evidencia — justo lo que `S/memory-fabric` prohíbe («Event ledger como sistema de registro»). Además `M/memory-stack.ts:20-24` guarda el PEM **privado** del firmante en la tabla `meta` de la misma base cuyos checkpoints firma, y `M/memory-control.ts:189` firma con él.

**Riesgo en la extracción:** al separar anillos, el ledger y la vista pueden acabar en propietarios distintos con el orden invertido congelado. Y una clave privada en el almacén que firma hace que la firma no pruebe nada frente a quien pueda editar la DB.

**Mitigación:** orden append→vista en una unidad de trabajo (D03); `KeyCustodyPort` con material fuera de la DB editable (D05.4).

---

### H-08 · MEDIA — Autoridades volátiles promovidas a kernel

Cuatro estructuras de autoridad viven en memoria de proceso: claves y revocaciones (`I/keystore.ts:14-15`), CCR (`I/token-ring.ts:107`), idempotencia (`I/contract.ts:364`), checkpoints rápidos (`M/memory-control.ts:48`).

**Riesgo en la extracción:** son puras, así que el criterio de §2.1 las manda a anillo-0 — pero un kernel que olvida las revocaciones al reiniciar es peor que un adaptador que las olvida, porque el kernel es la autoridad declarada.

**Mitigación:** la **lógica** va a anillo-0; el **estado** va a anillo-2 tras puerto. Ninguna de las cuatro se promueve tal cual.

---

### H-09 · MEDIA — Bordes fail-open dentro de un sistema que se declara fail-closed

Tres decisiones que abren en lugar de cerrar:
- `I/governance.ts:49`: fuente desconocida → `{ allowed: true, quarantined: true }`. Permite, mitigando con cuarentena; pero `ExecutionGate.decide` solo bloquea si el sandbox falta (`I/sandbox.ts:367-371`), así que con cualquier proveedor disponible la capacidad de fuente desconocida se ejecuta sandboxeada.
- `I/hard-gates.ts:71`: tool desconocida → permitida (H-02).
- `I/ingest.ts:158-160`: fallo de `git clone` → `[]`, indistinguible de «repo vacío».

**Riesgo en la extracción:** al convertirlos en política de anillo-0, el fail-open se vuelve invariant del kernel.

**Mitigación:** fuente desconocida → denegada o cuarentena **sin** ejecución; tool no normalizable → bloqueada; fallo de fetcher → error propagado.

---

### H-10 · MEDIA — Ciclos por barrel y por tipos compartidos

Dos vectores de ciclo potenciales al partir en anillos:
1. **Barrel:** `I/index.ts:7-28` exporta los 22 módulos en plano. Si anillo-0 y anillo-1 heredan barrels que se reexportan entre sí, el ciclo es invisible en el source y aparece solo al cargar.
2. **Tipos:** `M/fabric.ts:20-42` (`MemoryFabricOptions`) acepta `Governance`, `ConfigLike`, `MemoryBackend`, `EmbeddingProvider`, `Reranker`, `MemorySigner`, `CanonProposer` y `redactFn` a la vez — ocho tipos de tres anillos distintos en una sola firma de constructor.

**Mitigación:** un barrel por anillo, sin reexportación cruzada; y las opciones de composición se resuelven en el composition root de anillo-1, no en la firma de la pieza.

---

### H-11 · MEDIA — Extracción sin consumidor: las fronteras se afirman, no se ejercen

72 % del código (10.103/13.982 líneas) y 24 de 27 capacidades no los ejecuta ningún proceso. Cero tests en `pi-intermediate` y `pi-memory`.

**Riesgo:** una extracción verificada solo por `tsc --noEmit` produce anillos que compilan y no funcionan. La diferencia entre «el anillo-0 no depende del anillo-2» y «el anillo-0 **no puede** depender del anillo-2» solo la da un test o un lint de dependencias.

**Mitigación:** la extracción se acompaña de (a) un check de dirección de imports ejecutable, y (b) al menos un consumidor real por anillo. El candidato obvio es el router, que ya corre: conectar `I/hard-gates.ts` a `P/extension.ts` convierte H-01 en un caso probado y da al anillo-0 su primer consumidor vivo.

---

### H-12 · MEDIA — `pi-memory` declara el host como dependencia obligatoria

`src/pi-memory/package.json` → `"@earendil-works/pi-coding-agent": "1.3.0"` en `dependencies`, no en `peerDependencies`. Pero las importaciones runtime del host están solo en `M/extension.ts:8-18`. Compare con `src/pi-account-router/package.json`, que sí lo declara como `peerDependencies` (`"@earendil-works/pi-coding-agent": "*"`).

**Riesgo en la extracción:** instala el SDK del host en todo consumidor del motor de memoria, incluido un anillo-2 que solo quiera el backend cloud o el transporte MCP. Contradice la instalación independiente que el dossier manda conservar (`D/08` §1, última fila).

**Mitigación:** host como peer opcional + entrada de adaptador separada (D11).

---

## 7. Secuencia de extracción recomendada

Sin big bang, y con el orden del dossier (`D/08-delta-recomendado.md` §5) como restricción: la integridad de datos va antes que la estética de fronteras.

| Paso | Contenido | Cierre exigible |
|---|---|---|
| 0 | Romper `M/intermediate.ts:11` en imports nombrados (D11) | Typecheck verde sin ruta física; frontera de paquete por nombre declarado |
| 1 | `MemoryCommandPort`: un escritor, ledger antes que vista, `replay` inhabilitado hasta cobertura completa (D01/D03/D04) | Las cuatro entradas producen estado equivalente; historial incompleto no reemplaza datos |
| 2 | Ámbito de tenant en el puerto de almacenamiento, no solo en `search` (D02) | Ningún `get`/`forget`/`invalidate`/`snapshot`/`replay` cruza ámbito |
| 3 | Extraer anillo-0 **puro**: `I/contract.ts`, `I/types.ts`, `I/events.ts`, `I/trust.ts`, `I/grade.ts`, `I/provenance.ts`, `I/hard-gates.ts`, álgebra de `I/token-ring.ts`, SPI+perfiles de `I/sandbox.ts`, `P/ports.ts`, `P/domain/policy.ts`, álgebra de `M/` | Cero imports de `node:sqlite`, `node:fs`, `node:child_process`, `node:net` en anillo-0, verificado por lint |
| 4 | `SchemaPort` + `JournalPort` + `KeyCustodyPort`; `I/db.ts` pasa a anillo-2 | El esquema es dato declarado; un solo mecanismo hash-chained; material de firma fuera de la DB firmada |
| 5 | Anillo-1: `I/router.ts`, `I/core.ts` (solo cableado), `I/gateway.ts`, `I/ingest.ts` (pipeline), fachada `TokenRing`, `M/memory-stack.ts`, `M/fabric.ts`, `M/memory-gateway.ts`, `M/openai-compat.ts` | Ninguna ruta expuesta permite saltarse el escritor único |
| 6 | Anillo-2: proveedores de sandbox, fetchers, transportes MCP, backends, repositorios SQLite, adaptadores de host | Cada proveedor representa de verdad cwd/mounts/readonly/red o devuelve «no soportado» (D10) |
| 7 | M como rango propio: `ContextBudgetPort` + triggers de ciclo de vida declarados | Cada inyección de memoria aparece atribuida en el governor por capa |
| 8 | Primer consumidor vivo: gates de anillo-0 registrados en `P/extension.ts` (cierra H-01) | `tool_call`/`user_bash` bloquean en el único paquete que Pi ejecuta |

Los pasos 1–2 son prerequisito de 3–7, no paralelizables con ellos: mover escritores antes de unificarlos multiplica la divergencia.

---

## 8. Lagunas

Lo que **no** pude verificar y que afecta a la confianza de este diseño:

1. **Nada se ha ejecutado.** Cero builds, cero tests, cero typecheck, cero servidores. Todo el documento es lectura de fuente. No hay evidencia dinámica de que los tres paquetes compilen hoy en este estado del árbol (el dossier afirma que sí, `D/03-evidencia.md:119-120`, pero es de 2026-10-18 y hay 8 ficheros dirty).
2. **Lectura parcial de ficheros grandes.** `P/adapters/routed-streams.ts` (664 líneas) solo se ha leído por estructura; `M/memory.ts` (558), `M/memory-embeddings.ts` (421), `M/memory-cloud.ts` (373), `M/memory-mcp.ts` (320), `M/regression.ts` (313) se han leído por cabecera y exports, no línea a línea. Puede haber responsabilidades no inventariadas en §1.
3. **Specs leídas por requisito, no por escenario.** Las 27 specs se han contrastado por título de requisito (§1.5). Los `#### Scenario:` de cada requisito pueden exigir comportamientos que no he comparado con el código; G1–G10 son los desajustes que encontré buscando constructos nombrados, no un censo exhaustivo.
4. **Dossier leído parcialmente.** `D/05` (536 líneas, leídas 225), `D/08` (completo), `D/01`, `D/04`, `D/07` (parciales), `D/02`, `D/03`, `D/06`, `D/09` (solo lo citado). No he re-verificado V00–V13 ni los contrafactuales: los doy por ciertos según el encargo.
5. **Ecosistema fuera del repo.** `D/05` y `D/08` hablan de CORE, Jart-Contratos, Jart-PROXY, FACTORY, CANON, BOARD/BAR y Dementor como propietarios de responsabilidades. **No he inspeccionado ninguno**: están fuera de `/Users/ruben/Code/PI-agent`. La tabla de §2.3 y los puertos de §5.2 podrían solapar o contradecir puertos ya existentes en esos productos. En particular, `AuthorityPort`/`PolicyPort`/`ReceiptPort` de `D/05-arquitectura-propuesta.md` §4 no los he buscado fuera.
6. **Intención del dueño no persistida.** La definición de los tres anillos y la duda sobre la memoria vienen del encargo de 2026-10-25 y **no están escritas en ninguna spec ni ADR**. §2 y §3 son mi interpretación de esa intención contra el código; si la intención era otra (p. ej. «anillo-1 = solo exposición, sin selección»), las colocaciones de `I/router.ts` y `I/core.ts` cambian.
7. **Sin medición de coste.** §3.2 razón 3 argumenta por estructura (quién produce y consume presupuesto), no por tokens medidos. No hay medición de cuántos tokens inyecta realmente la memoria por turno en producción, ni de cuántos cuesta el esquema de `memory` (`M/memory-tool.ts:56-58` sabe medirlo; nadie lo ha ejecutado aquí).
8. **`verification-evaluation` sin trazabilidad.** G10 afirma que no hay implementación en `src/`. No he comprobado si vive en otro repo del ecosistema o en tooling externo; el descarte propuesto en §4.3 depende de esa comprobación.
