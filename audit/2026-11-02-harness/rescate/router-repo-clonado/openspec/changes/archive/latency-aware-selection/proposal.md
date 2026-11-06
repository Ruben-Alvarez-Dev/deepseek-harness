# Latency-aware selection (L1)

## Why
L1 research line: account-level EWMA latency tracking improves selection when pools have equal pressure. Proven SOTA (LAD, S3b/S3c). Measured outlier: 4.63s vs 0.55s median TTFT across 4 Agnes keys.

## Scope
- v3 state: `latEWMA[accountId]` (EWMA ms, decay α=0.5)
- Config: `latencyEWMAAlpha` (0–1, default 0.5), `latencyThresholdMs` (default 2000)
- Selector: `(pressure, latEWMA)` — pressure is primary, latency breaks ties
- No user quota cost (reads existing state)
- Opt-in via config; default behavior unchanged for single-account setups

## Acceptance
1. `npm run check` passes
2. `openspec validate latency-aware-selection --strict` passes
3. Two equal-pressure accounts with different EWMA latencies select the faster one
4. Fresh accounts (no history) fall back to pressure-only selection
