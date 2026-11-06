# Agent Note: Passive local memory with a bounded index and redacted capture

Status: proposed

English | [中文](2026-11-06-passive-memory.zh.md)

## Problem

A session starts with no durable background: what an operator learned in earlier work is only available if the agent decides to call a memory tool, and a tool call costs a step, a schema, and a decision the model may skip. The plan's memory front (P4) wants passive injection — memory that arrives with the request because the task matches, not because the agent asked. A remote backend is out of scope for this change and carries the worst failure mode: private session text leaving the machine. The remaining design space is a local artifact, a deterministic selector, a volatile injection that cannot contaminate the stable prefix, and a capture path that is redacted before it is written.

## Proposal

`@deepseek-ai/dsh-memory-passive` mounts three pieces over existing seams:

1. **Bounded store (C-5)** — `memoryDir` holds `MEMORY.md` with canonical `- <id> — <title> — <keywords>` lines (bounded by `maxIndexLines`, default 200) and one `<id>.md` per topic. A missing index is an empty store; a malformed line fails loud.
2. **Volatile injector (C-3, E-2)** — on the first `agent/pre-step` of a turn, the plugin tokenizes the latest direct user text, ranks index entries lexically (title/id hits weigh three keyword hits, id order breaks ties), renders the selected entries inside an untrusted fence within `injectQuotaChars`, and adds the block as a user message to the turn's pre-step decision; the agent loop appends it to the session surface, so it becomes durable history that later requests resend. The durable `memory/injected` event records ids, a SHA-256 digest, character count, quota, and turn, binding the block to its surface message.
3. **Local capture (C-2)** — when a session is disposed, the plugin takes the last direct user and assistant text, applies fixed redaction rules (private keys, `sk-` keys, Bearer tokens, JWTs, GitHub tokens, AWS keys, secret assignments), bounds each side, and appends one JSON line to `inbox.jsonl`. There is no network or model call in this path.

Measured on a synthetic fixture (39 memories, 39 labeled task queries): **recall@5 1,000**, every rendered block below the 4000-character quota, six redaction rules verified against a secret fixture, and a tool-runtime check proving the plugin registers no tools. Nothing is mounted in shipped presets, so recorded snapshots are unchanged. C-4 (consolidation scheduling) is deliberately deferred: it needs durable scheduling and an admission policy that this change does not own.

## Alternatives considered

- **Cortex/MCP capture bridge over the network** — rejected here: it sends private text to another process; the plan's backend decision is separate and this local layer is safe to ship first.
- **Injecting memory into the system prompt** — rejected: it changes the stable prefix on every selection and defeats prompt-cache reuse; the volatile tail costs more tokens but keeps the prefix reusable.
- **Embedding-based selection** — rejected: a model call to rank memory adds latency, cost, and nondeterminism to a background mechanism.
- **Full-transcript capture** — rejected: unbounded private text in the inbox; the last exchange is the smallest useful record and redaction happens before the write.
- **An agent-visible save/recall tool** — rejected as the primary path: it is the behavior this front replaces; the inbox can be curated by an operator or a future consolidation step.

## Acceptance criteria

- recall@k on the labeled fixture >= 0,80 with k equal to the injected entries; every injection stays within the configured quota and carries the untrusted fence.
- Zero tools registered by the package; injection happens at most once per turn; no matching terms means no injection.
- Capture writes only to the local inbox, after redaction, with the redaction counts recorded; the injection event makes the request reconstructable from the log plus the store.
- Focused tests, typecheck, and documentation gates pass; activation in a composition is a separate owner decision because it changes model-visible context.

## Risks

- **Memory poisoning** — injected entries are untrusted text; the fence forbids following instructions and the agent must verify claims, exactly like referenced sessions.
- **Lexical gaps** — synonyms and paraphrases miss; recall is bounded by vocabulary overlap and the quota, not by semantics.
- **Local capture growth** — the inbox has no automatic curation; an operator or a later consolidation change owns pruning.
- **Replay dependency** — the log records what entered the request, but reproducing the text needs the memory directory contents.
- **Synthetic gate** — the fixture is authored for the package; the recall number is a regression signal, not a quality guarantee for real memories.
