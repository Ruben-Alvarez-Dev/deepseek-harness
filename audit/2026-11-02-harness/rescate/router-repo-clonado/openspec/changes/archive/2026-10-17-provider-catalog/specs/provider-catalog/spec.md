# provider-catalog Specification

## Purpose
Provider specifications SHALL be stored as versioned, immutable contract files that the router can query at runtime to validate account limits, available models, and API endpoints.

## ADDED Requirements

### Requirement: Versioned immutable contracts
Each provider contract SHALL be a versioned JSON file that, once published, is never modified except to add `supersededBy` when a new version replaces it.

#### Scenario: Contract is immutable
- **GIVEN** `contracts/agnes/free-v1.json` committed to the repository
- **WHEN** Agnes changes its free tier limit from 10 to 5 RPM
- **THEN** a new file `contracts/agnes/free-v2.json` is created and `free-v1.json` only gains `"supersededBy": "agnes/free-v2"` — no other fields change

#### Scenario: Old contract still valid
- **GIVEN** a user profile referencing `providerContract: "agnes/free-v1"`
- **WHEN** `free-v2.json` is added
- **THEN** the user's profile still resolves against `free-v1.json` and uses its limits

### Requirement: Contract chain
Contracts SHALL reference their predecessor and successor via `supersedes` and `supersededBy` fields.

#### Scenario: Resolve latest contract
- **GIVEN** `free-v1.json` (supersededBy: "agnes/free-v2") and `free-v2.json` (supersedes: "agnes/free-v1")
- **WHEN** the catalog is queried for "latest agnes free"
- **THEN** it returns `free-v2.json`

### Requirement: Model availability validation
The validator SHALL reject an account configuration that uses a model not listed in the contract's available models.

#### Scenario: Paid model in free contract
- **GIVEN** a profile account with `providerContract: "agnes/free-v1"` and a model selector that includes `"agnes-3.0-pro"`
- **WHEN** the validator runs
- **THEN** it throws because `agnes-3.0-pro` is not in `free-v1.json` models

#### Scenario: Free model in free contract
- **GIVEN** a profile account with `providerContract: "agnes/free-v1"` and model `"agnes-3.0-flash"`
- **WHEN** the validator runs
- **THEN** it passes because `agnes-3.0-flash` is listed

### Requirement: Limit validation
The validator SHALL reject account group limits that exceed the contract's documented limits.

#### Scenario: RPM exceeds contract
- **GIVEN** a contract with `limits.rpm: 10` and a quotaGroup with `limits: [{ requests: 20, windowMs: 60000 }]`
- **WHEN** the validator runs
- **THEN** it warns (or errors, depending on strict mode) that 20 RPM exceeds the contract's 10 RPM

### Requirement: Source traceability
Every contract SHALL document its sources with URLs and verification dates.

#### Scenario: Contract has verifiable sources
- **GIVEN** `contracts/agnes/free-v1.json`
- **WHEN** inspected
- **THEN** it contains a `sources` array with at least one entry having `url`, `description`, and `verifiedAt`

### Requirement: All contracts pass CI validation
Every contract file in `catalog/contracts/` SHALL pass schema validation (Zod) in CI.

#### Scenario: Malformed contract fails CI
- **GIVEN** a contract file missing the required `api.baseUrl`
- **WHEN** CI runs contract validation
- **THEN** the validation fails with a schema error