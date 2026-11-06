## MODIFIED Requirements

### Requirement: Proactive rotation
The router SHALL select the account for every inference, including tool continuations and compaction, from the eligible pools with the lowest current pressure, where pressure is the larger of rolling-window utilisation and in-flight concurrency utilisation. Equal-pressure pools SHALL rotate in cursor order. The router SHALL NOT wait for a pool to be exhausted before preferring another pool with headroom, and SHALL NOT send one request to several accounts.

#### Scenario: Three healthy accounts
- **WHEN** six sequential requests use three eligible accounts A, B and C with equal pressure
- **THEN** dispatch order is A, B, C, A, B, C without waiting for failures

#### Scenario: Loaded pool is left behind early
- **WHEN** one pool has used most of its window while another eligible pool has headroom
- **THEN** the next inference uses the pool with the most headroom, not the next account in rotation order

#### Scenario: Identical pools rotate
- **WHEN** all eligible pools have equal pressure
- **THEN** successive inferences use them in rotation order

#### Scenario: Unavailable account
- **WHEN** the next account is disabled, lacks credentials or has no capacity
- **THEN** selection skips it and uses another eligible account
