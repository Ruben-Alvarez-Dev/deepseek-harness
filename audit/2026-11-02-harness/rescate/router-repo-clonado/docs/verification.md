# Initial acceptance verification

Date: **2026-10-09 (UTC)**. This records initial acceptance before multi-account enrollment; see [accounts-verification.md](accounts-verification.md) for subsequent real four-credential verification and the updated suite. Target host: **Pi 1.1.0**, `@earendil-works/pi-ai` **1.1.0**. Development environment: Node **26.5.0**, OpenSpec **1.14.1**. Supported minimum Node: **22.19**; a multi-version/platform matrix has not been run.

## Results

| Check | Result |
| --- | --- |
| `npm run check` | Strict TypeScript, recommended Biome rules (warnings fail checks) and **99 tests across 8 files** pass |
| `npm run check:specs` | OpenSpec strict validation passes; accepted change archived and canonical capability specs preserved |
| `npm pack --pack-destination /tmp/pi-account-router-dist --json` | Standard source package produced; prepack runs the complete check suite |
| `tests/package.test.ts` | Real packed/extracted package executes through Pi with only runtime dependencies, **no installed Pi peers** and no network installation |
| `npm audit --json` | **0 known vulnerabilities**, including development dependencies |
| `npm audit --omit=dev --json` | **0 known runtime vulnerabilities** |
| `PI_ROUTER_LIVE=1 npm run test:live` | Actual Agnes inference through the extension succeeds |

Automated tests use synthetic keys, temporary state and local HTTP servers. The ordinary suite never intentionally contacts Agnes. The live script refuses to issue a request without its opt-in flag and suppresses raw child/provider output on failure.

## Actual Pi compatibility

- Public `registerProvider(createProvider(...))`; ordinary default extension factory and `pi.extensions` manifest. No proxy, Pi patch, global registry monkey-patch or replacement of `agnes-ai`.
- Native available-model catalog, source `-e` loading and directory/package `-e` loading verified with the real CLI. `pi install . --local` installed this checkout through the standard package manager; automatic project discovery (without `-e`) subsequently listed both models using an isolated synthetic-credential profile. No default model was changed.
- Generic compatible endpoint verified with the actual Pi agent, not just a hand-built transcript: account A returns a `read` call for a temporary public fixture; Pi executes it; account B receives the result and returns the final answer. Both accounts share their declared quota group.
- Headless `/router-status` emits valid native JSONL messages; real RPC `/router-status` emits the standard `extension_ui_request` / `notify` protocol and makes **zero model requests**.
- TUI notification/footer behavior is checked through public UI-method fixtures. Visual interactive-terminal rendering has **not** been manually tested.
- Idempotent shutdown, session replacement and owner-isolated cleanup verified. Four actual child processes compete for the same file-backed concurrency-one group.
- Packing excludes auth files, router state, `.env`, `.pi`, development tests and `node_modules`. All 19 packed file contents were also compared in memory against existing literal local credential values: no matches; no credential values were printed. Runtime Pi imports use the host-provided root/compat entrypoints, including `openAICompletionsApi()`: no hidden dependency on a development-only Pi subpath import.
- Explicit bad config is captured safely by Pi's real resource loader, without registration or fallback. Pi's `--list-models` mode itself can suppress extension-load diagnostics; the extension does not override host presentation.

## Live Agnes observation

The final smoke used the existing read-only `agnes-ai` API-key reference and `account-router/agnes-3.0-flash`, with thinking off, tools disabled, an inert system prompt and no session persistence. It returned the expected `ROUTER_OK` marker:

```json
{
  "success": true,
  "provider": "account-router",
  "model": "agnes-3.0-flash",
  "stopReason": "stop",
  "markerMatched": true,
  "usage": { "input": 115, "output": 4, "totalTokens": 119 }
}
```

A SHA-256 comparison confirms global Pi `auth.json`, `models.json` and `settings.json` remain unchanged across the final smoke and project-local installation. No key values or hashes are published. The router's expected private quota-state directory is created by inference, not by factory/model listing.

The live result proves a successful native extension request, **not** an account bill, daily quota, sustained capacity or independence of multiple real Agnes accounts. Only one real Agnes credential was available. Two-credential rotation and full tool continuation were verified against controlled compatible HTTP fixtures; the initial direct Agnes research also verified actual streaming tool-call emission. Real multi-account switching, image interpretation, large-context limits, pressure testing and billing were not tested. No real rate limit was deliberately triggered.

## Specification traceability

Canonical specifications: `openspec/specs/{account-routing,provider-transport,pi-extension}/spec.md`. Accepted proposal/design/tasks remain in `openspec/changes/archive/2026-10-09-implement-account-router/`.

| Requirement / scenarios | Executable coverage |
| --- | --- |
| Proactive A/B/C rotation, skip unavailable account | `router.test.ts`, `transport.test.ts`, real tool continuation in `pi-cli.test.ts` |
| Shared rolling minute/long budgets, conservative consumption | `router.test.ts`, `file-state.test.ts`, `transport.test.ts` |
| Atomic cross-process reservations, crash recovery, corrupt state, policy conflict, unlock failure preserving the primary error | `file-state.test.ts`, `router.test.ts` |
| Bounded waiting, delayed state contention, queued/active abort, shutdown | `router.test.ts`, `transport.test.ts` |
| Group-wide 429 and fallback/date/delta Retry-After, selected-account 401/403, transient failures | `router.test.ts`, `transport.test.ts` |
| Replace Agnes with compatible endpoint, free-only defaults, namespaced model IDs | `config.test.ts`, `pi-cli.test.ts`, `package.test.ts` |
| Current Pi key, environment/scoped auth, duplicate keys, unsupported auth, no command execution | `credentials.test.ts`, `extension.test.ts`, `transport.test.ts` |
| Native text/tool deltas, full continuation, usage, empty/Unicode/fragmented SSE, declared generic image conversion | `transport.test.ts`, `pi-cli.test.ts` |
| Payload/response/provider-event hooks, headers, custom fetch, environment, retry exclusion | `transport.test.ts` |
| Single terminal, no replay after partial/malformed stream, timeout | `transport.test.ts` |
| Secret-echo normalization, recognizable overflow, conservative cleanup failure | `transport.test.ts`, `credentials.test.ts`, `file-state.test.ts` |
| Standard provider/manifest/availability, factory without HTTP/state writes | `extension.test.ts`, `pi-cli.test.ts`, `package.test.ts`, `config.test.ts` |
| Lifecycle ownership, double shutdown, session replacement | `extension.test.ts`, `router.test.ts`, `transport.test.ts` |
| Status JSON/RPC/TUI methods and re-enable without quota reset | `extension.test.ts`, `pi-cli.test.ts`, `router.test.ts` |

## Operational boundaries

- Pools must be authorized and genuinely independent when assigned separate groups. Extra keys do not establish extra capacity. Agnes terms forbid circumvention of limits.
- Rolling-window request accounting only: no invented calendar reset, token-per-minute budget, daily free allowance or distributed-machine coordination.
- Local coordination covers only clients using this extension and the same state directory/endpoint; other clients can consume upstream quota independently. Do not erase state to regain capacity.
- Queue budgets do not remove unavoidable filesystem/cleanup latency. A zero budget disables application-level capacity waiting; positive deadlines are rechecked under the state transaction before dispatch.
- Native transport makes one attempt. Pi's agent-level retry/compaction policies still apply and are not globally altered.
- Default Agnes advertises text only; generic image conversion is fixture-tested, not actual Agnes image support.
- Unsupported v1: command-backed credentials, OAuth refresh, non-OpenAI wire protocols and older/forked Pi APIs. Provider-neutral domain/application logic remains replaceable through adapters.
- Model cost metadata is not a billing assertion. Free promotions, permissions and provider data/availability terms can change.

## Development workflow

Dependency stages were executed serially: package/config → router/state → credentials/native transport → Pi integration → acceptance. Each stage passed its checks before progression. Acceptance caught and removed reliance on a peer subpath not virtualized by Pi; the packed-runtime test prevents that regression. Recommended lint rules are enabled; lock-release failures cannot overwrite a primary transaction error or turn a failed unlock into success. Archive validation passed with one non-blocking advisory to consider splitting changes with more than ten deltas; this cohesive change retains 14 capability requirements and 18 dependency-ordered tasks. No publishing to npm or changes to global defaults were performed.
