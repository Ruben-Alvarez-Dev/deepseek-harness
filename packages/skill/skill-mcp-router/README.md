---
description: "Zero-embedding FTS5 router ranking skill summaries and visible MCP tool schemas by the current task for deployments selecting what to surface."
kind: "package-reference"
---

# @deepseek-ai/dsh-skill-mcp-router

English | [中文](README.zh.md)

## Summary

`dsh-skill-mcp-router` keeps an in-memory SQLite FTS5 index of skill summaries and visible MCP tool schemas and answers BM25 queries for the current task. It uses no embeddings and makes no model calls: consumers decide what to surface from the ranked names, so the router never hides a skill or tool by itself. The tool partition refreshes from the final `system-prompt/assemble` result, and both partitions reindex only when their content digest changes. Mount it where a consumer needs deterministic, replayable ranking.

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

Mount the service where agents run; `ctx.skillRouter` is then available to consumers:

```yaml
- name: '@deepseek-ai/dsh-skill-mcp-router'
  config:
    path: ':memory:'
```

| Field | Default | Meaning |
|---|---|---|
| `path` | `:memory:` | SQLite database path for the FTS5 index |

```text
await ctx.skillRouter.indexSkills(skills)          // SkillSummary[] from ctx.skills.snapshot()
await ctx.skillRouter.indexTools(visibleSchemas)   // ToolSchema[]; only mcp__* entries are indexed
const ranked = await ctx.skillRouter.search('deploy the service', { kind: 'skill', limit: 8 })
```

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-skill-mcp-router) is the exhaustive source for every accepted field.

<a id="understand-the-implementation"></a>
## Understand the implementation

### Design concept

Ranking is a reviewable lexical problem, so the index is plain FTS5 with the `porter unicode61` tokenizer: word forms stem and diacritics fold without an embedding model. Query terms are tokenized, deduplicated, capped, and quoted one by one before they reach `MATCH`, so punctuation and FTS operators cannot change the query shape. BM25 ordering is deterministic for identical partitions and queries. Reindexing compares a content digest first, so the assembly listener refreshes the tool partition only when the model-visible MCP set actually changes.

### Source map

- `src/index.ts` — the `skillRouter` service, `indexSkills`/`indexTools`, `search`, tokenizer, digest-based rebuild, and the assembly listener.
- The tool partition is built from the final assembled tool schemas, so prompt-level providers the tool registry never sees are still indexed.

<a id="further-exploration"></a>
## Further Exploration

- [Skill registry](../skill/README.md) — the summaries this router indexes.
- [System prompt assembly](../../core/system-prompt/README.md) — the waterfall whose final tool set refreshes the tool partition.
- [Tool runtime](../../core/tools/README.md) — the visible tool schemas the registry exposes.

<a id="dev-note"></a>
## Dev Note

The package publishes no `./invariant`: it owns no relation between independent observations that could diverge. It requires `node:sqlite` with FTS5 support and fails loud on first use when the runtime lacks it; the quality gate in `tests/router-quality.spec.ts` asserts recall@8 and nDCG@8 on a labeled synthetic corpus.

<a id="model-experience"></a>
## Model Experience

None, as the package only ranks skill and MCP tool metadata; consumers own every prompt, schema, or result they build from ranked names.

#### KV Cache effect

No direct effect; a consumer that changes what it surfaces owns the resulting cache behavior.

## Known Limitations and Deferred Work

- **Lexical only** — a query whose vocabulary shares no stem with an entry misses it; synonyms and cross-lingual paraphrases are out of scope without an embedding or translation step.
- **In-memory index** — the default database is per-process memory; a deployment needing a shared index must supply a path and own its lifecycle.
- **Synthetic quality gate** — recall@8 and nDCG@8 are measured on a 59-query labeled fixture authored for this package; they are an internal regression signal, not a universal quality claim.
