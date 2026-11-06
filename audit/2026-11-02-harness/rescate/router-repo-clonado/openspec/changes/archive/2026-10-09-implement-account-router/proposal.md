# Proposal

## Why

Sequential account exhaustion wastes available short-window capacity. Pi needs a standard selectable provider that proactively distributes each inference across authorized accounts while preserving conversations and shared quotas.

## What Changes

- Ship an ordinary Pi package with a default TypeScript extension factory and native provider registration.
- Select credentials per inference, including tool continuations, compaction and direct calls, without duplicating prompts.
- Enforce explicitly configured shared rolling-window budgets, concurrency and server cooldowns across local Pi processes.
- Separate provider-neutral scheduling from credential storage, persistence, transport and Pi adapters.
- Include Agnes free-model defaults, an OpenAI-compatible provider option, secret-free configuration and status commands.
- Reuse existing Pi credentials without copying secrets or changing global settings.
- Deliver deterministic tests, real Pi loader/transport checks and opt-in live verification.

## Capabilities

### New Capabilities

- `account-routing`: Proactive selection, shared capacity, durable reservations and cancellation.
- `provider-transport`: Credential references, supported adapters, streaming and failure policy.
- `pi-extension`: Standard packaging, selectable models, lifecycle and status in supported Pi modes.

### Modified Capabilities

None; this repository has no existing specifications.

## Impact

New TypeScript package targeting the installed official `@earendil-works/pi-coding-agent` 1.1.0 API. Pi packages remain host-provided peers. Local state stores quota metadata only. No account creation, rate-limit circumvention, credential redistribution, background network access or changes to Pi global configuration.
