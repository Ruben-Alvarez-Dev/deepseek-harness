# provider-catalog Specification

## ADDED Requirements

### Requirement: Runtime contract validation on config load
WHEN `loadConfig()` loads a configuration whose accounts declare
`providerContract`, the loaded configuration SHALL be validated against the
shipped provider catalog before the router is constructed:

- a reference that does not resolve to a catalog contract SHALL fail the load;
- a configured model not listed in the contract's models SHALL fail the load,
  when the contract's provider matches the configured provider adapter;
- a quota-group limit window whose equivalent RPM exceeds the contract's
  documented `limits.rpm` SHALL fail the load.

Configs without `providerContract` SHALL load without touching the catalog.

#### Scenario: Missing contract reference fails the load
- **GIVEN** an account with `providerContract: "agnes/free-v9"` and no such catalog contract
- **WHEN** `loadConfig()` is called
- **THEN** it throws a `RouterError` with code `config` mentioning `agnes/free-v9`

#### Scenario: Over-limit quota group fails the load
- **GIVEN** an account bound to `agnes/free-v1` whose quota group allows 20 requests per 60000ms
- **WHEN** `loadConfig()` is called
- **THEN** it throws a `RouterError` with code `config` mentioning the contract RPM

#### Scenario: Contract-conformant config loads
- **GIVEN** an account bound to `agnes/free-v1` with a 10 req / 60000ms group and only free models
- **WHEN** `loadConfig()` is called
- **THEN** it returns the parsed configuration without error

#### Scenario: No contract declared means no catalog I/O
- **GIVEN** a configuration where no account declares `providerContract`
- **WHEN** `loadConfig()` is called
- **THEN** it returns without loading the provider catalog
