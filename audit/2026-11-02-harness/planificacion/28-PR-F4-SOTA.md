# PR — F4 integration + `sota` preset (borrador listo para copiar)

**Rama:** `feat/ch050-integration` · **HEAD final:** `45045b828e` · **Base:** `origin/master` = `0d1f50007f` · **Sin push ni PR abierta.**

## Título

```
feat(f4): integrate the seven opt-ins and ship the sota preset
```

## Cuerpo

## Summary

This PR lands the F4 program as one audited tree and exposes it as a product:

- Integrates CH-041…CH-047 on `0d1f50007f` into `feat/ch050-integration` (audited tree at `0175f5610b`; product head `45045b828e`) and closes the P6 MAJOR findings plus the integration findings.
- Ships `sota`, a fifth shipped preset that activates the seven opt-ins as an explicit mode; `standard` stays the default and unchanged.
- Mounts telemetry redaction on the host plane, so the guarantee covers every profile whatever preset a session selects.

Mechanisms and measured gates are owned by the Agent Notes added here: the integration note owns the tree and the audit, the preset note owns the activation.

## Changes

### F4 opt-ins integrated, not activated by default

| Change | Package | Effect | Measured |
|---|---|---|---|
| CH-041 | `@deepseek-ai/dsh-system-prompt-governor` | bounds the MCP tool-schema surface at assembly | 1.393 tok/request (0,45 %), replay simulation |
| CH-043 | `@deepseek-ai/dsh-skill-mcp-router` | FTS5 ranking of skills/MCP metadata behind `tool-skill` | recall@8 0,915 / nDCG@8 0,932 vs 0,890/0,883 |
| CH-042 | `@deepseek-ai/dsh-tool-dispatch-gate` + `compaction-tool-result-pruner` | audit/enforce allowlist; opt-in per-turn prune above 100k tokens | conservative 12,94 % (aggressive 20,54 %), replay simulation |
| CH-044 | `@deepseek-ai/dsh-memory-passive` | bounded local store, injected block, redacted capture | recall@5 1,000; max block 1.033 chars vs 4.000 quota |
| CH-045 | `@deepseek-ai/dsh-handoff` | `/handoff` linked child with a bounded checkpoint | 15/15 facts carried; durable delivery verified on resume |
| CH-046 | `@deepseek-ai/dsh-telemetry-redaction` + `@deepseek-ai/dsh-redaction` | scrubs every outbound telemetry record | 20/20 records, 6 secret families |
| CH-047 | `@deepseek-ai/dsh-experimental-longitudinal-eval` | shared recall/nDCG metrics, usage summary, kill criteria | hand-checked metrics; 30-day window pending |

### `sota` preset (explicit activation)

- `packages/preset/agent-presets/presets/sota/` starts from `standard` and adds one row per opt-in: governor (MCP schema budget 3.000, description cap 120), dispatch gate in `audit`, conservative pressure pruning (`maxContextTokens: 100000`, `pruneThresholdChars: 8192`, head/tail 4096/1024), FTS5 router + `tool-skill` with `catalogTopK: 8` in an entry-local realm, passive memory (`memoryDir` under the DSH home, 5 entries, 4.000-character quota, `capture: false`), and `/handoff`.
- Selected as a mode: `agent-presets.default` remains `standard`, and a session that does not name `sota` is composed exactly as before.
- Host plane: `@deepseek-ai/dsh-telemetry-redaction` mounts in `packages/bundle/base/cordis.patch.yml`, so redaction applies to every profile and preset. Its row takes no config; the OTel row keeps its own.
- Display copy localized via `presetSotaName`/`presetSotaDescription`. The Web e2e boots the shipped composition, lists five presets, mounts `sota`, asserts the model-facing catalog is unchanged, the router/pruner stay preset-local, and the preset row asks the router for top-K.

### Remediation carried in the tree

- Handoff checkpoint survives a resume: host-only Session projection over the durable records; independent probe: pending log → 1 delivery, committed → 0, already delivered → 0.
- Documentation and the persistence record state what the loop actually does: injected memory/checkpoint messages are durable history, and the three opt-in events are not ignorable (older readers refuse them; no affected session exists while unmounted).
- Audited minors: dispatch-gate `mode` validated loudly, unused router injection removed, deferred deprecated read declared in the owning notes, continuation gate labelled a definition, stale `lib/` redaction artifacts removed; memory creates its directory on first mount.
- Two product MAJORs found by the independent audit were fixed and re-verified: the OTel row config was restored (bundle suite 129/129) and the `sota` router is actually asked for top-K.
- Deduplication: shared text-bound/command-lifecycle helpers; lint, typecheck, and duplication green.

## Gates (HEAD `45045b828e`)

| Gate | Result |
|---|---|
| `pnpm run check:ci:static` | 55/55 |
| `pnpm run test:docs` | 20/20 |
| `pnpm run verify-package-invariants` | 39/39 |
| `pnpm run verify-runtime-closure` | 5 presets / 145 packages |
| `pnpm run typecheck` | exit 0 |
| `pnpm run lint:contracts-ready` | 0 warnings / 0 errors |
| `pnpm run duplication` | 0 clones |
| `packages/bundle` | 129/129 |
| presets + memory + locales | 365/365 |
| Web preset e2e | 34/34 |
| `pnpm run test:snapshot` | 152 passed / 2 skipped (requires `python3 >= 3.10` on `PATH`) |
| Independent CH-050 audit | 0 BLOCKER / 0 CRITICAL / 0 MAJOR; debt declared |

## Docs

New Agent Notes (bilingual EN/ZH, pairing recorded):

- [F4 opt-in integration — one audited tree](.agents/notes/proposed/feature/2026-11-06-f4-integration.md)
- [The `sota` preset — the F4 opt-ins as a selectable mode](.agents/notes/proposed/feature/2026-11-08-sota-preset.md)

Each per-change note keeps its own mechanism and gate: governor, router, gate+pruner, memory, handoff, longitudinal eval; CH-046 documents in the telemetry-redaction package README.

## Not included / owner decisions

- Activation is a user choice, never a default: `sota` is not the default and no existing session migrates.
- `tool-dispatch-gate` runs in `audit` until an allowlist is derived from recorded non-allowed decisions; switching to `enforce` is a separate, deliberate step.
- The 30-day longitudinal window and the live evaluation of pruning and memory remain pending; `sota` ships selectable on that basis.
- Memory capture (`capture: false`) and the aggressive pruning policy (20,54 %) are not part of this PR.

## Risk

- Token effects (governor 0,45 %, pruner 12,94 %) are replay simulations, and the router/memory gates are synthetic fixtures; live behavior is not claimed.
- The three opt-in event types are not forward compatible: a downgraded reader refuses a session written with one mounted.
- `sota` copies `standard`'s composition, so future `standard` rows must be replicated by hand; the e2e catches missing model-facing tools only.
- Telemetry redaction at the host plane changes outbound telemetry for every profile; deployments needing unredacted copies must patch it out explicitly.

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
