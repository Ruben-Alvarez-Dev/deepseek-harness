# repository-hygiene Specification

## Purpose
The project operates under a physical-boundary rule: every file, dependency, artifact and script side effect belongs to the repository root. Documentation must remain truthful and navigable inside that boundary.

## Requirements

### Requirement: Working artifacts stay inside the repository root

No project script or runtime path SHALL create, move or read working artifacts outside the repository root except the documented Pi agent-directory state locations (`<agentDir>/account-router*`, `<secretsDir>`), which are the runtime home of any Pi extension.

#### Scenario: Pack destination is inside the root

- **GIVEN** `npm run verify:full`
- **WHEN** it packs the tarball
- **THEN** the destination directory is `dist/` inside the repository and listed in `.gitignore`

#### Scenario: Transient decryption material is co-located

- **GIVEN** the secrets depot decrypts a vault
- **WHEN** it needs a temporary identity file
- **THEN** the file is created inside the vault's own directory and unlinked afterwards (see `secret-depot` requirement)

### Requirement: Documentation contains no dead references

Project documentation SHALL NOT reference files that no longer exist as if they were readable. Retired documents SHALL be described as retired, with their successor named.

#### Scenario: Retired study points to its successor

- **GIVEN** `docs/policy-study.md` was retired with the reduced plan of 2026-10-12
- **WHEN** a reader opens ADR 0004
- **THEN** the reference declares it retired and identifies ADR 0004 itself as the consolidated successor

#### Scenario: External evidence is declared external

- **GIVEN** verification logs archived in `DOCS-HARNESS`, outside the repository
- **WHEN** `docs/project-status.md` cites them
- **THEN** the text marks them as an external, unversioned provenance note rather than an in-repo dependency
