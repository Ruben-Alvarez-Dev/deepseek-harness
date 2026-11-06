# Agent Note: Zero-embedding skill and MCP tool router

Status: proposed

English | [中文](2026-11-06-skill-mcp-router.zh.md)

## Problem

The catalog and the visible tool set grow with every skill and MCP server, while the current request only needs a few of them. The catalog's lexical ranking keeps every skill listed and only shortens descriptions, but it compares exact lowercased tokens, so word forms and diacritics miss ("outage" does not match "outages"), and there is no shared ranking for MCP tool metadata at all. An embedding router would add model calls, latency, and nondeterminism to a selection that must replay from the session log. The remaining option is a deterministic lexical index that understands word forms — and that must not hide anything, because a hidden tool has no escape hatch.

## Proposal

`@deepseek-ai/dsh-skill-mcp-router` keeps an in-memory SQLite FTS5 index (`node:sqlite`) over two partitions: skill summaries (`indexSkills`) and visible MCP tool schemas (`indexTools`, `mcp__*` only), with the `porter unicode61` tokenizer. Queries are tokenized, deduplicated, capped, and quoted one by one, then ordered by `bm25`. Reindexing compares a content digest first, and the tool partition refreshes from the final `system-prompt/assemble` result, so prompt-level providers are included and unchanged sets cost nothing. The service adds no model-visible surface by itself and never hides a skill or tool.

Integration is opt-in and one-directional: `dsh-tool-skill` reads `ctx.get('skillRouter')`; when present, the top-K full-description set follows the router's BM25 order, and without it the lexical fallback runs unchanged. No discovery tool is added: MCP tools stay visible, so a `find-mcp-tools` schema would cost prompt tokens on every request without adding capability; the tool partition stays available through the service API for a future selection consumer.

Measured on a labeled synthetic fixture (32 entries, 59 task queries, graded relevance): **recall@8 0,915 and nDCG@8 0,932**, against **0,890 / 0,883** for the lexical baseline; the gate targets are 0,90 / 0,80. Nothing is mounted in shipped presets, so recorded snapshots are unchanged.

## Alternatives considered

- **Embedding router** — rejected: model calls per selection, latency, and nondeterministic ordering that cannot replay from the log.
- **Hand-rolled BM25 over token arrays** — rejected: would reimplement stemming, diacritic folding, and ranking on top of an SQLite that already ships FTS5.
- **Hide low-ranked tools** — rejected: visible is the only escape hatch for a tool; hiding needs a re-exposure mechanism that does not exist.
- **Reorder every tool by relevance** — rejected: changes the request header on every step (cache invalidation) with no token saving, because ordering does not shrink the set.
- **A `find-mcp-tools` discovery tool** — rejected for now: tools are not hidden, so the schema cost buys no reachable capability.

## Acceptance criteria

- The router meets recall@8 >= 0,90 and nDCG@8 >= 0,80 on the labeled fixture and stays ahead of the lexical baseline.
- Without a mounted router the catalog is byte-identical to the lexical fallback; with one, the top-K follows its ranking and every skill remains listed.
- Deterministic reindexing (digest-gated), no model calls, no hidden capability, and a loud failure when the runtime lacks SQLite FTS5.
- Focused tests, typecheck, and documentation gates pass; activation in a composition is a separate owner decision because it changes model-visible descriptions and snapshots.

## Risks

- **Synthetic gate** — the corpus and queries are authored for this package; the numbers are an internal regression signal, not a universal quality claim.
- **Vocabulary gaps** — a query with no shared stem ("roll back" vs "rollback") retrieves nothing; synonyms and cross-lingual paraphrases need an embedding or translation step this change intentionally avoids.
- **Runtime dependency** — FTS5 requires `node:sqlite` support; a runtime without it fails loud on first use and the lexical fallback remains available by not mounting the router.
- **Cache ownership** — the router itself changes no request; a consumer that surfaces a different set owns the resulting prompt-cache effect.
