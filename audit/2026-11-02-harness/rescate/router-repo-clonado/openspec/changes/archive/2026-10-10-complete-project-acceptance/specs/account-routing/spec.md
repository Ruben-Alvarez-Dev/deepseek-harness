# Account Routing

## MODIFIED Requirements

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
