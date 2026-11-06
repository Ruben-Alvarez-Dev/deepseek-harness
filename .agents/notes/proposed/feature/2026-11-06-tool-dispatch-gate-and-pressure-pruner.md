# Agent Note: Tool dispatch gate and per-turn pressure pruning

Status: proposed

English | [中文](2026-11-06-tool-dispatch-gate-and-pressure-pruner.zh.md)

## Problem

P2 of the SOTA plan has two separate jobs that the same change carries: an enforceable dispatch policy, and a token-pressure lever for the outbound context. Neither exists today. Tool restrictions only remove tools from the model-visible set; a direct or alternate caller can still dispatch a tool, so "hidden" is not "denied". And the existing tool-result pruner only runs when compaction itself qualifies, so a long conversation can keep large tool results in context for many turns before anything trims them. P1 measured that prompt-surface selection alone cannot move the per-request token budget (0.45 %, see the outbound-governor note); the remaining volume is conversation history, which this change addresses through tool-result content. Adjacent proposal: [recallable compaction](2026-07-06-recallable-compaction.md) targets making shadowed history recallable; this change does not depend on it.

## Proposal

Two opt-in plugins, no shipped default changes:

1. `@deepseek-ai/dsh-tool-dispatch-gate` registers on `tools/pre-execute` and compares a canonical tool name (NFKC, format characters removed, trimmed, lowercased — never rewriting `exec.name`) against an allowlist of exact entries or trailing-`*` prefixes; explicit denies win. `audit` (default) records non-allowed decisions as a durable log-only `tool/dispatch-gate` event and delegates; `enforce` returns the deny decision without calling `next()`, so no later listener can approve the call. Twelve bypass vectors are covered by tests, including a real Loader composition.
2. `compaction-tool-result-pruner` gains a disabled-by-default `pressure: { maxContextTokens, pruneThresholdChars }` block. When configured, an `agent/pre-step` listener measures the session with the injected token meter and, only above `maxContextTokens`, prunes current tool-result nodes over the pressure threshold through the existing replacement path; complete originals remain in the log and `compaction/prune` shadow prices are unchanged.

Measured on the three CH-040 sessions with a replay simulation (logged provider usage as baseline; removed characters priced by the meter's fixed heuristic; a reduction is counted on every later request that carries the pruned surface):

| Policy | `maxContextTokens` | `pruneThresholdChars` | head / tail | Tokens saved | Share of baseline |
|---|---|---|---|---|---|
| Conservative (existing defaults) | 100 000 | 8 192 | 4 096 / 1 024 | 23 226 625 | **12,94 %** |
| Aggressive | 40 000 | 3 000 | 2 048 / 512 | 36 870 187 | **20,54 %** |

The −20 % gate is reachable only with the aggressive policy, which retains roughly 640 tokens per tool result; the conservative policy lands at 12,94 %. Neither has been activated in shipped presets, so recorded snapshots are unchanged. The dispatch gate has no token effect (it is a security control).

## Alternatives considered

- **Enforce by default** — rejected: the plan requires an audit period, and a deny-by-default gate without an observation window would break legitimate tools on day one.
- **Vocabulary classes instead of canonical names** — deferred: a capability vocabulary needs a current consumer and evidence for its groupings; exact names plus explicit MCP prefix wildcards are reviewable today.
- **Lower the existing compaction threshold instead of a per-turn trigger** — rejected: that changes trim-on-compaction behavior for every deployment and still waits for a compaction trigger.
- **Lower `thresholdChars` globally for the aggressive effect** — rejected: the same shape would alter compaction-driven trimming unconditionally; the pressure block keeps the aggression opt-in.
- **Claim the aggressive policy as the default** — rejected: a 20 % win that trims results to 640 tokens carries a model-quality risk this change cannot measure; it stays a deployment decision with kill criteria.

## Acceptance criteria

- The gate denies in `enforce` and logs in `audit` for the twelve bypass vectors, records only non-allowed decisions, and never lets a downstream listener approve a denied call.
- The pressure trigger adds no listener when unconfigured, prunes only above `maxContextTokens`, keeps originals in the log, and is idempotent across steps.
- Focused tests, typecheck, and documentation gates pass; activating the trigger in a composition is a separate decision because it changes model-visible results and snapshots.

## Risks

- **Quality regression from aggressive truncation** — 2 048 + 512 characters per result can hide the middle of long outputs; the trigger must stay opt-in and be disabled if tool-call retries or task success regress.
- **Simulation, not a live run** — the token share assumes provider usage falls with the pruned context; it does not prove model behavior. A live evaluation remains the gate for activation.
- **Audit volume** — the gate records only non-allowed decisions; deployments wanting complete call telemetry need the tool-call log, not this event.
- **Pressure timing** — the trigger measures at `agent/pre-step`, so it acts on the next request; a session that only ever stays under the threshold keeps the current behavior.
