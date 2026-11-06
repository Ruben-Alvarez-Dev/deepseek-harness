---
description: "在 tools/pre-execute 上执行显式工具分发白名单，支持 audit 与 enforce 两种模式，供需要限制 agent 可调用工具的部署使用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-tool-dispatch-gate

[English](README.md) | 中文

## 概述

`dsh-tool-dispatch-gate` 挂载在 `tools/pre-execute` 上，对到达注册表的每次工具调用应用显式白名单。`audit` 模式（默认）记录本会被拒绝的调用并放行；`enforce` 模式在分发之前拒绝它们，返回普通的失败工具结果。匹配比较的是规范化名称——NFKC、移除格式字符、去空白、转小写——与精确条目或结尾 `*` 前缀条目比较，显式 deny 优先。非允许决策会写成持久的、仅日志用途的 `tool/dispatch-gate` 会话事件，且不携带参数。

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

在已提供 `dsh-tools` 的编排中挂载本包：

```yaml
- name: '@deepseek-ai/dsh-tool-dispatch-gate'
  config:
    mode: enforce
    allow: ['read', 'grep', 'mcp__git__*']
    deny: ['bash']
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `mode` | `audit` | `audit` 记录并委托；`enforce` 拒绝未列出的调用 |
| `allow` | `[]` | 规范化名称或结尾 `*` 前缀；`*` 允许所有非空名称 |
| `deny` | `[]` | 优先于 `allow` 的规范化名称或前缀 |

先用 `audit` 观察一段时间，检查 `tool/dispatch-gate` 事件，再把同一编排切换到 `enforce`。所有可用配置字段以生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-tool-dispatch-gate)为准。

<a id="understand-the-implementation"></a>
## 理解实现

### 设计理念

工具名是每个调用方都必须提供的唯一分发事实，因此门禁只规范化它用于比较，绝不为了执行而改写 `exec.name`。精确条目不会前缀匹配更长的名称；只有结尾 `*` 才选择前缀匹配，这样既能放行整个 MCP 服务器，又不会放行形似的名称。拒绝会返回 `deny` 决策而不调用下游瀑布事件，因此后续监听器无法再批准该调用；允许与 audit 路径通过 `next()` 委托。

### 源码导图

- `src/index.ts` — `name`/`Config`/`apply`、`normalizeToolName`、`compilePatterns`、`decideToolDispatch`、`tools/pre-execute` 监听器以及仅日志事件的追加。
- 持久事件声明在 `@deepseek-ai/dsh-session/types` 上；它仅用于日志，携带 `name`、`normalized`、`decision` 与 `mode`，从不携带参数。

<a id="further-exploration"></a>
## 进一步探索

- [工具运行时](../../core/tools/README.zh.md) — 本包所决策的注册表与 `tools/pre-execute` 瀑布事件。
- [工具调用超时策略](../timeout-policy/README.zh.md) — 同一分发管线上的另一个 `tools/pre-execute` 守卫。

<a id="dev-note"></a>
## 开发备注

本包不发布 `./invariant`：它不拥有可能出现分歧的独立观测关系，其决策由测试与持久事件来验证。其会话事件对所认识它的构建是 read-required 的；挂载本包的部署包含该词汇。

<a id="model-experience"></a>
## 模型体验

### 被拒绝的工具调用

#### 模型看到什么

被拒绝时，模型收到注册表普通的失败工具结果，内容为 `Error: tool "<name>" is not in the dispatch allowlist`。门禁不新增系统提示词文本，也不新增工具 schema。

#### Token 影响

所有调用都被允许时为零。被拒绝的调用会用一个短的失败工具结果替代该工具本会产生的任何结果。

#### KV Cache 影响

当先前允许的调用变为拒绝时替换请求 token：从该工具结果起历史发生变化，而调用之前的前缀仍然可复用。策略与工具行为不变时没有影响。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- **仅检查名称** — 不检查参数；被允许的 `bash` 仍可执行任意命令。应与沙箱和审批策略组合，而不是把白名单当作命令过滤器。
- **没有能力分组** — 条目只匹配规范化名称与前缀；把等价能力（MCP 文件系统工具与 `read`）映射到一起由部署负责，在没有当前消费者时发明共享词汇属于后续工作。
- **审计体积有界** — 只记录非允许决策，因此本包不记录被允许的调用；需要跟踪每次调用时使用工具调用遥测。
