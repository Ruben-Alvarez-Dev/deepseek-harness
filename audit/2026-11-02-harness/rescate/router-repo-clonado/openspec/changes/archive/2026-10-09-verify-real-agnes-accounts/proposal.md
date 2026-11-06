# Verify real Agnes credentials

## Why

The user supplied four Agnes credentials and requested local enrollment and real routing tests, including investigation of an alleged fifth credential. The initial implementation had only exercised one real credential.

## What Changes

- Compare supplied credentials in memory with existing Agnes configuration and relevant previous Pi user messages; never print secret values.
- Enroll missing credentials through public Pi login persistence and its locked credential store, preserving the existing provider credential and unrelated entries.
- Configure four account references outside the repository, sharing the existing conservative 10 RPM / concurrency-one policy and retained quota history.
- Add an opt-in, public-API-only test observer for actual Pi selected reservations/HTTP statuses and an inert tool continuation.
- Execute bounded live checks, record sanitized evidence and rerun deterministic acceptance checks.

## Capabilities

### New Capabilities

None. This is operational enrollment and acceptance evidence for existing capabilities.

### Modified Capabilities

None. No changes to extension registration, routing semantics or wire contracts.

## Impact

Explicit user-authorized writes to local Pi credential storage and private router configuration, plus opt-in development test tooling and documentation. No secrets enter source/package artifacts; global model/default settings and existing quota history remain intact. Separate upstream account quotas are not presumed or pressure-tested.
