---
description: "用于记忆与 skill 纵向评估的纯测量助手：recall@k、分级 nDCG@k、会话使用聚合与声明式 kill-criteria，且不访问主机。"
kind: "package-reference"
---

# @deepseek-ai/dsh-longitudinal-eval

[English](README.md) | 中文

## 概述

`dsh-longitudinal-eval` 为 SOTA 计划的 F-1/F-2 提供测量原语：二值 `recall@k`、分级 `nDCG@k`、按会话聚合的使用统计（请求数、按名称的工具调用、加载 skill 的会话、记忆注入、活跃天数），以及把测量窗口变成 `keep`/`disable` 决策并附带测量理由的声明式 kill-criteria。调用方读取会话日志并传入样本；本包不拥有主机路径、服务或配置，因此测量可复现、可审查。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [开发备注](#dev-note)
- [已知限制与后续工作](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## 使用本包

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
## 理解实现

### 指标定义

`recallAtK` 统计前 `k` 位中命中的期望名称数，除以 `min(relevant, k)`。`ndcgAtK` 使用增益 `2^grade - 1`，按 `log2(position + 2)` 折减，并以分级标签的理想排序归一化。两者都拒绝非正或非整数的 `k`。`summarizeUsage` 汇总请求与逐工具计数、统计调用 `skill` 加载器的会话、统计 `memory/injected` 事件，并统计调用方提供的不同 UTC 天数。

### Kill-criteria

只有当窗口覆盖其 `minSessions` 后才会评估准则；低于该值时决策为 `keep` 并附样本量理由。覆盖后，记忆在低于 `minInjections` 时禁用，skills 在低于 `minSessionRatio` 时禁用，`reason` 中带有测量值。本包计算决策；执行决策（禁用某功能）属于部署方。

<a id="dev-note"></a>
## 开发备注

No invariant companion is published because the package is pure measurement code over caller-supplied samples and owns no runtime observation.

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- **日历窗口在外部** — 本包测量调用方提供的窗口；30 天指标需要调用方在 30 天后重新运行。
- **提取由调用方负责** — 读取会话日志并把事件映射为样本不在本包内，因此日志格式变化更新调用方而非这些指标。
- **依赖功能的计数器** — 当相应可选项未挂载时，`memoryInjections` 与 skill 加载为零；禁用状态下的基线只能证明缺失，不能证明使用。
- **无统计模型** — 聚合是描述性的，不为小窗口估计置信区间。
