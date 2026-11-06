# Tasks: error-classification-typing

Execute serially. Check typecheck and tests after every code task.

- [x] 1. Inventory confirmed: `src/adapters/routed-streams.ts` terminal-event invariant; `src/adapters/episode-store.ts` decode-corrupt, lock-acquire, lock-compromise; grep confirms no further raw `throw new Error` in `src/`
- [x] 2. Convert site 1 (`routed-streams.ts` terminal stream invariant) to `RouterError` with a fixed code; message preserved
- [x] 3. Convert site 2 (`episode-store.ts` decode corrupt) to `RouterError` reusing/aligning with the existing corrupt-state code; message preserved
- [x] 4. Convert sites 3–4 (`episode-store.ts` lock acquire/compromise) to `RouterError` with fixed lock codes; messages preserved
- [x] 5. Audit catch consumers (feedback handling, command handlers): no behavior change required — record confirmation
- [x] 6. Add tests: typed code asserted on decode-corrupt path and on a lock path (existing helper style)
- [x] 7. `npm run check` green (typecheck, lint --error-on-warnings, root suite, secrets suite)
- [x] 8. `openspec validate --all --strict` green, then archive this change once all tasks above are checked
