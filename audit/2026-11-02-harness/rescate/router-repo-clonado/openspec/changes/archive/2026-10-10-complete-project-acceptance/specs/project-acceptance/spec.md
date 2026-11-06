# Project Acceptance

## Purpose

Accept the user's actual priority: preserve a started task through temporary rate limits and coordinate simultaneous Pi instances using standard native integration.

## ADDED Requirements

### Requirement: Continuity is the mandatory objective
Global acceptance SHALL require observed task continuity and shared-session coordination, not economic savings or a speculative capacity multiplier. Tests and formal specification validation SHALL NOT alone constitute global acceptance.

#### Scenario: Optional financial analysis is absent
- **WHEN** mandatory continuity/compatibility criteria are evidenced and financial savings have not been evaluated
- **THEN** the absent optional analysis does not block continuity acceptance and no economic claim is made

### Requirement: Native multi-session continuity evidence
Two actual native Pi processes sharing local router state SHALL complete declared bounded inert-tool tasks across at least two quota-window rollovers and a controlled pre-output 429 without manual continuation, duplicate tool execution, quota/concurrency overcommit or leftover ownership.

#### Scenario: Two sessions encounter shared temporary exhaustion
- **WHEN** both agents need further inference after exhausting the known shared budget
- **THEN** each waits fairly and completes after capacity returns, with its original context and exactly one tool execution per task

### Requirement: Standard activation
Ordinary deployed Pi sessions SHALL actually select the router through standard package/default configuration, not require an unreported --model override. Because Pi marks a native provider configured synchronously only when `models.json` declares it, activation SHALL include that provider declaration, and the placeholder value SHALL never reach the provider. Configuration mutation SHALL remain an explicit deployment operation, not factory behavior.

#### Scenario: New ordinary session starts
- **WHEN** a new Pi process starts with deployed defaults and `models.json` declaring `account-router`
- **THEN** its inference uses account-router and shared quota coordination while the original Agnes registration remains available, and the `models.json` placeholder is never transmitted

### Requirement: Evidence and limits stay explicit
Acceptance SHALL distinguish controlled rate-limit tests, minimal real credential checks and untested provider outages. Separate pool budgets SHALL require defensible attribution; unknown independence SHALL NOT be converted into independent limits. Finite capacity MAY require waiting rather than immediate output.

#### Scenario: Real pool independence remains unknown
- **WHEN** the four credentials work but independent quotas are unconfirmed
- **THEN** shared respectful waiting can satisfy continuity, but no additive quota claim is accepted
