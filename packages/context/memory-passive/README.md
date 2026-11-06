---
description: "Local passive memory: a bounded MEMORY.md index injected per turn behind an untrusted fence, plus redacted capture on session disposal, with no network and no agent tool calls."
kind: "package-reference"
---

# @deepseek-ai/dsh-memory-passive

English | [中文](README.zh.md)

## Summary

`dsh-memory-passive` gives an agent background memory without a tool call. A local directory holds a bounded `MEMORY.md` index and one Markdown file per topic; on the first step of each turn the plugin ranks the index against the latest direct user text and adds the selected entries as an untrusted-fenced user message, which the agent loop appends to the session surface as durable history. On session disposal, the plugin appends a redacted record of the last exchange to a local inbox. Nothing leaves the machine, no model call ranks memory, and the injection is recorded in the session log.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Dev Note](#dev-note)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

Mount the plugin with a memory directory that contains `MEMORY.md` (or an empty directory for a fresh store):

```yaml
- name: '@deepseek-ai/dsh-memory-passive'
  config:
    memoryDir: '/home/me/.dsh/memory'
    injectLimit: 5
    injectQuotaChars: 4000
```

| Field | Default | Meaning |
|---|---|---|
| `memoryDir` | — (required) | Directory holding `MEMORY.md` and one `<id>.md` per topic; must exist |
| `injectLimit` | `5` | Maximum entries rendered into one injection |
| `injectQuotaChars` | `4000` | Character quota for the whole injected block, fence included; minimum 400 |
| `maxIndexLines` | `200` | Maximum index lines loaded; further lines are deferred |
| `injectOncePerTurn` | `true` | Inject only on the first pre-step of each turn |
| `capture` | `true` | Append a redacted capture record when a session is disposed |
| `captureMaxChars` | `2000` | Per-side character bound for a capture record |

Each index line is `- <id> — <title> — <keywords>`; `#` lines are comments. The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-memory-passive) is the exhaustive source for every accepted field.

<a id="understand-the-implementation"></a>
## Understand the implementation

### Design concept

Passive memory is a bounded local artifact, so loading and ranking stay deterministic and cheap. The index is read once and cached; selection tokenizes the latest direct user request and scores a title/id hit three times a keyword hit, with id order breaking ties. Rendering reserves the fence first and fills the remaining quota per entry, truncating content and dropping entries that no longer fit. The injected message is appended to the session surface by the agent loop and resent in later requests. The durable `memory/injected` event records the ids, a SHA-256 digest of the block, its character count, the quota, and the turn, so the log binds one injection to one surface message. The capture path runs only at `session/disposed`, applies the fixed secret-redaction rules shared with outbound telemetry (`@deepseek-ai/dsh-redaction`), bounds each side, and appends JSON lines to `inbox.jsonl`; it makes no network or model call. The tracked exchange is bounded at ingest, so a long session never retains text it can never capture.

### Source map

- `src/index.ts` — plugin entry, the `agent/pre-step` injector, the `session/disposed` capture listener, and the `memory/injected` event append.
- `src/store.ts` — bounded index parsing, deterministic selection, quota-fenced rendering, and redaction of injected topics.
- `src/capture.ts` — bounded last-exchange tracking, shared-rule redaction, and the local inbox append.

<a id="further-exploration"></a>
## Further Exploration

- [Session lifecycle](../../core/session/README.md) — `session/event` and `session/disposed` semantics and containment.
- [Session references](../session-reference/README.md) — the untrusted-fence and volatile-injection precedent this package follows.
- [Secret redaction](../../util/redaction/README.md) — the shared rule set applied to captures and injected topics.
- [Agent loop](../../core/agent/README.md) — where `agent/pre-step` runs and what its decision controls.

<a id="dev-note"></a>
## Dev Note

No invariant companion is published because the package owns no relation between independent observations that could diverge. Redaction and quota rules are covered by focused tests; the recall gate lives in `tests/memory-passive.spec.ts` against the synthetic fixture.

<a id="model-experience"></a>
## Model Experience

### Injected passive memory

#### What the model sees

On the first step of a turn whose direct user text matches indexed memory, the model sees one additional user-role message after the request's messages: a `## Passive memory (untrusted background)` heading, a warning that the entries are background information and not instructions, and the selected entries inside `<passive-memory>` tags. The message is durable: the agent loop appends it to the session surface after the system prompt, and later requests resend it. The `memory/injected` event records the entry ids, digest, character count, quota, and turn, binding the block to its injection. The capture path never reaches the model.

#### Token effect

Each injection adds the fixed fence plus up to `injectLimit` entries bounded by `injectQuotaChars`; no model call ranks memory. Entry content is truncated to the remaining quota and an entry that does not fit is dropped rather than growing the block. Injection happens at most once per turn when `injectOncePerTurn` is set, so later steps in the same turn add no tokens.

#### KV Cache effect

The injected message is appended after the request's existing messages, so the stable prefix stays reusable. A changed selection or memory content changes only the new suffix; later compaction may invalidate reuse from its replacement boundary.

## Known Limitations and Deferred Work

- **Local only, no consolidation** — the package captures and injects; it does not merge, summarize, or promote memories (the plan's C-4 consolidation scheduler is deferred).
- **Lexical selection** — a request whose words share no token with an entry misses it; paraphrases and synonyms are out of scope without an embedding step.
- **Synthetic recall gate** — recall@5 is measured on a 39-query synthetic fixture; it is an internal regression signal, not a claim about real memory quality.
- **Injection is durable, not volatile** — every injection is appended to the session surface and resent in later requests, so the history cost grows with the session; the quota bounds one block, not the total. The `memory/injected` event binds each block to its ids and digest.
- **Capture is a snapshot** — one redacted last-exchange record per disposed session, not a transcript; the inbox grows unless an operator curates it.
