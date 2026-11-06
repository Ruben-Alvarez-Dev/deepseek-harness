---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-11-06-opt-in-session-events

English | [中文](2026-11-06-opt-in-session-events.zh.md)

## Summary

Adds three event types owned by the opt-in F4 plugins: memory/injected records one memory injection (ids, digest, character count, quota, turn), handoff/checkpoint records a checkpoint pending delivery to a linked child session, and tool/dispatch-gate records one non-allowed tool dispatch decision. The injected memory block and the delivered checkpoint are also appended to the session surface by the agent loop as ordinary user messages; the events themselves stay log-only records of what happened.

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

New roots only: existing records contain none of these events, so replay of older sessions is unchanged and no header version changes. The three events are not marked ignorable, and validateStoredEvents refuses a stored log containing an unknown non-ignorable type: a reader older than this build rejects any session written while one of these opt-ins is mounted. While the opt-ins stay unmounted no such session exists, and older readers keep working. This same-version decision covers the absence of a structural change to existing roots, not forward compatibility for older readers.

<a id="verification"></a>
## Verification

Probe: validateStoredEvents rejects an unknown non-ignorable event type and accepts the same type only when marked ignorable, so this record makes no skippability claim. Volatile message sources stay on the existing plugin variant, so no persisted source union changed. pnpm run verify-session-format-catalog: PASS. pnpm run verify-persistence-changes after recording: PASS. pnpm exec vitest run packages/context/memory-passive packages/session/handoff packages/guard/tool-dispatch-gate: 40 tests passed.

<a id="dev-note"></a>
## Dev Note

None.
