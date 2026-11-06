---
description: "面向目标的会话交接：/handoff <goal> 把当前会话整理为有界检查点，并创建带父链接的子会话以供继续。"
kind: "package-reference"
---

# @deepseek-ai/dsh-handoff

[English](README.md) | 中文

## 概述

`dsh-handoff` 增加一个人工命令 `/handoff <goal>`，把当前会话变为可继续的交接：读取会话实时状态，渲染有界检查点（目标、父会话 id、实测上下文 token 数、最后请求、最后结果、最近工具调用、引用文件与固定指引），创建一个 header 链接到父会话的子会话，并把检查点追加为子会话的首条消息。父会话除常规命令生命周期外不被修改；子会话无需重新发现目标与工作集，仍可通过既有会话工具读取父会话。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [开发备注](#dev-note)
- [模型体验](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## 使用本包

在已包含命令注册表、会话存储与 token meter 的编排中挂载命令插件：

```yaml
- name: '@deepseek-ai/dsh-handoff'
  config:
    checkpointAssistantChars: 2000
    maxToolCalls: 8
    argumentChars: 200
```

然后运行 `/handoff finish the migration and keep the API stable`。

| 字段 | 默认值 | 含义 |
|---|---|---|
| `checkpointAssistantChars` | `2000` | 最后请求与最后结果保留的最大文本 |
| `maxToolCalls` | `8` | 工作集中列出的最近工具调用数；`0` 表示省略 |
| `argumentChars` | `200` | 每次工具调用保留的最大参数字符数 |

所有可用配置字段以生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-handoff)为准。

<a id="understand-the-implementation"></a>
## 理解实现

### 设计理念

检查点来自实时投影（`session.deriveMessages()`），从不使用已废弃的历史读取。它先写目标，再写父链接与实测上下文大小，然后是有界的最后请求/结果与工作集，最后是命名父会话 id 与 `session_event_search`/`session_trace` 工具的固定指引。子会话创建时设置 `header.parentSession`，接收 `turn/start` 与一条标记为 `handoff-checkpoint` 来源的用户消息，并只从该消息开始。不做 fork 复制父历史，不运行压缩，父会话保留自己的轨迹。

### 源码导图

- `src/index.ts` — 插件入口、`/handoff` 注册、生命周期排空。
- `src/command.ts` — 目标校验、token 测量、子会话创建、检查点消息追加。
- `src/checkpoint.ts` — 实时状态派生、边界、围栏文本、引用文件提取。
- `src/config.ts` — 校验后的检查点边界。

<a id="further-exploration"></a>
## 进一步探索

- [命令](../../interaction/commands/README.zh.md) — 本命令使用的注册表与生命周期。
- [会话存储](../../core/session/README.zh.md) — `create()` header 与 `parentSession` 血统。
- [会话查询工具](../../session-query/tool-session-query/README.zh.md) — 检查点指引中提及的 `session_event_search` 与 `session_trace` 工具。

<a id="dev-note"></a>
## 开发备注

本包不发布 `./invariant`：它不拥有可能出现分歧的独立观测关系。继续性门禁位于 `tests/handoff.spec.ts`；它是确定性的代理指标（检查点中存在的事实 vs 每个缺失事实一次恢复搜索），不是模型实跑基准。

<a id="model-experience"></a>
## 模型体验

### 交接检查点消息

#### 模型看到的内容

在子会话中，首条用户角色消息就是检查点：`## Handoff checkpoint (from the previous session)` 标题、目标、父会话 id、实测上下文大小、面向 `session_event_search`/`session_trace` 的指引、有界的最后请求与最后结果，以及最近工具调用与引用文件。父会话的模型看不到新内容：命令及其结果只是人工命令生命周期记录。

#### Token 影响

子会话从一条有界消息开始，而不是父会话的完整历史；检查点最多增加配置的助手文本、工具调用参数与提取的文件名。实测 token 数字描述被摘要的父上下文，而不是子会话新增的 token。

#### KV Cache 影响

新会话没有提供方缓存：其可缓存前缀是检查点消息加子会话后续轮次。修改检查点只改变新的前缀；父会话的缓存历史不受影响。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- **检查点是摘要** — 超出有界最后交互与工作集的细节不会被携带；固定指引指向父会话日志。
- **继续性门禁是代理** — "更少步骤"按检查点中存在的事实 vs 每个缺失事实一次恢复搜索来测量，而非运行模型；实跑评估仍是启用门槛。
- **不自动切换** — 命令报告子会话 id，打开它由前端负责；本包不移动焦点。
- **不自动压缩** — 父会话既不压缩也不删除；处置仍由操作者决定。
- **仅文本投影** — 非文本块与附件只按名称引用或省略，不跨会话携带。
