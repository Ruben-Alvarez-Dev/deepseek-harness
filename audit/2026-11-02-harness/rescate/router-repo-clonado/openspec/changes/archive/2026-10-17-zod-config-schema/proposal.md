# Zod Config Schema

## Why

Today config validation is ad-hoc: `parseConfig()` in `config.ts` uses manual type checks, `integer()` helpers, and inline defaults spread across 200 lines. This has known gaps:

1. No single runtime schema for the flat router configuration
2. Error messages are generic (`"Invalid account credential format."`) without pointing to the exact field
3. Adding a new policy field requires touching parser, type, and defaults in 3 separate places
4. No way to validate configs in CI without running the full router

Zod is the SOTA choice for TypeScript config validation:
- Single source of truth: schema IS the TypeScript type
- Runtime validation with precise error paths (`accounts[0].quotaGroup: expected string, got number`)
- `.parse()` throws with structured errors, `.safeParse()` returns result union
- 10KB, zero dependencies beyond Zod itself

## What Changes

- **New file**: `src/config.zod.ts` — Zod schemas for every domain object
- **Modified file**: `src/config.ts` — `parseConfig()` delegates to Zod, keeps defaults logic
- **Modified file**: `src/extension.ts` — uses typed config from Zod
- **New tests**: `tests/config-zod.test.ts` — exhaustive validation scenarios

## Capabilities

### New Capabilities

- `config-validation`: Config validation with Zod schemas, precise error reporting, CI-testable

### Modified Capabilities

- `pi-extension`: Config loading now validates against Zod schema before constructing router

## Impact

- Backward compatible: all existing config files pass Zod validation (must be verified by test)
- Breaking: configs with unknown fields now fail instead of silently ignoring
- Migration: automatic — `parseConfig()` internally validates with Zod, same API surface
- No new dependencies added to runtime (Zod is already a common transitive dep in Pi ecosystem, but we add it explicitly as devDep for safety)
