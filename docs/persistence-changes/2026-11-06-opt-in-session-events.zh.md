---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-11-06-opt-in-session-events

[English](2026-11-06-opt-in-session-events.md) | 中文

## 概述

新增三个由 F4 可选插件拥有的仅日志事件类型：memory/injected 记录一次易失记忆注入，handoff/checkpoint 记录待投递到链接子会话的检查点，tool/dispatch-gate 记录一次未放行的工具分发决策。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

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
## 兼容性

仅新增根类型：既有记录不含这些事件，因此旧会话回放不变。三者按契约均为仅日志：它们从不改变表层、请求文本或任何读者必须解释的事件，所以不认识它们的读者可以跳过而不改变重建的对话或当前 Session 校验。恢复流程不依赖其中任何一个。

<a id="verification"></a>
## 验证

把易失消息来源回退到既有 plugin 变体，因此没有持久化联合类型变化。pnpm run verify-session-format-catalog：通过。pnpm exec vitest run packages/context/memory-passive packages/session/handoff packages/guard/tool-dispatch-gate：40 个测试通过。记录后 pnpm run verify-persistence-changes：通过。

<a id="dev-note"></a>
## 开发备注

无。
