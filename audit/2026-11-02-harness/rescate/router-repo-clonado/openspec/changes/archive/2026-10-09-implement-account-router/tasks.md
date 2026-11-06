# Tasks

Execute groups in order; do not begin the next group until the current group's checks pass. No speculative parallel changes.

## 1. Standard package and configuration boundary

- [x] 1.1 Create standard pi manifest, host peers, strict TypeScript and reproducible check scripts; verify npm install and manifest test.
- [x] 1.2 Implement strict secret-free config, safe defaults and provider model descriptors; verify config tests for invalid values, unknown fields and paid-model rejection.
- [x] 1.3 Document config shape and defaults in README; verify example JSON against parser.

## 2. Provider-neutral routing and durable state

- [x] 2.1 Define minimal domain/ports and pure shared-window rotation; verify rotation, quota windows, cooldown and concurrency tests.
- [x] 2.2 Implement bounded abortable acquisition, release and authentication recovery; verify fake-clock cancellation and cleanup tests.
- [x] 2.3 Implement atomic private file state, cross-process locks and dead-process recovery; verify competing child-process reservations and corrupt-state fail-closed tests.
- [x] 2.4 Document local coordination and rolling-budget semantics; verify docs do not imply calendar resets or independent quotas per key.

## 3. Credentials and native transport

- [x] 3.1 Resolve environment/Pi API-key references and reject duplicate keys across groups; verify missing, rotating, unsupported and malformed credential tests without secret output.
- [x] 3.2 Implement native stream delegation, one-attempt policy and HTTP feedback; verify mocked 429/401/503, Retry-After date/delta and hook passthrough tests.
- [x] 3.3 Verify tool continuation, usage, empty/Unicode responses, partial-stream failure, overflow and abort via local HTTP integration tests using the real Pi API transport.
- [x] 3.4 Document security, unsupported auth/overrides and failure policy; verify no retries or raw upstream errors escape.

## 4. Standard Pi integration

- [x] 4.1 Compose native provider and default extension factory; verify public native registration, availability and no factory network/state side effects.
- [x] 4.2 Implement standard status/enable commands and idempotent runtime shutdown; verify TUI/RPC/headless behavior and owner isolation.
- [x] 4.3 Add Pi loader/package CLI integration checks and opt-in live smoke script; verify installed Pi can select router models and load packed resources.
- [x] 4.4 Document install, development, compatibility version and provider replacement; verify documented entry points and npm pack contents.

## 5. End-to-end acceptance

- [x] 5.1 Run complete type/lint/test/OpenSpec strict checks and record commands/results in docs/verification.md.
- [x] 5.2 Run minimal live Agnes request through the extension using existing credential without changing global settings; record observable result and untested limits.
- [x] 5.3 Review spec-to-test traceability, package secret exclusion and dependency audit; verify no incomplete tracked task remains before marking implementation complete.

## Workflow follow-up

- Archive the change after acceptance checks and preserve canonical capability specifications.
