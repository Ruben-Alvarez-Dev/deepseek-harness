# Continuity-first acceptance design

## Corrected goal

Primary: preserve work through temporary quota exhaustion and coordinate two Pi instances. Economics and additive throughput are optional investigations, not blockers introduced by the assistant. Four valid keys already work; keep their conservative shared budget unless separate pool attribution is established.

## Serial implementation

1. Config accepts maxWaitMs null (default: cancellable unlimited capacity waiting), zero (no wait), or a finite millisecond budget. Body/transport timeouts remain separate. rateLimitRecovery defaults to wait; error mode preserves strict single-attempt diagnostics/testing.
2. Durable state v2 adds bounded-format waiting-ticket metadata (no prompts/credentials). Decode v1 into v2 while retaining all usage/cooldowns/disabled IDs/leases. Tickets carry runtime owner, PID and eligible group IDs. Earlier tickets have priority for overlapping groups, not unrelated groups. Cancellation/dead-process recovery/shutdown remove owned tickets; waiting never holds the file lock.
3. Each native HTTP attempt has retries zero and its own reservation/body timeout. Only HTTP 429 before any exposed native event may resume inside the same logical inference. Release the rejected reservation, keep consumption/cooldown, then rejoin capacity waiting. Never replay partial events, ambiguous failures or authentication failures. Cleanup failure prevents recovery.
4. Verify pure/fake-clock waiting and fairness, migration and actual native transport behavior before native multi-process CLI acceptance. Use a local compatible server with small rolling windows and a controlled first 429; require both agents to finish one inert tool and its continuation with no duplicate execution.
5. Run a minimal concurrent real check with existing credentials without provoking upstream limits. Controlled HTTP supplies reproducible rate-limit evidence; do not mislabel it a real Agnes exhaustion test.
6. Install/activate using standard Pi configuration and verify default startup routes without --model. Existing provider registration, unrelated settings, credentials and quota history must remain intact. Runtime cancellation remains local to each session.

## Measurable acceptance

Both native processes finish their assigned bounded tool tasks under the declared test deadline, through at least two quota-window rollovers and the controlled 429. Zero unrecovered capacity/429 terminals, duplicate tool executions, quota/concurrency overcommit or leftover live tickets/leases. Cancelling one waiting process does not abort its peer. Explicit finite wait/error mode and non-replay-after-partial behavior remain verified.

No arbitrary provider outage or permanently invalid key is promised recoverable. No zero-wait guarantee, independent fourfold quota claim, p95/SLA or financial benefit is required to accept the clarified continuity goal.
