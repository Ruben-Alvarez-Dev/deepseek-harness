---
description: "在系统提示词组装阶段约束 MCP 工具 schema 体积的出站提示词治理器，供需要为提示上下文设定预算的部署使用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-system-prompt-governor

[English](README.md) | 中文

## 概述

`dsh-system-prompt-governor` 监听 `system-prompt/assemble` 瀑布事件，在构建请求头之前限制 MCP 工具 schema 的 token 体积。它保证每个 MCP 工具仍可调用：名称、必需参数、类型、默认值与嵌套结构保持不变，只对超出预算的工具去掉参数描述/示例以及过长的工具描述。治理后的工具会进入 `request/header`，因此模型实际收到的内容仍可从会话日志重建。请在提供 `ctx.systemPrompt` 的包之后挂载本插件。

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

在已挂载 `dsh-system-prompt` 的编排中挂载本插件：

```yaml
- name: '@deepseek-ai/dsh-system-prompt-governor'
  config:
    mcpSchemaTokenBudget: 3000
    mcpToolDescriptionMaxLength: 120
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `mcpSchemaTokenBudget` | `3000` | 所有 MCP 工具 schema 的合计 token 预算；正整数 |
| `mcpToolDescriptionMaxLength` | `120` | 被治理 MCP 工具的描述上限；整数且 ≥ 3 |

名称以 `mcp__` 开头的工具会被治理；其他工具 schema 永远不会被改动。所有可用配置字段以生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-system-prompt-governor)为准。

### 对单个工具做了什么

对放不进预算的 MCP 工具，工具描述会被规范化并截断，参数 schema 中每一层的 `description`、`examples`、`$comment` 键都会被移除。其余内容——`type`、`properties`、`required`、`enum`、`default`、`oneOf`/`anyOf` 与嵌套结构——全部保留，因此模型仍能构造合法的调用。

<a id="understand-the-implementation"></a>
## 理解实现

### 设计理念

MCP 服务器是工具面中无界的部分：它们的 schema 来自第三方，并且每次请求都会重新发送。治理器把 schema 体积视为预算——能放进预算的规范化 MCP 工具前缀保留文档，其余工具只保留结构、不保留文档。规范化顺序使切分具有确定性，因此工具集稳定的会话会得到稳定的前缀。

### 源码导图

- `src/index.ts` — 插件的 `name`/`Config`/`apply`、组装监听器、`governPromptTools` 与 schema 压缩器。
- `estimateToolSchemasTokens`（[token-meter](../../llm/token-meter/README.zh.md)）使用与请求信封相同的固定启发式估算工具 schema 体积，因此预算与计量器的数字一致。

<a id="further-exploration"></a>
## 进一步探索

- [系统提示词组装](../system-prompt/README.zh.md) — 本插件所转换的瀑布事件。
- [Token 计量器](../../llm/token-meter/README.zh.md) — 针对被治理体积的、可回放的上下文压力测量。

<a id="dev-note"></a>
## 开发备注

本包只在固定启发式的 schema 计价上依赖 `dsh-token-meter`；它不挂载服务，也不新增自己的模型可见文本。本包不发布 invariant 伴随包，因为预算切分由包内测试断言，且不存在可供交叉检查的独立观测。

<a id="model-experience"></a>
## 模型体验

### MCP 工具面

#### 模型看到什么

对超出预算的 MCP 工具，模型看到相同的工具名称与参数结构，但没有参数描述、示例、注释，工具描述被截断到 `mcpToolDescriptionMaxLength`。预算内的工具以及所有非 MCP 工具保持不变。

#### Token 影响

条件性且有上限：当 MCP schema 面超过 `mcpSchemaTokenBudget` 时，被治理体积被压缩到预算加压缩后的剩余部分；当它在预算内时，请求保持不变。

#### KV Cache 影响

替换请求 token：治理后的 schema 替换请求头中未治理的 schema，因此压缩集合变化会从该请求起使复用失效。工具集与预算稳定时切分是确定性的，重复请求会保持可复用的前缀。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- **超出预算后的说明缺失** — 被治理工具的参数文档不再发送给模型；由于名称、类型与必需列表保留，合法调用仍可构造。需要这些说明时请提高预算。
- **预算只作用于 MCP 组** — 非 MCP 工具不在治理范围内；全局预算留待第二个消费者出现时再实现。
- **没有相关性排序** — 切分遵循规范化顺序；按当前请求对 MCP 工具排序留作后续工作。
