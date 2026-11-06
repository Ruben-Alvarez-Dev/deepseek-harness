# Tasks

## Implementation
- [x] 1. Add `shadowEnabled`, `latencyEWMAAlpha`, `latencyThresholdMs` to RouterConfig and parseConfig (default shadowEnabled=false, alpha=0.5, threshold=2000).
- [x] 2. Extend RouterState to v3 with `latEWMA: Record<string, number>`.
- [x] 3. Migrate v2→v3 in decodeState (add empty latEWMA).
- [x] 4. Add `Lease.startedAt` field and populate it at acquire time.
- [x] 5. Add `AccountRouter.recordLatency(accountId, latencyMs)` method.
- [x] 6. Update `selectAccount` in policy.ts to use `(pressure, latEWMA)` as sort key.
- [x] 7. Record latency in RoutedStreams after successful request completion.
- [x] 8. Write tests for EWMA math, selection tiebreaker, migration.
- [x] 9. Validate OpenSpec change strictly.
- [x] 10. Update docs/project-status.md and archive.
