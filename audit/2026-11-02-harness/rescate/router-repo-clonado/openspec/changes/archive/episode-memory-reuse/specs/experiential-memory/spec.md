
## ADDED Requirements

### Requirement: Verified episode capture
The system SHALL capture an episodic lesson only when a deterministic verifier produced a verdict for a step. Episodes SHALL contain a task class, a redacted context excerpt, an attempt summary, the verdict, the verifier used, a single actionable lesson, and a timestamp. Episodes SHALL NOT contain credentials, headers, full tool outputs, or any sensitive material.

#### Scenario: Verified failure produces an episode
- **WHEN** a shadow step fails its deterministic verifier
- **THEN** one episode is written with the verdict, the verifier id and a single lesson

#### Scenario: Unverified step produces nothing
- **WHEN** a step has no deterministic verdict
- **THEN** no episode is written, and self-feedback from the model alone never becomes a lesson

#### Scenario: Secrets are redacted
- **WHEN** an attempted episode contains a credential, header or full tool output
- **THEN** the field is redacted or omitted before the episode is stored

### Requirement: Bounded private retention
Episodes SHALL be stored in a private local store (no network, mode 0600) with per-class and global caps. When a cap is reached the oldest episode of that class is evicted, and duplicate lessons SHALL be merged rather than accumulated.

#### Scenario: Cap enforcement
- **WHEN** a task class exceeds its retention cap
- **THEN** the oldest episode of that class is evicted and the store stays within the cap

#### Scenario: Duplicate lessons
- **WHEN** two episodes carry the same normalized lesson for the same task class
- **THEN** they are merged into one entry, not kept as duplicates

### Requirement: Standard-hook reuse
The system SHALL inject the top-K (K≤3) most relevant episodes for the current task class into the Pi run by modifying the structured system-prompt section through the standard `before_agent_start` hook, with a documented token budget and a per-session opt-in command. The system SHALL NOT use a forced full system prompt replacement for this purpose, SHALL NOT inject episodes for non-router models, and SHALL keep the injected text bounded to the documented budget.

#### Scenario: Opt-in reuse
- **WHEN** reuse is enabled for a session and the run matches a task class with episodes
- **THEN** up to K episodes are added as a dedicated prompt section within the documented token budget

#### Scenario: Disabled or non-router
- **WHEN** reuse is disabled, or the active model is not the router model
- **THEN** no episode text is added to the run

#### Scenario: Budget is hard
- **WHEN** the selected episodes exceed the token budget
- **THEN** entries are truncated or dropped so the injected section never exceeds the budget
