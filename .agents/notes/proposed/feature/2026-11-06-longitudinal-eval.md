# Agent Note: Shared longitudinal measurement for memory and skill features

Status: proposed

English | [中文](2026-11-06-longitudinal-eval.zh.md)

## Problem

Each P1–P6 change measured its own gate with a bespoke script, and none of them answered the question the frontier keeps asking: does the feature help over months? Without a shared metric harness, a later gate re-implements `recall@k` or `nDCG@k` from scratch and two results stop being comparable. Without a longitudinal usage summary and an explicit kill criterion, a feature that nobody uses survives because nobody measures it. The plan's F-1/F-2 ask for a harness over own memories and skill selection plus a 30-day metric with kill criteria; this change builds the measurement primitives and applies them to the only real baseline available today.

## Proposal

`@deepseek-ai/dsh-longitudinal-eval` is a private, pure library with three parts:

- **Retrieval metrics** — binary `recallAtK` and graded `ndcgAtK` (gain `2^grade - 1`, `log2(position + 2)` discount, ideal normalization), validated against hand-computed values and rejecting invalid cutoffs.
- **Usage summary** — `summarizeUsage` aggregates caller-supplied session samples: requests, tool calls by name, sessions that loaded a skill, `memory/injected` events, and distinct UTC days. The caller owns log reading; the package owns no host path.
- **Kill criteria** — `evaluateKillCriteria` applies declarative thresholds only once the window covers a minimum session count, returning `keep`/`disable` with the measured values in the reason.

Applied to the three CH-040 sessions: **3 sessions, 582 requests, 4 skill calls in 2 sessions, 0 memory injections, 2 active days**. The memory criterion returns **disable** ("0 injections in 3 sessions, below the 1 minimum") — the correct reading is *no evidence while the opt-in is inactive*, so passive memory must not be activated without a window measured while it runs. The skills criterion returns **keep** (2/3 sessions loaded a skill ≥ 0.5).

The 30-day number cannot be measured in this session: only two active days exist. The instrument, baseline, and rule are the deliverable; the re-run after 30 days is the pending gate, and it stays explicit rather than simulated.

## Alternatives considered

- **Grafana/OTel dashboard as the metric home** — rejected for the repo gate: it needs infrastructure and cannot run in a keyless checkout; a pure function is reviewable and comparable across changes.
- **An embedding-based relevance evaluator** — rejected: it adds a model call to a measurement that must be deterministic and cheap.
- **Store samples in the package** — rejected: session logs are host state; the caller extracts aggregates and the package stays free of filesystem access.
- **Skip the kill criteria until the 30-day window exists** — rejected: the rule is what prevents a zombie feature; applying it to the baseline already yields the actionable "do not activate memory yet".

## Acceptance criteria

- Metrics match hand-computed expectations, including graded nDCG and cutoffs larger than the rank list.
- The usage summary aggregates fixtures exactly and handles an empty window.
- Kill criteria keep below the session minimum and decide on the measured values once covered; the baseline decisions are published with their numbers.
- Focused tests, typecheck, and documentation gates pass; the 30-day re-run is declared as a temporal limitation, not claimed.

## Risks

- **Calendar time** — the real gate waits 30 days; the tooling cannot shorten it.
- **Feature-dependent counters** — memory injections are zero while the opt-in is unmounted; the baseline proves absence, not failure.
- **Caller-owned extraction** — a log-format change updates the caller, not the metrics.
- **Small samples** — descriptive aggregation without confidence intervals; the decision rule is a product threshold, not a statistical test.
