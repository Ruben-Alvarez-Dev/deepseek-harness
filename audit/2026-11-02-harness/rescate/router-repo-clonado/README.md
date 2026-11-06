# pi-account-router

> **Estructura del repositorio:** el código activo está en la raíz (`src/`, `tests/`,
> `docs/`, `openspec/`), datos de referencia en `catalog/`. Una extensión, una carpeta,
> una sola versión (ADR 0005). Véase [docs/repository-layout.md](docs/repository-layout.md).

Standard Pi extension for **proactive per-request routing** across authorized account pools. Native provider ID: `account-router`. No proxy, custom harness, account creation or Pi patching.

**Continuity goal implemented and verified with two native Pi processes, including real no-`--model` startup; re-confirm in your daily Pi.** The priority is automatic progress through temporary quota exhaustion, including two Pi instances — not an economic advantage or a speculative quota multiplier. See [docs/project-status.md](docs/project-status.md).

## Compatibility and installation

Targets the official `@earendil-works/pi-coding-agent` / `pi-ai` **1.1.0** public native-provider API and Node.js **22.19+**. Peer dependencies are host-provided, as required by the Pi package standard. Other Pi forks or older `@mariozechner/*` APIs are not claimed compatible.

```sh
# Development, without changing Pi settings
npm ci --ignore-scripts
pi -ne -e ./src/extension.ts --model account-router/agnes-3.0-flash

# Standard local Pi package installation
pi install . --local
```

Installation does not change your default model. Select `account-router/agnes-3.0-flash` using `/model`. Existing `agnes-ai` registration and credentials are not overwritten.

### Activate routing as the startup default

Pi marks a native provider as configured **synchronously** only when `models.json` declares it. A provider that resolves its credential per request can otherwise lose the race during initial model selection and fail with `No API key found`. Add this to your agent directory (`~/.pi/agent/models.json`) once:

```json
{
  "providers": {
    "account-router": { "apiKey": "managed-by-extension" }
  }
}
```

The placeholder is never sent: the extension resolves the real account credential for every request. Then choose the startup model, for example in `settings.json`:

```json
{ "defaultProvider": "account-router", "defaultModel": "agnes-3.0-flash" }
```

## Configuration

Read from `$PI_ACCOUNT_ROUTER_CONFIG` (explicit path, relative to process cwd), otherwise `<agentDir>/account-router.json`. `agentDir` is Pi's standard `PI_CODING_AGENT_DIR` or `~/.pi/agent`. Missing implicit config uses one existing `agnes-ai` credential, one shared **10 RPM** group and concurrency one. Invalid or missing explicit configuration fails rather than silently falling back.

`examples/agnes.json` references the existing Pi credential. `examples/authorized-pool.json` demonstrates three **authorized, genuinely independent** pools, not an instruction to manufacture free accounts. Keys stay in environment variables or Pi `auth.json`, never in router JSON.

```json
{
  "version": 1,
  "provider": { "adapter": "agnes" },
  "accounts": [
    { "id": "a", "quotaGroup": "a-pool", "credential": { "env": "AGNES_A" } },
    { "id": "b", "quotaGroup": "b-pool", "credential": { "env": "AGNES_B" } }
  ],
  "quotaGroups": [
    { "id": "a-pool", "maxConcurrent": 1, "limits": [{ "requests": 10, "windowMs": 60000 }] },
    { "id": "b-pool", "maxConcurrent": 1, "limits": [{ "requests": 10, "windowMs": 60000 }] }
  ],
  "maxWaitMs": null,
  "rateLimitRecovery": "wait",
  "requestTimeoutMs": 120000,
  "rateLimitCooldownMs": 60000,
  "transientCooldownMs": 5000
}
```

Every account explicitly belongs to a quota group. Multiple keys sharing upstream limits **must share the same group**; keys with independently enforced limits **must not**. Measured 2026-10-10: an Agnes free key returns 429 after ~10 requests in a rolling minute while a different key is still accepted immediately, so Agnes limits are per key, not per user. Assign one group per key to use each key's own window, or keep several keys in one group if a provider really meters them together. Identical resolved keys assigned to different groups are rejected — identical keys can only ever share one group. Missing keys are skipped. `enabled: false` excludes an account. Unknown fields, duplicate IDs, non-integer quotas, unsafe URLs and literal credential fields are rejected.

The Agnes adapter pins the official endpoint and only exposes `agnes-3.0-flash` and `agnes-2.5-flash`; paid models are excluded. Text input is advertised by default until image behavior is verified. Generic endpoints require explicit model metadata; see `examples/openai-compatible.json`. HTTPS is required except loopback HTTP for local servers. Generic model cost accounting starts at zero (no price claim); configure Pi `models.json` cost overrides if needed.

## Scheduling and coordination

Selection is **least-pressure**: before each inference it picks the eligible pool with the most headroom (rolling-window usage and in-flight concurrency), and rotates **A → B → C → A** only among pools with equal pressure. No pool is driven toward exhaustion while another has room, and nothing waits for a failure first. This applies before each inference, including tool follow-ups and compaction. Each HTTP attempt goes to one account only; definitive pre-output 429 rejections may wait and reacquire for the same logical inference. Independent simultaneous requests can occupy independent groups; dependent steps of one agent conversation remain sequential. Context stays in Pi and is transmitted by its native API adapter.

`limits` are exact rolling windows, not calendar reset promises. A 24-hour `windowMs: 86400000` budget is a rolling day-length limit, **not** midnight reset. Configure only quotas known for your pool; there is no invented free-tier daily limit. All windows and group concurrency must allow the request. Usage is reserved conservatively before dispatch and is never refunded on cancellation/error.

Quota history, rotation, cooldowns, disabled IDs, fair waiting tickets and local-process leases persist under `<agentDir>/account-router-state/`, in private atomic JSON files. State is shared across Pi processes using this extension and endpoint on **one local filesystem**. It does not coordinate arbitrary clients or multiple machines. Live process leases never expire silently; crashed processes are reclaimed. Corrupt state or conflicting live quota policies fail closed. Do not delete state to bypass quotas.

## Failures, cancellation and security

- Native transport retries are forced to zero per HTTP attempt. Default `rateLimitRecovery: "wait"` resumes a logical inference only after a definitive HTTP 429, before any public stream event and after successful feedback/cleanup. `"error"` preserves explicit single-attempt diagnostics. Pi's agent-level retry policy remains unchanged.
- 429 cools the **whole quota group**, respecting `Retry-After` seconds or HTTP date; absent/invalid header uses the configured fallback. With one key per group this is exactly the key that was rejected, so the other keys keep working.
- 401/403 disables only the selected account. `/router-enable <account-id>` clears that disable flag, without resetting usage/cooldown.
- Transient server errors cool the group; no hidden retry on another account, including after partial text/tool output.
- Capacity waiting defaults to `maxWaitMs: null`: cancellable, without an arbitrary 30-second stop. Zero means no waiting; a positive value explicitly bounds each acquisition. Positive deadlines are rechecked under the state transaction. Body timeout starts after acquisition, not while queued. Cancellation/shutdown release owned tickets/leases without touching peer work or refunding usage.
- Secrets, prompts and upstream error bodies are not written into router state or diagnostics. Standard request instrumentation supplied by Pi may observe sensitive payloads, just as with native providers.
- Existing Pi literal and environment-referenced API-key credentials are supported. Command-backed keys and OAuth are intentionally unsupported in v1. Arbitrary `--api-key` overrides are rejected because they do not identify a configured quota group.
- Raw errors are normalized; recognizable context overflow remains `context_length_exceeded` so Pi can compact. Known 4xx fields use fixed diagnostic categories, never arbitrary upstream bodies.
- Malformed tool calls are removed from terminal messages, including abort/cleanup failures. Successful turns containing them become errors. A provider-neutral `context` hook repairs outgoing historical projections and orphan tool results without rewriting session JSONL; manual retry may still be needed.
- No factory-time network calls, background resources or global configuration writes.

**Footer label.** One compact label, in the extension status row next to Pi's own model indicator (Pi renders that indicator itself and extensions cannot recolour it): `#2/4 agnes-3.0-flash` = account in use / total accounts / model. Its colour is a continuous green→red ramp driven by that pool's RPM usage; `⏳n` (queued), `❄ns` (cooldown) and `⚠n` (auth-disabled accounts) appear only when present, and model truncation targets 24 code points; wide glyphs or unusually large anomaly counts can exceed 24 terminal columns. It updates only from real events (own state commits, sibling Pi processes writing the shared state, model/session events, and one timer armed for the exact instant a cooldown ends or a window slot frees) — there is no fixed-interval polling, and unchanged renders are skipped.

`/router-status` reports safe account/group capacity and queued request counts. Earlier tickets have priority for overlapping groups without blocking unrelated groups. Valid state v1 migrates to v2 without resetting history. Interactive/RPC use standard Pi notifications; headless mode uses Pi messages, never unsolicited stdout. Configuration changes take effect through Pi's standard `/reload`.

Agnes' [terms §5.4](https://wiki.agnes-ai.com/en/docs/terms-of-service) prohibit circumventing rate limits. Rotation does **not** establish permission to accumulate free accounts. Use only authorized credentials/pools; no guarantee of independent `N × 10 RPM` capacity. Agnes currently publishes free Flash pricing but it can change. The free tier has no SLA and its data terms can permit training; review before sending proprietary code. See `docs/agnes-research.md`.

## Architecture and development

Light hexagonal boundaries: `domain` (provider-neutral policy), `application` (reservation orchestration), `ports` (state/clock/credentials), `adapters` (filesystem/Pi auth/native transport), `extension.ts` (composition and standard Pi registration). One runtime dependency: `proper-lockfile`. Streaming conversion is delegated to Pi, not duplicated.

```sh
npm run check             # strict types, lint, deterministic tests
npm run check:specs       # OpenSpec strict validation (CLI required)
PI_ROUTER_LIVE=1 npm run test:live  # opt-in real smoke, one small inference
PI_ROUTER_LIVE=1 npm run test:live:accounts  # enrolled four-account/shared-10-RPM profile only
PI_ROUTER_LIVE=1 npm run test:live:performance  # four timed, bounded outputs; same shared budget
npm pack                 # runs checks and packs a standard source Pi package
```

Initial acceptance and spec-to-test traceability: [docs/verification.md](docs/verification.md). Subsequent four-credential enrollment and real rotation/tool results: [docs/accounts-verification.md](docs/accounts-verification.md). Measured latency, effective output delivery and objective scoreboard: [docs/performance.md](docs/performance.md). OpenSpec proposal, design, granular tasks and executable scenarios live in `openspec/`. Work is serialized by dependency stage. Live smoke uses the existing configured key, executes no model tools, changes no global settings and does not print credentials. Automated tests use synthetic keys and a local server.
