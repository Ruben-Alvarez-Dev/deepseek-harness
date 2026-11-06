## ADDED Requirements

### Requirement: EWMA latency tracking per account
The router SHALL maintain an exponentially weighted moving average (EWMA) of observed request latency per account in state. The EWMA SHALL use the configured decay factor `latencyEWMAAlpha` (default 0.5). Fresh accounts without history SHALL have EWMA of 0.

#### Scenario: First measurement sets EWMA
- **WHEN** an account completes its first request with latency 500ms and `latencyEWMAAlpha` is 0.5
- **THEN** the stored EWMA for that account is 500ms

#### Scenario: EWMA updates with subsequent measurements
- **WHEN** an account with EWMA 500ms completes a request with latency 1000ms and `latencyEWMAAlpha` is 0.5
- **THEN** the stored EWMA becomes 750ms (0.5 × 1000 + 0.5 × 500)

### Requirement: Latency as selection tiebreaker
The router SHALL use EWMA latency as a tiebreaker when two eligible accounts have equal pool pressure. Lower EWMA wins; if EWMA is equal, the rotation cursor breaks the tie.

#### Scenario: Equal pressure, different latency
- **WHEN** account A has pressure 0.2 and EWMA 200ms, account B has pressure 0.2 and EWMA 800ms
- **THEN** account A is selected

#### Scenario: Different pressure overrides latency
- **WHEN** account A has pressure 0.8 and EWMA 100ms, account B has pressure 0.2 and EWMA 900ms
- **THEN** account B is selected (pressure is primary)

#### Scenario: Fresh account falls back to pressure-only
- **WHEN** all eligible accounts have EWMA of 0 (no history)
- **THEN** selection follows pressure-only rules with rotation cursor tiebreaker
