---
description: "Goal-oriented session handoff: /handoff <goal> summarizes the live session into a bounded checkpoint and creates a linked child session for continuation."
kind: "package-reference"
---

# @deepseek-ai/dsh-handoff

English | [中文](README.zh.md)

## Summary

`dsh-handoff` adds a human command, `/handoff <goal>`, that turns the current session into a continuation: it reads the live state, renders a bounded checkpoint (goal, parent id, measured tokens, last exchange, tool calls, files, guidance), creates a child session linked through `header.parentSession`, and records that checkpoint as a log-only event delivered to the child's first model step as a request-scoped message. The parent is not forked or compacted; the child starts small and can still read the parent through the existing session tools.

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

Mount the command plugin in a composition that already carries the command registry, the session store, and the token meter:

```yaml
- name: '@deepseek-ai/dsh-handoff'
  config:
    checkpointAssistantChars: 2000
    maxToolCalls: 8
    argumentChars: 200
```

Then run `/handoff finish the migration and keep the API stable`.

| Field | Default | Meaning |
|---|---|---|
| `checkpointAssistantChars` | `2000` | Maximum text kept for the last request and last outcome |
| `maxToolCalls` | `8` | Recent tool calls listed in the working set; `0` omits them |
| `argumentChars` | `200` | Maximum argument text kept per tool call |

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-handoff) is the exhaustive source for every accepted field.

<a id="understand-the-implementation"></a>
## Understand the implementation

### Design concept

The checkpoint is derived from the live projection (`session.deriveMessages()`), never from deprecated historical reads. It states the goal first, then the parent link and the measured context size, then the bounded last request/outcome and working set, and finally the guidance that names the parent session id and the `session_event_search`/`session_trace` tools. The child is created with `header.parentSession` set and its checkpoint is appended as a `handoff/checkpoint` log-only record. On the child's first model step, an `agent/pre-step` listener injects that checkpoint as a request-scoped user message tagged `handoff-checkpoint`; the child's surface therefore stays empty until the loop adds its own system prompt, and the delivery happens once. No fork copies the parent history, no compaction runs, and the parent keeps its own trajectory.

### Source map

- `src/index.ts` — plugin entry, `/handoff` registration, lifecycle drain.
- `src/command.ts` — goal validation, token measurement, child creation, checkpoint message append.
- `src/checkpoint.ts` — live-state derivation, bounds, fence text, referenced-file extraction.
- `src/config.ts` — validated checkpoint bounds.

<a id="further-exploration"></a>
## Further Exploration

- [Commands](../../interaction/commands/README.md) — the registry and lifecycle this command uses.
- [Session store](../../core/session/README.md) — `create()` headers and `parentSession` lineage.
- [Session query tool](../../session-query/tool-session-query/README.md) — the `session_event_search` and `session_trace` tools named in the checkpoint guidance.

<a id="dev-note"></a>
## Dev Note

No invariant companion is published because it owns no relation between independent observations that could diverge. The continuation gate lives in `tests/handoff.spec.ts`; it is a deterministic proxy (facts present in the checkpoint versus a per-fact recovery search), not a model-run benchmark.

<a id="model-experience"></a>
## Model Experience

### Handoff checkpoint message

#### What the model sees

In the child's first model step, the request carries one additional user-role message after the claimed messages: a `## Handoff checkpoint (from the previous session)` heading, the goal, the parent session id, the measured context size, the guidance for `session_event_search`/`session_trace`, the bounded last request and last outcome, and the recent tool calls and referenced files. The checkpoint is a request-scoped delivery, not a surface message, so the child's system prompt remains surface node 0. The parent session's model sees nothing new: the command and its result are human-only command lifecycle records.

#### Token effect

The child starts with one bounded message instead of the parent's full history; the checkpoint adds at most the configured assistant bound, tool-call arguments, and extracted file names. The measured token figure describes the parent context that was summarized, not tokens added to the child.

#### KV Cache effect

A new session starts with no provider cache: its cacheable prefix is the child's system prompt plus the delivered checkpoint and later turns. Editing the checkpoint changes only the new prefix; the parent's cached history is untouched.

## Known Limitations and Deferred Work

- **Checkpoint is a summary** — details beyond the bounded last exchange and working set are not carried; the fixed guidance points to the parent log instead.
- **Continuation gate is a proxy** — "fewer steps" is measured as facts present in the checkpoint versus one recovery search per missing fact, not by running a model; a live evaluation remains the activation gate.
- **No automatic switch** — the command reports the child session id and leaves opening it to the surface; the package does not move focus.
- **No automatic compaction** — the parent is neither compacted nor deleted; disposal remains the operator's choice.
- **Text projection only** — non-text blocks and attachments are referenced by name or omitted, not carried across.
