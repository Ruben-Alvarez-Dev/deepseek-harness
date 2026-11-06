# S2 · Sistemas y runtime — procesos, persistencia, concurrencia y fallos

**Sección:** especialista en sistemas e infraestructura.
**Fecha:** 2026-10-25. **Modo:** solo lectura estricta. No se ejecutó `pi`, no se escribió en `~/.pi`, no se mutó ningún repositorio auditado.
**Ámbito:** mecanismo real de carga de Pi, topología de procesos, persistencia y concurrencia de la suite de memoria, modos de fallo, y mapeo a Qwen Code 0.26.1.

---

## 0. Leyenda de rutas (todas las citas son `ruta:línea`)

| Alias | Ruta absoluta |
|---|---|
| `SDK` | `/Users/ruben/Code/PI-agent/src/pi-memory/node_modules/@earendil-works/pi-coding-agent` (v**1.3.0**) |
| `LIVE` | `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent` (v**1.4.0**, destino de `/opt/homebrew/bin/pi`) |
| `M` | `/Users/ruben/Code/PI-agent/src/pi-memory/src` |
| `I` | `/Users/ruben/Code/PI-agent/src/pi-intermediate/src` |
| `R` | `/Users/ruben/Code/PI-agent/src/pi-account-router/src` |
| `AGENT` | `/Users/ruben/.pi/agent` |
| `ADAPTER` | `/Users/ruben/.pi/agent/npm/node_modules/pi-mcp-adapter` (v6.0.0) |
| `DOSSIER` | `/Users/ruben/Code/PI-agent/src/pi-account-router/docs/audit-2026-10-18/arquitectura-ecosistema` |

Verificación de versión viva: `/opt/homebrew/bin/pi --version` → `1.4.0`; el symlink apunta a `LIVE/dist/bundle/cli.js`, cuyo shebang es `#!/usr/bin/env node` (`LIVE/dist/bundle/cli.js:1`). Node del sistema: v26.5.0.

---

## 1. Contrato de carga de Pi: qué espera realmente de una pieza

### 1.1 Las dos vías de entrada

Pi no tiene un «sistema de plugins» único: tiene **recursos** (extensions, skills, prompts, themes) que llegan por cuatro caminos, y solo uno de ellos es `packages`.

| Vía | Origen | ¿Persiste en config? | Evidencia |
|---|---|---|---|
| Descubrimiento de proyecto | `<cwd>/.pi/extensions/` | No | `SDK/dist/core/extensions/loader.js:679-681` |
| Descubrimiento de usuario | `<agentDir>/extensions/` | No | `SDK/dist/core/extensions/loader.js:682-684` |
| `extensions` / `packages` de settings | `AGENT/settings.json` + `.pi/settings.json` | Sí | `SDK/dist/core/extensions/loader.js:685-697`; `SDK/docs/settings.md` §Resources |
| CLI por invocación | `-e/--extension <path>` (repetible) | **No** | `SDK/docs/cli.md:194-196`; «Resource paths apply only to the current process» `SDK/docs/cli.md:224` |

Orden de carga: proyecto → usuario → configurados → CLI, con dedupe por ruta resuelta (`SDK/dist/core/extensions/loader.js:668-678`, `seen`/`addPaths`). Los built-in van en una pasada final porque una extensión ya cargada no se puede descargar (`SDK/dist/core/resource-loader.js:503-505`).

### 1.2 Resolución de una extensión: el algoritmo exacto

`resolveExtensionEntries(dir)` (`SDK/dist/core/extensions/loader.js:593-620`), duplicado idéntico en `SDK/dist/core/package-manager.js:381-407`:

```
1. si existe <dir>/package.json Y pkg.pi.extensions es un array de strings no vacío
     → devuelve esas rutas (resueltas contra <dir>), SOLO las que existen
2. si no, si existe <dir>/index.ts   → [<dir>/index.ts]
3. si no, si existe <dir>/index.js   → [<dir>/index.js]
4. si no                             → null
```

`readPiManifest` (`SDK/dist/core/pi-manifest.js:3,7-24`) **solo** reconoce `pkg.pi.{extensions,skills,prompts,themes}` y solo si son arrays de strings; si `pkg.pi` no es objeto devuelve `null`. No hay `pi.json`, no hay `main`-como-extensión, no hay convención sobre `src/`.

`discoverExtensionsInDir(dir)` (`SDK/dist/core/extensions/loader.js:632-657`): ficheros `.ts`/`.js` directos + subdirectorios **de un solo nivel** pasados por `resolveExtensionEntries`. Comentario literal: *«No recursion beyond one level. Complex packages must use package.json manifest.»* Los symlinks se resuelven por `statSync` (`loader.js:641-648`).

### 1.3 Resolución de un `packages` entry

`resolvePackageSources` (`SDK/dist/core/package-manager.js:1000-1058`) clasifica la fuente:

- **`local`** → `resolveLocalExtensionSource` (`:1067-1092`). Si es **fichero**, se añade como extensión directa. Si es **directorio**, se llama a `collectPackageResources`; y aquí está el detalle que importa:

```js
// SDK/dist/core/package-manager.js:1079-1086
if (stats.isDirectory()) {
    metadata.baseDir = resolved;
    metadata.packageRoot = resolved;
    const resources = this.collectPackageResources(resolved, accumulator, filter, metadata);
    if (!resources) {
        this.addResource(accumulator.extensions, resolved, metadata, true);   // ← el DIRECTORIO como extensión
    }
}
```

`collectPackageResources` (`:1848-1885`): con manifiesto `pi` → entradas del manifiesto; sin manifiesto → recorre los directorios convencionales `extensions/`, `skills/`, `prompts/`, `themes/` (`RESOURCE_TYPES`, `:71`) y devuelve `hasAnyDir`. **Si el paquete no tiene ni manifiesto `pi` ni ninguno de esos cuatro directorios, devuelve `false`** y el propio directorio raíz entra como ruta de extensión.

- **`npm`** → `getNpmInstallPath`; si falta o la versión no coincide, instala (salvo `PI_OFFLINE`, `:1016-1029`). Raíz gestionada: `AGENT/npm/` con `package.json` `{name:"pi-extensions", private:true, dependencies:{"pi-mcp-adapter":"^6.0.0"}}` (`AGENT/npm/package.json`).
- **`git`** → clonado y reconciliado al ref fijado (`:1042-1057`).

Identidad/dedupe: npm por nombre, git por URL sin ref, local por ruta absoluta resuelta (`SDK/docs/packages.md` §Understand scope and identity; `SDK/dist/core/package-manager.js:1114-1124`). Proyecto gana a usuario, salvo `autoload:false` que actúa como delta de filtrado (`:1060-1066`).

### 1.4 Carga del módulo: jiti, y por qué las dependencias del host no se duplican (casi nunca)

`loadExtensionModule` (`SDK/dist/core/extensions/loader.js:461-487`):

```js
const resolutionOptions = usesEmbeddedModules
    ? { virtualModules: await getVirtualModules(), tryNative: false }
    : isTypeScriptSourceRuntime
        ? { virtualModules: await getVirtualModules(), tsconfigPaths: true }
        : { alias: getAliases() };
const jiti = createJitiImpl(import.meta.url, { moduleCache: false, ...resolutionOptions });
const module = await jiti.import(extensionPath, { default: true });
```

Tres regímenes (`loader.js:18-22`): binario Bun/SEA/Node empaquetado → `virtualModules`; runtime en TypeScript fuente → `virtualModules` + `tsconfigPaths`; Node sin empaquetar → `alias`. El binario vivo es un bundle ESM con shebang `node`, así que cae en el régimen de módulos embebidos/virtuales.

`getAliases()` (`loader.js:36-84`) redirige al propio host: `@earendil-works/pi-coding-agent`, `pi-agent-core`, `pi-tui`, `pi-ai` (+`/compat`, `/oauth`, `/providers/all`), `typebox` (+`/compile`, `/value`), y los alias legacy `@mariozechner/*`. **Consecuencia práctica:** una extensión que importe el SDK recibe la copia del host, no la suya. Pero `SDK/docs/packages.md` §Declare dependencies advierte explícitamente que listar esos paquetes en `dependencies` «can bypass Pi's extension module mapping in compiled ESM and create duplicate classes, registries, and initialization work», y que Pi emite un warning al detectarlo (`SDK/dist/core/resource-loader.js:510`, `collectExtensionPackageWarnings`).

### 1.5 Contrato del módulo y ciclo de vida

- **Export obligatorio:** `export default function (pi: ExtensionAPI)`, síncrona o asíncrona. Si el default no es función → `loader.js:482-484` devuelve `undefined` y `loader.js:530` produce `"Extension does not export a valid factory function: <path>"`.
- **Ejecución:** `initializeExtension` (`loader.js:508-521`) → `await factory(load.api)` → `load.commit()`; si lanza, `load.discard()` desuscribe todo lo registrado durante la carga. La carga es **atómica por extensión**.
- **La factory es awaited antes de continuar el arranque** (`SDK/docs/extensions.md` §Respect the runtime lifecycle): puede registrar providers necesarios en startup. Es exactamente lo que hace el router (`R/extension.ts:57,116`).
- **Prohibido** arrancar procesos, sockets, watchers o timers en la factory: «some invocations load extensions without starting a session». Recursos long-lived → `session_start`; cierre → `session_shutdown` **idempotente** (cancelación, reload, reemplazo de sesión y salida de proceso convergen en el mismo camino).
- **Fronteras accionables:** `turn_end` y `agent_before_settle` pueden encadenar entradas y pedir **una** continuación; `agent_settled` es final y solo notificativo.
- **Concurrencia interna:** las tool calls de un mismo mensaje assistant pueden correr **en paralelo**; los handlers de eventos se esperan en orden de registro. `withFileMutationQueue()` es el primitivo recomendado para herramientas que mutan ficheros.
- **Fallos:** un fallo en un handler `tool_call` **bloquea** la herramienta (fail-safe); un fallo de ejecución de herramienta se convierte en resultado de error para el modelo (`SDK/docs/extensions.md` §Errors and cleanup). `pi-memory` se apoya en esto: `M/hooks.ts:52-56` lanza para bloquear `user_bash`.
- **Aislamiento:** ninguno. «An extension runs inside the Pi process with the same operating-system permissions.»

### 1.6 Dónde vive la configuración y cómo se aísla

`getAgentDir()` (`SDK/dist/config.js:491-497`):

```js
const envDir = process.env[ENV_AGENT_DIR];      // ENV_AGENT_DIR = "PI_CODING_AGENT_DIR"  (config.js:476)
if (envDir) return expandTildePath(envDir);
return join(homedir(), CONFIG_DIR_NAME, "agent");   // CONFIG_DIR_NAME = pkg.piConfig?.configDir || ".pi"  (config.js:473)
```

Variables de proceso (`SDK/docs/environment-variables.md` §Pi Process Configuration): `PI_CODING_AGENT_DIR` (sustituye todo el agent dir), `PI_CODING_AGENT_SESSION_DIR` (sesiones; `--session-dir` gana), `PI_PACKAGE_DIR` (directorio de paquetes), `PI_OFFLINE`, `PI_SKIP_VERSION_CHECK`. Todo lo demás cuelga de `getAgentDir()`: `settings.json`, `auth.json`, `models.json`, `extensions/`, `skills/`, `prompts/`, `themes/`, `sessions/` (`SDK/dist/config.js:500-532`).

> **Corrección de una premisa del encargo.** `AGENT/profiles/default.json` **no es un perfil de Pi**. Pi no tiene el concepto: no aparece `profiles` en `SDK/dist/config.js` ni en `settings-manager.js`, y el fichero contiene `provider.adapter`/`accounts`/`quotaGroups`/`policies` con la nota «Migrated from account-router.json on 2026-10-12». Además, `R/config.ts:153-171` (`loadConfig`) lee `<agentDir>/account-router.json` o `PI_ACCOUNT_ROUTER_CONFIG`, y `grep -rn "profiles" R/src` **no devuelve ninguna lectura**. Es un artefacto huérfano (ver S2-11).

### 1.7 Cómo cargar `pi-memory` sin tocar la config viva

Estado del manifiesto de `pi-memory` (`/Users/ruben/Code/PI-agent/src/pi-memory/package.json`):

| Campo | Valor | Línea | Consecuencia |
|---|---|---|---|
| `pi` | **ausente** | — | `readPiManifest` → `null`; no hay entradas declaradas |
| directorios convencionales | **ninguno** (`extensions/`, `skills/`, `prompts/`, `themes/` no existen) | — | `collectPackageResources` → `false` |
| `main` / `types` | `./src/index.ts` | `:8-9` | Pi **no** los usa para extensiones |
| `exports` | `.` → `./src/index.ts`, `./*` → `./src/*.ts` | `:10-13` | ídem |
| `dependencies` | `@earendil-works/pi-coding-agent: 1.3.0`, `@pi-agent/intermediate: file:../pi-intermediate`, `typebox` | `:22-26` | host en `dependencies` (debería ser `peerDependencies`, ver S2-07) |
| `keywords` | incluye `pi-package` | `:28` | solo afecta a la galería, no a la carga |

Y `M/index.ts:8-41` es un **barrel puro de `export *` sin default export**. La fábrica correcta está en `M/extension.ts:31`.

**Resultado de añadirlo a `packages` tal cual está:** cadena `resolveLocalExtensionSource` → `collectPackageResources` devuelve `false` → se añade el directorio raíz → `discoverAndLoadExtensions` lo pasa por `resolveExtensionEntries` (sin `pi`, sin `index.ts` en raíz → `null`) → `discoverExtensionsInDir` encuentra el subdirectorio `src/` con `src/index.ts` → se carga el barrel → **`"Extension does not export a valid factory function"`**. Es decir: hoy `pi-memory` **no es cargable como paquete**, y el fallo sería un error de carga, no un crash.

**Mecanismo recomendado (aislado, reversible, sin escribir en `AGENT/settings.json`):**

```bash
# A) Una sola invocación, sobre el agent dir vivo (hereda auth/models/router):
/opt/homebrew/bin/pi -e /Users/ruben/Code/PI-agent/src/pi-memory/src/extension.ts

# B) Aislamiento total de estado (agent dir propio, nada toca ~/.pi):
PI_CODING_AGENT_DIR=/tmp/pi-mem-audit/agent \
PI_CODING_AGENT_SESSION_DIR=/tmp/pi-mem-audit/sessions \
PI_CORE_DB=/tmp/pi-mem-audit/memory.sqlite \
/opt/homebrew/bin/pi -e /Users/ruben/Code/PI-agent/src/pi-memory/src/extension.ts
```

- (A) usa `-e`, que es **por proceso** y no escribe settings (`SDK/docs/cli.md:194-196,224`; `SDK/docs/packages.md`: «Use `--extension` or `-e` to try a package for one invocation without adding it to settings»). Apunta al **fichero** con default export, no al paquete.
- (B) añade `PI_CODING_AGENT_DIR` (`SDK/dist/config.js:476,491-497`), que desvía settings/auth/models/sessions/extensions a otro árbol. Ojo: un agent dir vacío implica sin `auth.json` ni `models.json`, así que para probar solo memoria conviene `-ne` y no esperar proveedor; o copiar `auth.json`/`models.json` al dir temporal.
- `PI_CORE_DB` es **obligatorio** para que la memoria sea durable: `M/extension.ts:32` pasa `process.env.PI_CORE_DB || undefined` y `M/core.ts:49` hace `openDb(opts.dbPath ?? ":memory:")`. Sin él, toda la capa de memoria es volátil (S2-02).
- Con `-ne` se desactivan descubiertas, configuradas y built-in, pero las `-e` explícitas siguen cargando (`SDK/docs/cli.md:197`). Útil para medir `pi-memory` sin `pi-mcp-adapter` ni `capabilities-footer`.
- Para una prueba repetible sin CLI: `.pi/settings.json` en un cwd de pruebas con `packages: ["<ruta absoluta a pi-memory>"]`, bajo trust de proyecto (`SDK/docs/configuration.md` §Project `.pi` directory). Requiere el arreglo de manifiesto de S2-07.

**Arreglo mínimo para que sea cargable como paquete** (una línea en `pi-memory/package.json`, misma forma que el router en `/Users/ruben/Code/PI-agent/src/pi-account-router/package.json:24-27`):

```json
"pi": { "extensions": ["./src/extension.ts"] }
```

Contraste: `ADAPTER/package.json` declara `pi.extensions: ["./index.ts"]` y el router `["./src/extension.ts"]`; ambos cargan. `pi-memory` no declara nada.

---

## 2. Topología de procesos

### 2.1 Hoy (verificado sobre el estado vivo)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PROCESO ÚNICO  pi  (bundle ESM sobre node v26.5.0, UID ruben, sin sandbox)        │
│ /opt/homebrew/bin/pi → LIVE/dist/bundle/cli.js                                    │
│                                                                                    │
│  ┌── Núcleo Pi: session manager, model runtime, compaction, tools built-in ──────┐ │
│  │                                                                               │ │
│  │  EXTENSIONES IN-PROCESS (mismos permisos que Pi)                              │ │
│  │  ├─ pi-account-router      R/extension.ts:116 registerProvider()  ← packages  │ │
│  │  │    · AccountRouter + FileStateStore + RoutedStreams + episode store        │ │
│  │  │    · sanitizeTranscript en pi.on("context")   R/extension.ts:119           │ │
│  │  ├─ pi-mcp-adapter@6.0.0   ADAPTER (pi.extensions: ./index.ts)    ← packages  │ │
│  │  │    · sustituye al built-in: settings tiene "extensions":["-builtin:mcp"]    │ │
│  │  ├─ AGENT/extensions/skill-router.ts            ← descubrimiento usuario      │ │
│  │  ├─ AGENT/extensions/registry-search.ts         ← descubrimiento usuario      │ │
│  │  └─ AGENT/extensions/capabilities-footer → SYMLINK a /Users/ruben/Code/FLYBOX/src │
│  │                                                                               │ │
│  │  NO CARGADOS (no declarados en packages ni extensions):                       │ │
│  │  ✗ pi-memory   ✗ pi-intermediate (solo entra como librería de pi-memory)      │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│              │ stdio (spawn)                       │ HTTPS                          │
└──────────────┼─────────────────────────────────────┼────────────────────────────────┘
               ▼                                     ▼
   servidores MCP stdio                    · https://googledrive.run.tools/
   (según mcp.json / adapter)              · https://api.you.com/mcp  (you-key-1, you-key-2, api[disabled])
                                           · proveedor agnes vía AccountRouter (baseUrl de account-router.json)

PERSISTENCIA EN AGENT/  (todo fichero plano o SQLite; ningún daemon propietario)
  sessions/<cwd-slug>/*.jsonl     54 dirs, 132 ficheros   árbol id/parentId, version 3
  account-router-state/<sha256(baseUrl)[0:24]>.json  0600, dir 0700   + episodes.json + *.tmp huérfano
  mcp-cache.json      597.885 B, 13 servidores, sin ttlMs
  capabilities.json   200.429 B        models-store.json  78.150 B (0600)
  auth.json (0600)     models.json (0600)     trust.json (5 rutas)     crashes.json
  settings.json        mcp-adapter.json       npm/ (raíz npm gestionada)   profiles/default.json (huérfano)
  bin/fd               logs/  backups/  prompts/  scripts/
```

Hechos de proceso relevantes:

- **Todo lo que hoy ejecuta lógica propia corre dentro del proceso de Pi**, con sus permisos y su vida. No hay gateway HTTP: `grep -rn "node:http\|createServer\|listen(\|Bun.serve\|express" M I` → **cero resultados**. `I/gateway.ts:44-62` es un dispatcher *en proceso* sobre `Route` con `BASE = "/v1"`, que deriva OpenAPI 3.1 y definiciones MCP de las mismas rutas. Es un contrato, no un servidor.
- El único transporte fuera de proceso que existe en la suite de memoria es **stdio JSON-RPC**: `M/memory-mcp-server.ts:283-285` (`opts.input ?? process.stdin`, `opts.output ?? process.stdout`, `createInterface`), con `MCP_PROTOCOL_VERSION = "2024-11-05"` (`:13`).
- Los procesos externos reales hoy son los **servidores MCP** (stdio spawn o HTTPS remoto) y el **proveedor de inferencia** detrás del AccountRouter.
- En el momento de la auditoría había un proceso `pi` vivo (PID 35585) con un ticket en `waiters` del estado del router: prueba de que el fichero de estado es compartido entre procesos concurrentes en la práctica, no solo en teoría.

### 2.2 Tras la extracción en anillos (propuesta)

```
ANILLO-0 · KERNEL (autoridad, evidencia, una sola escritura)
  proceso propio, dueño exclusivo del almacén durable
  ┌────────────────────────────────────────────────────────────┐
  │ ledger append-only + hash-enlazado + firma (M/memory-ledger) │
  │ claves FUERA del almacén editable (hoy: M/memory-stack.ts:19-27) │
  │ checkpoints + ancla de cabeza custodiada                     │
  │ ámbito/tenant prefijado en el puerto, no en la petición      │
  │ unidad de trabajo: datos + índices + evidencia (una transacción) │
  └────────────────────────────────────────────────────────────┘
        ▲  única vía de escritura (comandos)         │ proyecciones de lectura
        │                                            ▼
ANILLO-1 · GATEWAY (I + implementaciones)
  ┌────────────────────────────────────────────────────────────┐
  │ Gateway/Route (I/gateway.ts) + IdempotencyStore + Tracer     │
  │ CircuitBreaker/Registry → routerMode "full"|"bm25-only"      │
  │   (I/reliability.ts:63-158)                                  │
  │ MemoryFabric como vista materializada (M/fabric.ts)          │
  │ TokenRing/knapsack (I/token-ring.ts)                         │
  │ SandboxSPI: Gondolin/Srt/Seatbelt/Bwrap (I/sandbox.ts)       │
  │ SERVIDO por: stdio MCP  |  HTTP  |  llamada en proceso       │
  └────────────────────────────────────────────────────────────┘
        ▲                    ▲                     ▲
        │                    │                     │
ANILLO-2 · CONNECTIONS (adaptadores por host, sin autoridad)
  ┌───────────────┐  ┌────────────────┐  ┌──────────────────────┐
  │ Pi extension  │  │ Qwen hook/MCP  │  │ AccountRouter provider│
  │ M/extension.ts│  │ + qwen serve   │  │ R/extension.ts        │
  │ (thin adapter)│  │ (out-of-process)│ │ (in-process, Pi)      │
  └───────────────┘  └────────────────┘  └──────────────────────┘
```

**Cómo cambian los tres invariantes del dossier** (`DOSSIER/04-continuidad.md` §2 y `DOSSIER/08-delta-recomendado.md` §2-3):

| Invariante | Hoy (todo in-process) | Tras anillos | Delta exigido |
|---|---|---|---|
| **Cableado** | Cuatro escritores distintos: tool→Fabric (`M/fabric.ts:101`), gateway→Control (`M/memory-gateway.ts:42`), hooks→Control (`M/hooks.ts:100`), flush de compactación→Store (`M/plane.ts:74`). | Un único dueño de escritura en anillo-0; anillo-1 expone comandos; anillo-2 solo traduce eventos del host. | **D01**: todas las mutaciones por el servicio de comandos de Fabric. Cerrar `plane.ts:74` y `memory-gateway.ts:42`. |
| **Ámbito** | `search` compone tenant, pero `get`/`forget` por ID delegan sin comprobarlo (`M/memory-control.ts:136-138`, `:163`); `nearest` filtra **después** de `peek` (`:139-157`). | Backend construido ya acotado al principal obtenido de contexto confiable; `peek` autorizado antes de lecturas con efectos. | **D02**: ámbito en el puerto de almacenamiento, no solo en search. Mantenimiento sin variante scoped → no soportado o denegado, nunca caída a la operación global. |
| **Atomicidad** | `Fabric.save` = `control.save()` **y luego** `ledger.append()` (`M/fabric.ts:101-115`), dos escrituras independientes. `MemoryStore` no abre ninguna transacción: `grep -n "BEGIN\|COMMIT\|ROLLBACK\|transaction" M/memory.ts` → **0 resultados**. `restore`/`replaceAll`/`importAll` son secuencias de statements sueltos (`M/memory.ts:315-397`). | Una unidad de trabajo sobre la misma conexión: revisión previa + memoria nueva + FTS + vector + evento + idempotencia. | **D03**. En backend remoto, capacidad equivalente o protocolo de conciliación explícito: **no** envolver una llamada remota en un `BEGIN` local y llamarlo atómico. |
| **Replay** | `replay()` interpreta solo `memory.save`/`memory.forget` y termina en `store.replaceAll(rows)` (`M/fabric.ts:207-227`, `M/memory.ts:370-374`) → destructivo, sin ámbito, sin comprobación de completitud. | Checkpoint validado + eventos que representan **todos** los cambios; historial parcial/corrupto/esquema desconocido → detener antes de borrar. | **D04**: no habilitar reemplazo destructivo como garantía de recuperación hasta tener cobertura completa. |
| **Firma** | Clave privada Ed25519 en la tabla `meta` de la **misma** DB que firma (`M/memory-stack.ts:19-27`). `eventHash` cubre 10 campos (`M/memory-ledger.ts:82-84`) y deja fuera `content`, `ref`, `sourceHarness`, `privacyClass`, `idempotencyKey`, `schemaVersion`, `signature`. | Objeto firmable versionado con los campos relevantes; material de confianza fuera del almacén editable; cabeza/checkpoint anclados fuera y comparados al abrir/restaurar. | **D05**. API append-only **no** es custodia frente a un escritor capaz de cambiar la historia. |

---

## 3. Persistencia y concurrencia de la memoria

### 3.1 Backend SPI: qué existe de verdad

`MemoryBackend` (`M/memory-spi.ts:20-49`) con `capabilities(): {graph, bitemporal, rerank, embeddings, ann}` y capacidades opcionales (`snapshot`/`restore`, `snapshotScoped`/`restoreScoped`, `consolidate`, `forgetBySalience`, `saveCheckpoint`/`getCheckpoint`/`listCheckpoints`/`pruneCheckpoints`, `vectorOf`/`nearest`).

| Backend | Implementación | Capacidades declaradas | Ámbito | Concurrencia |
|---|---|---|---|---|
| `local-first` | `M/memory-spi.ts:60` sobre `MemoryStore` (`node:sqlite` + FTS5 + vectores deterministas, esquema en `I/db.ts:7-...`) | `{graph:false, bitemporal:true, rerank:false, embeddings:true, ann:true}` (`:76-78`) | `scope`/prefijo en columna, compuesto en `search` | **Ninguna explícita.** Una conexión `DatabaseSync`, síncrona |
| `cloud-sql` | `M/memory-cloud.ts:45` sobre `SqlExecutor` inyectable (`:9-12`); Postgres en prod, fake en CI | `{graph:false, bitemporal:true, rerank:false, embeddings:false, ann:false}` (`:59-61`) | Predicado `tenant` en **cada** consulta + RLS en la DB (`:44`); cuota fail-closed `QuotaExceededError` (`:63-66`) | Delegada al servidor SQL |
| MCP espejo | `MirrorMcpBackend`, documentado en `/Users/ruben/Code/PI-agent/src/pi-memory/docs/OPERATIONS.md:27-28`: lecturas locales, escrituras **asíncronas**, circuit breaker, `refresh()` para tirar del servidor | — | — | Escritura asíncrona = ventana de divergencia |

Selección y negociación (`M/memory-stack.ts:76-90,113-149`): `memory.backend` (`local` por defecto, `:124`); `cloud` sin `sqlExecutor`/`tenant` → **nota y caída silenciosa a local-first** (`:85-89`). `negotiate()` (`M/memory-spi.ts:174-181`) degrada a `"fts-vec"` si falta una capacidad requerida; `createMemoryStack` solo exige `{bitemporal:true}` (`:141`), así que `graph`/`rerank`/`ann` ausentes **no** marcan degradación por esa vía (sí por `notes.length > 0`, `:144`).

### 3.2 Apertura de la base de datos: lo que falta

`I/db.ts:283-288`:

```js
export function openDb(path: string = ":memory:"): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  migrate(db);
  return db;
}
```

No hay `PRAGMA journal_mode=WAL`, ni `busy_timeout`, ni `synchronous`. Migraciones versionadas y reversibles sí existen (`I/db.ts:259-281`, tabla `schema_migrations`). Contraste con el router, que sí resuelve concurrencia entre procesos con lockfile + tmp + `fsync` de fichero **y** de directorio (`R/adapters/file-state-store.ts:174-260`).

### 3.3 Matriz de concurrencia

| Escenario | Qué pasa hoy | Evidencia |
|---|---|---|
| Dos sesiones Pi con el mismo `PI_CORE_DB` | Sin `busy_timeout`, el segundo escritor recibe `SQLITE_BUSY` de inmediato; sin transacciones, una secuencia `hardDelete`+`INSERT`+`refFts`+`ensureVector` puede quedar a medias | `I/db.ts:283-288`; `M/memory.ts:300-397` |
| Sesión Pi + consolidación sleep-time | La consolidación **no** es sleep-time en el sentido de fuera de proceso: se dispara en `session_before_compact`, síncrona, dentro del proceso de Pi (`M/extension.ts:161-177` → `M/hooks.ts:127-141` → `M/memory-control.ts:163-...`). Dos Pi concurrentes consolidando el mismo fichero = dos escritores sobre `archive`/`upsert` sin coordinación | `M/memory-consolidate.ts:21-69` |
| Escritura vía gateway HTTP/MCP + vía tool | Caminos distintos al mismo Store; el del gateway no deja evento en el ledger | `M/memory-gateway.ts:42`; `M/fabric.ts:101-115`; **D01** en `DOSSIER/08-delta-recomendado.md` §3 |
| Replay concurrente con una sesión activa | `replaceAll` borra por ID todo lo que no está en el ledger reconstruido, sin ámbito | `M/fabric.ts:207-227`; `M/memory.ts:370-374` |
| Múltiples procesos Pi sobre el estado del router | **Resuelto**: `proper-lockfile` con `stale:10000, update:2000, retries:0`, deadline de 10 s, `onCompromised` → `RouterError("state", …)`; las transacciones de solo lectura no reescriben el fichero para no realimentar watchers | `R/adapters/file-state-store.ts:174-199`, `:224-231` |
| Checkpoints de consolidación | Se escriben **antes** de la mutación (correcto), en memoria y en durable; pero el `Map` en memoria y la tabla pueden divergir tras un reinicio, y `pruneCheckpoints` corre después | `M/memory-control.ts:163-200` |

### 3.4 Qué exige anillo-0 para serializar autoridad

1. **Un solo escritor por almacén, impuesto y no declarado.** `M/memory-ledger.ts:5` dice «Un solo escritor por ledger (single-writer); los demás leen», pero nada lo impone: no hay lock, ni `O_EXCL`, ni PID, ni lease. El router sí tiene el patrón (`R/adapters/file-state-store.ts:174-199`) y es reusable.
2. **Ámbito prefijado en el puerto**, no derivado del cuerpo de la petición (**D02**).
3. **Unidad de trabajo** que incluya los efectos secundarios del Store —FTS, vector, evento, idempotencia— en la misma conexión (**D03**).
4. **Clave de firma fuera del almacén que firma**, y ancla de cabeza custodiada fuera del alcance de quien puede reescribir historia (**D05**).
5. **Replay no destructivo** hasta que el historial cubra todos los cambios y se valide completitud/custodia (**D04**).
6. **Idempotencia por comando** en la frontera de anillo-1: `I/gateway.ts` ya importa `IdempotencyStore` de `I/contract.ts` (`:8`), y el ledger ya lleva `idempotencyKey` (`M/memory-ledger.ts:26,39`). Falta conectarlos a la unidad de trabajo.

---

## 4. Modos de fallo

### 4.1 Pi muere a mitad de consolidación

Camino real: `session_before_compact` (`M/extension.ts:161-177`) → `beforeCompact` (`M/hooks.ts:127-141`) → `flushBeforeCompact` (**escribe directo en Store**, `M/plane.ts:65-76`) → `core.memoryFabric.consolidate()` (`M/fabric.ts:182-193`) → `control.consolidate()` (`M/memory-control.ts:163-...`) → `backend.consolidate()` → `consolidate(store)` (`M/memory-consolidate.ts:21-69`).

`M/memory-consolidate.ts` hace, en bucles separados y sin transacción: `store.archive(dup.id)` por cada duplicado (`:36`) y `store.upsert({...})` por cada resumen de grupo (`:57-66`). Una muerte entre medias deja **archivados parciales y resúmenes a medias**.

- **Lo que salva:** el checkpoint se graba **antes** (`M/memory-control.ts:170-190`), con snapshot y firma, así que `rollback(checkpoint)` puede restaurar. La consolidación es idempotente por `contentHash` y por `id = sum_<sha256(key|body)>` con comprobación previa (`M/memory-consolidate.ts:33-37,53-55`).
- **Lo que no salva:** el rollback **no es automático**. Solo ocurre en `session_start` si `memory.rollbackOnStart === "true"` (`M/hooks.ts:100-103`). Por defecto, el estado parcial persiste.
- **Lo que lo agrava:** si `PI_CORE_DB` no está definido, la DB es `:memory:` (`M/core.ts:49`) y no hay nada que recuperar ni nada que perder: la capa de memoria entera desaparece con el proceso.
- **Evidencia empírica del mismo patrón en el router:** `AGENT/account-router-state/e592ff32df1fbb1186fde4f8.json.d656e6f5-c318-49a9-83a0-e9f65aeaf744.tmp`, 1.260 B, modo 0600, mtime **2026-10-19 10:41:51**, junto al fichero comprometido con mtime 2026-10-25 09:13:19. El `finally { if (temporary) await unlink(temporary) }` (`R/adapters/file-state-store.ts:257-258`) no llegó a ejecutarse: el proceso murió dentro de la ventana de commit. El diseño aguanta (el estado bueno sigue ahí, `rename` es atómico), pero queda residuo 0600 y **se pierde silenciosamente el commit en vuelo** —no hay journal de intención que permita distinguirlo de «no se intentó».

### 4.2 El pool de cuentas agota cuota

Configuración viva observada: 5 grupos (`agnes-free` + 4 pools), cada uno `maxConcurrent: 1` y `limits: [{requests: 10, windowMs: 60000}]`; `disabledAccountIds: []`; `leases: []`; `waiters: [1 ticket con pid vivo]`.

- **Agotamiento de ventana:** el grupo entra en `cooldownUntil` y el router espera/prueba otro grupo. Con `maxConcurrent: 1` por grupo y 4 cuentas, el techo efectivo es 4 inferencias concurrentes y ~40 req/min agregadas.
- **Bloqueo del lock de estado:** tras 10 s de deadline → `RouterError("state", "Cannot acquire account router state lock.")` (`R/adapters/file-state-store.ts:193-195`). Es **fail-closed**: no se ejecuta la petición sin contabilidad de cuota.
- **Estado corrupto:** `corrupt()` lanza «Account router state is corrupt; refusing to reset quota history.» (`:25-30`). Fail-closed deliberado: prefiere inutilizar el router a reiniciar el historial de cuota. La validación es exhaustiva (claves exactas, `safeId`, `timestamp`, `pid !== 0`, `latEWMA` finito no negativo, `waiters.length <= 10000`) en `:32-135`.
- **Disponibilidad del proveedor:** `available()` devuelve el conjunto de cuentas resolubles; si está vacío, `auth.apiKey.check`/`resolve` devierten `undefined` y aíslan el fallo con `try/catch` (`R/extension.ts:83-108`). Pi lo ve como «proveedor no disponible», no como error.
- **Riesgo residual:** los tickets de `waiter` llevan `pid` y el comentario de `R/adapters/file-state-store.ts:45-50` afirma que «prepareState purges dead pids». **No verifiqué esa purga en el código** (ver Lagunas). Si un proceso muere dejando ticket, y la purga no cubre `waiters`, el grupo puede quedar con un contador de espera fantasma.

### 4.3 Staleness del cache MCP

`ADAPTER/metadata-cache.ts:251-278`, `isServerCacheValid(entry, definition, maxAgeMs = 0, environment)`:

```
:254  // 0 means no age limit: without a server-declared TTL, an entry stays valid until the next connect refreshes it.
:264  configHash distinto            → inválido
:265  cachedAt ausente/no numérico    → inválido
:267  cacheScope === "private"        → inválido
:268  discoveryFailed                 → inválido
:269-275  si entry.ttlMs es número ≥0 → 0 = inválido; si no, age < min(maxAge, ttl)
:276  si maxAgeMs > 0 y age > maxAge  → inválido
:277  en otro caso                    → VÁLIDO
```

`computeServerHash` (`:143-158`) hashea solo lo que afecta a identidad y salida de tools: `command`, `args`, `socket`, `env` (interpola salvo `literalEnv`), `inheritEnv`, `cwd`, `url`, `headers`, `requestHeadersCommand`. Excluye a propósito `lifecycle`, `idleTimeout`, `requestTimeoutMs`, `debug`.

Estado vivo de `AGENT/mcp-cache.json` (597.885 B, 13 servidores):

| Servidor | `cachedAt` | `ttlMs` | tools | `discoveryFailed` |
|---|---|---|---|---|
| stitch | 2026-10-03 11:35 | **ausente** | 17 | false |
| notebooklm | 2026-10-09 18:17 | ausente | 20 | false |
| obsidian | 2026-10-09 18:18 | ausente | 12 | false |
| googledrive | 2026-10-09 19:40 | ausente | 22 | false |
| you-official | 2026-10-11 00:04 | ausente | 4 | false |
| youdotcom--brian-ifpw | 2026-10-11 01:00 | ausente | 0 | **true** |
| vault | 2026-10-12 05:53 | ausente | 16 | false |
| jart-cortex | 2026-10-12 13:22 | ausente | 75 | false |
| codegraph | 2026-10-17 09:54 | ausente | 1 | false |
| api | 2026-10-23 05:58 | ausente | 4 | false |
| openspec | 2026-10-25 05:50 | ausente | 40 | false |
| you-key-1 / you-key-2 | 2026-10-25 07:51 / 07:52 | ausente | 5 / 5 | false |

**Ninguna entrada declara `ttlMs`, y `maxAgeMs` por defecto es 0 → las 12 entradas no fallidas son válidas indefinidamente mientras el `configHash` no cambie.** `stitch` lleva 22 días servido desde cache. Un servidor remoto que cambie sus tools/schemas sin que cambie la configuración local sigue describiéndose al modelo con metadatos de hace tres semanas: el modelo invoca herramientas que ya no existen o con esquemas distintos. El fallo es silencioso porque solo se manifiesta en el `tools/call`.

Mitigación existente: la reconexión refresca (`ADAPTER/init.ts:694-736` reescribe `configHash`, tools, resources, prompts, `cachedAt: Date.now()`), y `discoveryFailed` se invalida a sí mismo (`:268`) forzando redescubrimiento. Pero nada acota la edad máxima por política local.

### 4.4 Otros fallos observados

- **Extensión que tumba el proceso.** `AGENT/crashes.json` registra `kind: "uncaught_exception"`, `message: "Unknown theme color: #60aaff"`, con stack en `/Users/ruben/.pi/agent/extensions/capabilities-footer.ts:129` → `:185` dentro de `render`. Es la consecuencia directa de que las extensiones corran in-process sin aislamiento: un error de render en el footer mató Pi (v1.0.3).
- **Symlink a código externo no auditado.** `AGENT/extensions/capabilities-footer` es un symlink a `/Users/ruben/Code/FLYBOX/src`. `discoverExtensionsInDir` sigue symlinks (`SDK/dist/core/extensions/loader.js:641-648`), así que **todo árbol externo que ese directorio resuelva se carga en cada arranque de Pi**, fuera del alcance de esta auditoría y de cualquier revisión de `PI-agent`.
- **Fallo de herramienta de memoria.** `M/extension.ts:49,69` lanzan `"sandbox required (PI_CORE_SANDBOX_ALL=1) but unavailable"`: fail-closed correcto, y la semántica de Pi lo convierte en bloqueo de `user_bash` / resultado de error de tool.
- **Cierre best-effort.** `sessionShutdown` traga excepciones (`M/hooks.ts:143-148`): el olvido por salience puede no ocurrir y no queda constancia.

### 4.5 Qué debe garantizar cada anillo

| Anillo | Fail-closed obligatorio | Degradable | Prohibido |
|---|---|---|---|
| **0 · Kernel** | Ámbito/tenant no verificable → denegar. Historial incompleto/corrupto/esquema desconocido → **detener antes de borrar**. Firma requerida ausente → rechazo, no «firma válida». Cabeza por debajo del ancla → cuarentena. Unidad de trabajo fallida → todo revertido. | Nada: es la autoridad. | Reemplazo destructivo como recuperación por defecto. Clave de firma dentro del almacén firmado. Recalcular scores/tiempos como si fueran los de origen. |
| **1 · Gateway** | Sin unidad de trabajo confirmada, no hay recibo. Sin sujeto y alcance en el recibo, rechazo (**D06**). Presupuesto inválido o cero → no inyectar (**D07**). | Rerank/embeddings remotos → `bm25-only` vía `routerMode` (`I/reliability.ts:150-158`), **declarando** el fallback (hashing no es semántica real). Telemetría opcional. | Dos reranks sobre el mismo proveedor (**D08**). Recorrer `store.all()` sin límites o enviar el corpus entero a embeddings. Envolver una llamada remota en `BEGIN` local y llamarlo atómico. |
| **2 · Connections** | Sandbox exigido y no disponible → denegar, nunca ejecución directa (**D10**). Control obligatorio por perfil (p. ej. SCOPE) independiente del score (**D09**). Backend ausente o política no representable → no soportado. | Adaptadores por host con declaración de cobertura por canal/versiones. | Presentar una extensión in-process como si fuera autoridad externa. Aceptar tenant/rol del cuerpo de la petición. Atribuir por nombre de producto un recorrido no verificado. |

Referencia de obligatoriedad: `DOSSIER/08-delta-recomendado.md` §3 (D01–D11) y §5 (orden P0 datos → P0 consistencia → P0 evidencia → P0 gobierno → P1 eficiencia → P1 distribución); `DOSSIER/04-continuidad.md` §2 R05 («sin autorización exigida no hay efecto; sin verificador requerido no hay verificado») y Q14 (política de fallo por dependencia, no regla única).

---

## 5. Hallazgos numerados

Severidad: **Crítica** (rompe un invariante de autoridad/durabilidad) · **Alta** (fallo probable en operación normal) · **Media** (deuda que condiciona la extracción) · **Baja** (higiene).

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| **S2-01** | **Crítica** | La capa de memoria no tiene ningún mecanismo de concurrencia: `openDb` no fija `journal_mode` ni `busy_timeout`, y `MemoryStore` no abre **ninguna** transacción. Cualquier segundo escritor (otra sesión Pi, gateway, consolidación) o recibe `SQLITE_BUSY` inmediato o interleava escrituras parciales. Contrasta con el router, que sí resuelve esto con lockfile + tmp + `fsync` de fichero y directorio. | `I/db.ts:283-288`; `grep "BEGIN\|COMMIT\|ROLLBACK\|transaction" M/memory.ts` → 0 resultados; `M/memory.ts:315-397`; contraste: `R/adapters/file-state-store.ts:174-260` |
| **S2-02** | **Crítica** | `PI_CORE_DB` no está definido en ningún sitio observable, y el default es `:memory:`: la suite de memoria es **volátil por diseño** tal como está cableada. Nada en `AGENT/settings.json`, `AGENT/AGENTS.md` ni en el entorno del proceso la declara. | `M/extension.ts:32`; `M/core.ts:49`; `AGENT/settings.json` (contenido completo verificado, sin `env`) |
| **S2-03** | **Crítica** | La «tamper-evidence» del ledger es forgeable por quien pueda escribir el fichero: la clave privada Ed25519 vive en la tabla `meta` de la misma DB que firma, y `eventHash` excluye `content`, `ref`, `sourceHarness`, `privacyClass`, `idempotencyKey`, `schemaVersion` y `signature`. Anillo-0 no puede reclamar autoridad con este anclaje. | `M/memory-stack.ts:19-27`; `M/memory-ledger.ts:82-84`; coincide con **D05**/V01 en `DOSSIER/08-delta-recomendado.md` §3 |
| **S2-04** | **Crítica** | `replay()` es destructivo, sin ámbito y sin comprobación de completitud: termina en `store.replaceAll()`, que borra por ID todo lo ausente del ledger reconstruido. Como gateway, hooks y flush escriben **fuera** del ledger, un replay elimina registros legítimos y puede reactivar revisiones invalidadas. | `M/fabric.ts:207-227`; `M/memory.ts:370-374`; escritores laterales en `M/memory-gateway.ts:42`, `M/hooks.ts:100`, `M/plane.ts:74`; **D01/D04** |
| **S2-05** | **Alta** | Residuo de un commit interrumpido en producción: `.tmp` huérfano de 1.260 B (0600) del 2026-10-19 junto al estado vivo. Demuestra que la ventana entre `open(tmp,"wx")` y `rename` se ha alcanzado con muerte del proceso, y que no hay journal de intención: un commit perdido es indistinguible de un commit no intentado. Tampoco hay limpieza de `*.tmp` al abrir. | `AGENT/account-router-state/e592ff32df1fbb1186fde4f8.json.d656e6f5-….tmp` (mtime 2026-10-19 10:41:51) vs `.json` (mtime 2026-10-25 09:13:19); `R/adapters/file-state-store.ts:225-258` |
| **S2-06** | **Alta** | `pi-memory` **no es cargable por Pi tal como está**: no tiene manifiesto `pi`, no tiene ninguno de los cuatro directorios convencionales, y el `index.ts` que el descubrimiento acabaría cargando es un barrel sin default export. Añadirlo a `packages` produce un error de carga, no una extensión. | `pi-memory/package.json` (sin clave `pi`; `:8-13`); ausencia de `extensions/`,`skills/`,`prompts/`,`themes/`; `M/index.ts:8-41`; cadena en `SDK/dist/core/package-manager.js:1067-1092` → `:1848-1885` → `SDK/dist/core/extensions/loader.js:593-620` → `:482-484,530` |
| **S2-07** | **Alta** | Skew de versión y dependencia mal declarada: `pi-memory` declara `@earendil-works/pi-coding-agent: 1.3.0` en **`dependencies`** (copia física instalada en su `node_modules`) mientras el Pi vivo es **1.4.0**. La doc del SDK exige `peerDependencies` con `"*"` y avisa de que una copia física «can bypass Pi's extension module mapping … and create duplicate classes, registries, and initialization work». | `pi-memory/package.json:22-26`; `SDK/package.json:3` (`version: 1.3.0`); `/opt/homebrew/bin/pi --version` → `1.4.0`; `SDK/docs/packages.md` §Declare dependencies; warning en `SDK/dist/core/resource-loader.js:510` |
| **S2-08** | **Alta** | El cache MCP no caduca por edad: `maxAgeMs` por defecto 0 y ninguna de las 13 entradas vivas declara `ttlMs`. La única invalidación es por `configHash`. `stitch` lleva 22 días sirviendo metadatos de herramientas. El fallo es silencioso: solo se manifiesta en el `tools/call`. | `ADAPTER/metadata-cache.ts:251-278` (comentario en `:254`), `:143-158`; `AGENT/mcp-cache.json` (13 servidores, `ttlMs` ausente, `cachedAt` desde 2026-10-03) |
| **S2-09** | **Alta** | La consolidación corre **síncrona dentro del proceso de Pi**, en el camino de compactación, y muta sin transacción (archivados y resúmenes en bucles separados). El checkpoint previo permite `rollback`, pero el rollback solo es automático si `memory.rollbackOnStart === "true"`. | `M/extension.ts:161-177`; `M/hooks.ts:127-141` y `:100-103`; `M/memory-consolidate.ts:33-37,53-66`; `M/memory-control.ts:163-200` |
| **S2-10** | **Alta** | Un symlink en `AGENT/extensions/` apunta fuera de todo repo auditado (`/Users/ruben/Code/FLYBOX/src`) y se carga en cada arranque. Ya hay un crash registrado de Pi causado por esa extensión. Las extensiones corren in-process con los permisos del usuario y sin aislamiento. | `ls -la AGENT/extensions/` → `capabilities-footer -> /Users/ruben/Code/FLYBOX/src`; `AGENT/crashes.json` (stack en `capabilities-footer.ts:129`→`:185`); `SDK/dist/core/extensions/loader.js:641-648`; `SDK/docs/extensions.md` §Create and load an extension |
| **S2-11** | **Media** | `AGENT/profiles/default.json` es un artefacto huérfano con forma de autoridad: no lo lee Pi (no existe el concepto `profiles` en `SDK/dist/config.js` ni en `settings-manager.js`) y no lo lee el router (`R/config.ts:153-171` lee `account-router.json` o `PI_ACCOUNT_ROUTER_CONFIG`; `grep -rn "profiles" R/src` → 0). Contiene 4 cuentas y 4 quotaGroups que **no** coinciden con los 5 grupos del estado vivo. Riesgo de editar el fichero equivocado. | `AGENT/profiles/default.json` («Migrated from account-router.json on 2026-10-12»); `R/config.ts:153-171`; `AGENT/account-router-state/e592ff32df1fbb1186fde4f8.json` (5 grupos) |
| **S2-12** | **Media** | `pi-memory/src/intermediate.ts` escapa de la raíz del paquete con una ruta relativa (`../../pi-intermediate/src/index.ts`). Funciona en checkout hermano; se rompe en instalación npm/git, que es justo el modo en que Pi instala `packages`. | `M/intermediate.ts:11`; `SDK/dist/core/package-manager.js:1030-1057`; coincide con **D11** |
| **S2-13** | **Media** | La degradación de backend no es fail-closed: `cloud` sin `sqlExecutor`/`tenant` cae a `local-first` con una nota en `notes[]`. Un perfil que se cree multi-tenant escribe en un fichero local sin ámbito. | `M/memory-stack.ts:85-89`, `:144`; contraste con la cuota fail-closed de `M/memory-cloud.ts:63-66` |
| **S2-14** | **Media** | No existe gateway HTTP: el «gateway» es un dispatcher en proceso. Toda la topología de anillo-1 que asuma un servicio de red hay que construirla; lo único fuera de proceso hoy es el servidor MCP stdio. | `grep -rn "node:http\|createServer\|listen(\|Bun.serve\|express" M I` → 0 resultados; `I/gateway.ts:44-62`; `M/memory-mcp-server.ts:283-285` |
| **S2-15** | **Baja** | `estimateTokens` es `ceil(len/4)` y se usa tanto para presupuestar como para emitir, con renders distintos: es la causa raíz ya documentada de presupuestos finales incorrectos. | `I/token-ring.ts:22-24`; `M/plane.ts:36-45`; **D07**/V05 |
| **S2-16** | **Baja** | `sessionShutdown` traga todas las excepciones del olvido por salience sin dejar rastro: una política de retención puede dejar de aplicarse de forma invisible. | `M/hooks.ts:143-148` |

---

## 6. Mapa a Qwen Code 0.26.1

Referencia: `/Users/ruben/Code/QWEN-code/REFERENCIA-QWEN-CODE.md` §3 (piezas instalables y orquestación) y §4 (superficies, daemon, SDKs).

### 6.1 Correspondencia de mecanismos

| Pieza de Pi | Equivalente en Qwen Code | Diferencia de runtime que importa |
|---|---|---|
| Extensión in-process (`ExtensionAPI`, jiti, mismos permisos) | **Mods** (JS/TS con `register(on)`, aislados en **QuickJS**, sin Node/fs/red) — §3.2 | Incompatible con la suite de memoria: QuickJS no puede abrir SQLite ni firmar. Un mod sirve para política, no para autoridad |
| `pi.registerTool()` | Servidor **MCP** (`stdio`/`http`/`sse`) declarado en settings o manifiesto — §3.7 | Fuera de proceso → aislamiento real, coste de serialización y de ciclo de vida |
| `pi.on("tool_call")` con `{block:true}` | Hook **`PreToolUse`** con `permissionDecision: "deny"` o exit **2** bloqueante — §3.6 | `ask` no lo aprueba ninguna regla ni YOLO; en headless/subagentes background/ACP cae a `deny` (fail-closed por defecto, más fuerte que Pi) |
| `pi.on("user_bash")` + sandbox SPI | Hook `PreToolUse` con matcher `Bash`/`^bash$` + `sandbox`/`executionBackend: container` de agentes — §3.4 | El sandbox de Qwen es por agente/herramienta, no un SPI de proveedores intercambiables como `I/sandbox.ts` |
| `pi.on("session_start" / "session_shutdown")` | Hooks **`SessionStart`** (matcher startup/resume/clear/compact) y **`SessionEnd`** — §3.6 | `SessionEnd` no garantiza ejecución: un `kill -9` no lo dispara, igual que en Pi |
| `session_before_compact` (flush + consolidación) | **`PreCompact` / `PostCompact`** — §3.6 | `PreCompact` es el análogo exacto del punto donde hoy vive la consolidación; `PostCompact` permite separar flush (pre) de consolidación (post), que es lo que pide D03 |
| `before_agent_start` + secciones de system prompt | **Rules** baseline (`.md` sin `paths:` → system prompt desde el inicio) y `UserPromptSubmit`/`UserPromptExpansion` (stdout se añade al contexto) — §3.6, §3.8 | El PUSH estable de `M/plane.ts:10-18` mapea a una rule baseline; el PULL volátil de `contextRecall` mapea a `UserPromptExpansion` |
| `pi.appendEntry()` (estado durable fuera de contexto) | Sin equivalente directo: transcripciones del daemon + `GET /session/:id/transcript` paginado — §4.5 | Qwen no expone un almacén de entradas por rama; hay que llevarlo en el proceso de anillo-0 |
| `pi.registerProvider()` (AccountRouter) | **Sin equivalente.** Lo más cercano: `baseUrl`/`authType` por modelo, o un proxy local delante | Es la pieza menos portable del ecosistema: el router depende de ser un provider registrado dentro del proceso |
| `AGENT/account-router-state/*.json` + lockfile | `~/.qwen/boards/`, `$QWEN_HOME/sessions/<pid>.json`, sockets UNIX por sesión, `expectedRevision` en la API de canales — §3.9, §4.5 | Qwen sí tiene noción de revisión esperada y de registro por PID; el patrón de lease con `pid` del router tiene análogo |
| `AGENT/mcp-cache.json` sin TTL | `discoveryTimeoutMs`, `versionNegotiation` (`auto` gasta hasta 5 s y arranca copia desechable), replay solo con `trust: true` + workspace confiable + `idempotentHint` — §3.7 | Qwen acota el descubrimiento por tiempo y condiciona el replay a idempotencia declarada: resuelve por diseño parte de S2-08 |
| `pi` binario único, todo in-process | **`qwen serve`**: daemon HTTP+SSE → hijo `qwen --acp` **por workspace** → mismo núcleo que la TUI — §4.5 | Es la única superficie de Qwen que da separación de procesos entre clientes y agente. Pero es «Stage 1 experimental» y **«This is intentional, not a sandbox»**: loopback sin token = acceso completo, incluida ejecución de código como el usuario del daemon |
| Suite de memoria propia | **Mem0 / external-context** bundled: `memory.mem0` en user settings, registra `external-context` con `context_search`, `enableWrites: false` por defecto; con writes, un hook autoinstalado pide aprobar el contenido exacto **incluso en YOLO** — §3.8 | Precedente directo y útil: Qwen trata la memoria como **servicio externo + herramienta de lectura + hook de aprobación de escritura**, no como extensión in-process. Es exactamente la forma de anillo-1/anillo-2 |
| Firmas de evidencia (ledger, checkpoints) | Pin por hash en permisos: `Workflow(name:…,sha256:…)` — §3.2 | Qwen firma/pinea **artefactos ejecutables**, no hechos memorizados. No cubre D05/D06 |
| `pi.events` entre extensiones | Cross-session messaging (`ipcToken`, socket UNIX, recibos held/delivered/denied/…) y Agent Board — §3.9 | Qwen tiene recibos y auth de línea; `pi.events` es un bus en proceso sin ninguna de las dos cosas |

### 6.2 Dónde viviría cada anillo en Qwen Code

- **Anillo-0 (kernel / autoridad).** Proceso propio, dueño exclusivo del almacén, alcanzable por HTTP o stdio. En Qwen se conecta con hooks `http` (timeout 600 s, `once`, `allowedEnvVars`, whitelist `security.allowedHttpHookUrls`, SSRF bloqueado) o como servidor MCP `http` con `trust: true`. **`qwen serve` no sirve como anillo-0**: la referencia es explícita en que no es un sandbox y en que loopback sin token concede acceso completo. Puede *alojar* la superficie, no *ser* la autoridad.
- **Anillo-1 (gateway + implementaciones).** Un servidor MCP (`httpUrl`) que exponga las `Route` de `I/gateway.ts` como tools MCP —el propio paquete ya deriva las definiciones MCP de las mismas rutas (`I/gateway.ts:5`, `M/memory-gateway.ts:20,36,94`)— más hooks `PreCompact`/`PostCompact`/`SessionStart` para el ciclo de vida. El `IdempotencyStore` de `I/contract.ts` encaja con el requisito de replay idempotente de Qwen (§3.7).
- **Anillo-2 (connections).** Adaptadores finos por host: en Pi, `M/extension.ts` y `R/extension.ts`; en Qwen, manifiesto de extensión con `mcpServers` + `hooks/hooks.json` + rules, y `qwen serve`/SDK cuando haga falta conducir sesiones desde fuera. `--safe-mode`, `--bare` y `disableAllHooks: true` son los interruptores de degradación que un adaptador debe respetar y declarar.

### 6.3 Respuesta a la duda del dueño: ¿dónde vive la suite de memoria?

Con la evidencia de runtime, **no en anillo-2 y no como extensión in-process**.

- El motor (`M/core.ts`, `M/fabric.ts`, `M/memory-control.ts`, `M/memory-spi.ts`, `M/memory-ledger.ts`, `M/memory-consolidate.ts`) es independiente del host: solo `M/extension.ts` importa `@earendil-works/pi-coding-agent`, y `M/hooks.ts` existe precisamente para que la lógica sea testeable sin el runtime de Pi (comentario en `M/hooks.ts:3-5`).
- La autoridad de escritura, la firma y el ámbito son propiedades de **anillo-0**; la recuperación, la consolidación y el presupuesto son de **anillo-1**; la traducción de eventos del host es de **anillo-2**.
- Por tanto: motor + ledger + claves + unidad de trabajo → **anillo-0**, en proceso propio con un solo escritor. Fabric, gateway, retrieval, TokenRing y sandbox SPI → **anillo-1**, servido por stdio MCP o HTTP. `M/extension.ts` (Pi) y un manifiesto de extensión + hooks (Qwen) → **anillo-2**, delgados y sin autoridad.
- Esto es compatible con **D11** (`DOSSIER/08-delta-recomendado.md` §3): usar el entrypoint público de `@pi-agent/intermediate` desde la ACL, tratar el host como peer opcional o entrada de adaptador, y componer con `createMemoryStack`/`createMemoryFabric` inyectando opciones antes de crear otro motor. Y con **D01**: la frontera de comandos es lo que hace que la ubicación física del proceso deje de ser un riesgo de integridad.
- Precedente externo a favor: Qwen Code resuelve exactamente este problema tratando la memoria como servicio externo declarable en settings con una herramienta de lectura y un hook de aprobación para la escritura (§3.8), no como código dentro del proceso del agente.

---

## 7. Lagunas

Lo que **no** pude verificar en modo solo-lectura, y qué haría falta:

1. **Purga de `waiters` por PID muerto.** `R/adapters/file-state-store.ts:45-50` afirma en un comentario que «prepareState purges dead pids», pero no localicé ni leí `prepareState`. Sin eso no puedo afirmar si un proceso matado deja un ticket de espera fantasma que restrinja un quotaGroup. *Comprobación:* leer `prepareState` en `R/src/application/router.ts` o `R/src/domain/policy.ts`, y buscar el tratamiento de `waiters` con `pid` no vivo.
2. **Régimen de resolución de módulos del binario vivo.** `LIVE/dist/bundle/cli.js` está empaquetado; no confirmé si `PI_BUNDLED_NODE` queda definido en el bundle, es decir, si la carga real usa `virtualModules` (`tryNative: false`) o `alias`. Cambia el alcance exacto de S2-07: con `virtualModules`, la copia física 1.3.0 queda sombreada; sin él, puede cargarse. *Comprobación:* `grep -n "PI_BUNDLED_NODE" LIVE/dist/bundle/chunks/*.js`, o un arranque con `PI_DEBUG`/`--verbose` en un agent dir temporal.
3. **Comportamiento real de `-e` sobre `pi-memory`.** Razoné la cadena de resolución hasta el error «does not export a valid factory function» a partir del código, pero no la ejecuté. *Comprobación:* `PI_CODING_AGENT_DIR=<tmp> pi -ne -e <ruta>/src/extension.ts --verbose` y leer el listado de recursos cargados y los errores de extensión.
4. **Contenido y alcance de `/Users/ruben/Code/FLYBOX/src`.** Está fuera del ámbito declarado de la auditoría y es código que se carga en cada arranque de Pi vía symlink (S2-10). No lo inspeccioné.
5. **Efecto real de `journal_mode` por defecto en `node:sqlite` v26.** Afirmé la ausencia de `WAL`/`busy_timeout` en `openDb` (verificado en el fuente), pero no medí el comportamiento de contención con dos procesos reales sobre el mismo fichero. *Comprobación:* dos procesos con `PI_CORE_DB` compartido y escritura concurrente, observando `SQLITE_BUSY`.
6. **`MirrorMcpBackend`.** Solo lo conozco por `pi-memory/docs/OPERATIONS.md:27-28`; no localicé su implementación en `M/`. Si existe, su escritura asíncrona con circuit breaker es el mayor riesgo de divergencia de la matriz de concurrencia y no está cubierto aquí.
7. **Servidores MCP stdio realmente spawneados.** `AGENT/mcp-adapter.json` solo declara cuatro servidores remotos HTTP(S) y `mcp-cache.json` lista trece nombres; no leí `mcp.json` de agente ni de proyecto, así que no puedo decir cuántos son procesos hijo locales frente a remotos. El diagrama de §2.1 marca la frontera por transporte declarado, no por inventario completo.
8. **`capabilities.json` (200 KB) y `models-store.json` (78 KB).** Verifiqué claves de nivel superior y tamaño, no el contenido ni quién los escribe ni con qué atomicidad. Son los dos ficheros grandes de `AGENT/` sin mecanismo de escritura verificado en esta sección.
9. **Versión 1.4.0 vs documentación 1.3.0.** Toda la evidencia de contrato de carga proviene del SDK 1.3.0 instalado en `pi-memory/node_modules`; el binario vivo es 1.4.0. Comprobé que `createBashTool`, `serializeConversation` y `convertToLlm` siguen exportados en `LIVE/dist/index.d.ts:6,12,20,26` (idéntico a 1.3.0 en esas líneas), pero no hice un diff completo de la superficie de `ExtensionAPI` entre versiones. Los eventos que usa `M/extension.ts` (`tool_call`, `user_bash`, `tool_result`, `before_agent_start`, `context`, `session_before_compact`, `session_start`, `session_shutdown`) deberían revalidarse contra 1.4.0.
10. **Ausencia de tests de runtime.** `pi-memory/package.json:16-18` solo declara `typecheck`; `pi-intermediate` igual. Las 68 aserciones del dossier son un probe local gitignored (`.probe-architecture-delta.mjs`, 11 DB en RAM, sin I/O de red/proceso/escritura), no una validación de los modos de fallo de proceso descritos en §4.
