# COLOFÓN ADVERSARIAL 1 — contra `DISENO-EXTRACCION-ANILLOS-PI.md` (v3)

**Fecha:** 2026-10-25 · **Rol:** colofón adversarial (Dementor, casa Pi) · **Método:** lectura del diseño v3 + `S1`/`S2`/`S4`, y verificación línea a línea contra `/Users/ruben/Code/PI-agent/src/` (solo lectura, cero ejecuciones que muten, cero credenciales volcadas).
**Postura:** el diseño es falso hasta que el código demuestre lo contrario.
**Alias:** `I/` = `src/pi-intermediate/src/`, `M/` = `src/pi-memory/src/`, `P/` = `src/pi-account-router/src/`.

**Veredicto en una línea:** el diagnóstico del diseño es en su mayor parte **correcto y verificable** (las 5 premisas de seguridad/agujeros que usa como fundamento se confirman todas contra el fuente, y una de ellas es peor de lo que el diseño dice), pero su **tesis central es falsa**: ni las costuras son copiables tal cual, ni el criterio de pureza del paso 3 es satisfacible con la lista de copiado, ni «viable sin reescribir nada» sobrevive a su propio §3 (8 puertos que no existen) y §4 (16 piezas a adaptar). El diseño sirve como **mapa de deuda**, no como base de implementación.

---

## 1 · Tabla claim → verificado / refutado

| # | Claim del diseño (cita) | Veredicto | Evidencia `ruta:línea` |
|---|---|---|---|
| 1a | `MemoryBackend` SPI existe y sirve tal cual | **Parcial** | `M/memory-spi.ts:20-47` existe ✓. Pero `:6-7` importa `Memory`, `MemoryInput`, `MemoryPreview`, `MemoryCheckpoint`, `MemoryCheckpointInput`, `SearchOptions`, `MemoryStore` **desde `./memory.ts`** (el store SQLite, anillo-2). El SPI no es autónomo: no se puede copiar a anillo-0 sin extraer antes los tipos de dominio del módulo de anillo-2. |
| 1b | «`MemoryBackend` (13+12 métodos, 4 implementaciones)» (§3, S1 §5.1) | **Refutado (conteo)** | En `M/memory-spi.ts:20-47` hay **11 miembros obligatorios** (`name` + 10 métodos) y **12 opcionales**. El «13» no existe. Las 4 implementaciones sí (`:59`, `M/memory-cloud.ts:46`, `M/memory-adapters.ts:25`, `M/memory-mcp.ts:242`). |
| 1c | `SandboxProvider` SPI sirve tal cual, con `supports()` fail-closed | **Parcial** | `I/sandbox.ts:37-45` ✓ con `invocation?` `:42` y `supports?` `:44`. Pero el **fichero** importa `node:child_process` `:6` y `node:fs` `:8`, hace `spawnSync` en `:67,90,105,117,181,214,263,282` y lee `process.env.PI_CORE_SANDBOX_PROVIDER` en `:305`. S1 §4.1 lo lista bajo «Se copia TAL CUAL»: imposible sin partir el fichero. |
| 1d | `P/ports.ts` son «los cinco puertos mejor diseñados del repo», copiar tal cual | **Parcial** | Los 5 puertos existen y son exactos: `EpisodeStorePort:10-24`, `ExtensionBus:27-29`, `StateStore:31-38`, `Clock:40-44` (`now`/`sleep`/`isProcessAlive` ✓), `CredentialResolver:50-56`. Pero `P/ports.ts:1-2` importa `Episode` de `./domain/episode.ts` y `CredentialReference`/`RouterState` de `./domain/types.ts` — **ninguno de los dos está en la lista de copiado**. Y `P/domain/policy.ts:1-7` importa `RouterError` como **valor** (no type-only) de `./types.ts`. |
| 1e | `I/contract.ts` es fuente de verdad sin dependencias | **Verificado** | Cero imports en todo el fichero ✓. `$ref` ignorado confirmado: `I/contract.ts:247` `if (schema.$ref) return;`. |
| 1f | `I/gateway.ts` deriva OpenAPI 3.1 y tools MCP de la misma ruta | **Verificado** | `Route:44-54`, `toOpenApiDocument():142-178`, `toMcpTools():181-190` ✓. Y el defecto que el diseño ya declara en «Adaptar» es real: `:134` `this.tracer?.record(match.route.operationId, 0, 0)` (tokens siempre 0) y `:135` `return { status: 200, ... }` (status siempre 200, incluso tras `catch` de ruta no encontrada resuelto en `:137-139`). |
| 2 | «Hoy hay cuatro escritores» (§2, S1 §3.3) | **Refutado** | Los cuatro citados son exactos (`M/fabric.ts:105-106`, `M/memory-gateway.ts:42`, `M/hooks.ts:100`, `M/plane.ts:74`), pero hay **al menos siete caminos durables adicionales** no mencionados. Ver §2 abajo. |
| 3 | La lista «copiar tal cual (12)» es pura | **Refutado** | I/O e impurezas en 8 de los módulos de la lista. Ver §3. |
| 4 | Paso 3: «cero imports de `node:sqlite\|fs\|child_process\|net` en anillo-0 verificado por lint» | **Refutado (no satisfacible)** | 2 violaciones directas + 5 transitivas + 1 ciclo 0→1. Ver §4. |
| 5 | Orden de pasos; «los pasos 1–2 no son paralelizables con 3–7» | **Refutado en parte** | Dos inversiones de dependencia (1←4 y 2←SPI nuevo) y una contradicción frontal §5.1 vs §6 sobre el paso de gates. Ver §5. |
| 6 | Reconciliación S1/S2/S4 del emplazamiento de memoria es coherente | **Refutado** | §7 y §8 colocan el **mismo** conjunto de artefactos en anillos distintos, y §7 contradice el test de pureza de §1. Ver §6. |
| 7a | S4-T1: gates no cargados en la config viva | **Verificado** | Ver §7. |
| 7b | S4-K1: clave privada en la DB que firma | **Verificado** | Ver §7. |
| 7c | S4-G2: `get`/`forget` sin tenant | **Verificado** | Ver §7. |
| 7d | S2-01: `MemoryStore` sin WAL/busy_timeout y sin una sola transacción | **Verificado** | Ver §7. |
| 7e | S3: olvido que no olvida (`0.3·0.5=0.15` vs threshold 0.15 estricto) | **Verificado y subestimado** | Ver §7. |
| 8 | «Viable **sin reescribir nada**» (veredicto en una línea, S1 veredicto) | **Refutado** | El propio §3 enumera 8 puertos que «Faltan» y el §4 enumera 16 piezas a «Adaptar». 9 módulos clasificados anillo-0 exigen lógica nueva → violan INV-10 tal como el diseño lo enuncia. Ver §8. |
| — | §8 TokenRing: «`remaining()`/`used()` tienen 0 sitios de llamada» | **Verificado** | `I/token-ring.ts:244` (`used()`), `:247-248` (`remaining()`). El único llamador de `used()` es `remaining()` en `:248`; `remaining()` tiene **cero** llamadores en los tres paquetes. |
| — | §5.5 seatbelt macOS es deny-list `(allow default)` | **Verificado** | `I/sandbox.ts:335` `"(allow default)"`; el comentario de `:96` lo declara explícitamente. |
| — | §5.5 deny-read omite `~/.pi/**` | **Verificado** | `I/sandbox.ts:149` y `:326`: `denyRead` = `~/.ssh`, `~/.aws`, `~/.gnupg`, `~/.config/gcloud`. Ninguna entrada `~/.pi`. |
| — | §7 «cero listeners de red en `src/`» | **Verificado** | grep `createServer\|\.listen(\|node:net\|node:http` sobre los tres paquetes → **0 resultados**. |
| — | §2 «`replay` termina en `replaceAll()` sobre un historial incompleto» | **Verificado** | `M/fabric.ts:227` `return this.store.replaceAll(rows);`. El bucle `:214-224` solo reconoce `memory.save` y `memory.forget`; ignora `memory.consolidate` (`:190`), `memory.forget_salience` (`:152`), `memory.quarantine`/`memory.discard` (`:118-125`) y `session.start` (`M/hooks.ts:95`). |
| — | §4 «ledger **antes** que vista» como corrección | **Verificado (el orden hoy es inverso)** | `M/fabric.ts:106` `const r = this.control.save(input);` (vista) → `:108` `this.ledger.append({...})` (evidencia). |
| — | §5.1 `I/hard-gates.ts` solo conoce `bash`/`edit`/`write` y lee `input.command`/`input.path` | **Verificado** | `I/hard-gates.ts:68-72`; `:71` `return { allow: true };` para cualquier otro nombre. |

---

## 2 · Refutación del claim 2 — no son cuatro escritores, son once

Los cuatro que el diseño cita son correctos y están bien localizados. El problema es el cuantificador «exactamente cuatro», sobre el que el diseño apoya su «condición no negociable» y el orden D02→D03→D01→D04. Caminos de mutación durable adicionales, ninguno mencionado en v3 ni en S1 §3.3:

| # | Camino | Evidencia | Gravedad |
|---|---|---|---|
| 5 | **MCP `memory.import` → backend directo.** Salta `MemoryControl` entero (sin admisión, sin `sanitize`, sin `redact`, sin tenant, sin firma) **y** el ledger | `M/memory-mcp-server.ts:248-251` `return this.control.backend.importAll(records);` | **Crítica**: es el bypass más completo del sistema y está expuesto por transporte |
| 6 | MCP `memory.save`/`consolidate`/`rollback`/`forgetSalience` → `control.*` sin ledger | `M/memory-mcp-server.ts:213`, `:239`, `:241`, `:243` | Alta: segundo servidor MCP que el diseño decide **descartar** (§4), pero mientras exista es un escritor vivo |
| 7 | **Escritura durable del material privado de firma** en la tabla `meta`, fuera de todo escritor y de todo ledger | `M/memory-stack.ts:24-25` `store.setMeta("memory.signer.privatePem", kp.privatePem)` | Alta: es a la vez el S4-K1 y un camino de mutación no inventariado |
| 8 | Migración UMP firmada → `backend.importAll` | `M/memory-adapters.ts:88` | Media |
| 9 | `MirrorMcpBackend`: `local.save`/`local.invalidate`/`local.importAll` sin ledger | `M/memory-mcp.ts:277-278`, `:294-295`, `:305`, `:314` | Media: es el patrón que §8 Fase 3 propone portar a Qwen |
| 10 | `MemoryControl.consolidate`/`rollback`: `saveCheckpoint`, `restoreScoped`, `restore` | `M/memory-control.ts:190`, `:240`, `:245` | Media: mutación durable con checkpoint que `replay` no conoce |
| 11 | Harness de evaluación y `reconstructSession` → `ctl.save` | `M/memory-eval.ts:77`, `M/memory-control.ts:291` | Baja (no productivo), pero ensucia el estado si comparte DB |

**Consecuencia para el diseño:** el paso 1 («`MemoryCommandPort` + ledger antes que vista») está dimensionado para 4 entradas y su criterio de cierre es «**cuatro** entradas producen estado equivalente». Con 11 caminos, el criterio de cierre es insatisfacible tal como está redactado: se puede cumplir el paso 1 y dejar `memory.import` (`M/memory-mcp-server.ts:250`) escribiendo directamente al backend. El inventario debe rehacerse antes de escribir el puerto, no después.

**Matiz a favor del diseño:** su afirmación de que la tool `memory` de Pi pasa por la fabric **es correcta** — `M/extension.ts:115` `executeMemoryAction(fabricMemoryActions(get().memoryFabric), ...)` → `M/fabric.ts:262` `save: (input) => fabric.save(input)`. El camino principal sí tiene ledger.

---

## 3 · Refutación del claim 3 — la lista «copiar tal cual» no es pura

grep `node:fs|node:net|node:child_process|node:sqlite|process.env|Date.now|Math.random` sobre los 23 módulos de la lista de copiado (§4 del diseño + S1 §4.1):

| Módulo (en la lista de copiado) | Impureza | Inyectable |
|---|---|---|
| `I/sandbox.ts` | `:6` `node:child_process`, `:8` `node:fs`, `:9` `node:os`, `:305` `process.env`, `spawnSync` ×8 | **No** |
| `M/memory-graph.ts` | `:6` `import type { DatabaseSync } from "node:sqlite"`; `Date.now()` en `:28,31,36,77` | **No** (sqlite); parcial (reloj) |
| `I/events.ts` | `:42` `Date.now()` + `Math.random()` en `eventId()`; `:46` `Math.random()` en `traceId()`; `:55` `Date.now()` | **No** en `:42`/`:46`; sí en `:55` (`opts.time ??`) |
| `I/token-ring.ts` | `:574` `createdAt: Date.now()` (PromptFoundry) | **No** |
| `I/reliability.ts` | `:82` `Date.now()`; `:177` `Math.random()` | Sí (`opts.now ??`) / **no** en `:177` |
| `M/memory-admission.ts` | `:77` `Date.now()` | Sí (`opts.now ??`) |
| `M/memory-forget.ts` | `:15`, `:34` `Date.now()` | Sí (param/opts) |
| `M/memory-layers.ts` | `:42` `Date.now()` | Sí (`opts.now ??`) |

Limpio de verdad, sin ninguna observación: `I/contract.ts`, `I/types.ts`, `I/trust.ts`, `I/grade.ts`, `I/provenance.ts` (solo `node:crypto`, permitido), `I/hard-gates.ts`, `M/memory-vector.ts`, `M/memory-vector-index.ts`, `M/memory-consolidate.ts` (salvo su import del barrel, ver §4).

**El punto que importa:** el criterio de anillo-0 del diseño (§1, regla 3) exige «ejecutable sin red, sin filesystem, sin procesos hijo, **sin reloj**, sin DB». `I/events.ts:42` (`eventId()`) y `:46` (`traceId()`) y `I/token-ring.ts:574` no tienen reloj inyectable: son no deterministas por construcción. Están en la lista de «copiar tal cual» y violan el test de pureza del propio diseño. O se cambia la firma (lógica nueva → INV-10) o se admite que esos tres no son anillo-0.

---

## 4 · Refutación del claim 4 — el criterio del paso 3 es insatisfacible con la lista dada

**Violaciones directas (el fichero está literalmente en la lista de anillo-0):**
1. `M/memory-graph.ts:6` → `node:sqlite`. El diseño lo lista en anillo-0 (§1: «`M/memory-graph.ts`») y S1 §4.1 lo lista en «copiar tal cual». El lint del paso 3 falla el primer día.
2. `I/sandbox.ts:6,8` → `node:child_process`, `node:fs`. Mismo estatus: listado en anillo-0 «solo SPI+perfiles+`ExecutionGate`» **y** en «copiar tal cual». Las dos cosas no pueden ser ciertas a la vez sobre un fichero de 372 líneas.

**Violaciones transitivas por el barrel (más graves, porque no las ve un lint de imports directos):**
`M/intermediate.ts:11` = `export * from "../../pi-intermediate/src/index.ts"`, e `I/index.ts:9` = `export * from "./db.ts"`, e `I/db.ts:5` = `import { DatabaseSync } from "node:sqlite"`. Cuatro módulos **clasificados anillo-0** importan `./intermediate.ts`:

| Módulo anillo-0 | Import del barrel | Símbolo |
|---|---|---|
| `M/canon-contract.ts:7` | `./intermediate.ts` | `verifyContent` |
| `M/memory-consolidate.ts:7` | `./intermediate.ts` | `sha256` |
| `M/memory-layers.ts:6` | `./intermediate.ts` | `estimateTokens` |
| `M/memory-dma.ts:8-9` | `./intermediate.ts` | `estimateTokens`, `packKnapsack`, `mmrSelect`, `redact` |

Cualquiera de los cuatro arrastra `node:sqlite` en el grafo de módulos. **El paso 0 (romper `M/intermediate.ts:11`) no resuelve esto**: lo agrava, porque obliga a decidir uno por uno de qué módulo de `I/` viene cada símbolo, y `sha256`/`redact`/`estimateTokens`/`packKnapsack` viven en ficheros distintos de los que el diseño asigna a anillo-0.

**Violación de dirección 0→2 por valor:**
`M/retrieval-fabric.ts:9` `import { cosineDense } from "./memory-embeddings.ts"` — import de **valor**, no de tipo, desde un módulo que hace HTTP (`M/memory-embeddings.ts:200` `fetch(url, init as RequestInit)`, `:295` `await this.fetchFn(...)`). `retrieval-fabric.ts` está en anillo-0 (§1 y S1 §4.1). Anillo-0 depende en runtime de anillo-2.

**Ciclo 0→1 por módulo no clasificado:**
`M/memory-dma.ts:10` `import { stableCodex } from "./plane.ts"`. `M/plane.ts` **no aparece en ninguna de las tres listas de §1** del diseño (solo se le cita como escritor en `:74`). Y `M/plane.ts:6` `import type { PiCore } from "./core.ts"` — `PiCore` es el composition root que el diseño pone en anillo-1. Así que `memory-dma` (anillo-0) → `plane` (sin clasificar) → `PiCore` (anillo-1). Falta una clasificación y sobra una flecha.

---

## 5 · Refutación del claim 5 — inversiones de dependencia y una contradicción de orden

**5.1 · El paso 1 depende del paso 4.** El paso 1 exige «ledger **antes** que vista». El ledger es la tabla `event_ledger`, que vive en `I/db.ts:174-195` (SQLite = anillo-2) y se escribe desde `M/memory-ledger.ts`. Para que un escritor único de anillo-0/anillo-1 apendice al ledger sin importar anillo-2 hace falta el `JournalPort` — que el diseño crea en el **paso 4**. Orden real: 4 → 1, no 1 → 4.

**5.2 · El paso 2 exige lógica nueva en el SPI.** «Tenant en el puerto de almacenamiento, no solo en `search`». Hoy el SPI tiene `snapshotScoped?`/`restoreScoped?` (`M/memory-spi.ts:35-36`) pero **no tiene** `get`/`invalidate` con ámbito: `M/memory-control.ts:136-138` y `:162-164` delegan en crudo. Cumplir el paso 2 obliga a añadir métodos nuevos a `MemoryBackend`, que el diseño declara «**Sirve tal cual** (no inventar sustitutos)» (§3) y «copiar tal cual» (S1 §4.1). Contradicción interna: el paso 2 invalida el §3.

**5.3 · Contradicción frontal §5.1 vs §6 sobre los gates.** El veredicto en una línea del diseño dice que el prerequisito de seguridad es «**anterior a toda frontera**»; §5.1 lo titula literalmente «**Paso 0** — cablear lo que ya existe»; §6 lo numera como **paso 8, el último**. No es un matiz: es el BLOCKER (S4-T1) colocado después de los siete pasos que lo agravan. O el §6 se reordena o el veredicto en una línea es falso.

**5.4 · Sobre «los pasos 1–2 no son paralelizables con 3–7».** La razón que da el diseño («mover escritores antes de unificarlos multiplica la divergencia») es **sólida** para 1↔5/6/7. Pero no justifica la no-paralelización de **3** con 1–2: el paso 3 (anillo-0 puro) no mueve escritores, mueve álgebra; su bloqueo real viene del paso 0 y de los §4.1/§4.2 de este colofón, no del paso 1. La afirmación es demasiado fuerte tal como está redactada y esconde la verdadera dependencia (3 ← 0 ← partición de ficheros).

---

## 6 · Refutación del claim 6 — la reconciliación S1/S2/S4 es hand-waving

**6.1 · §7 y §8 colocan los mismos artefactos en anillos distintos.**

| Artefacto | §7 (Topología runtime, «integrado S2») | §8 (Port a Qwen, «integrado S3») |
|---|---|---|
| motor / almacén | **anillo-0** («motor+ledger+claves+unidad de escritura → anillo-0 como proceso dueño exclusivo del almacén») | **anillo-1** («almacén, índice, ledger, consolidación, olvido, harness de eval y servidor MCP al anillo-1 como servicio propio») |
| ledger | **anillo-0** | **anillo-1** |
| claves | **anillo-0** | (no mencionado) |
| consolidación / olvido | (implícito anillo-0, con el motor) | **anillo-1** |

Y §2 afirma que «Ambas posturas coinciden en lo esencial». No coinciden: son emplazamientos **opuestos** del mismo componente. §8 añade además «ledger de evidencia y atribución de tokens **transversales**», un tercer emplazamiento para el ledger. v3 no reconcilia: superpone las tres versiones y las declara compatibles.

**6.2 · §7 refuta el test de pureza de §1.** §1 regla 3: «anillo-0 = ejecutable sin red, sin filesystem, sin procesos hijo, sin reloj, **sin DB**». §7: anillo-0 es «**proceso dueño exclusivo del almacén**». Un proceso que posee en exclusiva un almacén **es** una DB. El diseño usa «anillo-0» para dos cosas mutuamente excluyentes (álgebra pura sin I/O, y proceso propietario del estado) sin marcar nunca cuál de las dos rige en cada paso. Eso no es una reconciliación, es una ambigüedad que se propaga a los criterios de cierre de los pasos 3, 4 y 7.

**6.3 · S1 §4.1 contra §8, sin resolver.** S1 §4.1 pone `M/memory-consolidate.ts` y `M/memory-forget.ts` en anillo-0 «copiar tal cual»; §8 pone «consolidación, olvido» en anillo-1. La v3 adopta «la descomposición de S2 como forma concreta de la Opción C» (§2) y a la vez «la misma descomposición de S2» con contenido de S3 (§8), que es distinta. El anexo S1 queda formalmente vigente y contradice al §8.

---

## 7 · Re-verificación de las 5 premisas (claim 7) — todas confirmadas

**7a · S4-T1 (gates no cargados) — VERIFICADO.**
`~/.pi/agent/settings.json:19-22` → `"packages": ["npm:pi-mcp-adapter", "../../Code/PI-agent/src/pi-account-router"]`. `pi-memory` **ausente**. `P/extension.ts` registra exactamente cinco hooks: `context:119`, `before_agent_start:353`, `session_start:375`, `model_select:388`, `session_shutdown:393` — **ningún `tool_call`, ningún `user_bash`**. `gateToolCall` tiene dos apariciones en todo el repo: la definición `I/hard-gates.ts:68` y el único llamador `M/hooks.ts:48`, que solo se registra en `M/extension.ts:56` y `:66`. El Pi real ejecuta bash y escribe sin puerta dura. **El BLOCKER es real.**

**7b · S4-K1 (clave en la DB firmada) — VERIFICADO.**
`M/memory-stack.ts:20` `store.getMeta("memory.signer.privatePem")`, `:24-25` `store.setMeta("memory.signer.privatePem", kp.privatePem)`. El mismo `MemoryStore`/SQLite cuyos checkpoints firma esa clave (`M/memory-control.ts:188-190`: `this.signer.sign({...})` → `this.backend.saveCheckpoint({... signature ...})`). El almacén editable contiene el material que autentica su propia integridad. RL-2 confirmada.

**7c · S4-G2 (`get`/`forget` sin tenant) — VERIFICADO.**
`M/memory-control.ts:136-138` `get(id) { return this.backend.get(id); }` — sin `scopeOf`, sin `tenantPrefix`.
`M/memory-control.ts:162-164` `forget(id) { return this.backend.invalidate(id); }` — ídem.
Contraste interno que prueba que no es olvido sino omisión: `nearest()` en `:141-149` **sí** aplica `this.scopeOf(scope)` y `this.tenantPrefix()`. Y ambos métodos están expuestos por transporte: `M/memory-mcp-server.ts:218` (`memory.get`) y `:236` (`memory.forget`/`invalidate`), más `M/memory-gateway.ts` y `M/memory-tool.ts:87,118`. D02 confirmado línea a línea.

**7d · S2-01 (sin WAL / sin transacciones) — VERIFICADO.**
grep `journal_mode|WAL|busy_timeout|BEGIN|COMMIT|transaction` sobre `pi-memory/src/*.ts` + `pi-intermediate/src/*.ts` → **una sola coincidencia**: `I/governance.ts:20`, que es un literal de regex para redactar claves privadas, no SQL. `I/db.ts:283-288` `openDb()` = `new DatabaseSync(path); db.exec(SCHEMA); migrate(db); return db;` — **cero pragmas**. `migrate()` en `:263-273` ejecuta N `m.up(db)` + N `INSERT INTO schema_migrations` **sin transacción**: un fallo a mitad deja el esquema a medias con el registro de versiones inconsistente. `M/memory-control.ts:171-205` (`consolidate`: snapshot → sign → saveCheckpoint → consolidate → pruneCheckpoints) muta en bucles sueltos, exactamente como dice S2-09.

**7e · S3 (olvido que no olvida) — VERIFICADO Y SUBESTIMADO.**
`M/memory-forget.ts:20` `const s = 0.5 * recency + 0.2 * frequency + 0.3 * importance;`
`:17` `const recency = Math.exp(-ageSec / Math.max(1, halfLife));` — **asintótico: nunca vale 0** para edad finita.
`:18` `const frequency = m.accessCount / (1 + m.accessCount);` — vale 0 si nunca se accedió.
`:33` `const threshold = opts.threshold ?? 0.15;` · `:38` `if (salience(m, now, halfLife).salience < threshold)`.

Para un recuerdo nunca accedido: `s = 0.5·e^(−age/halfLife) + 0.3·importance > 0.3·importance` **para toda edad finita**. Con `importance ≥ 0.5` → `s > 0.15` siempre → **nunca se archiva**. No es un caso de borde en el umbral, como sugiere el diseño al plantearlo como `0.3·0.5 = 0.15` vs `< 0.15`: es un **suelo permanente de inmortalidad** para todo `importance ≥ 0.5`.

Y el valor por defecto **es** 0.5: `M/memory.ts:172` `input.importance ?? 0.5`. Peor: el flush de sesión escribe `importance: 0.6` (`M/memory.ts:554`). Es decir, **por configuración de fábrica ningún recuerdo es olvidable**, y los resúmenes de sesión —la vía de mayor volumen— son inmortales por construcción. `M/hooks.ts:144` pasa `core.config.getNumber("memory.forgetThreshold", 0.15)`: el mismo 0.15. El `session_shutdown` (`M/hooks.ts:142-148`) es, en la práctica, un no-op sobre el conjunto por defecto.

---

## 8 · Refutación del claim 8 — «viable sin reescribir nada» es falso, y por el propio texto del diseño

**8.1 · El §3 enumera 8 puertos que no existen.** `SchemaPort`, `CapabilityRepository`/`SourceRepository`/`ConfigPort`, `JournalPort`, `ContextBudgetPort`, `KeyCustodyPort`, `TurnContextPort`, `MemoryCommandPort`, `VocabularyPort`. Verificado: ninguno aparece en los tres paquetes. Inventar ocho abstracciones nuevas **es** escribir código nuevo. La frase «sin reescribir nada» no sobrevive a su propia sección 3.

**8.2 · Nueve módulos clasificados anillo-0 exigen lógica nueva → violan INV-10 tal como el diseño lo enuncia** («si un módulo exige lógica nueva para caber en el anillo-0, está mal clasificado»):

| Módulo | Lógica nueva exigida | Evidencia |
|---|---|---|
| `M/memory-graph.ts` | Perder `node:sqlite` y pasar a repositorio | `:6`, `:28`, `:31`, `:36`, `:77` |
| `I/events.ts` | Hacer `eventId()`/`traceId()` inyectables | `:42`, `:46` |
| `I/token-ring.ts` | Hacer `createdAt` inyectable | `:574` |
| `I/sandbox.ts` | Partir fichero: SPI+perfiles vs. 4 proveedores `spawnSync` | `:6`, `:8`, `:37-45` vs `:63-93`, `:100-120`, `:175-217`, `:258-285` |
| `M/memory-spi.ts` | Extraer los tipos de dominio desde `memory.ts` (anillo-2) | `:6-7` |
| `M/retrieval-fabric.ts` | Mover `cosineDense` fuera del módulo HTTP | `:9` ← `M/memory-embeddings.ts:200` |
| `M/memory-dma.ts` | Mover `stableCodex` fuera de `plane.ts` (que importa `PiCore`) | `:10` ← `M/plane.ts:6` |
| `MemoryBackend` (SPI) | Añadir `get`/`invalidate` con ámbito (paso 2) | `M/memory-spi.ts:24`, `:28` sin variante scoped |
| `I/hard-gates.ts` | Normalizar vocabulario vía `VocabularyPort` (que no existe) | `:68-72` |

**8.3 · El §4 del diseño es la confesión.** «Adaptar (16, las críticas)» incluye cambios de comportamiento, no de forma: `I/gateway.ts` debe atribuir tokens reales y devolver status reales (`:134-135`), `I/hard-gates.ts` debe decidir sobre operaciones semánticas normalizadas (`:68-72`), `M/memory-stack.ts` debe sacar la clave de la DB (`:20-25`), `M/fabric.ts` debe invertir el orden ledger/vista (`:106`→`:108`), `M/canon-contract.ts` debe firmar un objeto distinto (`:50-52`), `M/memory-control.ts` debe aplicar tenant (`:136-138`, `:162-164`), `P/extension.ts` debe mover la inyección fuera del prefijo (`:363-369`). Dieciséis cambios de semántica **no** son «sin reescribir nada».

**Conclusión del claim 8:** la frase correcta es «viable **sin reescribir la lógica de dominio**» — que es cierta y valiosa: el álgebra (knapsack, MMR, RRF, PPR, admisión, salience, consolidación, firma, gates) es sólida y reutilizable. «Sin reescribir nada» no lo es, y es la afirmación que el veredicto en una línea usa para justificar el calendario de 9 pasos.

---

## 9 · Falsos positivos del diseño (afirmaciones que no se sostienen)

1. **«Cuatro escritores»** (§2, S1 §3.3) — son al menos once; el más grave (`M/memory-mcp-server.ts:250`) salta control y ledger a la vez y está expuesto por MCP.
2. **«Copiar tal cual (12 piezas — ya cumplen el criterio de su anillo)»** (S1 §4.1) — 8 de los módulos listados tienen I/O, reloj no inyectable o imports de anillo-2.
3. **«`MemoryBackend` 13+12 métodos»** (§3, S1 §5.1) — son 11+12.
4. **«Viable sin reescribir nada»** (veredicto en una línea) — contradicho por su §3 (8 puertos ausentes) y su §4 (16 adaptaciones).
5. **«Ambas posturas coinciden en lo esencial»** (§2, reconciliación S2) — §7 y §8 asignan el motor/ledger/consolidación/olvido a anillos distintos.
6. **Paso 3 «cero imports de sqlite/fs/child_process/net en anillo-0»** como criterio de cierre alcanzable con la lista dada — insatisfacible: 2 violaciones directas, 5 transitivas por barrel, 1 import de valor 0→2, 1 ciclo 0→1.
7. **Paso 2 «tenant en el puerto de almacenamiento»** sin tocar el SPI — exige métodos nuevos en `MemoryBackend`, al que §3 declara «sirve tal cual».
8. **`M/memory-spi.ts` / `I/sandbox.ts` / `P/ports.ts` como ficheros autónomos** — los tres tienen imports de dominio fuera de la lista de copiado (`M/memory-spi.ts:6-7`, `I/sandbox.ts:6-10`, `P/ports.ts:1-2`).
9. **Orden §6 con los gates en el paso 8** — el propio §5.1 los llama «Paso 0» y el veredicto los declara «anterior a toda frontera».
10. **S3 olvido planteado como caso de borde en el umbral** — es un suelo permanente: con el `importance` por defecto (0.5, `M/memory.ts:172`) nada es olvidable nunca.

## 10 · Falsos negativos (defectos reales que el diseño no recoge)

1. **`memory.import` como bypass total** — `M/memory-mcp-server.ts:250` escribe al backend saltándose admisión, saneo, redacción, tenant, firma y ledger. El diseño discute el servidor MCP solo para decidir cuál de los dos descarta (§4), nunca como escritor no inventariado.
2. **`setMeta` del PEM privado como mutación durable** — `M/memory-stack.ts:24-25`. El diseño lo trata solo como problema de custodia (S4-K1), no como séptimo camino de escritura.
3. **`migrate()` sin transacción** — `I/db.ts:263-273`: N `up()` + N `INSERT` sin BEGIN. Un fallo a mitad deja esquema y `schema_migrations` inconsistentes. El diseño cita S2-01 para `MemoryStore` pero no para el migrador del esquema de **todo** el ecosistema, que es el que el paso 4 parte en dos.
4. **`replay` ignora 5 tipos de evento del propio ledger** — `M/fabric.ts:214-224` solo maneja `memory.save`/`memory.forget`; el ledger produce además `memory.quarantine`, `memory.discard` (`:118-125`), `memory.forget_salience` (`:152`), `memory.consolidate` (`:190`) y `session.start` (`M/hooks.ts:95`). El diseño dice «historial incompleto» pero no enumera qué falta, y el paso 1 («replay inhabilitado hasta cobertura completa») no define la cobertura.
5. **Dependencia 0→2 por valor en `retrieval-fabric`** — `:9` importa `cosineDense` (valor) desde el módulo HTTP. Rompe la regla de precedencia nº1 del diseño («dependencia unidireccional 2→1→0, cero ciclos») en el anillo que debe ser puro.
6. **`M/plane.ts` sin clasificar** — no aparece en ninguna de las tres listas de §1, y es a la vez escritor (`:74`), proveedor de `stableCodex` consumido por anillo-0 (`M/memory-dma.ts:10`) e importador de `PiCore` (`:6`). Un módulo sin anillo del que depende un módulo de anillo-0.
7. **`I/events.ts` y `I/token-ring.ts:574` no deterministas** — el diseño los declara anillo-0 («determinista, cero I/O») sin notar que `eventId()`/`traceId()`/`createdAt` leen el reloj del sistema sin inyección.
8. **`memory-eval.ts` y `regression.ts` escriben en el mismo store** — `M/memory-eval.ts:77` `ctl.save({ id: 'adv_${c.id}', ... })`. El diseño los pone en anillo-1 («Evaluación») sin notar que un harness que muta el almacén productivo no es de anillo-1: es de anillo-2 o necesita un backend aislado.
9. **Criterio de cierre del paso 1 mal dimensionado** — «cuatro entradas producen estado equivalente» es verificable y verde con siete escritores vivos.
10. **El umbral de olvido por defecto está duplicado en dos sitios** — `M/memory-forget.ts:33` (`?? 0.15`) y `M/hooks.ts:144` (`getNumber("memory.forgetThreshold", 0.15)`). Cambiar uno no cambia el otro; el diseño pide `ContextBudgetPort` para el presupuesto pero no un puerto equivalente para la política de retención.

## 11 · Pasos inviables tal como están redactados

| Paso | Por qué es inviable | Qué exigiría |
|---|---|---|
| **1** | Depende del `JournalPort` que crea el paso 4; su criterio de cierre («cuatro entradas») deja vivos siete escritores; no define la «cobertura completa» de `replay` | Reordenar tras el 4; rehacer el inventario a 11 caminos; enumerar los 7 tipos de evento del ledger |
| **2** | Exige métodos scoped nuevos en `MemoryBackend`, declarado «sirve tal cual» | Aceptar que el SPI cambia, o aplicar tenant en el control (que es lo que hace `nearest()` hoy, `M/memory-control.ts:141-149`) |
| **3** | Criterio de lint insatisfacible con la lista de copiado: `M/memory-graph.ts:6` y `I/sandbox.ts:6,8` directos; 4 módulos más vía barrel; `M/retrieval-fabric.ts:9` por valor | Partir `I/sandbox.ts`, extraer tipos de `memory.ts`, mover `cosineDense`, romper el barrel **antes** de medir, y declarar que el lint debe ser de grafo transitivo, no de import directo |
| **4** | `migrate()` sin transacción (`I/db.ts:263-273`): partir esquema/ejecutor sobre un migrador no atómico consolida el defecto | Añadir atomicidad al migrador como parte del paso, no después |
| **7** | Depende de `ContextBudgetPort` (inexistente) y de clasificar `M/plane.ts`, que no tiene anillo | Clasificar `plane.ts` y extraer `stableCodex` a anillo-0 |
| **8** | Contradice §5.1 («Paso 0», «anterior a toda frontera») y el veredicto en una línea; colocar el BLOCKER al final reproduce el vacío de autoridad durante los pasos 1-7 | Moverlo a la posición 0, como el propio §5.1 manda |

Los pasos **0, 5 y 6** no presentan bloqueos propios detectados en esta verificación (el 0 es correcto y necesario; el 5 y el 6 son movimientos de superficie cuya viabilidad depende de que el 3 y el 4 se corrijan antes).

---

## 12 · Veredicto

**¿El diseño aguanta como base de implementación? No. Aguanta como diagnóstico, y es un diagnóstico bueno.**

La parte negativa del diseño —lo que está roto— se verifica contra el fuente con una precisión inusual: las cinco premisas cargadas (S4-T1, S4-K1, S4-G2, S2-01 y el olvido de S3) son **todas ciertas**, y una de ellas (el olvido) es **peor** de lo que el diseño describe: no es un caso de borde en el umbral 0.15 sino un suelo permanente de inmortalidad para todo recuerdo con `importance ≥ 0.5`, que es exactamente el valor por defecto (`M/memory.ts:172`) y el que escribe el flush de sesión (`:554`). A eso se suman hallazgos propios del diseño que esta verificación confirma íntegros: el orden vista-antes-que-ledger (`M/fabric.ts:106`→`:108`), el `replaceAll` sobre historial incompleto (`:227`), el `$ref` ignorado (`I/contract.ts:247`), el tracing nominal y el status 200 incondicional (`I/gateway.ts:134-135`), el gate que solo conoce tres nombres de tool (`I/hard-gates.ts:68-72`), el TokenRing sin bucle (`remaining()` con cero llamadores), el seatbelt `(allow default)` (`I/sandbox.ts:335`), el deny-read que omite `~/.pi` (`:149`, `:326`) y los cero listeners de red. Ese inventario es sólido y se puede firmar.

La parte positiva —la tesis constructiva— **no se sostiene**. Tres de sus cuatro pilares fallan contra el código:

1. **Las costuras no son copiables.** Los cinco puertos que el diseño presenta como «ya existen, no inventar sustitutos» existen, pero ninguno de los tres críticos es autónomo: `MemoryBackend` toma sus tipos de dominio del store SQLite de anillo-2 (`M/memory-spi.ts:6-7`), `P/ports.ts` importa dos módulos que no están en la lista de copiado (`:1-2`), e `I/sandbox.ts` no se puede copiar «tal cual» porque sus primeras diez líneas son `node:child_process` y `node:fs`. La costura existe; lo que no existe es la separación.
2. **El criterio de pureza del anillo-0 es insatisfacible con la lista de copiado.** `M/memory-graph.ts:6` importa `node:sqlite` y está listado en anillo-0; cuatro módulos anillo-0 más (`canon-contract`, `memory-consolidate`, `memory-layers`, `memory-dma`) arrastran `node:sqlite` transitivamente vía `M/intermediate.ts:11` → `I/index.ts:9` → `I/db.ts:5`; `M/retrieval-fabric.ts:9` importa **por valor** desde un módulo que hace `fetch`; y `M/memory-dma.ts:10` depende de `M/plane.ts`, que el diseño no clasifica en ningún anillo y que a su vez importa `PiCore` (anillo-1). El paso 3 no es un paso difícil: es un paso falso.
3. **«Sin reescribir nada» lo refuta el propio diseño.** Su §3 enumera ocho puertos que no existen en ningún paquete y su §4 enumera dieciséis adaptaciones que son cambios de semántica, no de forma. Nueve módulos clasificados anillo-0 exigen lógica nueva para caber ahí, que es literalmente la condición que INV-10 declara como «mal clasificado». La afirmación verdadera —y más útil— es «sin reescribir la **lógica de dominio**»: el álgebra de PALIMPSEST (knapsack exacto, MMR, RRF, PPR, admisión A-MAC, salience, consolidación, firma, gates) es el activo real y es reutilizable.

Y hay un cuarto fallo, de coherencia interna, que es el más caro de los cuatro porque invalida la secuencia entera: **el diseño no sabe dónde vive la memoria.** §7 pone motor, ledger, claves y unidad de escritura en anillo-0; §8 pone almacén, índice, ledger, consolidación y olvido en anillo-1; §2 declara que ambas posturas «coinciden en lo esencial» y añade que evidencia y contabilidad son «transversales». Son tres emplazamientos para los mismos artefactos, presentados como reconciliados. Peor: el de §7 («proceso dueño exclusivo del almacén» en anillo-0) contradice el test de pureza de §1 («anillo-0 = ejecutable… sin DB»). Mientras esa ambigüedad viva, los criterios de cierre de los pasos 3, 4 y 7 no son evaluables, porque «anillo-0» significa dos cosas incompatibles según la sección.

**Qué debe cambiar antes del primer commit:**

1. **Resolver el emplazamiento de la memoria a un solo valor.** Elegir entre «motor en anillo-0» y «almacén en anillo-1», reescribir §2/§7/§8 con la misma asignación, y si se elige la opción de proceso dueño exclusivo, retirar «sin DB» del test de pureza de §1 y decir explícitamente que anillo-0 tiene dos subniveles (álgebra pura y autoridad de estado). Sin esto, ningún criterio de cierre es verificable.
2. **Mover los gates al paso 0**, como el propio §5.1 ya los nombra. Es el BLOCKER confirmado (S4-T1): la config viva carga solo `pi-account-router` (`settings.json:19-22`), que no registra `tool_call` ni `user_bash`. Cablear `I/hard-gates.ts` en `P/extension.ts` es una change pequeña, independiente de toda frontera, y es lo único que impide que los pasos 1-7 se ejecuten sobre un runtime sin puertas.
3. **Rehacer el inventario de escritores antes de diseñar el `MemoryCommandPort`.** Once caminos, no cuatro; el criterio de cierre del paso 1 debe nombrarlos todos y `memory.import` (`M/memory-mcp-server.ts:250`) debe cerrarse o eliminarse, no solo unificarse. Incluir `setMeta` del PEM (`M/memory-stack.ts:24-25`) en el inventario.
4. **Reordenar la secuencia: 0 → gates → 4 (`JournalPort`/`SchemaPort`/`KeyCustodyPort`) → 1 → 2 → partición de ficheros → 3 → 5 → 6 → 7.** El paso 1 no puede preceder al puerto de journal; el paso 3 no puede preceder a la partición de `I/sandbox.ts`, la extracción de tipos de `M/memory.ts`, el movimiento de `cosineDense` y la ruptura real del barrel.
5. **Reescribir el criterio de cierre del paso 3 como lint de grafo transitivo**, no de import directo, y añadirle `M/plane.ts` a la clasificación. Un lint que solo mira la primera línea de imports da verde sobre `M/memory-graph.ts` y sobre los cuatro módulos que arrastran sqlite vía barrel.
6. **Corregir el olvido antes de portarlo.** Con `importance` por defecto 0.5 (`M/memory.ts:172`) y threshold 0.15 con `<` estricto (`M/memory-forget.ts:33,38`), `forgetBySalience` no archiva nada del conjunto por defecto: el `session_shutdown` (`M/hooks.ts:142-148`) es un no-op. O se baja el threshold, o se cambia `<` por `<=`, o se revisa la ponderación de `:20`. Y se unifica el 0.15 duplicado en `M/memory-forget.ts:33` y `M/hooks.ts:144` tras un único puerto de política de retención.
7. **Sustituir «viable sin reescribir nada» por «viable sin reescribir la lógica de dominio»**, y presupuestar explícitamente los 8 puertos nuevos y las 16 adaptaciones del §4 como trabajo de escritura, no de movimiento. La frase actual es la que hace que el calendario de 9 pasos parezca barato.

**Con esas siete correcciones el diseño sí sirve como base de implementación.** Sin ellas, el primer commit hereda un criterio de pureza que no se puede cumplir, un puerto de escritura dimensionado para cuatro de once caminos, un BLOCKER de seguridad colocado al final de la cola y una memoria que no sabe en qué anillo vive.

---

### Alcance y deuda de este colofón

Verificado contra fuente: las 8 afirmaciones del encargo, las 5 premisas cargadas, y 6 afirmaciones adicionales del diseño (TokenRing sin llamadores, seatbelt `allow default`, deny-read sin `~/.pi`, cero listeners, `replay`→`replaceAll`, orden ledger/vista). **No verificado en este colofón** (se toma del diseño sin comprobación propia): el contrato de carga de Pi sobre SDK 1.3.0/binario 1.4.0 (§7), el bwrap que no monta el workdir declarado (D10), la cache MCP sin TTL y la entrada de 22 días (S2-08), el symlink `capabilities-footer` (S2-10), la degradación cloud→local-first (S2-13), el patrón `definitionHash` de `mcp-project-approvals.json`, y los permisos 0644 de `settings.json` y del resto de ficheros de P1-P12. Cero ejecuciones que muten; cero valores de credencial reproducidos.
