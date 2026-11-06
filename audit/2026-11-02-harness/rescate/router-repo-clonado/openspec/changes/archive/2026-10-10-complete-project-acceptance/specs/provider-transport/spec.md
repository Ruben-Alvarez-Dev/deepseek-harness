# Provider Transport

## MODIFIED Requirements

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
