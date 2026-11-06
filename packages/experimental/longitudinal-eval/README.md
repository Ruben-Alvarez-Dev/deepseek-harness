---
description: "Pure measurement helpers for the longitudinal memory and skill evaluation: recall@k, graded nDCG@k, session-usage aggregation, and declarative kill criteria with no host access."
kind: "package-reference"
---

# @deepseek-ai/dsh-longitudinal-eval

English | [中文](README.zh.md)

## Summary

`dsh-longitudinal-eval` provides the measurement primitives for F-1/F-2 of the SOTA plan: binary `recall@k`, graded `nDCG@k`, a per-session usage aggregation (requests, tool calls by name, skill-loading sessions, memory injections, active days), and declarative kill criteria that turn a measured window into `keep` or `disable` decisions with the measured reason. The caller reads session logs and passes samples; the package owns no host paths, services, or configuration, so measurements stay reproducible and reviewable.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Dev Note](#dev-note)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

```ts
import { evaluateKillCriteria, summarizeUsage } from '@deepseek-ai/dsh-longitudinal-eval'

const summary = summarizeUsage([
  { requests: 315, toolCalls: { skill: 2 }, memoryInjections: 0, day: '2026-11-02' },
])
const decisions = evaluateKillCriteria(summary, {
  memory: { minInjections: 1, minSessions: 3 },
  skills: { minSessionRatio: 0.5, minSessions: 3 },
})
```

<a id="understand-the-implementation"></a>
## Understand the implementation

### Metric definitions

`recallAtK` counts expected names in the first `k` positions divided by `min(relevant, k)`. `ndcgAtK` uses gain `2^grade - 1` and discounts by `log2(position + 2)`, normalizing by the ideal ordering of the graded labels. Both reject a non-positive or non-integer `k`. `summarizeUsage` sums requests and per-tool counts, counts sessions that called the `skill` loader, counts `memory/injected` events, and counts distinct UTC days supplied by the caller.

### Kill criteria

A criterion is evaluated only after the window covers its `minSessions`; below that the decision is `keep` with the sample-size reason. Once covered, memory disables below `minInjections` and skills disable below `minSessionRatio`, each with the measured values in `reason`. The package computes decisions; applying them (disabling a feature) belongs to the deployment.

<a id="dev-note"></a>
## Dev Note

No invariant companion is published because the package is pure measurement code over caller-supplied samples and owns no runtime observation.

## Known Limitations and Deferred Work

- **Calendar window is external** — the package measures whatever window the caller supplies; a 30-day metric requires the caller to re-run after 30 days.
- **Caller-owned extraction** — reading session logs and mapping events to samples is outside the package, so log-format changes update the caller, not these metrics.
- **Feature-dependent counters** — `memoryInjections` and skill loads are zero when the corresponding opt-ins are not mounted; a baseline with them disabled cannot prove usage, only absence.
- **No statistical model** — aggregation is descriptive; it does not estimate confidence intervals for small windows.
