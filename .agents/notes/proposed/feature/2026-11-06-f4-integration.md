# Agent Note: F4 opt-in integration — one audited tree

Status: proposed

English | [中文](2026-11-06-f4-integration.zh.md)

## Problem

The seven F4 changes were built as seven independent branches. Each owning note closes with the same sentence: activation in a composition is a separate owner decision. Seven green branches prove seven changes in isolation; they do not prove the tree that would ship them together. Shared helpers, the persisted event union, the tool catalog exemption, TypeScript project references, workspace constraints, and the Cordis realms only meet when all seven are merged — and at that meeting the P6 review found two MAJOR defects plus integration findings that no single branch could expose. The F4 close-out asks for a stronger artifact than seven branches: one integrated tree with its gates measured at a fixed HEAD and an independent audit, before anyone decides activation.

## Proposal

The branch `feat/ch050-integration` integrates the seven changes on `origin/master` (at integration time) in dependency order — CH-041 first because CH-043 is stacked on it, then the remaining changes — and carries the remediation commits on top. It is the tree the activation decision consumes; the companion `sota` note adds the opt-in activation without changing the default. The seven changes, in merge order:

- **CH-041 — outbound prompt governor** bounds the MCP schema surface during assembly ([note](2026-11-06-outbound-prompt-governor.md)).
- **CH-043 — skill and MCP router** adds optional FTS5 ranking behind `tool-skill` ([note](2026-11-06-skill-mcp-router.md)).
- **CH-042 — dispatch gate and pressure pruner** adds the audit/enforce allowlist and the per-turn prune trigger ([note](2026-11-06-tool-dispatch-gate-and-pressure-pruner.md)).
- **CH-044 — passive memory** adds the bounded local store, the injected block, and redacted capture ([note](2026-11-06-passive-memory.md)).
- **CH-045 — session handoff** adds `/handoff` and the linked-child checkpoint ([note](2026-11-06-session-handoff.md)).
- **CH-046 — telemetry redaction** scrubs every outbound telemetry record through the shared rule set ([package README](../../../../packages/session/telemetry-redaction/README.md)).
- **CH-047 — longitudinal evaluation** adds the shared metrics, usage summary, and kill criteria ([note](2026-11-06-longitudinal-eval.md)).

Only two merges conflicted (`tsconfig.base.json` in CH-046 and the package-README verifier in CH-047); both were resolved by keeping both sides. The tree reaches its integrated HEAD: 37 commits, 191 files, +9.251/−202, clean worktree, no upstream, and no push or PR. Nothing here changes the default preset: `standard` stays the default and unchanged, the opt-in `sota` preset activates them only when a session selects it (see [the sota note](2026-11-08-sota-preset.md)), and host-plane telemetry redaction is the one default-mounted change. Existing recorded snapshots are unchanged because no recorded scenario selects `sota`.

## Remediation

The P6 review's two MAJOR findings, and the integration findings the merged tree exposed, are closed in the tree and re-verified rather than deferred to the reader:

- **Handoff delivery after resume** — the checkpoint was delivered only from live `session/event` state, so a child resumed in a new process never received it. The fix folds the durable `handoff/checkpoint` and the committed delivery message in a host-only Session projection; an independent probe reproduces one delivery from a pending log, zero after the delivery is committed, and zero on a log that already records it.
- **Durable injections, stated as durable** — memory blocks and the checkpoint are appended to the session surface by the agent loop, so they are durable history that later requests resend. READMEs, type annotations, and the owning notes now say so and state the cost; the volatile-message source stays on the persisted `plugin` variant, so no source union changed.
- **Persistence compatibility** — the three opt-in events are not ignorable, and a reader older than this build refuses a log that contains one. The [persistence record](../../../../docs/persistence-changes/2026-11-06-opt-in-session-events.md) now claims only what the code does: same-version for the absence of a structural change, no forward compatibility. No affected session exists while the opt-ins stay unmounted.
- **Integration findings** — the newer base's typert schema materialization, the tool-catalog exemption for `tool-dispatch-gate`, the `skillRouter` realm placement and catalog role, workspace constraints for the new packages, the persistence record, the deduplication pass (shared text bounds and command lifecycle), and the lint/deprecation sweep are all in the tree and re-measured.
- **The declared exception** — `tool-skill` keeps two deprecated synchronous history reads behind one helper, registered in the CH-041 and CH-043 notes with the migration deferred; MINOR-3 is the audit's one open minor and it is declared, not silent.

## Audit and gates

An independent audit of the integrated tree (`10-AUDITORIA-CH050` in the owner's expediente) re-measured the final HEAD and records 0 BLOCKER, 0 CRITICAL, and 0 MAJOR findings, with MINOR-3 declared and the INFO items as debt. The gates at the integrated HEAD:

| Gate | Command | Result |
|---|---|---|
| Static checks | `pnpm run check:ci:static` | 55/55 |
| Documentation | `pnpm run test:docs` | 20/20 |
| Package invariants | `pnpm run verify-package-invariants` | 39/39 |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Lint | `pnpm run lint:contracts-ready` | 0 warnings, 0 errors |
| Duplication | `pnpm run duplication` | 0 clones |
| Focused tests | `pnpm exec vitest run <17 paths>` | 623/623 |

The focused count is the F4 and touched-package set, not the whole repository suite; the audit also ran the `llm` (1.234) and `session`+`agent-loop` (923) suites for the deduplication commit.

## Alternatives considered

- **Merge each change to master as its own PR, activate later** — rejected: it puts cross-change failures at release time and no reviewer sees the composed behavior; this tree is where the shared-helper, event-union, realm, and catalog interactions were measured.
- **Squash the seven into one commit** — rejected: it erases which change owns which defect and makes reverting one opt-in impossible; the merge commits are the integration evidence.
- **Activate the opt-ins in the default `standard` preset here** — rejected: integration is not activation; the default agent's model-visible input and snapshots must not change in this branch, and the product decision is [the `sota` preset](2026-11-08-sota-preset.md).
- **Seal on the P6 evidence alone** — rejected: P6 reviewed per-change branches, its "clean surface" claim was not reproducible, and its MAJOR-1 only appears in the merged tree; the seal needs an independent HEAD.
- **Keep the branch local and defer the gates** — rejected: every gate above was re-measured at the final HEAD. The 37 commits are still local, so CI has not seen the merge result.

## Acceptance criteria

- The seven changes are present on the integration base in dependency order, with the integrated HEAD and a clean worktree.
- Every gate in the table is green at that HEAD; the audit reports 0 BLOCKER/CRITICAL/MAJOR with MINOR-3 declared and the INFO items recorded as debt.
- P6 MAJOR-1 and MAJOR-2 are remediated with a resume test/probe and corrected documentation; the persistence record states the real (non-)compatibility.
- `standard` stays the default and unchanged; the opt-in `sota` preset is the only shipped activation, and no recorded snapshot selects it. Host-plane telemetry redaction is mounted by the base bundle by design.
- The branch carries no upstream and no PR by itself; pushing it and activating any opt-in remain owner decisions.

## Risks

- **Simulated value** — 1.393 tokens per request (0,45 %) and the pruner's 12,94 %/20,54 % are replay simulations over logs outside the repo; the audit marked them unverified by independent execution (INFO-2). The tree proves mechanism, not benefit; a live evaluation remains the activation gate.
- **Forward compatibility** — a reader older than this build refuses any session written while an opt-in is mounted, because the three events are not ignorable. Unmounting keeps that risk latent; activating creates it for users who downgrade.
- **Deferred deprecated read** — the `tool-skill` exception is the single migration point for the synchronous-read API; remove that API without migrating the helper and the catalog and request ranking fail.
- **Local-only branch** — 37 commits and 191 files exist on one machine; CI and review see the merge result only after a push.
- **Seal is not value** — the audit seals the tree, not the product; the CH-047 30-day window and its kill criteria stay pending and may still return "disable".
