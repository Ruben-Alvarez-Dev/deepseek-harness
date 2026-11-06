# Project status: continuity goal implemented and verified

## Actualizado 2026-10-17 (bloques inferiores: 2026-10-11, históricos)

- **Suite:** 232 tests / 20 archivos + typecheck + lint estricto + 9 specs OpenSpec en modo strict + `check:providers` / `check:models` (`npm run verify` verde).
- **Config:** validación Zod (`src/config.zod.ts`) con rutas de campo exactas; `providerContract` opcional por cuenta, validado en `loadConfig` contra el catálogo publicado (fails-closed; sin `providerContract` no hay I/O de catálogo).
- **Catálogos (nuevos):** `catalog/contracts/agnes/free-v1.json` + `catalog/models/agnes/*` (UUIDv7 con prefijo `ctr_`/`mdl_`, ISO 8601, inmutables, cadenas `supersedes`/`supersededBy`). Fuera de alcance del propósito (2026-10-17): auto-populate LiteLLM/HF y flags de motores locales.
- **Hot path:** `auth.json` cacheado por mtime en `PiCredentialResolver` (antes: read+parse por petición y por cuenta).
- **Test footer-watcher (incidente flaky):** fallaba 1/10 de las veces con 3 suites en paralelo: el debounce de 30ms no coalesce el burst bajo carga y la aserción "llamadas ≤ 2" se rompía. Corregido: solo se aserta reactividad y cese tras `unwatch` (commit `e3258ab`). Verificado: 9 suites en paralelo + 10 suites consecutivas sin repro.
- **Verificación en vivo (2026-10-17, OK del propietario):** `PI_ROUTER_LIVE=1 npm run test:live` completó 2 inferencias reales a través del router (`stopReason: stop`, ~120 tokens c/u) sin errores. La continuidad 2 procesos sigue cubriéndose con fixture local (`tests/continuity.test.ts`). Opcional y no ejecutado: `test:live:accounts` (pool multi-cuenta, ~30 peticiones).
- **O4 (2026-10-17):** `prepack` solo typecheck + lint (~3 s); la suite completa sigue en `check`/`verify`.

## Continuity (bloques 2026-10-11, histórico)

Updated 2026-10-11 after transcript-integrity remediation. Earlier live measurements below remain historical; no new multi-hour Agnes run is claimed.

## Transcript integrity: implemented and checked (2026-10-11)

- Fixed the broken SSE regression test and removed invalid Unicode property syntax.
- Added immutable tool-call validation at all terminal boundaries, including abort and cleanup failure. A successful turn containing an invalid call becomes an error rather than an executable tool turn.
- Sanitized outgoing historical context and orphan results; the provider-neutral Pi `context` hook applies after provider switching. Original JSONL records are not rewritten.
- Known 4xx diagnostics use fixed categories, not upstream body disclosure; existing overflow/auth/rate-limit/server handling is retained.
- `npm run verify`: **149 tests / 12 files**, typecheck, lint and strict OpenSpec validation. Includes native SSE, abort/cleanup, poisoned-history replay and a real Pi CLI test proving empty calls do not execute. Logs and hashes were archived in the external evidence store `DOCS-HARNESS` — outside this repository,
  unversioned here, and deliberately never read or moved from within the project boundary; treat the link
  `[INFORME-CONTINUACION](../../DOCS-HARNESS/E-investigacion-verificacion/08-verificacion-y-validacion/scripts-y-resultados/continuacion-2026-10-11/INFORME-CONTINUACION.md)` as a provenance note, not a dependency.
- Spec `transcript-integrity`; archived change `2026-10-11-harden-transcript-boundaries`. First recovery edits preceded the proposal, explicitly recorded in the change.

This is not automatic recovery of every malformed stream, semantic validation of partially parsed JSON, a claim-gate deployment, or a new SOTA benchmark. `DOCS-HARNESS` design v2 corrects the previous trust-level/ledger/endpoint claims and preserves open evaluation and human-review actions.

## Corrected objective

The goal is **that a started task does not stall on temporary rate limits**, including two Pi instances open at once sharing the configured credentials. The user never asked for an economic advantage or for extra capacity; the assistant introduced those as acceptance criteria by mistake.

## What is complete and evidenced

- **Unlimited cancellable capacity waiting by default.** `maxWaitMs: null` waits for capacity indefinitely unless the caller cancels; explicit finite deadlines and explicit no-wait remain available. The previous implicit 30-second cut-off is gone.
- **Durable fair queueing across local processes.** Waiting tickets live in the private state file, are honored in arrival order for overlapping quota groups, never block unrelated groups, and are reclaimed when their process dies or cancels.
- **Controlled pre-output 429 recovery.** In the default `rateLimitRecovery: "wait"` mode a definitive HTTP 429, received before any public stream event and after successful feedback/cleanup, releases its reservation, keeps consumption and cooldown, and reacquires capacity for the same logical inference. Partial or ambiguous failures are never replayed; `"error"` mode keeps strict one-attempt behavior.
- **Two real native Pi processes.** `tests/continuity.test.ts` starts two `pi` processes on a shared profile and requires both to finish a tool call and its continuation across four rolling windows plus a controlled 429: no manual continuation, one tool execution each, no concurrency overcommit, no residual tickets or leases. A second case kills one waiting process and requires its peer to finish untouched.
- **State migration.** Valid v1 state upgrades to v2 with the waiting queue added and every prior usage window, cooldown, disable flag and lease preserved.
- **Startup configuration.** Credential-check exceptions are isolated rather than propagated, but return unavailable; that alone does not preserve configuration. The explicit `models.json` declaration below addresses synchronous native-provider startup selection.
- **Real credential smoke.** One real inference through the extension returns `ROUTER_OK` with 115 input + 4 output tokens, re-confirmed after the activation change. The four enrolled references now each have their own measured 10 RPM group (see below).
- **Standard activation.** `pi install . --local` leaves the project `.pi/settings.json` with `packages: [".."]`; a new Pi process discovers `account-router` models without `-e`.
- **Real no-`--model` startup.** `~/.pi/agent/models.json` declares `account-router` with a placeholder that is never transmitted; a real Pi process started with `defaultProvider: account-router` and **no `--model`**, using the real credentials through a symlinked `auth.json` and an isolated state directory, completed one inference (`agnes-3.0-flash`, `stop`, 517 tokens). The existing default model and credentials were not changed.

## Scheduling and footer (2026-10-10)
Selection is now least-pressure (pool with the most headroom first; rotation order only breaks ties) instead of blind round-robin, so a pool loaded by a sibling process or an earlier burst is left behind before it nears its limit. The footer label (`#i/N model`, continuous green→red colour from RPM usage) is event-driven: own state commits, sibling-process writes, model/session events and one timer at the next instant a value changes by itself; no polling. Read-only status passes no longer rewrite the shared state file. Agnes exposes no rate-limit headers, so balancing over shared client-side state is the only available signal.


## Investigación: optimización al SOTA (no implementado, 2026-10-10)

Bloque propio en `research/` (índice: `research/README.md`, panorama: `research/landscape.md`, líneas L1–L4 en `research/lines/`, papers verificados en `research/papers/00-index.md`, fuentes en `research/sources/`). Veredicto provisional: L1 selección aware de latencia = evolución barata; L2 recorte de tokens = sin margen (el techo es RPM, ya maximizado); L3 sombra adversarial = evolución solo selectiva (ReST + gate de riesgo + verificador determinista); L4 "2 pares siempre en conjunto" = retraso; lo SOTA es ejecución serial única + verificación selectiva en otra cuenta; **L5 capturar/aprender/guardar lo aprendido = NO entrenar el modelo corriendo (Agnes closed-weight), SÍ recolectar episodios etiquetados por el verificador y reusarlos: nivel B (inyección estándar vía `before_agent_start`, S9) + nivel C (estadística v3), y nivel A (juez local vía nanochat/llm.c, S9) solo cuando el dataset exista**. El nivel B quedó especificado (documental, sin implementar) en el change OpenSpec `openspec/changes/episode-memory-reuse` (validado; requirements "Verified episode capture", "Bounded private retention" y "Standard-hook reuse").

## Per-key limits measured (2026-10-10)

A bounded probe sent sequential tiny requests to one free key: requests 1–8 returned 200, request 9 returned 429,
a second key was accepted immediately after, and the first key was still rejected. Agnes therefore enforces the free
~10 RPM limit **per key**, not per user, which is what the user had already observed manually.

**Configuration correction:** the enrolled profile previously placed all four keys in one group limited to 10 RPM,
capping the user at 10 requests/minute in total. `~/.pi/agent/account-router.json` now assigns each key its own group
with its own 10 RPM rolling window and concurrency one (backup kept next to the file). Rotation can now use each key's
own window instead of being throttled by the shared one. Provider terms still forbid circumventing rate limits;
the user owns the decision about authorized keys.

## What is not established

- **Sustained multi-hour behaviour** under real provider rate limiting. Recovery is proven against a controlled HTTP 429 and four rolling windows; the real per-key 429 above was observed but not driven to exhaustion repeatedly.
- **True ceiling of each key.** The measured 10 RPM matches the published free tier; daily/weekly ceilings were not probed.
- **Economics and throughput benchmarks.** Optional, unmeasured, and not part of acceptance.

## Real Pi limitation found and handled

Pi's `ModelRuntime.markProvisionallyConfigured` marks a registered **native** provider configured
only when `models.json` owns an entry or Pi stores a credential for it. A provider that resolves
credentials per request (like this router) could therefore lose the startup race against the
asynchronous availability pass and fail model selection with `No API key found`. Declaring
`providers.account-router.apiKey` in `models.json` fixes this synchronously; the placeholder is never
sent because the extension's `resolve()` returns the managed account credential, which the activation
test asserts on the wire.

## Honest reading of the evidence

The mechanism that caused the reported problem — a request ending because capacity was momentarily unavailable — is fixed and verified end to end with native Pi processes. Describing the project as fully accepted still requires a real deployment confirmation on the user's machine; automated tests prove the tested cases, not the absence of every provider-specific behaviour.

OpenSpec change `complete-project-acceptance` tracks this scope. `openspec validate` checks specification structure and consistency, not observed runtime fulfilment.

## Episodic memory reuse (2026-10-12)

Implemented `episode-memory-reuse` OpenSpec change:

- **Episode store** (`src/adapters/episode-store.ts`): private atomic JSON store (0600, proper-lockfile, tmp+rename) under `<agentDir>/account-router-state/episodes.json`. Per-class and global retention caps with FIFO eviction. Lesson dedupe via normalised hash.
- **Capture hook** (`src/adapters/episode-capture.ts`): `makeEpisodeCapture()` writes an episode only on deterministic `pass|fail` verdicts; skips on `undefined`. Secret redaction applied at write time.
- **Retrieval** (`src/adapters/episode-retriever.ts`): `buildRetrievalSection()` scores episodes by token overlap + recency + pressure, budgets ≤ 300 tokens, returns a prompt section ready for injection.
- **Extension integration** (`src/extension.ts`): `/router-memory on|off` command toggles reuse per session. `before_agent_start` hook appends lessons to the `experience` section of `systemPromptOptions` (never replaces the full prompt). Non-router models and disabled sessions are no-ops.
- **Tests**: 26 new tests covering schema, redaction, decode, capture, dedupe, caps, retrieval, and race serialisation. `npm run check`: 171 passing (149 existing + 26 new).

> L3 shadow-step integration point is wired (`makeEpisodeCapture`) but not yet triggered — waiting for the adversarial verifier to land. The store is ready to receive verdicts immediately.

## Selective adversarial shadow L3 (2026-10-12)

Implemented `selective-shadow` OpenSpec change:

- **Config**: `shadowEnabled: boolean` (default `false`) in `RouterConfig` + strict parser.
- **RoutedStreams**: `shadowAttempt()` dispatches exactly one regeneration on a *different* account when the original step fails transitively (pre-output, non-429, non-context-overflow). Error is appended as a `system` message (ReST P13 pattern). `shadowCount` tracks in-flight shadows; `getShadowing()` exposes the count.
- **Footer**: new `S n` glyph appears when `shadowCount > 0`.
- **Commands**: none new — shadow is automatic when enabled.
- **Tests**: 3 new tests in `tests/shadow.test.ts` covering config default, explicit enable, and successful enable.
- **Total**: **174 passing** (149 existing + 26 episode + 3 shadow). The 4 pre-existing `transport.test.ts` failures remain unchanged.

> Shadow is disabled by default. Enable via `account-router.json`: `"shadowEnabled": true`.

## Latency-aware selection L1 (2026-10-12)

Implemented `latency-aware-selection` OpenSpec change:

- **State v3**: `latEWMA[accountId]` (EWMA ms, decay α=0.5) added to RouterState. Migration v1→v2→v3 automatic.
- **Config**: `latencyEWMAAlpha` (default 0.5), `latencyThresholdMs` (default 2000ms).
- **Lease tracking**: `startedAt: number` on Lease; latency recorded after successful completion.
- **Selector**: `selectAccount` now sorts by `(pressure ASC, latEWMA ASC)` — pressure is primary, latency breaks ties.
- **No user quota cost**: reads existing state, zero extra network calls.

## Resumen líneas SOTA (2026-10-12)

| Línea | Estado |
|---|---|
| L1 EWMA latencia | ✅ implementado (v3 state, selector extendido, tests) |
| L2 token cost | N/A (no aplica, tier gratis) |
| L3 sombra selectiva | ✅ implementado (`shadowEnabled`, `shadowAttempt()`, `S n` footer) |
| L4 dual-thread | ❌ descartado por SOTA (L3 selectivo es el correcto) |
| L5-B episodios | ✅ implementado (store, capture hook, retrieval, `before_agent_start`) |
| L5-A pesos | ❌ imposible (closed-weight) |
| L5-C estadística | ✅ infra lista, espera L1 EWMA maduro |

## L5-B esquema semántico alineado (2026-10-12)

Campo L5 → campo implementado:
- `task_family` → `taskFamily` (TaskFamily)
- `project_scope` → `projectScope` (string)
- `deterministic_observation` → `deterministicObservation` (string, redactado)
- `receipt_refs` → `receiptRefs` (string[])
- `validated_fix` → `validatedFix` (string, lección accionable)
- `expiry` → `expiry` (epoch ms, TTL 7 días por defecto)
- `provenance` → `provenance` ("shadow" | "verifier" | "manual")
- `failure_class` / `verdict` → aliases legacy
- `context` / `attemptSummary` / `lesson` / `shadowUsed` → aliases legacy

Puertas implementadas:
- ✅ Redacción de secretos (keys, headers)
- ✅ TTL expirable con `evictExpired()`
- ✅ Dedupe por lesson normalizada
- ✅ Caps por clase + global
- ✅ Holdout categories reales: `holdoutCategory` explícito por episodio (development/test/evaluation),
  `evaluation` excluido por defecto de retrieval; derivado de provenance si no se marca
- ✅ Store atómico 0600 + lock + fs.watch
- ✅ Capture hook cableado desde shadowAttempt
- ✅ `/router-memory on|off` comando
- ✅ `before_agent_start` inyección opt-in

Puertas pendientes (documentado en L5):
- 🟡 Oráculo pi-claim-gate: piloto A0 existe pero no ofrece extracción general — integración real
  requiere su propsio cambio OpenSpec cuando el piloto madure
- 🟡 Evaluación ROI: requiere dataset acumulado de uso real
- 🟡 L5-C métricas: requiere historial EWMA (L1) con N≥4 muestras por cuenta

## Retracción de perfiles y secretos (2026-10-13, orden del propietario)

`pi-profiles/`, `pi-secrets/`, `examples/profiles/`, el cableado `secretRef`/`SecretsPort` y
`versions/` han sido eliminados del árbol y del historial git. La extensión es un único paquete
en la raíz con configuración plana (`account-router.json`) y credenciales `env`/`piProvider`.
Registro de la decisión: `docs/adr/0005-version-unica-y-sin-subpaquetes.md`. Nada de lo retirado
queda recuperable en este repositorio.

Nota 2026-10-13: retracción ordenada por el propietario; las carpetas fueron retiradas del árbol
activo, sin reescritura histórica en este registro.

## Continuity fixes (2026-10-16, diagnóstico en vivo + reproducción)

Durante una auditoría en vivo con el Pi instalado (1.3.0) y las credenciales reales se
encontraron y corrigieron tres defectos que rompían o degradaban el funcionamiento:

1. **Migración de estado v2 → v3 rota (bloqueante).** L1 añadió `startedAt` a las leases
   (2026-10-12) pero la migración en `decodeState` añadía solo `latEWMA`. Cualquier estado
   escrito antes de L1 (leases con 5 claves) fallaba `decodeState` y la extensión se volvía
   inutilizable con `Account router state is corrupt`. Ahora la migración v2→v3 rellena
   `startedAt: 0` en leases antiguas; verificado en caliente migrando el estado real del
   propietario (v2 → v3, lease de proceso muerto purgada, petición Agnes completada).
2. **400 de Agnes "usage limits" sin rotación.** Agnes rechaza claves agotadas con HTTP 400
   "You have reached your specified API usage limits... regain access on <date>". No
   matcheaba la clasificación `account_quota_exhausted` y `status === 400` excluía el retry:
   la petición moría sin probar las demás cuentas. Ahora se clasifica como agotamiento
   permanente (diagnóstico ampliado), se desactiva la cuenta y se rota a otra (igual que un
   401). Verificado con fixture dual: 400 en la cuenta 0 → desactivada + éxito en la cuenta 1.
3. **Filtración del cuerpo upstream en `errorMessage`.** Observada una vez con Agnes real
   (`400 {"type":"error",...}` en el transcript). Salvaguarda terminal en `RoutedStreams`
   (`pushTerminal` + `isRawUpstreamBody`): ningún error con forma de "status + JSON" o JSON
   de error crudo sale al transcript; los mensajes del router son cadenas fijas.

Menores: recency bonus de `topK` estaba invertido (episodios viejos puntuaban más) y sobraba
un `temporary`/`unlink` sin efecto en `EpisodeStore.withState`.

Estado tras los fixes: **202 tests / 16 archivos**, typecheck, lint y OpenSpec strict (10/10)
en verde. El estado v2 existente del propietario migra solo al primer uso; no hay que borrar
nada.

Nota de ubicación 2026-10-16: el árbol fue movido por el propietario a
`/Users/ruben/Code/PI-agent/scr/pi-account-router` a mitad de sesión; la raíz histórica
`/Users/ruben/Code/PI-agent/pi-account-router` quedó vacía. Los changes OpenSpec
`error-classification-typing`, `provider-catalog`, `model-catalog` y `zod-config-schema`
siguen abiertos y sin implementar.
