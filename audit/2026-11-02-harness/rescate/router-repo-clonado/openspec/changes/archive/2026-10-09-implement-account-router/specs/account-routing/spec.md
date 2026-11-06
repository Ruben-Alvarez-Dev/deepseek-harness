# Account Routing

## Purpose

Distribute individual inference requests across authorized accounts without exhausting one first or treating shared credentials as independent capacity.

## ADDED Requirements

### Requirement: Proactive rotation
The router SHALL rotate among eligible accounts before every inference, including continuations and direct calls, and SHALL dispatch each request to only one account.

#### Scenario: Three healthy accounts
- **WHEN** six sequential requests use three eligible accounts A, B and C
- **THEN** dispatch order is A, B, C, A, B, C without waiting for failures

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
Reservations, rotation position, quota consumption and group concurrency SHALL be durable and atomically coordinated across processes on one local filesystem. Corrupt state or conflicting group policies SHALL fail closed.

#### Scenario: Competing Pi processes
- **WHEN** two processes reserve simultaneously from a group with concurrency one
- **THEN** at most one receives a reservation

#### Scenario: Crash recovery
- **WHEN** a reservation belongs to a process that has exited
- **THEN** another process reclaims concurrency without erasing its recorded request consumption

#### Scenario: Invalid durable state
- **WHEN** persisted JSON is malformed or structurally invalid
- **THEN** no request dispatches and existing state is not silently reset

### Requirement: Bounded cancellable waiting
Requests SHALL wait for capacity only within a configured maximum queue duration. Cancellation and shutdown SHALL stop pending work and release owned reservations without deleting recorded usage.

#### Scenario: All groups temporarily unavailable
- **WHEN** no group can dispatch before the queue deadline
- **THEN** the request returns an actionable capacity error without contacting the provider

#### Scenario: Cancel while queued
- **WHEN** a caller aborts a queued request
- **THEN** it terminates as aborted and creates no reservation

### Requirement: Server cooldown and authentication isolation
A 429 response SHALL cool down its quota group using Retry-After when valid or a configured fallback. Authentication failures SHALL disable only the selected account. Transient server failures SHALL temporarily cool down the affected group.

#### Scenario: Shared group rate limit
- **WHEN** account A receives 429 with Retry-After 30 seconds
- **THEN** neither A nor another key in its group dispatches before the cooldown ends

#### Scenario: Invalid credential
- **WHEN** account A receives 401 or 403
- **THEN** A is disabled while unrelated eligible accounts remain usable
