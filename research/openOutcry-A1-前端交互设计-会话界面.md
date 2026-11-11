# A-1 前端交互设计 · Agent 接入台与会话界面

| 项 | 内容 |
|---|---|
| 模块 | A-1 前端部分（接入台 + 会话台 + 运行观察台） |
| 版本 | v1.0（MVP） |
| 状态 | 待评审 |
| 上游 | `openOutcry-A1-外部Agent接入-开发文档.md`（后端部分） |
| 参考实现 | `sst/opencode` 的 `packages/session-ui`、`siteboon/claudecodeui`（CloudCLI）、`chenhg5/cc-connect` 的卡片层、Zed 的 `agent_ui` |

---

## 1. 问题：后端通了，不等于用户能用

上一版 A-1 开发文档解决的是「怎么把 agent 跑起来、怎么收到它的帧」。但那只是管道。用户真正接触的是三个界面，而这三个界面各有各的失败模式：

| 界面 | 用户要做什么 | 做不好的后果 |
|---|---|---|
| **接入台** | 挑一个 agent、确认它能用、填好凭证 | 用户卡在「不知道装了什么、为什么不可用」，接入率归零 |
| **会话台** | 看 agent 在想什么、调了什么工具、结果如何 | 一屏流式文字，看不出因果，等于黑盒 |
| **运行观察台** | 旁观 agent 在训练场里跑，必要时介入 | 分不清「第几个交易日」「这单批没批」，评测结论不可信 |

**本文的核心判断：这三个界面的难点不在样式，而在「事件 → 部件」的映射契约。** 契约定错，后面所有交互都是补丁。

---

## 2. 参考实现拆解

### 2.1 opencode `packages/session-ui`（最完整的会话 UI）

Solid + 自建 UI 包，专门服务 opencode 自己一个 agent。目录本身说明了它的抽象层次：

```
src/
  message/      current-message.tsx  message-content.tsx  current-tool-state.ts  paced-text-machine.ts
  tools/        tool-renderer.tsx  tool-group.stories.tsx  run-machine.ts  shell-output.ts
  components/   disclosure.ts(+machine)  tool-status-title.tsx(+machine)  tool-count-summary.tsx
                markdown-stream.ts  markdown-worker.ts  session-review.tsx  question-prompt.css
  v2/components/ session-progress-indicator-v2.tsx
```

**它做对的四件事：**

| 做法 | 具体表现 | 我们要不要抄 |
|---|---|---|
| part 化 | 一条会话不是「消息数组」，是 `SessionMessageAssistant{Text,Reasoning,Tool,Shell}` 的 part 序列，每种 part 独立渲染 | ✅ 抄 |
| 状态机驱动折叠 | `disclosure-machine.ts` 把「展开/收起」做成显式状态机，不是 `useState` 布尔 | ✅ 抄 |
| 状态标题动画 | `tool-status-title-machine.ts` 计算进行中/完成的公共前缀，做「Reading… → Read」的原地变形 | ✅ 抄（低成本高感知） |
| 同类工具折叠成组 | `tool-count-summary.tsx` 把连续 6 次 read 折叠成一行「读了 6 个文件」 | ✅ 抄 |

**不能直接抄的：** 它 `switch (tool.name)` 分派渲染器（`tool-renderer.tsx:294-328`，`read`/`list`/`glob`/`grep`/`shell`/`edit`/`write`/`patch`/`question`/`skill`…）。**它只服务一个 agent，工具名是封闭集合；我们有 44 个 agent，工具名不可穷举。**

### 2.2 claudecodeui / CloudCLI（React，最像「产品」）

`src/modules/chat/` 是完整的产品级聊天模块：

```
chat/
  ChatInterface.tsx
  composer/   ChatComposer.tsx  PermissionRequestsBanner.tsx  ComposerPermissionMenu.tsx
              QueuedMessageCard.tsx  TokenUsageSummary.tsx  BackgroundSendDialog.tsx
  tools/      ToolRenderer.tsx  configs/toolConfigs.ts  configs/permissionPanelRegistry.ts
              ContentRenderers/{Text,Markdown,FileList,TodoList,TaskList,QuestionAnswer}.tsx
              InteractiveRenderers/{AskUserQuestionPanel,McpElicitationPanel}.tsx
              ToolDiffViewer.tsx  BashEditDiff.tsx  PlanDisplay.tsx  SubagentPanel.tsx
  export/     TranscriptExportDocument.tsx  buildTranscriptHtml.tsx
```

**它做对的五件事：**

| 做法 | 具体表现 | 我们要不要抄 |
|---|---|---|
| **注册表式分发** | `toolConfigs.ts` 是 `Record<string, ToolDisplayConfig>`（图标/标题/渲染器）；`ToolRenderer.tsx` 先用 `getToolCategory()` 归到 `edit`/`search`/`bash`/`todo`/`agent`/`plan`/`question`/`default` 再渲染 | ✅ 抄「两层分发」：粗类 → 细分 |
| **内容类型再分发** | `ContentRenderers/*` 按 tool result 的形状选渲染器（文本/文件列表/待办/问答），与工具名解耦 | ✅ 抄 |
| **交互面板注册** | `permissionPanelRegistry.ts`：`registerPermissionPanel('AskUserQuestion', AskUserQuestionPanel)`，工具名 → 交互面板 | ✅ 抄（用 ACP 的 elicitation 对应） |
| **权限横幅在输入框上方** | `PermissionRequestsBanner` 挂在 composer 之上，不打断阅读流 | ⚠️ 部分抄：协议级权限用横幅，业务审批用 inline 卡片 |
| **transcript 可导出** | `buildTranscriptHtml.tsx` 把整段会话导出成自包含 HTML | ✅ 抄（评测复盘要交材料） |

**不能抄的：** 同样是 `switch (toolName)`，且它面对的是 Claude/Codex/OpenCode 三家各自的私有工具名（`Bash`/`PowerShell`/`TodoWrite`/`TaskCreate`…），维护成本已经体现在 `toolConfigs.ts` 的 500+ 行里。

### 2.3 cc-connect 的卡片层（唯一服务「非 IDE 界面」的）

cc-connect 把 ACP 事件渲染成 IM 卡片（飞书/Slack），它的价值不在视觉，而在**分层**：

| 做法 | 说明 | 我们要不要抄 |
|---|---|---|
| card builder 与 transport 解耦 | `core/` 生成平台无关的卡片结构，`platform/feishu` 只做序列化 | ✅ 抄：我们的 Part 就是平台无关的卡片结构 |
| 就地更新而非追加 | 流式过程更新同一条卡片，结束后才定型 | ✅ 抄：这是「不刷屏」的根本 |
| 审批用按钮回调 | 卡片按钮 → `RespondPermission` | ❌ 不抄：我们的业务审批走 MCP 工具返回值 |

### 2.4 Zed `agent_ui`（只作参照，不落地）

Rust + GPUI，thread 视图分 thinking / tool / message 三层，与 ACP 同源（Zed 是 ACP 的两个共同治理方之一）。**它的分层顺序值得对齐**（thought 在最上且默认折叠、tool 居中、message 在下），但代码不可复用。

### 2.5 结论：一个必须做的分歧

> **opencode 和 claudecodeui 都按「工具名」分发渲染器。我们必须按 ACP 的 `kind` 分发，工具名只作次级提示。**

理由是硬约束：ACP 的 `ToolKind` 是协议级枚举，只有 10 个值，跨所有 agent 稳定：

```
read | edit | delete | move | search | execute | think | fetch | switch_mode | other
```

而工具名是 agent 私有的、随版本变化的、不可穷举的。**按 kind 分发 → 44 个 agent 只需要 10 个渲染器 + 1 个兜底；按 name 分发 → 需要 44 套。**

协议原文也支持这个判断（`tool-calls.mdx:70`）：*"Tool kinds help Clients choose appropriate icons and optimize how they display tool execution progress."*——kind 本来就是给客户端做呈现用的。

---

## 3. 三个界面

### 3.1 接入台（`/agents`）

解决「我有什么 agent、能不能用、怎么用」。

```
┌──────────────────────────────────────────────────────────┐
│  Agent 接入                                    [+ 自定义] │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌────────────────────┐          │
│  │ Claude Code        │  │ Codex              │          │
│  │ wrapper · 2.5.0    │  │ wrapper · 0.100.0  │          │
│  │ ✅ 可用  延迟 1.8s  │  │ ⚠️ 能力受限        │          │
│  │ [探测] [配置]       │  │ 缺 resume，长会话会重建      │
│  └────────────────────┘  └────────────────────┘          │
│  ┌────────────────────┐  ┌────────────────────┐          │
│  │ Antigravity        │  │ Gemini CLI         │          │
│  │ vendor-hosted      │  │ native · 已停服     │          │
│  │ ❌ 不可用           │  │ ⬜ 未探测           │          │
│  │ LAUNCH_FAILED      │  │                    │          │
│  │ 未找到 agy          │  │                    │          │
│  │ [复制安装命令]      │  │                    │          │
│  └────────────────────┘  └────────────────────┘          │
└──────────────────────────────────────────────────────────┘
```

**四个必须做对的细节：**

1. **provenance 徽标必须显示**（`native` / `wrapper` / `vendor-hosted` / `community`）。这是 A-1 后端 §2.4 承认的代价，界面必须把它变成用户的知情权，而不是藏起来。
2. **探测是可点的一次性动作，不是页面加载时自动跑**。spawn 一个 agent 要 2–30 秒，自动跑会让页面一直转圈。探测过程要显示分步进度（`spawn → initialize → session/new → ping`），失败停在哪一步就标红哪一步。
3. **错误码必须配可行动文本**（对齐后端 §4.6 的 8 个码）。`LAUNCH_FAILED` → 给出可直接复制的安装命令；`AUTH_REQUIRED` → 给出该 CLI 的登录命令；`CAPABILITY_MISSING` → 建议换 agent 而不是让用户重试。
4. **凭证不进我们的库**。界面只显示「环境变量 `ANTHROPIC_API_KEY`：已设置 / 未设置」，并提供本地登录引导。

### 3.2 会话台（`/runs/:id/session/:sid`）

解决「agent 在想什么、做了什么」。这是本文的主体。

```
┌──────────────────────────────────────────────────────────────┐
│  Codex · 分析师 · 第 3 交易日        ● 运行中  12.4k tok     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ▸ 思考 · 已折叠                                              │
│                                                              │
│  我正在判断 600519 今天的量能是否支持加仓。需要先确认……        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🔍 search  查 600519 近 20 日量比          已完成 0.8s  │  │
│  │   └ 命中 3 条                                          │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📄 read  读取 2026-11-03 收盘快照           已完成      │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ⚡ execute  trade.submit_order               进行中     │  │
│  │   ┌──────────────────────────────────────────────────┐ │  │
│  │   │ 订单票据  买入 600519  200 股  限价 1680.00       │ │  │
│  │   │ 预计成本 336,000.00 · 手续费 336.00               │ │  │
│  │   │ ⏳ 等待确认  00:27   [批准] [改单] [拒绝]          │ │  │
│  │   └──────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ─────────────────────────────────────────────────────       │
│  3 个工具调用 · 1 个待审批                                     │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 运行观察台（`/runs/:id`）

会话台是「一个 agent 的对话」，观察台是「一场比赛」。区别在**时间维度**：

| 观察台独有 | 说明 |
|---|---|
| 模拟时钟与交易日时间轴 | 顶部固定显示 `2026-11-03 09:30`，左侧时间轴可跳转到任意交易日 |
| 交易日分隔条 | 会话流里插入 `day-divider` part，跨日必须可见（否则复盘时不知道哪天在做什么） |
| 播放控制 | 暂停 / 继续 / 单日步进 / 倍速 |
| 人工介入 | 给 agent 发消息（走 `session/prompt`），打断当前 turn 前先确认 |
| 侧栏 | 持仓 / 委托 / 决策依据（因果链，A-6） |

---

## 4. 核心模型：SessionPart

**前端不直接消费 ACP 帧，消费 Part。** Part 是 ACP `session/update` 经过折叠、去重、排序后的稳定视图。

```ts
type SessionPart =
  | { type: 'text';      id: string; text: string; streaming: boolean }
  | { type: 'thought';   id: string; text: string; collapsed: boolean }
  | { type: 'tool';      id: string; toolCallId: string; name: string;
                          kind: ToolKind;        // 分派依据
                          title: string;         // agent 写的可读标题
                          status: 'pending' | 'in_progress' | 'completed' | 'failed';
                          content: ToolCallContent[];   // 结构化结果
                          locations: ToolCallLocation[];
                          rawInput: unknown; rawOutput: unknown;
                          startedAt: number; endedAt?: number }
  | { type: 'permission'; id: string; toolCallId: string;
                          options: { id: string; name: string; kind: PermissionOptionKind }[];
                          resolution?: 'selected' | 'cancelled' | 'auto_rejected' }
  | { type: 'plan';      id: string; entries: { content: string; status: string }[] }
  | { type: 'usage';     id: string; inputTokens?: number; outputTokens?: number; cost?: number }
  | { type: 'error';     id: string; code: string; message: string }
  | { type: 'day-divider'; id: string; simulatedDate: string; simulatedTime: string }
```

**三个不变量：**

1. **`toolCallId` 是唯一键**。`tool_call` 与 `tool_call_update` 是同一个 part 的两条更新，必须 upsert 而不是追加。
2. **`kind` 只来自协议，不从 `title` 猜**。`title` 是 agent 写的自然语言，可能中英混杂、可能撒谎；`kind` 是枚举，可信任。
3. **`rawInput` 以 `tool_call_update` 为准**。后端已确认部分 agent 在 `tool_call` 里给 `{}`（A-1 后端 §4.10），前端不要在 `tool_call` 时就渲染入参。

---

## 5. 渲染契约：kind → 组件

### 5.1 两级分派

```
ToolPart
  ├─ 第一级：按 kind（协议枚举，10 个）
  │    read     → FileReadCard      单行 + 路径 + 命中行数
  │    search   → SearchCard        查询词 + 命中列表
  │    execute  → ExecuteCard       命令/调用 + 输出（ansi 转义）
  │    edit     → DiffCard          前后对比（diff 视图）
  │    write    → DiffCard          新建文件视图
  │    delete   → FileOpCard        路径 + 确认
  │    move     → FileOpCard        源 → 目标
  │    think    → ThoughtCard       默认折叠
  │    fetch    → FetchCard         URL + 状态码 + 摘要
  │    switch_mode → ModeCard       模式切换
  │    other    → GenericCard       兜底：title + 折叠的 rawInput/rawOutput
  │
  └─ 第二级：按 name 覆写（只对我们自己的 MCP 工具）
       trade.submit_order → OrderTicketCard    ← 订单票据 + 审批
       trade.hold         → HoldCard
       trade.cancel       → CancelCard
       market.quote       → QuoteCard          行情表
       market.news        → NewsCard
       research.*         → ResearchCard
```

**第二级只允许出现在 `kind === 'execute'` 且 name 命中白名单时。** 白名单是 openOutcry 自己的 MCP 工具，写在代码里（不是配置），因为它们是我们发布的、稳定的。

### 5.2 内容再分派

`content` 是 `ToolCallContent[]`，协议定义了三种（`tool-calls.mdx:275+`）：

| `content.type` | 渲染 |
|---|---|
| `content`（标准 content block） | 按 block 的 `type` 再分：`text` → 文本/代码块，`image` → 图片，`resource` → 资源链接 |
| `diff` | diff 视图（`oldText`/`newText`，新建文件时 `oldText` 为 null） |
| `terminal` | 终端输出（ansi 解析 + 自动滚底） |

这一层与工具名完全解耦——这正是 claudecodeui `ContentRenderers/*` 的思路，我们照搬。

### 5.3 折叠规则

| 规则 | 理由 |
|---|---|
| 单个工具默认收起，只显示一行状态标题 | 一屏放得下 8–10 个工具，而不是 2 个 |
| 连续 ≥3 个同 kind 且都完成 → 折叠成组「读取了 6 个文件」 | 抄 opencode `tool-count-summary` |
| `status === 'failed'` 强制展开 | 失败信息不能藏 |
| `kind === 'edit' / 'write'` 展开到 diff 摘要 | 改动必须一眼可见 |
| **我们自己的 `trade.*` 永不折叠** | 交易动作是评测对象，藏起来就没法复盘 |
| `thought` 默认折叠，可全局开关 | 思考过程是审计材料，不是主阅读流 |

折叠状态用显式状态机（`disclosure-machine`），并**按 partId 持久化到 localStorage**：用户展开过的卡片，重连后保持展开。

### 5.4 状态标题

抄 opencode 的做法：计算「进行中文本」与「完成文本」的公共前缀，只动画差异部分。

```
进行中:  正在读取 2026-11-03 收盘快照
完成:    已读取 2026-11-03 收盘快照
          └── 只让「正在/已」这一段做变形动画
```

降级：`prefers-reduced-motion` 时直接切换文本，无动画。

---

## 6. 审批：两套，绝不混用

这是与两个参考实现最大的行为分歧，也是本文最重要的设计约束。

| | 协议级权限 | 业务审批（订单） |
|---|---|---|
| 来源 | ACP `session/request_permission` | MCP 工具 `trade.submit_order` 的 handler 内部 |
| 界面位置 | 输入框上方的**横幅** | 会话流里的**内联卡片** |
| 选项 | `allow_once` / `allow_always` / `reject_once` / `reject_always` | 批准 / 改单 / 拒绝 |
| 我们的默认行为 | **自动拒绝**（`reject_once`），横幅只做告知 | 阻塞等待，超时拒绝 |
| 为什么 | 后端已证明该通道在部分 agent 上不可靠（cc-connect `#1100`、`rawInput` 恒为 `{}`），不能承载业务语义 | 工具返回值是可靠的、有类型的、可审计的 |

**横幅文案示例**（不吓人、但要说清）：

> ⛔ 该 Agent 请求执行 `Bash: rm -rf build/`，已被自动拒绝。openOutcry 只通过 MCP 工具授予操作权限。

**订单票据卡片**必须包含：标的、方向、数量、价格、预计成本、费用、风控校验结果、倒计时、三个按钮。倒计时归零 → 自动拒绝并写入 `tool_call` 结果。

---

## 7. 前后端契约

### 7.1 传输

WebSocket，`/ws/runs/:runId`。消息带 `seq`（对齐后端 `agent_event.seq`），断线重连用 `since=seq` 续传。

### 7.2 消息

```ts
// 服务端 → 客户端
{ t: 'snapshot',  sessionId, parts: SessionPart[], seq }        // 首次连接 / 重连兜底
{ t: 'part.delta', sessionId, partId, field: 'text', text }     // 流式增量
{ t: 'part.upsert', sessionId, part: SessionPart, seq }         // 整块新增或替换
{ t: 'part.finalize', sessionId, partId }                       // 定型，不再变更
{ t: 'turn.end',  sessionId, stopReason }
{ t: 'session.state', sessionId, status, errorCode? }
{ t: 'run.clock', runId, simulatedDate, simulatedTime, tradingDay }

// 客户端 → 服务端
{ t: 'prompt',  sessionId, text }
{ t: 'cancel',  sessionId }
{ t: 'approve', sessionId, toolCallId, decision: 'approve'|'modify'|'reject', patch? }
{ t: 'reconnect', since: number }
```

### 7.3 三条规则

1. **增量优先，快照兜底**。`part.delta` 走流式，但每 N 秒或每 turn 结束发一次 `snapshot` 校验，防漂移。
2. **`part.finalize` 之后不再接受该 part 的 delta**。迟到的 delta 直接丢弃（agent 会重复发）。
3. **重连必须去重**。按 `(partId, seq)` 幂等 upsert；`seq` 倒退的消息丢弃。

---

## 8. 关键交互细节（都是踩过的坑）

| 坑 | 表现 | 做法 |
|---|---|---|
| 流式逐字渲染导致滚动抖动 | 每来一个 token 就 `scrollToBottom`，用户往上翻会被拽回 | 只在「用户已在底部」（sticky bottom，阈值 40px）时才自动滚；并做文本节奏化（抄 opencode `paced-text-machine`） |
| 大输出卡死 | 一个 `terminal` 返回 5000 行 | 超过 200 行折叠 + 虚拟滚动；`ansi` 解析放到 worker |
| 断线重连重复渲染 | 同一个 tool 出现两次 | 按 `toolCallId` upsert，不按到达顺序 append |
| 长会话首屏慢 | 上千个 part | 只渲染最近 50 个 + 向上「加载更早」；虚拟列表 |
| 中文/英文混排 | agent 的 `title` 是英文，我们的卡片是中文 | 不翻译 agent 文本（原样显示，它是证据），我们自己的 MCP 工具用中文 |
| 取消后残留「进行中」 | 用户点了取消，卡片还转圈 | `session.state` 变化时把所有 `in_progress` part 置为 `failed` 并标 `cancelled` |
| 审批卡片被刷走 | 用户滚动时错过订单确认 | 待审批时页面顶部固定一条「1 个待审批」跳转条 + 浏览器标题闪烁 |

---

## 9. 里程碑与工作量

| 里程碑 | 内容 | 估时 |
|---|---|---|
| F1 骨架 | Part 模型 + WS 协议 + 会话流渲染（text/thought/error） | 4d |
| F2 工具卡片 | kind → 组件 10 个 + 兜底 + 折叠状态机 + 状态标题 | 6d |
| F3 接入台 | 卡片列表 + 探测分步进度 + 错误码文案 + 凭证状态 | 4d |
| F4 审批 | 订单票据卡片 + 三按钮 + 倒计时 + 协议权限横幅 | 3d |
| F5 观察台 | 模拟时钟 + 交易日分隔 + 播放控制 + 侧栏 | 4d |
| F6 硬化 | 虚拟滚动 + 重连去重 + 导出 transcript + 降级 | 3d |
| | **合计** | **24d** |

---

## 10. 验收标准

1. 接入台：8 个 agent 的三种状态（可用/受限/不可用）都能正确展示，错误码带可复制的修复命令。
2. 会话台：一个含 10+ 工具调用的 turn，用户能在**不展开任何卡片**的情况下看懂「它在干什么」。
3. 会话台：`trade.submit_order` 卡片默认展开、带倒计时、三按钮可用，超时自动拒绝。
4. 协议级权限请求 100% 自动拒绝，且横幅可见。
5. 断线 30 秒后重连，会话流无重复、无缺失、滚动位置保持。
6. 观察台：任意交易日可跳转，跨日分隔条可见。
7. 整段会话可导出为自包含 HTML（评测材料）。

---

## 11. 不做什么

| 不做 | 理由 |
|---|---|
| 按工具名穷举渲染器 | 44 个 agent 不可维护，这是与 opencode/claudecodeui 的核心分歧 |
| 翻译 agent 输出的自然语言 | 它是证据，改写即失真 |
| 在浏览器里做 PTY / 终端镜像 | 拿不到结构化 `tool_call`，因果链会断（A-6 失效） |
| 富文本/自定义渲染协议 | agent 输出就是 markdown + 结构块，不需要新协议 |
| 移动端适配（MVP） | 观察台是桌面场景；会话台先保证 1280px 以上 |
