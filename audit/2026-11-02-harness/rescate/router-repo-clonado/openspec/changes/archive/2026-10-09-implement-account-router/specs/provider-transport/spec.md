# Provider Transport

## Purpose

Connect authorized account pools to supported model APIs while preserving Pi streaming, tool use, instrumentation and credential confidentiality.

## ADDED Requirements

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
The router SHALL make at most one upstream attempt per request, disable transport retries, and leave explicit agent-level recovery to Pi. It SHALL NOT silently replay an emitted partial response on another account.

#### Scenario: Failure after content
- **WHEN** a stream fails after emitting text or tool deltas
- **THEN** an error terminates that stream without a second upstream request

### Requirement: Safe errors
Persisted state and router diagnostics SHALL contain neither credentials nor prompts or complete provider responses. Transport error text SHALL be normalized to safe categories while preserving recognizable context overflow.

#### Scenario: Provider echoes a secret
- **WHEN** a failed upstream response includes the API key in its error body
- **THEN** the terminal error and persisted metadata omit the key and response body

#### Scenario: Context overflow
- **WHEN** the native transport identifies a context overflow
- **THEN** the error remains recognizable as context_length_exceeded for Pi compaction
