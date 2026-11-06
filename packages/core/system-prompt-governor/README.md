---
description: "Outbound prompt governor that bounds the MCP tool-schema surface during system-prompt assembly for deployments sizing prompt context."
kind: "package-reference"
---

# @deepseek-ai/dsh-system-prompt-governor

English | [中文](README.zh.md)

## Summary

`dsh-system-prompt-governor` listens on the `system-prompt/assemble` waterfall and caps the token surface of MCP tool schemas before the request header is built. It keeps every MCP tool callable: names, required arguments, types, defaults, and nesting stay intact, while parameter descriptions/examples and long tool descriptions are dropped from the tools that fall beyond the configured budget. The governed tools enter `request/header`, so what reached the model remains reconstructable from the session log. Mount it after the package that provides `ctx.systemPrompt`.

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

Mount the plugin in the composition that already mounts `dsh-system-prompt`:

```yaml
- name: '@deepseek-ai/dsh-system-prompt-governor'
  config:
    mcpSchemaTokenBudget: 3000
    mcpToolDescriptionMaxLength: 120
```

| Field | Default | Meaning |
|---|---|---|
| `mcpSchemaTokenBudget` | `3000` | Token budget for all MCP tool schemas combined; positive integer |
| `mcpToolDescriptionMaxLength` | `120` | Tool-description cap for governed MCP tools; integer ≥ 3 |

Tools whose names start with `mcp__` are governed; all other tool schemas are never changed. The full catalog for every accepted config field is the generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-system-prompt-governor).

### What governance does to one tool

For the MCP tools that do not fit the budget, the tool description is normalized and capped, and every `description`, `examples`, and `$comment` key is removed recursively from its parameter schema. Everything else — `type`, `properties`, `required`, `enum`, `default`, `oneOf`/`anyOf`, nesting — is preserved, so the model can still form valid calls.

<a id="understand-the-implementation"></a>
## Understand the implementation

### Design concept

MCP servers are the unbounded part of the tool surface: their schemas arrive from third parties and are re-sent on every request. The governor treats the schema surface as a budget — the canonical prefix of MCP tools that fits keeps its documentation, and later tools keep structure without documentation. Canonical order makes the split deterministic, so a session with a stable tool set produces a stable prefix.

### Source map

- `src/index.ts` — plugin `name`/`Config`/`apply`, the assemble listener, `governPromptTools`, and the schema compactor.
- `estimateToolSchemasTokens` ([token-meter](../../llm/token-meter/README.md)) prices tool schemas with the same fixed heuristic the request envelope uses, so the budget matches the meter's numbers.

<a id="further-exploration"></a>
## Further Exploration

- [System prompt assembly](../system-prompt/README.md) — the waterfall this plugin transforms.
- [Token meter](../../llm/token-meter/README.md) — replay-aware pressure measurement for the governed surface.

<a id="dev-note"></a>
## Dev Note

The package depends on `dsh-token-meter` only for its exported fixed-heuristic schema price; it mounts no service and adds no model-visible text of its own. No invariant companion is published because the budget split is asserted by the package tests and has no independent observation to cross-check.

<a id="model-experience"></a>
## Model Experience

### MCP tool surface

#### What the model sees

For MCP tools beyond the budget, the model sees the same tool names and parameter structure without parameter descriptions, examples, comments, and with the tool description capped at `mcpToolDescriptionMaxLength`. Tools within the budget and every non-MCP tool are unchanged.

#### Token effect

Conditional and capped: when the MCP schema surface exceeds `mcpSchemaTokenBudget`, the governed surface is reduced to the budget plus the compacted remainder; when it fits, the request is unchanged.

#### KV Cache effect

Replacing request tokens: the governed schemas replace the ungoverned ones in the request header, so a change in the compacted set invalidates reuse from that request onward. With a stable tool set and budget the split is deterministic, so repeated requests keep a reusable prefix.

## Known Limitations and Deferred Work

- **Guidance loss beyond the budget** — models lose parameter documentation for governed tools; valid calls remain possible because names, types, and required lists stay. Raise the budget when a deployment needs the prose.
- **Budget applies to the MCP group only** — non-MCP tools are outside the governed surface; a global budget is deferred until a second consumer needs it.
- **No relevance ordering** — the split follows canonical order; ranking MCP tools by the current request is deferred.
