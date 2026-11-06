# provider-transport Specification

## Purpose
Connect authorized account pools to supported model APIs while preserving Pi streaming, tool use, instrumentation and credential confidentiality.

## Requirements

### Requirement: Replaceable provider
The package SHALL support an Agnes adapter and a configurable OpenAI-compatible adapter without changing provider-neutral routing behavior. Agnes defaults SHALL expose only the documented free Flash models.

#### Scenario: Replace Agnes
- **WHEN** configuration selects another OpenAI-compatible endpoint and explicit model metadata
- **THEN** the same routing and quota behavior applies to that endpoint

### Requirement: Credential references only
Configuration SHALL accept environment-variable or existing Pi API-key credential references, never literal secrets or shell commands. Duplicate resolved credentials SHALL share a quota group or be rejected.

#### Scenario: Existing Pi credential
- **WHEN** an account references Pi provider agnes-ai
- **THEN** requests resolve its current API key without copying or modifying auth.json

#### Scenario: Duplicate secret across groups
- **WHEN** two account references resolve to the same key but claim separate groups
- **THEN** the request fails before network dispatch

### Requirement: Native stream contract
Streaming SHALL reuse Pi's supported API implementations, preserve full transcript context, emit one terminal event, retain usage and tool-call information, and forward request instrumentation, environment, fetch and cancellation options.

#### Scenario: Tool continuation
- **WHEN** a tool result is followed by a request routed to another account
- **THEN** the provider receives the complete relevant transcript and normalized tool definitions

#### Scenario: Instrumentation
- **WHEN** a caller supplies payload, response and raw-provider-event callbacks
- **THEN** each callback is honored according to Pi's native contract

### Requirement: Single attempt policy
Native transport retries SHALL remain zero for each HTTP attempt. In continuity mode the router MAY resume the same logical inference after a definitive HTTP 429 rejection only if no public stream event was exposed, cleanup succeeded and cancellation was not requested. It SHALL retain consumption, respect group cooldown/Retry-After and reacquire capacity fairly. Explicit error mode SHALL retain one-attempt behavior. Partial or ambiguous failures SHALL NOT be transparently replayed.

#### Scenario: Rate limit rejects before output
- **WHEN** upstream returns HTTP 429 before any exposed stream event in continuity mode
- **THEN** the logical request waits/reacquires and resumes without emitting a terminal rate-limit error or duplicating tool output

#### Scenario: Failure after content
- **WHEN** a stream fails after any public text/thinking/tool event
- **THEN** it terminates without a hidden second attempt

#### Scenario: Error mode is explicit
- **WHEN** rateLimitRecovery is configured as error and upstream returns 429
- **THEN** one sanitized terminal error is emitted after exactly one attempt

### Requirement: Safe errors
Persisted state and router diagnostics SHALL contain neither credentials nor prompts or complete provider responses. Transport error text SHALL be normalized to safe categories while preserving recognizable context overflow.

#### Scenario: Provider echoes a secret
- **WHEN** a failed upstream response includes the API key in its error body
- **THEN** the terminal error and persisted metadata omit the key and response body

#### Scenario: Context overflow
- **WHEN** the native transport identifies a context overflow
- **THEN** the error remains recognizable as context_length_exceeded for Pi compaction

### Requirement: Error classification completeness

Every error the router throws from its own code paths SHALL be a `RouterError` carrying a fixed diagnostic code from the controlled vocabulary; no internal path SHALL surface an untyped `Error` for conditions consumers may classify.

#### Scenario: Corrupt episode state is typed

- **GIVEN** an episode state file that fails decode
- **WHEN** `decodeEpisodeState` rejects it
- **THEN** a `RouterError` is thrown whose `code` identifies corrupt state, with the existing human-readable message preserved

#### Scenario: Lock acquisition and compromise are typed

- **GIVEN** the episode store lock cannot be acquired, or is compromised mid-transaction
- **WHEN** either failure occurs
- **THEN** a `RouterError` with a fixed code for the lock condition is thrown

#### Scenario: Generic consumers unchanged

- **GIVEN** a consumer that catches `Error` broadly (command handlers, transport bridge)
- **WHEN** it receives one of the newly typed errors
- **THEN** its behavior is unchanged from the previous raw-`Error` behavior except that `.code` is now available
