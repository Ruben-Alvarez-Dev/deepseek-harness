---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-11-06-opt-in-session-events

English | [中文](2026-11-06-opt-in-session-events.zh.md)

## Summary

Adds three log-only event types owned by the opt-in F4 plugins: memory/injected records one volatile memory injection, handoff/checkpoint records a checkpoint pending delivery to a linked child session, and tool/dispatch-gate records one non-allowed tool dispatch decision.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-11-06-opt-in-session-events
baseline: false
changes:
  - root: "event:handoff/checkpoint"
    previous: null
    after: "de1837a69b842f67615fa50fdea7fe0596545c6e63b931419f47304cb76c2043"
    decision: same-version
  - root: "event:memory/injected"
    previous: null
    after: "cba26b47888b4d3f588b01c325f4aec13fef456a1a13013345d177c1bec826dc"
    decision: same-version
  - root: "event:tool/dispatch-gate"
    previous: null
    after: "3db89e1b2a29d481f0d7867faf3f49ee90fbb0d975f969f643ddb826d6cd78bb"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

New roots only: existing records contain none of these events, so replay of old sessions is unchanged. All three are log-only by contract; they never alter the surface, request text, or any event a reader must interpret, so a reader that does not know them can skip them without changing the reconstructed conversation or the current Session validation. None of them is required for restoration.

<a id="verification"></a>
## Verification

Reverted the volatile message sources to the existing plugin variant, so no persisted union changed. pnpm run verify-session-format-catalog: PASS. pnpm exec vitest run packages/context/memory-passive packages/session/handoff packages/guard/tool-dispatch-gate: 40 tests passed. pnpm run verify-persistence-changes after recording: PASS.

<a id="dev-note"></a>
## Dev Note

None.
