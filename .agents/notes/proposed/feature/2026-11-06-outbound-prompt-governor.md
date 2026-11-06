# Agent Note: Outbound prompt governor — bounded tool and skill surface

Status: proposed

English | [中文](2026-11-06-outbound-prompt-governor.zh.md)

## Problem

The harness re-sends an unbounded outbound surface on every request: the skill catalog publishes every model-invocable skill with a capped description, and MCP servers contribute tool schemas the deployment does not control. The SOTA plan's P1 assumed this surface was the dominant per-request cost and gated a −20 % tokens-per-request improvement on it. Measured on three real sessions (582 requests, `planificacion/20-BASELINE-CH040.md`), the surface is small: the catalog costs roughly 1.3–1.5 k tokens per request after the current 500-character description cap, MCP schemas stay below 3 k, and total usage is 136 k–405 k tokens per request, dominated by cache-read conversation history. A −20 % total gate cannot be met by outbound surface selection alone; pretending otherwise would ship a behavior change with unmeasurable value.

## Proposal

Two opt-in, independently configurable levers on existing seams, not enabled in shipped presets:

1. `dsh-tool-skill` gains `catalogTopK` (default `0`, previous behavior) and `catalogSummaryDescriptionMaxLength` (default 64). Skills are ranked by zero-embedding lexical overlap between the current direct user message and each skill's name/description; the top-K keep their full description, every other skill stays listed under its name with a one-line summary, and `/name`-invoked skills always keep the full description. The loader stays the escape hatch because no name disappears.
2. A new function plugin, `dsh-system-prompt-governor`, registers on the `system-prompt/assemble` waterfall and caps the MCP tool-schema surface (`mcp__<server>__<tool>`) at `mcpSchemaTokenBudget` (default 3000). Tools inside the canonical budget prefix keep their full schema; every later MCP tool keeps its name, `required` list, types, defaults, and nesting, while parameter `description`/`examples`/`$comment` keys are removed recursively and the tool description is capped at `mcpToolDescriptionMaxLength` (default 120). The split is deterministic, non-MCP tools are untouched, and the governed tools enter `request/header`, so the model-visible input remains reconstructable from the session log. That durable header is the decision's registration: a separate per-assembly diagnostic event would grow the log for an opt-in diagnostic whose only reader is the operator, so none is added.

Measured on the same three sessions with the pricing fixed heuristic: **≈1 393 tokens saved per request, 0.45 % of total usage** (catalog ≈810 k tokens across 582 requests; MCP schemas already under budget, 0). The implementation remains opt-in because that effect does not justify changing shipped snapshots or defaults; the plan's P1 target moves to the P2 result pruner, where conversation history is the dominant term.

## Alternatives considered

- **Ship the levers enabled in standard/cordis presets** — would change model-visible prompts and recorded snapshots for a measured <1 % effect. Rejected: keep opt-ins out of shipped defaults.
- **Hardcode the budgets in the plugins** — rejected by the repository's no-hardcoded-tunables rule; both are validated `Config` fields.
- **Rank skills with embeddings or an external router** — rejected for P1: adds a model call or index to the critical path for a small surface; FTS5 ranking is P3's concern.
- **Truncate all tool schemas globally** — rejected: non-MCP tools are first-party and already curated; the unbounded part is MCP.
- **Drop MCP parameter structure entirely** — rejected: the model must still be able to call governed tools; dropping documentation is recoverable, dropping callable structure is not.

## Acceptance criteria

- `catalogTopK` changes only the rendered catalog: every skill name remains listed, `/name` gestures and user-invocable skills are never hidden, and a request with no lexical overlap leaves all descriptions intact.
- The governor is deterministic for identical assembly and limits; it never changes non-MCP tools; governed MCP tools keep name, `required`, types, defaults, and nesting.
- Focused tests, typecheck, and documentation gates pass; a real Loader composition test mounts both plugins through `cordis.yml` and asserts the assembled MCP schema is compacted.
- The measured effect on the three baseline sessions is published with the gate explicitly falsified for −20 % total.

## Risks

- **Guidance loss for governed MCP tools** — parameter documentation stops reaching the model; calls remain schema-valid but may need retries. Raising the budget restores it.
- **Catalog churn** — per-request ranking can change the selected top-K and republish the catalog message; the effect is bounded by the one-line summaries and the digest-based update path.
- **Wrong owner for the metric** — the measured <1 % result shows the plan must measure conversation compaction (P2) for its per-request goal; leaving P1 as the owner would keep the program optimizing the wrong surface.
