# Tasks — continuity acceptance remains OPEN

Execute stages serially and check only evidence-backed completion.

- [x] 1. Reconcile the clarified user objective: task continuity and simultaneous Pi sessions are mandatory; economics/additive throughput are optional. Record current 30-second deadline/terminal-429 gaps.
- [x] 2. Implement nullable unlimited waiting, durable fair tickets and history-preserving migration; verify cancellation, deadlines, fairness, PID cleanup and owner isolation.
- [x] 3. Implement explicit safe pre-output 429 recovery with no native retry/partial replay; verify real native transport against a local HTTP server and fallback/error modes.
- [x] 4. Verify two actual native Pi processes finish inert-tool tasks across multiple quota windows and a controlled 429; ensure exact tool execution, no overcommit and no leaked ownership.
- [x] 5. Run a minimal concurrent real credential check, activate routing through standard Pi package/default configuration and verify ordinary startup without --model; preserve unrelated settings/credentials/history.
- [x] 6. Record requirement-to-evidence acceptance, limits and optional investigations; run complete checks, packaging/security audit and archive only after mandatory continuity criteria pass.

Evidence: 115 automated tests over 10 files (including two native Pi processes, activation without `--model`, state migration and no-partial-replay), real credential smoke (119 tokens), real no-`--model` startup (517 tokens), `npm run check`, `openspec validate --all --strict` and a zero-vulnerability audit. Limits: shared 10 RPM aggregate, no real Agnes exhaustion test, no economic claim.
