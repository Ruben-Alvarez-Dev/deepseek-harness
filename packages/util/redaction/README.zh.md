---
description: "用于不可信文本的固定、可审计的密钥脱敏规则，由捕获与出站遥测共享：私钥、API 密钥、Bearer token、JWT、GitHub 与 AWS 密钥以及密钥赋值。"
kind: "package-reference"
---

# @deepseek-ai/dsh-redaction

[English](README.md) | 中文

## 概述

`dsh-redaction` 是 harness 固定密钥脱敏规则的唯一归属。`redactSecrets(text)` 会把私钥块、`sk-` API 密钥、Bearer token、JWT、GitHub token、AWS 访问密钥以及 `API_KEY=`/`password=` 形式的赋值替换为稳定占位符，并返回逐规则计数，让调用方记录移除了什么。这些规则是安全不变量而非配置：有序、确定、纯函数，且从不修改输入。捕获与出站遥测共享本模块，而不是各自增长规则列表。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [开发备注](#dev-note)
- [已知限制与后续工作](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## 使用本包

```ts
import { redactSecrets } from '@deepseek-ai/dsh-redaction'

const { text, summary } = redactSecrets('API_KEY=super-secret-value')
// text === 'API_KEY=[REDACTED]'
// summary === { count: 1, kinds: { 'secret-assignment': 1 } }
```

本包没有配置，也不提供服务。`REDACTION_RULE_NAMES` 按应用顺序列出规则，供审计界面使用。

<a id="understand-the-implementation"></a>
## 理解实现

### 规则顺序与占位符

规则按固定顺序应用，避免宽泛规则拆散窄规则本可识别的密钥：先 PEM 私钥块，然后是 `sk-` 密钥、Bearer token、JWT、GitHub token、AWS 访问密钥，最后是键值赋值。除赋值外，每个替换使用稳定占位符（`[REDACTED_API_KEY]`、`[REDACTED_JWT]` 等）；赋值保留变量名（`API_KEY=[REDACTED]`），使周围记录的结构仍可读。计数按规则名汇总。

### 源码导图

- `src/index.ts` — 有序规则、`redactSecrets`、`REDACTION_RULE_NAMES` 与结果类型。

<a id="further-exploration"></a>
## 进一步探索

- [遥测脱敏](../../session/telemetry-redaction/README.zh.md) — 这些规则的出站遥测消费者。

<a id="dev-note"></a>
## 开发备注

No invariant companion is published because the package is a pure text filter with no relation between independent observations; a rule change is a security change and must update the rule-order test and the telemetry leak gate together.

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- **基于模式** — 这些规则未命名的凭据格式会原样通过；扩展列表会更新这个唯一归属。
- **可能误报** — 形似密钥的字符串即使不是密钥也会被脱敏；占位符保持周围结构可读。
- **无语义分类** — 规则无法证明某个值是否为凭据；它们是固定、可审计的过滤器，不是分类器。
- **仅文本** — 调用方自行选择要脱敏的字段；本模块不遍历任意结构（遥测插件在其外层做遍历）。
