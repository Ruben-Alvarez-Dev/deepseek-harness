# Tasks

## Documentation-only (this change)
- [x] 1. Write the proposal, spec delta and design (episode schema, retention, retrieval, hook semantics).
- [x] 2. Validate the change strictly.

## Implementation
- [x] 3. Episode store (private, 0600, atomic + lock, fs.watch) reusing the router state pattern.
- [x] 4. Verifier-hook capture on L3 shadow failures (redaction fixture incl. credentials).
- [x] 5. top-K retrieval + prompt-section injection via `before_agent_start` (opt-in command, non-router no-op).
- [x] 6. Retention caps + lesson dedupe tests.
- [x] 7. Multi-process race test (two Pi writing the store).
- [x] 8. Update README/docs/project-status and archive.
