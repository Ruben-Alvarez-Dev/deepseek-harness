## ADDED Requirements

### Requirement: Safe terminal tool-call identities
The router SHALL remove tool-call blocks with missing, empty, whitespace-only or control-character identities, or non-object arguments, from every terminal message. A success containing such a block SHALL become an error, not a tool-executable success. Text, reasoning and usage SHALL be preserved without mutating shared partial messages.

#### Scenario: Incomplete successful stream
- **WHEN** a native stream ends successfully with an empty call id or name
- **THEN** the router returns an error terminal with no invalid tool-call block
- **AND** a real Pi tool loop executes no tools from that failed turn

#### Scenario: Abort or cleanup failure
- **WHEN** an incomplete call is present during cancellation or reservation cleanup failure
- **THEN** the error terminal does not reintroduce the invalid block
- **AND** the inference is not automatically replayed after partial output

### Requirement: Safe outgoing transcript projection
The router and its Pi extension SHALL sanitize malformed historical calls and orphan tool results in the outgoing projection. They SHALL preserve original session entries and unrelated system/custom messages. The extension transform SHALL apply even when another provider is selected.

#### Scenario: Provider switch with poisoned history
- **WHEN** history includes an empty-id call and its result and a different provider is selected
- **THEN** the context event returns a projection without those blocks
- **AND** the original history remains unchanged

### Requirement: Non-sensitive upstream diagnostics
Known client errors SHALL be classified using a fixed vocabulary, without copying arbitrary upstream response bodies. Existing overflow, authentication, rate-limit and service-error handling SHALL remain unchanged.

#### Scenario: Empty call id rejected by upstream
- **WHEN** a 400 body identifies an invalid tool-call id and includes private data
- **THEN** the error contains `invalid_request: tool_call_id`
- **AND** it contains none of the private body text

#### Scenario: Unknown client error
- **WHEN** the body does not match a supported diagnostic category
- **THEN** the router emits a generic status-specific error without body disclosure
