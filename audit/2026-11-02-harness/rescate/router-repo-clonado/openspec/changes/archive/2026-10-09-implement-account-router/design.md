# Design

## Context

See proposal.md and the three capability deltas. Pi 1.1.0 exposes native `Provider`, `createProvider` and supported streaming API implementations. Existing Agnes credentials and models are already configured. The upstream supports Chat Completions; pooled capacity authorization is not established by technical compatibility.

## Goals / Non-Goals

**Goals:** standard Pi package; per-inference credential selection; shared durable quota enforcement; testable small provider-independent core; no global configuration mutations.

**Non-Goals:** account creation, quota circumvention, credentials shared with unrelated parties, remote/distributed coordination, custom SSE parsing, silent failover, paid-model discovery, automatic recovery of disabled accounts, manipulating sessions or Pi internals.

## Decisions

1. **Native Pi provider, not virtual models or proxy.** Register `account-router` using public `createProvider`. The transport remains `openai-completions`; model IDs are the actual upstream IDs. Selection of credentials belongs below model selection, including compaction/direct calls. No overriding `agnes-ai`, monkey patches or custom CLI. Alternative: exposing one model/provider per account complicates auth and catalog unnecessarily.
2. **Light hexagonal architecture.** `domain` owns state and quota selection; `application` owns reservation/waiting; `ports` define clock, state transactions and credential resolution; adapters own filesystem, Pi credentials and OpenAI transport; `extension.ts` composes them. Prefer concrete functions/classes and small interfaces over containers or framework abstractions. Native transcript/stream conversion stays in Pi.
3. **Atomic JSON state with proper-lockfile.** Shared state is under the agent directory, namespace derived from backend/endpoint. Every read-modify-write holds a short cross-process lock and commits by atomic rename with private permissions. One runtime dependency, no daemon or long-lived factory resources. Unlike SQLite this does not introduce a runtime-specific native database requirement. Local filesystem only. Corrupt state fails closed.
4. **Reservations as local-process leases.** State records process ID and runtime owner. A live PID retains concurrency until explicit release; dead processes are reclaimed. Do not expire a live reservation with a TTL, which could overcommit a slow request. HTTP requests have bounded timeout and runtime cancellation. PID reuse is a conservative rare risk: it may delay capacity, never silently increase it.
5. **Rolling windows, not invented calendar resets.** Explicit `{requests, windowMs}` budgets support minute/hour/day-length/week-length windows. They do not claim a provider's daily reset semantics. Reserve and charge immediately, including subsequently aborted/failed attempts; no refunds. Histories are pruned only outside the longest configured window. Persist group policy and reject conflicting budgets while retained usage or leases exist.
6. **Credential references.** Environment names or existing Pi API-key entries are resolved per request. Never copy keys to config/state. Existing literal and environment-referenced API-key entries are supported; command-backed credentials and OAuth are explicitly unsupported in v1. Duplicate resolved keys in different groups fail before dispatch. Missing credentials are skipped; storage failures fail closed. Native provider auth reports configured availability using a non-secret managed marker; arbitrary `--api-key` overrides are rejected rather than bypassing pool identity.
7. **One attempt per logical request.** Delegate to Pi's supported OpenAI implementation with transport retries forced to zero. Intercept the provided fetch to see unsuccessful HTTP statuses too; native onResponse only observes successful setup. Honor Retry-After delta/date without shortening it, fall back conservatively, and do not retry inside the router. Pi owns explicit agent retries and compaction. Sanitize terminal errors, preserve overflow classification, retain already emitted content/usage. Release before publishing the terminal event.
8. **Strict config and conservative defaults.** Environment `PI_ACCOUNT_ROUTER_CONFIG` selects an explicit JSON file; otherwise `<agentDir>/account-router.json`, with a single existing Agnes account if absent. Explicit missing/bad files fail, no silent fallback. Agnes exposes only two free Flash models; generic OpenAI-compatible backend requires explicit metadata and HTTPS (loopback HTTP allowed for local development). IDs are bounded, safe ASCII; unknown fields reject. State policy includes endpoint identity, not secrets.
9. **Lifecycle.** Factory reads only configuration. No network, lock, timers or status persistence at load time. Each stream combines caller signal with a runtime shutdown signal. Shutdown aborts requests, waits for their cleanup and removes only owned leases. Standard commands use `ctx.ui.notify`/`setStatus` or `pi.sendMessage` in headless mode. No console output.

## Risks / Trade-offs

- [Unknown account independence/authorization] → Require explicit grouping and authorized accounts; document ToS restriction; do not claim multiplied capacity.
- [Other tools use the same keys] → State only coordinates this extension; configure conservative headroom and honor actual server cooldowns.
- [Filesystem locking overhead] → Small atomic transactions and bounded cancellable polling; no locks held during network streaming.
- [Machine clock changes] → Timestamp-based rolling windows are conservative after backward jumps; forward jumps and quota resets require external trustworthy clock if stronger guarantees are needed.
- [PID reuse / hung process] → Prefer reduced capacity to overcommit; timeout, cancellation and owner cleanup cover ordinary operation.
- [Agnes images only documented as URLs] → Default router models advertise text only until image compatibility is verified; generic adapter can explicitly enable images.
- [Future host changes] → Peer dependencies remain `*` per Pi package standard; declare tested Pi 1.1.0 and fail clearly if required public native API is absent. Re-run compatibility tests on upgrades.

## Migration Plan

Develop through `pi -e ./src/extension.ts`; validate source package through Pi package loading and npm pack. Do not install globally or change model defaults during development. Local installation is standard `pi install . --local`. Rollback is removal of the package declaration; quota metadata remains conservative and can be inspected separately. Never delete active usage state to recover a credential.
