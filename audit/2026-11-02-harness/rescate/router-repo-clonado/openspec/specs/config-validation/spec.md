# config-validation Specification

## Purpose
Config validation SHALL use Zod schemas as the single source of truth for config shape, providing runtime validation with precise, field-level error messages.

## Requirements

### Requirement: Valid config passes validation
Config files that match the schema SHALL pass `parseConfig()` without error, returning a typed `RouterConfig`.

#### Scenario: Minimal valid config
- **GIVEN** a config with one account, one quotaGroup, and no optional policies
- **WHEN** `parseConfig()` is called
- **THEN** it returns a RouterConfig with defaults applied for all optional fields

#### Scenario: Full config with all policies
- **GIVEN** a config with all policy fields explicitly set
- **WHEN** `parseConfig()` is called
- **THEN** it returns the exact values without overriding them with defaults

#### Scenario: Examples pass validation
- **GIVEN** each JSON file in `examples/`
- **WHEN** `parseConfig()` is called with its contents
- **THEN** it passes without error

### Requirement: Invalid fields produce precise errors
Invalid config fields SHALL produce errors with the exact field path and reason, never generic messages.

#### Scenario: Negative request limit
- **GIVEN** a quotaGroup with `limits: [{ requests: -1, windowMs: 60000 }]`
- **WHEN** `parseConfig()` is called
- **THEN** error message contains `quotaGroups[0].limits[0].requests` and mentions "positive"

#### Scenario: Missing required field
- **GIVEN** an account without `quotaGroup`
- **WHEN** `parseConfig()` is called
- **THEN** error message contains `accounts[0].quotaGroup` and mentions "Required"

#### Scenario: Wrong type
- **GIVEN** `maxConcurrent: "five"` (string instead of number)
- **WHEN** `parseConfig()` is called
- **THEN** error message contains `maxConcurrent` and mentions type mismatch

### Requirement: Unknown fields rejected
Configs with unknown top-level fields SHALL fail validation rather than silently ignoring them.

#### Scenario: Unknown top-level key
- **GIVEN** a config with `"inventedField": true`
- **WHEN** `parseConfig()` is called
- **THEN** it throws with message indicating the field is not recognized

### Requirement: Defaults applied
Optional fields omitted from config SHALL receive their documented defaults.

#### Scenario: Policies omitted
- **GIVEN** a config with no `rateLimitRecovery` field
- **WHEN** `parseConfig()` is called
- **THEN** `result.rateLimitRecovery` equals `"wait"`

#### Scenario: maxWaitMs omitted
- **GIVEN** a config with no `maxWaitMs` field
- **WHEN** `parseConfig()` is called
- **THEN** `result.maxWaitMs` is `null`

### Requirement: Cross-field consistency
Relationships between fields SHALL be validated even when individual fields are valid.

#### Scenario: Account references nonexistent quotaGroup
- **GIVEN** an account with `quotaGroup: "nonexistent"` and no quotaGroup with that id
- **WHEN** `parseConfig()` is called
- **THEN** it throws with message about the missing quotaGroup reference

#### Scenario: Duplicate account IDs
- **GIVEN** two accounts with the same `id`
- **WHEN** `parseConfig()` is called
- **THEN** it throws with message about duplicate IDs

#### Scenario: Duplicate credential keys in different groups
- **GIVEN** two accounts with env references to the same variable but assigned to different quotaGroups
- **WHEN** `resolveAccounts()` is called
- **THEN** it throws (existing behavior, unchanged by this change)

### Requirement: Backward compatibility
All existing config files that pass current validation SHALL pass Zod validation.

#### Scenario: Current test fixtures pass
- **GIVEN** every config used in existing test fixtures and `examples/`
- **WHEN** validated with Zod
- **THEN** all pass without modification
