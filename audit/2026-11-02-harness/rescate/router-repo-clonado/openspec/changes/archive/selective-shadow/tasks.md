# Tasks

## Implementation
- [x] 1. Add `shadowEnabled` to RouterConfig and parseConfig (default false).
- [x] 2. Extend RunResult with `failedAccountId` and modify `run()` to accept `excludeAccountId`.
- [x] 3. Implement `shadowAttempt()` in RoutedStreams: increments shadowCount, appends error as system message, runs stream on excluded account, decrements count.
- [x] 4. Wire shadow dispatch in `complete()`: on transient failure with shadowEnabled, dispatch shadow; fallback to normal transient retry.
- [x] 5. Add `S n` glyph to footer when shadows are active.
- [x] 6. Write tests for configuration, shadow dispatch, and footer glyph.
- [x] 7. Validate OpenSpec change strictly.
- [x] 8. Update docs/project-status.md and archive.
