# Tasks: Zod Config Schema

Execute serially. Check types, lint, and tests after every task.

- [x] 1. Add `zod` to devDependencies and install
- [x] 2. Create `src/config.zod.ts` with schemas for Limit, QuotaGroup, CredentialReference, Account, Provider, Policy, RouterConfig
- [x] 3. Add `.default()` for every optional field matching current defaults in `config.ts`
- [x] 4. Add `formatZodErrors()` helper that converts `ZodError` to human-readable string
- [x] 5. Refactor `parseConfig()` in `config.ts` to delegate validation to `RouterConfigSchema.safeParse()` before cross-field checks
- [x] 6. Keep cross-field validations (duplicate keys, missing quotaGroup refs, credential consistency) in `parseConfig()` after Zod pass
- [x] 7. Create `tests/config-zod.test.ts`:
  - Valid config files from `examples/` pass validation
  - Invalid fields caught (negative requests, missing quotaGroup, wrong type)
  - Unknown top-level fields rejected
  - Error messages contain field path
  - Default values applied when fields omitted
  - Cross-field: account references nonexistent quotaGroup fails
  - Cross-field: duplicate account IDs fails
- [x] 8. Run full suite: `npm run check` (typecheck + lint + 192+ tests)
- [x] 9. Run `openspec validate --all --strict` and verify `config-validation` spec passes