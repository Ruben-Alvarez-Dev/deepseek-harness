---
description: "本地被动记忆：每轮从有界的 MEMORY.md 索引中选取条目并置于不可信围栏内注入，会话释放时记录脱敏捕获；无网络、无 agent 工具调用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-memory-passive

[English](README.md) | 中文

## 概述

`dsh-memory-passive` 让 agent 无需调用工具即可获得背景记忆。本地目录保存有界的 `MEMORY.md` 索引与每个主题一个 Markdown 文件；插件在每轮首个步骤按最新直接用户文本对索引排序，并把选中的条目作为易失、带不可信围栏的用户消息注入。会话被释放时，插件把最后一段交互脱敏后追加到本地收件箱。数据不离开本机，排序不发起模型调用，注入会记录在会话日志中。

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

用包含 `MEMORY.md` 的记忆目录挂载插件（全新存储可用空目录）：

```yaml
- name: '@deepseek-ai/dsh-memory-passive'
  config:
    memoryDir: '/home/me/.dsh/memory'
    injectLimit: 5
    injectQuotaChars: 4000
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `memoryDir` | —（必填） | 保存 `MEMORY.md` 与每个主题 `<id>.md` 的目录；必须存在 |
| `injectLimit` | `5` | 单次注入渲染的最大条目数 |
| `injectQuotaChars` | `4000` | 整个注入块（含围栏）的字符配额；最小 400 |
| `maxIndexLines` | `200` | 最多加载的索引行数；其余行延后 |
| `injectOncePerTurn` | `true` | 仅在每轮首个 pre-step 注入 |
| `capture` | `true` | 会话释放时追加脱敏捕获记录 |
| `captureMaxChars` | `2000` | 单侧捕获记录的字符上限 |

索引行为 `- <id> — <title> — <keywords>`；`#` 开头为注释。所有可用配置字段以生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-memory-passive)为准。

<a id="understand-the-implementation"></a>
## 理解实现

### 设计理念

被动记忆是有界的本地产物，因此加载与排序保持确定且廉价。索引只读一次并缓存；选择会对最新直接用户请求分词，标题/id 命中按关键词命中的三倍计分，平局按 id 排序。渲染先预留围栏，再按剩余配额逐条填充，内容超长时截断，放不下的条目直接丢弃。注入消息只存在于请求中：持久的 `memory/injected` 事件记录 id、块的 SHA-256 摘要、字符数、配额与轮次，因此回放能准确知道哪些记忆进入了请求。捕获路径只在 `session/disposed` 运行，应用与出站遥测共享的固定密钥脱敏规则（`@deepseek-ai/dsh-redaction`），限制每侧长度，并向 `inbox.jsonl` 追加 JSON 行；不发起网络或模型调用。被跟踪的交互在摄取时即被限长，长会话不会保留永远无法捕获的文本。

### 源码导图

- `src/index.ts` — 插件入口、`agent/pre-step` 注入器、`session/disposed` 捕获监听器与 `memory/injected` 事件追加。
- `src/store.ts` — 有界索引解析、确定性选择、带配额围栏的渲染，以及注入主题的脱敏。
- `src/capture.ts` — 有界的最后交互跟踪、共享规则脱敏与本地收件箱追加。

<a id="further-exploration"></a>
## 进一步探索

- [会话生命周期](../../core/session/README.zh.md) — `session/event` 与 `session/disposed` 的语义与错误隔离。
- [会话引用](../session-reference/README.zh.md) — 本包遵循的不可信围栏与易失注入先例。
- [密钥脱敏](../../util/redaction/README.zh.md) — 应用于捕获内容与注入主题的共享规则集。
- [Agent 循环](../../core/agent/README.zh.md) — `agent/pre-step` 的运行位置及其决策控制。

<a id="dev-note"></a>
## 开发备注

本包不发布 invariant 伴随包，因为它不拥有可能出现分歧的独立观测关系。脱敏与配额规则由聚焦测试覆盖；recall 门禁位于 `tests/memory-passive.spec.ts`，针对合成 fixture 运行。

<a id="model-experience"></a>
## 模型体验

### 注入的被动记忆

#### 模型看到的内容

在直接用户文本与索引记忆匹配的一轮首个步骤，模型会在请求消息之后看到额外一条用户角色消息：`## Passive memory (untrusted background)` 标题、说明这些条目是背景信息而非指令的警告，以及 `<passive-memory>` 标签内的选中条目。该消息仅存在于请求中；持久日志只通过 `memory/injected` 记录条目 id、摘要、字符数、配额与轮次。捕获路径从不进入模型。

#### Token 影响

每次注入增加固定围栏以及最多 `injectLimit` 个受 `injectQuotaChars` 约束的条目；排序不发起模型调用。内容按剩余配额截断，放不下的条目会被丢弃而不是撑大块。设置 `injectOncePerTurn` 时每轮最多注入一次，因此同一轮后续步骤不增加 token。

#### KV Cache 影响

注入消息追加在请求既有消息之后，因此稳定前缀仍可复用。选择或记忆内容变化只改变新的后缀；后续压缩可能从其替换边界起使复用失效。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- **仅本地，无整合** — 本包负责捕获与注入；不合并、摘要或提升记忆（计划的 C-4 整合调度器已延后）。
- **词法选择** — 与条目没有共享 token 的请求会漏掉它；改写与同义词在没有嵌入步骤时不在范围内。
- **合成 recall 门禁** — recall@5 在 39 条合成 fixture 上测量；这是内部回归信号，不是对真实记忆质量的声明。
- **回放依赖存储** — 日志记录注入了什么，但复现文本需要相同的记忆目录内容。
- **捕获是快照** — 每个释放的会话一条脱敏的最后交互记录，而非完整转录；除非操作者整理，收件箱会持续增长。
