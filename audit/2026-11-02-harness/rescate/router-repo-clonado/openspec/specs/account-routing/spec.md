# account-routing Specification

## Purpose
Distribute individual inference requests across authorized accounts without exhausting one first or treating shared credentials as independent capacity.

## Requirements

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

### Requirement: Shared rolling budgets
The router SHALL enforce each configured rolling-window request budget per quota group, shared by all member accounts, including conservative accounting for failed dispatched requests.

#### Scenario: Two keys share a group
- **WHEN** two accounts share a group limited to two requests per minute
- **THEN** a third request cannot dispatch before capacity returns regardless of key rotation

#### Scenario: Additional long-window budget
- **WHEN** a group reaches its configured daily-length rolling budget
- **THEN** unused minute capacity does not permit dispatch

### Requirement: Atomic local coordination
Reservations, waiting tickets, rotation, consumption and concurrency SHALL be durable and atomically coordinated across local processes. Tickets SHALL receive fair priority for overlapping groups without blocking unrelated groups. Dead process metadata SHALL be reclaimed; corrupt state/conflicting policies SHALL fail closed. State migration SHALL preserve quota history.

#### Scenario: Two Pi processes keep requesting
- **WHEN** two processes queue requests against a concurrency-one shared group
- **THEN** later arrivals cannot repeatedly overtake an earlier ticket for that group

#### Scenario: Competing Pi processes
- **WHEN** two processes reserve simultaneously from a group with concurrency one
- **THEN** at most one receives a reservation

#### Scenario: Crash recovery
- **WHEN** a reservation belongs to a process that has exited
- **THEN** another process reclaims concurrency without erasing its recorded request consumption

#### Scenario: Invalid durable state
- **WHEN** persisted JSON is malformed or structurally invalid
- **THEN** no request dispatches and existing state is not silently reset

#### Scenario: Old state is upgraded
- **WHEN** valid state v1 is loaded by the continuity implementation
- **THEN** usage/cooldowns/disable flags/reservations remain intact and an empty waiting queue is added

### Requirement: Bounded cancellable waiting
Requests SHALL support cancellable unlimited capacity waiting by default, explicit finite deadlines and explicit zero-wait behavior. Temporary capacity exhaustion SHALL NOT end a task merely because an implicit 30-second timeout elapsed. Cancellation and shutdown SHALL remove owned waiting tickets/reservations without deleting usage.

#### Scenario: Exhaustion exceeds thirty seconds
- **WHEN** default-mode capacity returns after more than thirty seconds
- **THEN** the waiting request resumes without a capacity error or manual continuation

#### Scenario: Explicit finite deadline
- **WHEN** a configured finite queue deadline expires without capacity
- **THEN** an actionable capacity error terminates the request without upstream dispatch

#### Scenario: All groups temporarily unavailable
- **WHEN** no group can dispatch before a configured finite queue deadline
- **THEN** the request returns an actionable capacity error without contacting the provider

#### Scenario: Cancel while queued
- **WHEN** a caller aborts a queued request
- **THEN** its ticket is removed, no new reservation is made and peer work is unaffected

### Requirement: Server cooldown and authentication isolation
A 429 response SHALL cool down its quota group using Retry-After when valid or a configured fallback. Authentication failures SHALL disable only the selected account. Transient server failures SHALL temporarily cool down the affected group.

#### Scenario: Shared group rate limit
- **WHEN** account A receives 429 with Retry-After 30 seconds
- **THEN** neither A nor another key in its group dispatches before the cooldown ends

#### Scenario: Invalid credential
- **WHEN** account A receives 401 or 403
- **THEN** A is disabled while unrelated eligible accounts remain usable
