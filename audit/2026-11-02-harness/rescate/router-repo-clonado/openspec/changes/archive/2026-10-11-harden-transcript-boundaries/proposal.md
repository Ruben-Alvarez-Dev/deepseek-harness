# Harden transcript boundaries

## Why
An incomplete upstream tool call (empty id/name) poisoned replay across provider switches. Initial remediation also introduced a test syntax error and unsafe unfiltered error-body disclosure. This change records and verifies the corrective work; the initial recovery edits preceded this specification, which is recorded rather than presented as a compliant propose-first sequence.

## What Changes
- Validate tool-call identity and argument object shape at terminal boundaries, including abort/cleanup errors.
- Sanitize outgoing historical context and orphan results without rewriting original JSONL session entries.
- Register a provider-neutral Pi context transform so switching providers cannot replay that corruption.
- Classify known 4xx errors with a fixed diagnostic vocabulary. Never echo arbitrary provider bodies.
- Preserve quota history, cooldowns, finite deadlines, FIFO queueing and no-partial-replay semantics.

## Impact
New `message-safety.ts`; modifications to routed streams and extension registration. No credential rotation, endpoint-policy relaxation, model deployment or shared-state schema migration.
