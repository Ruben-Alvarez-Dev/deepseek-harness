## MODIFIED Requirements

### Requirement: Standard status command
The extension SHALL provide /router-status and /router-enable for safe status and recovery of disabled accounts, and one footer label next to the model, without adding footer rows. The label SHALL show the account in use out of the total, the model, and a colour that varies continuously with the pool's rolling-window usage; queued requests, cooldown and auth-disabled accounts SHALL appear only when present; its visible width SHALL be capped. The label SHALL update only from real events (own state commits, sibling-process writes to the shared state, model/session events and the next instant a value changes by itself) and SHALL NOT poll on a fixed period. Read-only inspection SHALL NOT rewrite shared state.

#### Scenario: JSON mode
- **WHEN** the status command executes in JSON mode
- **THEN** status is emitted as a Pi message rather than corrupting JSONL with console output

#### Scenario: Re-enable credential
- **WHEN** an operator runs /router-enable for a disabled configured account
- **THEN** its authentication-disable state clears without resetting quota or cooldown history

#### Scenario: Label follows reality
- **WHEN** this process or a sibling Pi process changes shared state, or a cooldown ends
- **THEN** the label is re-rendered without waiting for a timer tick and unchanged renders are suppressed

#### Scenario: Bounded footprint
- **WHEN** the model name is long or several anomalies are present
- **THEN** the visible label stays within the width cap on a single row

#### Scenario: Non-router model
- **WHEN** the active model does not belong to the router
- **THEN** the label is cleared
