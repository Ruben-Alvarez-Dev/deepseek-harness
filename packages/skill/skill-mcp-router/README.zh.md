---
description: "零嵌入的 FTS5 路由器，按当前任务对 skill 摘要与可见 MCP 工具 schema 排序，供需要选择展示内容的部署使用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-skill-mcp-router

[English](README.md) | 中文

## 概述

`dsh-skill-mcp-router` 在内存 SQLite FTS5 中维护 skill 摘要与可见 MCP 工具 schema 的索引，并按当前任务回答 BM25 查询。它不使用嵌入，也不发起模型调用：由消费者决定展示什么，因此路由器本身从不隐藏 skill 或工具。工具分区在最终 `system-prompt/assemble` 结果之后刷新，两个分区都只在内容 digest 变化时重建。在需要确定性、可回放排序的消费者处挂载它。

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

在 agent 运行处挂载服务；随后消费者可使用 `ctx.skillRouter`：

```yaml
- name: '@deepseek-ai/dsh-skill-mcp-router'
  config:
    path: ':memory:'
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `path` | `:memory:` | FTS5 索引使用的 SQLite 数据库路径 |

```text
await ctx.skillRouter.indexSkills(skills)          // SkillSummary[] from ctx.skills.snapshot()
await ctx.skillRouter.indexTools(visibleSchemas)   // ToolSchema[]; only mcp__* entries are indexed
const ranked = await ctx.skillRouter.search('deploy the service', { kind: 'skill', limit: 8 })
```

所有可用配置字段以生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-skill-mcp-router)为准。

<a id="understand-the-implementation"></a>
## 理解实现

### 设计理念

排序是一个可审查的词法问题，因此索引使用普通 FTS5 与 `porter unicode61` 分词器：词形会词干化、变音符号会折叠，而无需嵌入模型。查询词会被分词、去重、限量并逐个引用后才进入 `MATCH`，因此标点与 FTS 运算符无法改变查询形态。对相同分区与查询，BM25 排序是确定性的。重建前先比较内容 digest，因此组装监听器只在模型可见 MCP 集合真正变化时刷新工具分区。

### 源码导图

- `src/index.ts` — `skillRouter` 服务、`indexSkills`/`indexTools`、`search`、分词器、基于 digest 的重建以及组装监听器。
- 工具分区由最终组装后的工具 schema 构建，因此工具注册表看不到的提示词级提供方也会被索引。

<a id="further-exploration"></a>
## 进一步探索

- [Skill 注册表](../skill/README.zh.md) — 本路由器索引的摘要。
- [系统提示词组装](../../core/system-prompt/README.zh.md) — 最终工具集刷新工具分区的瀑布事件。
- [工具运行时](../../core/tools/README.zh.md) — 注册表暴露的可见工具 schema。

<a id="dev-note"></a>
## 开发备注

本包不发布 `./invariant`：它不拥有可能出现分歧的独立观测关系。它要求支持 FTS5 的 `node:sqlite`，在运行时缺少该能力时首次使用即失败；质量门禁在 `tests/router-quality.spec.ts` 中于带标签的合成语料上断言 recall@8 与 nDCG@8。

<a id="model-experience"></a>
## 模型体验

None, as the package only ranks skill and MCP tool metadata; consumers own every prompt, schema, or result they build from ranked names.

#### KV Cache effect

No direct effect; a consumer that changes what it surfaces owns the resulting cache behavior.

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- **仅词法** — 与条目没有共享词干的查询会漏掉它；同义词与跨语言改写在没有嵌入或翻译步骤时不在范围内。
- **内存索引** — 默认数据库位于进程内存；需要共享索引的部署必须提供路径并自行管理生命周期。
- **合成质量门禁** — recall@8 与 nDCG@8 在本包编写的 59 条带标签 fixture 上测量；这是内部回归信号，不是通用质量声明。
