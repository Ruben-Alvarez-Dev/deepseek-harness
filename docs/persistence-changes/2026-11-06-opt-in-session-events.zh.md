---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-11-06-opt-in-session-events

[English](2026-11-06-opt-in-session-events.md) | 中文

## 概述

新增三个由 F4 可选插件拥有的事件类型：memory/injected 记录一次记忆注入（id、摘要、字符数、配额、轮次），handoff/checkpoint 记录待投递到链接子会话的检查点，tool/dispatch-gate 记录一次未放行的工具分发决策。注入的记忆块与投递的检查点也会由 agent 循环作为普通用户消息追加到会话表面；事件本身仍是记录发生了什么的仅日志记录。

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

仅新增根类型：既有记录不含这些事件，因此旧会话回放不变，头部版本也不变。三个事件未标记为 ignorable，且 validateStoredEvents 会拒绝包含未知非 ignorable 类型的存储日志：比本构建更旧的读者会拒绝在任一可选插件挂载期间写入的会话。只要这些可选插件不挂载就不存在此类会话，旧读者仍可工作。该 same-version 决定只覆盖既有根类型没有结构变化，不表示对旧读者的前向兼容。

<a id="verification"></a>
## 验证

探针：validateStoredEvents 拒绝未知的非 ignorable 事件类型，仅当标记为 ignorable 时才接受，因此本记录不声明可跳过性。易失消息来源仍使用既有的 plugin 变体，因此没有持久化来源联合类型变化。pnpm run verify-session-format-catalog：通过。记录后 pnpm run verify-persistence-changes：通过。pnpm exec vitest run packages/context/memory-passive packages/session/handoff packages/guard/tool-dispatch-gate：40 个测试通过。

<a id="dev-note"></a>
## 开发备注

无。
