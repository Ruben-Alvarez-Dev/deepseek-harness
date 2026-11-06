---
description: "出站会话遥测的默认密钥脱敏：在 session-telemetry/record 上挂载可审计规则，使每条导出记录的 body 与 attributes 都被清洗，无需部署方手写监听器。"
kind: "package-reference"
---

# @deepseek-ai/dsh-telemetry-redaction

[English](README.md) | 中文

## 概述

`dsh-telemetry-redaction` 用可审计规则填充会话遥测的脱敏槽位。与遥测后端一起挂载后，它会转换 `session-telemetry/record` 上的每条记录：`body`、`attributes`、嵌套数组与嵌套对象中的字符串都会经过 [`@deepseek-ai/dsh-redaction`](../../util/redaction/README.zh.md)，因此私钥、API 密钥、Bearer token、JWT、GitHub 与 AWS 密钥以及密钥赋值都不会到达导出器。规范会话日志从不被改写，输入记录也不会被修改。无法无损复制的负载（循环引用）会使该记录按失败关闭语义被扣留。

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

照常挂载恰好一个遥测后端，然后在同一编排中挂载脱敏插件：

```yaml
- name: '@deepseek-ai/dsh-session-telemetry-otel'
  config: { mode: full }
- name: '@deepseek-ai/dsh-telemetry-redaction'
```

插件没有配置：规则是安全不变量。挂载它的部署不再需要手写 `session-telemetry/record` 监听器，这正是默认值的意义。

<a id="understand-the-implementation"></a>
## 理解实现

### 设计理念

该 seam 是 waterfall：每个监听器收到记录副本，并可在后端发出前转换 `next()` 返回的内容。本插件先调用 `next()`，然后返回一个副本，其 `body` 与 `attributes` 中每个可达字符串都由共享规则集脱敏。数字、布尔值与 `null` 原样通过。循环检测遍历复制栈；遇到循环即抛出，seam 文档化的失败关闭行为会扣留该记录，而不是导出部分脱敏的负载。

### 源码导图

- `src/index.ts` — waterfall 监听器与递归、感知循环的清洗。
- [`@deepseek-ai/dsh-redaction`](../../util/redaction/README.zh.md) — 有序规则集及其计数。

<a id="further-exploration"></a>
## 进一步探索

- [会话遥测](../session-telemetry/README.zh.md) — seam、记录词汇与脱敏 waterfall。
- [OpenTelemetry 后端](../session-telemetry-otel/README.zh.md) — 本插件通常搭配的已发布后端。

<a id="dev-note"></a>
## 开发备注

No invariant companion is published because the transform is pure over one record and owns no relation between independent observations.`tests/telemetry-redaction.spec.ts` 中的泄漏门禁导出 20 条记录，覆盖 body、嵌套值与 attributes 中的六类密钥，并断言零泄漏。

<a id="model-experience"></a>
## 模型体验

None, as the plugin transforms outbound telemetry copies and registers nothing model-facing; the canonical session log and every model request stay unchanged.

#### KV Cache effect

None; the package never assembles or alters a provider request.

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- **可选挂载** — 默认值在插件挂载时生效；不挂载的编排保留 seam 的未脱敏出站副本。
- **基于规则** — 六类之外的凭据格式会通过；扩展覆盖范围会修改共享规则模块。
- **失败关闭扣留** — 循环负载会失去其遥测记录，而不是导出部分脱敏。
- **无字段级豁免** — 整条记录都会被清洗；必须保留特定字段结构的部署需要自己的规则。
