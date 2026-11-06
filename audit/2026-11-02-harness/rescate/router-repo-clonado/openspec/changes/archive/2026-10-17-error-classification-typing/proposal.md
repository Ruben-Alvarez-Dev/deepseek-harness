# error-classification-typing

## Why

The router classifies failures through `RouterError` with fixed diagnostic codes, and downstream consumers (feedback handling, footer anomalies, `/router-status`) rely on that classification. Four internal paths still `throw new Error(...)` with a raw message, bypassing the code vocabulary: `routed-streams.ts` ("Missing terminal stream event"), `episode-store.ts` decode-corrupt, and two lock-failure paths ("Cannot acquire episode store lock", "Episode store lock was compromised"). A cartography of `src/` found no others.

## What Changes

- Convert the four raw throws to `RouterError` with codes from the existing snake_case vocabulary (reuse where semantics match, introduce new fixed codes only where genuinely distinct).
- Keep user-visible message text unchanged.
- Verify catch sites still behave: `RouterError` extends `Error`, so generic handlers are unaffected.
- Add tests asserting the typed code on the decode-corrupt and lock paths.

## Capabilities

### Modified Capabilities

- `provider-transport`: error classification completeness.

## Impact

- `src/` only. No config, spec-shape or wire behavior changes. Diagnostics gain programmatic classification for previously opaque internal failures.
