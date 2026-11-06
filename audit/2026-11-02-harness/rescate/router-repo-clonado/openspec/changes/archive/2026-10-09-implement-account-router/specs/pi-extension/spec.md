# Pi Extension

## Purpose

Make account routing an ordinary installable Pi extension with selectable models and mode-independent behavior rather than a proxy or harness modification.

## ADDED Requirements

### Requirement: Standard package and provider registration
The package SHALL export a default ExtensionAPI factory, declare extension paths in its pi manifest, and register a native provider named account-router through the public Pi API. Host-provided Pi packages SHALL remain peers and SHALL NOT be bundled.

#### Scenario: Pi loader
- **WHEN** Pi loads the package through -e or pi install
- **THEN** the provider and extension commands load without extension errors

#### Scenario: Model selection
- **WHEN** an eligible account credential is configured
- **THEN** router models appear in Pi's standard available-model catalog

### Requirement: Secret-free configuration
The extension SHALL validate explicit configuration before registration, reject unknown fields and invalid identifiers, and otherwise use a conservative single-account Agnes configuration referencing the existing agnes-ai Pi credential. It SHALL NOT alter existing providers or global settings.

#### Scenario: Missing custom configuration
- **WHEN** no router configuration file exists
- **THEN** only the existing Agnes credential is referenced with one shared 10 RPM group

#### Scenario: Malformed configuration
- **WHEN** configuration includes an unknown field or invalid quota
- **THEN** startup reports a safe configuration error rather than silently using defaults

### Requirement: Lifecycle ownership
Loading the factory SHALL perform no network requests or start background resources. Runtime shutdown SHALL cancel only that runtime's pending calls and release its reservations, and cleanup SHALL be idempotent.

#### Scenario: Help or model listing
- **WHEN** Pi loads the extension to list models or show help
- **THEN** no provider requests, timers or persistent locks remain active

#### Scenario: Shutdown twice
- **WHEN** cleanup is invoked twice
- **THEN** it safely completes without affecting another runtime's reservations

### Requirement: Standard status command
The extension SHALL provide /router-status and /router-enable for safe status and recovery of disabled accounts. TUI status SHALL use standard Pi UI methods, while headless commands SHALL report through Pi messages without writing unsolicited stdout.

#### Scenario: JSON mode
- **WHEN** the status command executes in JSON mode
- **THEN** status is emitted as a Pi message rather than corrupting JSONL with console output

#### Scenario: Re-enable credential
- **WHEN** an operator runs /router-enable for a disabled configured account
- **THEN** its authentication-disable state clears without resetting quota or cooldown history
