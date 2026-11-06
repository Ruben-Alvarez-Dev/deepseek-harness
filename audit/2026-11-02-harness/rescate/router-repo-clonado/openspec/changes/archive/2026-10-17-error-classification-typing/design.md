# Design: error-classification-typing

- Read `src/domain/types.ts` for the exact `RouterError` constructor and the existing code vocabulary; reuse codes where semantics match (corrupt-state), introduce new fixed codes only for genuinely distinct conditions (terminal-event invariant, lock-acquire, lock-compromise). Naming follows the existing snake_case style.
- Messages stay byte-identical where tests or users match on them.
- Catch-path audit: `routed-streams.ts` feedback classification, `extension.ts` command handlers — they catch `Error`; since `RouterError extends Error`, behavior is preserved; confirm, do not change.
- Scope guard: only the four identified sites in `src/`.
