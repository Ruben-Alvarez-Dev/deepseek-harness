# Agent Note: `sota` 预设 —— 把 F4 可选功能做成可选择的模式

Status: proposed

[English](2026-11-08-sota-preset.md) | 中文

## 问题

七个 F4 可选功能发布时都不挂载，每个属主笔记都把启用留给属主决定。这是正确的默认：每一个都会改变模型可见输入 —— 有界的 MCP schema、不允许分发的审计记录、被剪枝的工具结果、排序后的 Skills 目录、注入的记忆、交接检查点 —— 改变默认值会为从未要求这些的用户重写提示词、快照与每会话成本。但没有任何预设挂载的可选功能只是库，不是产品：实测效果（路由 recall@8 0,915、记忆 recall@5 1,000、保守剪枝 12,94 %、治理器 0,45 %）除非用户手工编写 Cordis 编排并把每个 realm 都放对，否则无法触达。产品问题是：如何把组合收在一个显式选择之后，让 `standard` 保持默认，把每个服务都限制在预设内，并避免宣称尚未测量的实跑收益。

## 方案

在已发布根目录新增第五个预设 `sota`，位于 `packages/preset/agent-presets/presets/sota/`（[agent-presets README](../../../../packages/preset/agent-presets/README.zh.md)）。它从 `standard` —— 完整编码 Agent —— 出发，为每个可选功能增加一行。机制与其测量门禁属于各自的属主笔记；本笔记拥有选择与配置。它作为模式被选择，永远不是默认：

| 可选功能 | 预设行与配置 | `sota` 会话得到什么 |
|---|---|---|
| CH-041 治理器 | `system-prompt-governor`：MCP schema 预算 3000，描述上限 120 | 超出预算的 schema 保留可调用结构，丢失参数文档 |
| CH-042 分发门禁 | `tool-dispatch-gate`：`mode: audit`，allow 与 deny 为空 | 不允许的调用被记录，并且仍然执行 |
| CH-042 压力剪枝器 | `tool-result-pruner`：`maxContextTokens: 100000`、`pruneThresholdChars: 8192`、head/tail 4096/1024 | 保守重放策略，模拟节省 12,94 % |
| CH-043 路由 | `skill-mcp-router` 与 `tool-skill` 放在一个条目本地 realm 内 | FTS5 排序的 Skills 目录，每个名字仍然列出 |
| CH-044 记忆 | `memory-passive`：`memoryDir` 位于 DSH home 下，5 条注入，4000 字符配额，`capture: false` | 本地脱敏注入，试点期间不采集 |
| CH-045 交接 | `handoff`：检查点 2000 字符，8 次工具调用，200 字符参数 | 带持久检查点投递的 `/handoff` |
| CH-046 脱敏 | `telemetry-redaction` 位于 base bundle 的宿主平面 | 每条出站遥测记录都被清洗 |

记忆在试点期间保持只读：CH-047 基线在可选功能未挂载时测得 0 次注入并返回 `disable`，因此只有在窗口测量其运行之后才启用采集。分发门禁留在 `audit` 也是同一理由：enforce 需要从已记录的不允许决策中推导允许列表，而不是猜测。

## 放置与选择

- **平面** —— 只有会话可选择的行放在预设里。`telemetry-redaction` 挂在 `packages/bundle/base/cordis.patch.yml`（[base bundle](../../../../packages/bundle/base/cordis.patch.yml)）中遥测后端旁边，因为该保证必须对所有 profile 和所有预设成立；预设可以被跳过。
- **Realm** —— `skill-mcp-router` 及其唯一消费者 `tool-skill` 共享一个条目本地 realm，因此宿主 realm 的 `ctx.get('skillRouter')` 保持 undefined，`standard` 会话永远不会得到该排序。剪枝器与 `compaction-basic` 共享压缩 realm，后者用 `ctx.get` 解析它；治理器、门禁、记忆与交接行不提供服务，也不需要分组。
- **标识** —— `preset.yml` 承载 id、顺序与展示元数据；已发布预设的展示文案通过语言键 `presetSotaName`/`presetSotaDescription` 解析（[展示解析器](../../../../packages/preset/agent-presets/src/display.ts)），因此「SOTA 模式」被翻译，而用户自撰的预设元数据不可翻译。
- **可解析性** —— `apps/cli/package.json` 列出这些可选包，使已发布预设能从安装锚点解析其模块；`python/sdk-runtime/package.json` 为 Python 运行时闭包镜像它们；`packages/bundle/base/package.json` 为宿主行列出脱敏包。
- **验证** —— `apps/cli/tests/web-agent-presets.e2e.ts` 启动已发布的 Web 编排，断言系统根提供五个预设、挂载 `sota`，并检查模型可见目录就是 `standard` 的（可选功能不新增工具）、路由与压力配置只存在于预设 realm、交接命令与其投影已注册。
- **默认值** —— `agent-presets.default` 保持 `standard`；预设被列出且可选择，未点名它的会话与之前完全一样地编排。

## 已考虑的替代方案

- **在 `standard` 中启用可选功能** —— 拒绝：这会为每个既有会话重写默认 agent 的模型可见输入、快照与成本；这些可选功能之所以可发布，正是因为它们不被选择时就保持关闭。
- **每个可选功能一个预设** —— 拒绝：六个杠杆对应七个预设，而且没有任何编排包含实测过的组合；产品是组合，不是零件。
- **一个有文档的用户自撰预设** —— 拒绝：指南无法交付挂载，用户仍然会把 realm 放错；已发布根目录才是名册解析、e2e 编排的产物。
- **把 `sota` 设为默认** —— 拒绝：它的价值依赖重放模拟与合成 fixture，而不是实跑窗口；默认会给未选择它的用户强加未测量的成本。名字表达的是雄心，不是证据。
- **把脱敏挂在预设而不是宿主** —— 拒绝：预设是可选的，跳过它就会恢复未脱敏的出站遥测；安全保证应放在任何预设选择都无法移除的位置。

## 验收标准

- 已发布根目录列出五个预设；`sota` 能编排，其会话得到 `standard` 的工具目录加上可选功能行为；`agent-presets.default` 仍为 `standard`。
- 路由与压力剪枝器只能从 `sota` 会话触达（宿主 `ctx.get` 返回 undefined）；交接命令及其宿主侧投影存在；记忆目录在 DSH home 下创建且采集关闭。
- Web e2e 从已发布 bundle 编排 `sota` 并断言这些属性；F4 聚焦测试与文档、typecheck、lint、重复检测门禁保持绿色。
- 未点名 `sota` 的会话以及每一份已记录快照保持不变。
- 选择是唯一的启用面：不重写任何设置、不迁移任何会话，删除预设后默认编排保持完整。

## 风险

- **与 `standard` 漂移** —— `sota` 复制了 `standard` 的行，因此未来加到 `standard` 的行必须手工复制；预设是副本，不是第二个来源，而 e2e 目录断言能抓到缺失的模型可见工具，却抓不到缺失的服务或提示词章节。
- **持久记忆成本** —— 注入块被追加到会话表面，因此其 tokens 会被后续请求重发并随会话增长；在测量窗口证明其价值之前采集保持关闭。
- **审计而非强制** —— 门禁只记录不阻断，因此 `sota` 用户在被观察，而不是被保护，直到从一周的 `tool/dispatch-gate` 事件推导出允许列表。
- **模拟差距** —— 12,94 % 的剪枝节省与 0,45 % 的治理器节省是重放模拟，路由的 0,915 recall 与记忆的 1,000 recall 是合成 fixture 门禁；`sota` 可选择是因为用户主动 opt-in，而不是因为生产价值已证明。
- **编辑时的 realm 误用** —— 留在 isolate 分组之外的消费者会静默解析宿主 realm 或在挂载时冲突；e2e 固定了当前放置，但新增行需要同样的评审。
- **宿主级变更** —— base bundle 中的遥测脱敏一次性清洗所有 profile 的出站记录；需要未脱敏副本的部署必须显式把它 patch 掉。
