## ADDED Requirements

### Requirement: Shadow is opt-in and disabled by default
The router SHALL NOT dispatch shadow regenerations unless `shadowEnabled` is explicitly set to `true` in configuration. The default value SHALL be `false`.

#### Scenario: Default behaviour unchanged
- **WHEN** configuration omits `shadowEnabled`
- **THEN** the router behaves identically to the pre-L3 implementation; no extra account acquisitions occur

#### Scenario: Shadow explicitly disabled
- **WHEN** `shadowEnabled` is `false`
- **THEN** transient failures follow the existing `maxTransientRetries` path only; no shadow dispatch

### Requirement: Single shadow per step
The router SHALL dispatch at most one shadow regeneration per original step. If the shadow also fails, the error is propagated without further retries.

#### Scenario: Shadow succeeds
- **WHEN** the original step fails transitively and `shadowEnabled` is true
- **THEN** one regeneration is dispatched on a different account; if it succeeds, its output is emitted

#### Scenario: Shadow fails
- **WHEN** the shadow regeneration fails (any reason)
- **THEN** the shadow failure is emitted as the terminal result; no additional retries are attempted

### Requirement: Different account for shadow
The shadow SHALL acquire from a different account than the one that failed, to avoid re-hitting the same group cooldown.

#### Scenario: Shadow avoids failed account
- **WHEN** account A fails transitively
- **THEN** the shadow acquisition skips account A and selects the next eligible account by least-pressure

#### Scenario: Only one account configured
- **WHEN** there is only one configured account and `shadowEnabled` is true
- **THEN** the shadow falls back to the same account (no other option) and follows normal transient semantics
