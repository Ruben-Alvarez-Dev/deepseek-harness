---
description: "Explicit tool-dispatch allowlist on tools/pre-execute with audit and enforce modes, for deployments restricting which tools an agent may call."
kind: "package-reference"
---

# @deepseek-ai/dsh-tool-dispatch-gate

English | [中文](README.zh.md)

## Summary

`dsh-tool-dispatch-gate` mounts on `tools/pre-execute` and applies an explicit allowlist to every tool call that reaches the registry. `audit` mode (default) records the calls that would be denied and lets them run; `enforce` denies them before dispatch with an ordinary failed tool result. Matching compares a canonical name — NFKC, format characters removed, trimmed, lowercased — against exact entries or trailing-`*` prefixes, and explicit denies win. Non-allowed decisions are written as a durable log-only `tool/dispatch-gate` session event that carries no arguments.

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

Mount it in a composition that already provides `dsh-tools`:

```yaml
- name: '@deepseek-ai/dsh-tool-dispatch-gate'
  config:
    mode: enforce
    allow: ['read', 'grep', 'mcp__git__*']
    deny: ['bash']
```

| Field | Default | Meaning |
|---|---|---|
| `mode` | `audit` | `audit` records and delegates; `enforce` denies unlisted calls |
| `allow` | `[]` | Canonical names or trailing-`*` prefixes; `*` allows every non-empty name |
| `deny` | `[]` | Canonical names or prefixes that win over `allow` |

Run `audit` for an observation period, review the `tool/dispatch-gate` events, then switch the same composition to `enforce`. The full catalog for every accepted config field is the generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-tool-dispatch-gate).

<a id="understand-the-implementation"></a>
## Understand the implementation

### Design concept

A tool name is the one dispatch fact every caller must supply, so the gate canonicalizes it for comparison without rewriting `exec.name` for execution. Exact entries never prefix-match a longer name; only a trailing `*` opts into prefixes, which is what admits a whole MCP server without admitting lookalikes. A denial returns the `deny` decision without calling the downstream waterfall, so no later listener can approve the call; allow and audit paths delegate with `next()`.

### Source map

- `src/index.ts` — `name`/`Config`/`apply`, `normalizeToolName`, `compilePatterns`, `decideToolDispatch`, the `tools/pre-execute` listener, and the log-only event append.
- The durable event is declared on `@deepseek-ai/dsh-session/types`; it is log-only and carries `name`, `normalized`, `decision`, and `mode`, never arguments.

<a id="further-exploration"></a>
## Further Exploration

- [Tool runtime](../../core/tools/README.md) — the registry and the `tools/pre-execute` waterfall this package decides on.
- [Tool-call timeout policy](../timeout-policy/README.md) — another `tools/pre-execute` guard for the same dispatch pipeline.

<a id="dev-note"></a>
## Dev Note

No invariant companion is published because it owns no relation between independent observations that could diverge, and its decisions are exercised by tests and durable events. Its session event is required-on-read by builds that know it; a deployment mounting this package includes that vocabulary.

<a id="model-experience"></a>
## Model Experience

### Denied tool call

#### What the model sees

On a denied call the model receives the registry's ordinary failed tool result containing `Error: tool "<name>" is not in the dispatch allowlist`. The gate adds no system-prompt text and no tool schema.

#### Token effect

Zero while every call is allowed. A denied call contributes one short failed tool result instead of whatever result the tool would have produced.

#### KV Cache effect

Replacing request tokens when a previously allowed call becomes denied: history differs from that tool result onward while the prefix before the call stays reusable. No effect while the policy and tool behavior are unchanged.

## Known Limitations and Deferred Work

- **Name-only gate** — arguments are not inspected; an allowlisted `bash` can still run anything. Combine it with sandbox and approval policy rather than treating the allowlist as a command filter.
- **No capability grouping** — entries match canonical names and prefixes only; mapping equivalent capabilities (an MCP filesystem tool versus `read`) is deployment-owned, and inventing a shared vocabulary without a current consumer is deferred.
- **Bounded audit volume** — only non-allowed decisions are recorded, so allowed calls are not logged by this package; use tool-call telemetry when every call needs tracking.
