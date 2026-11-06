# Accept continuity across rate limits and simultaneous Pi sessions

## Why

The user clarified the primary goal: a started process must not require manual restart/continue because of temporary rate limits, including when two Pi instances share credentials. Economic advantage was introduced by the assistant and is not an acceptance requirement. Current code has a 30-second default queue deadline and surfaces every 429 as a terminal error; those are real continuity gaps.

## What Changes

- Default to cancellable waiting without an arbitrary capacity deadline; retain explicit finite/no-wait operator options.
- Coordinate fair waiting tickets, reservations and budgets across local Pi processes, preserving existing quota history through state migration.
- Recover only definitive HTTP 429 rejections before any public stream event, respecting group cooldown and Retry-After; never replay partial output or ambiguous network failures.
- Prove two native Pi processes finish tool tasks across quota resets/controlled 429, without duplicate tools or manual continuation.
- Activate routing through standard Pi package/default configuration so ordinary sessions actually use the router, not merely expose selectable models.
- Keep economics and maximum-capacity benchmarking optional. Separate pools still require defensible attribution; unknown independence does not prevent continuity through respectful waiting.

## Capabilities

### New Capabilities

- `project-acceptance`: Evidence-backed task continuity and simultaneous-session acceptance.

### Modified Capabilities

- `account-routing`: Cancellable unlimited waiting and fair durable queue coordination.
- `provider-transport`: Explicit safe pre-output 429 recovery, with native retries disabled and no partial replay.

## Impact

Public native Pi APIs remain mandatory. No proxy/harness patch, quota increase, account manufacture, history reset or secret logging. Activation is an explicit deployment operation, not factory-time global configuration mutation. Limits can require a visible wait; no finite service can promise zero waiting or recovery from permanently invalid credentials or an unavailable provider.
