# Agent Note: The `sota` preset — the F4 opt-ins as a selectable mode

Status: proposed

English | [中文](2026-11-08-sota-preset.zh.md)

## Problem

The seven F4 opt-ins ship unmounted, and every owning note defers activation to the owner. That is the correct default: each one changes model-visible input — a bounded MCP schema, audit records of non-allowed dispatches, pruned tool results, a ranked skill catalog, injected memory, a handoff checkpoint — and changing the default would rewrite prompts, snapshots, and per-session costs for users who never asked for them. But an opt-in that no preset mounts is a library, not a product: the measured effects (router recall@8 0,915, memory recall@5 1,000, conservative pruning 12,94 %, governor 0,45 %) stay unreachable unless the user hand-authors a Cordis composition and gets every realm right. The product question is how to expose the combination behind one explicit choice, keep `standard` as the default, confine every service to the preset, and avoid claiming a live benefit that has not been measured.

## Proposal

Ship a fifth preset, `sota`, in the shipped root at `packages/preset/agent-presets/presets/sota/` ([agent-presets README](../../../../packages/preset/agent-presets/README.md)). It starts from `standard` — the full coding agent — and adds one row per opt-in. The mechanism and its measured gate belong to the owning notes; this note owns the choice and the configuration. It is selected as a mode, never as the default:

| Opt-in | Preset row and configuration | What a `sota` session gets |
|---|---|---|
| CH-041 governor | `system-prompt-governor`: MCP schema budget 3000, description cap 120 | schemas over budget keep callable structure, lose parameter docs |
| CH-042 dispatch gate | `tool-dispatch-gate`: `mode: audit`, empty allow and deny | non-allowed calls are recorded and still execute |
| CH-042 pressure pruner | `tool-result-pruner`: `maxContextTokens: 100000`, `pruneThresholdChars: 8192`, head/tail 4096/1024 | conservative replay policy, 12,94 % simulated saving |
| CH-043 router | `skill-mcp-router` and `tool-skill` inside an entry-local realm | FTS5-ranked skill catalog, every name still listed |
| CH-044 memory | `memory-passive`: `memoryDir` under the DSH home, 5 entries, 4000-character quota, `capture: false` | local redacted injection, no capture during the pilot |
| CH-045 handoff | `handoff`: 2000 checkpoint characters, 8 tool calls, 200 argument characters | `/handoff` with durable checkpoint delivery |
| CH-046 redaction | `telemetry-redaction` in the base bundle, host plane | every outbound telemetry record is scrubbed |

Memory stays read-only during the pilot: the CH-047 baseline measured 0 injections while the opt-in was unmounted and returned `disable`, so capture is enabled only after a window measures it running. The dispatch gate stays in `audit` for the same reason: enforcement needs an allowlist derived from recorded non-allowed decisions, not a guess.

## Placement and selection

- **Plane** — only the session-choosable rows live in the preset. `telemetry-redaction` mounts beside the telemetry backend in `packages/bundle/base/cordis.patch.yml` ([base bundle](../../../../packages/bundle/base/cordis.patch.yml)) because the guarantee must hold for every profile and every preset; a preset can be skipped.
- **Realms** — `skill-mcp-router` and its only consumer `tool-skill` share one entry-local realm, so the host realm's `ctx.get('skillRouter')` stays undefined and a `standard` session never receives the ranking. The pruner shares the compaction realm with `compaction-basic`, which resolves it with `ctx.get`; the governor, gate, memory, and handoff rows provide no service and need no group.
- **Identity** — `preset.yml` carries the id, order, and display metadata; shipped display copy resolves through the locale keys `presetSotaName`/`presetSotaDescription` ([display resolver](../../../../packages/preset/agent-presets/src/display.ts)), so "SOTA mode" is translated without making user-authored preset metadata translatable.
- **Resolvability** — `apps/cli/package.json` lists the opt-in packages so a shipped preset resolves its modules from the installation anchor; `python/sdk-runtime/package.json` mirrors them for the Python runtime closure; `packages/bundle/base/package.json` lists the redaction package for the host row.
- **Validation** — `apps/cli/tests/web-agent-presets.e2e.ts` boots the shipped Web composition, asserts five presets from the system root, mounts `sota`, and checks that the model-facing catalog is `standard`'s (the opt-ins add no tool), that the router and pressure configuration exist only in the preset realm, and that the handoff command and projection are registered.
- **Default** — `agent-presets.default` stays `standard`; the preset is listed and selectable, and a session that does not name it is composed exactly as before.

## Alternatives considered

- **Enable the opt-ins in `standard`** — rejected: it rewrites the default agent's model-visible input, snapshots, and cost for every existing session; what makes these opt-ins shippable is that they stay off unless chosen.
- **One preset per opt-in** — rejected: seven presets for six levers, and no composition where the measured combination exists; the product is the combination, not the parts.
- **A documented user-authored preset** — rejected: a guide cannot ship the mount, and the user would still get the realms wrong; the shipped root is the artifact the roster resolves and the e2e composes.
- **Make `sota` the default** — rejected: its value rests on replay simulations and synthetic fixtures, not a live window; a default would impose unmeasured cost on users who did not choose it. The name states the ambition, not evidence.
- **Mount redaction in the preset instead of the host** — rejected: a preset is optional, and skipping it would restore unredacted outbound telemetry; the security guarantee belongs where no preset choice can remove it.

## Acceptance criteria

- The shipped root lists five presets; `sota` composes and its session gets `standard`'s tool catalog plus the opt-in behavior; `agent-presets.default` remains `standard`.
- The router and the pressure pruner are reachable only from a `sota` session (host `ctx.get` returns undefined); the handoff command and its host-only projection exist; the memory directory is created under the DSH home with capture off.
- The Web e2e composes `sota` from the shipped bundles and asserts those properties; the F4 focused tests and the docs, typecheck, lint, and duplication gates stay green.
- A session that does not name `sota`, and every recorded snapshot, is unchanged.
- Selection is the only activation surface: no setting is rewritten, no session is migrated, and deleting the preset leaves the default composition intact.

## Risks

- **Drift from `standard`** — `sota` copies `standard`'s rows, so a future row added to `standard` must be replicated by hand; the preset is a copy, not a second source, and the e2e catalog assertion catches a missing model-facing tool but not a missing service or prompt section.
- **Durable memory cost** — the injected block is appended to the session surface, so its tokens are resent by later requests and grow with the session; capture stays off until a measured window justifies it.
- **Audit, not enforcement** — the gate records and does not block, so a `sota` user is observed, not protected, until an allowlist is derived from a week of `tool/dispatch-gate` events.
- **Simulation gap** — the 12,94 % pruner saving and the 0,45 % governor saving are replay simulations, and the router's 0,915 recall and memory's 1,000 recall are synthetic-fixture gates; `sota` is selectable because the user opts in, not because production value is proven.
- **Realm misuse on edit** — a consumer left outside the isolate group silently resolves the host realm or collides at mount; the e2e pins the current placement, but a new row needs the same review.
- **Host-wide change** — telemetry redaction in the base bundle scrubs outbound records for every profile at once; a deployment that needs the unredacted copy must patch it out explicitly.
