# openOutcry 外部 Coding Agent 接入方案调研

> 调研日期：2026-11-06 ｜ 方法：本地 clone 源码精读（ACP schema / cc-connect / claude-agent-sdk-python / claudecodeui / opencode）+ ACP Registry 实测数据
> 结论先行：**不要再自研 per-agent 适配器，把 openOutcry 做成一个 ACP Client，再把自己的能力做成 MCP Server。**

---

## 0. 一句话结论

我们要的“把 coding agent 转接到自己的界面并驱动它做交易决策”，在 2026 年已经是被标准化掉的问题：

- **控制面用 ACP（Agent Client Protocol）**：我们是 Client，agent 是 Agent，走 stdio JSON-RPC。项目方自己负责把 Claude Code / Codex / Gemini CLI / OpenCode / Cursor / Copilot / Goose / Kimi 包装成 ACP agent。
- **能力面用 MCP（Model Context Protocol）**：我们把“时点受控行情/研报检索 + 下单/空仓动作”做成 MCP Server，在 `session/new` 时注入给 agent。
- **交易动作 = MCP 工具调用**，不是解析 agent 输出的文本 JSON。

这样，A-2（格式准入）、A-4（时点受控网关）、A-5（人机审批）三件事会塌缩成同一套机制，代码量比自研适配器少一个数量级。

---

## 1. 证据：ACP 已经是事实标准

ACP 规范仓库已迁至 `agentclientprotocol/agent-client-protocol`（4.6k★，2025-06 创建，2026-11-04 仍在提交；旧地址 `zed-industries/agent-client-protocol` 已 301 重定向）。它维护着一个 Agent Registry：

```bash
curl https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json   # 实测 44 个 agent / 64KB
```

其中我们关心的几个，**官方发布物本身就带 ACP 启动参数**（实测 registry 字段）：

| Agent | 启动方式 | 说明 |
|---|---|---|
| Claude Code | `npx @agentclientprotocol/claude-agent-acp@0.100.0` | 官方 ACP wrapper |
| Codex | `npx @agentclientprotocol/codex-acp@2.5.0` | 官方 ACP adapter |
| Google Antigravity | `./agy_acp_server.par`（发布物托管在 `dl.google.com/agy-extensions/`） | Google 侧现役主力（`agy` CLI） |
| Gemini CLI | `npx @google/gemini-cli@0.67.0 --acp` | 原生支持，但 2026-06-18 起对消费者档停止服务，仅作兼容项 |
| GitHub Copilot | `npx @github/copilot@1.0.105 --acp` | 原生支持 |
| OpenCode | `opencode acp` | 原生支持 |
| Cursor | `./dist-package/cursor-agent acp` | 原生支持 |
| Goose | `./goose acp` | 原生支持 |
| Kimi CLI | `./kimi acp` | 原生支持 |

也就是说：**新增一个外部 agent 支持 = 配一行 command + args**，与我们写多少代码无关。

### 1.1 三种适配器来源（成熟度差异很大，必须分级）

| 来源 | 含义 | 例子 | 可信度 |
|---|---|---|---|
| **厂商原生** | 发布物自带 `acp` 子命令 | OpenCode / Goose / Kimi / Cursor / Copilot | 高 |
| **组织维护 wrapper** | ACP 组织用厂商**官方 SDK** 包一层 | `claude-agent-acp`（包 Anthropic 官方 Claude Agent SDK）、`codex-acp` | 中高（版本可能滞后于 CLI 本体） |
| **社区 bridge** | 个人/第三方把厂商的私有流翻译成 ACP | `sibbl/google-antigravity-acp`（把 `agy` 的 NDJSON headless 流转成 ACP） | 中（无 SLA） |

> **校准案例（2026-11）**：Google 于 2026-06-18 对消费者档停用 Gemini CLI，主力换成 Antigravity（`agy` CLI）。仓库仍活跃（108k★，当天仍在提交），企业/API key 仍可用。
> 这件事有两面：① **它证明了 ACP 的价值**——换掉整个 agent，客户端只改一行配置；② **它证明了不能押注单一 agent**——所以 A-2 必须有运行时准入探测，而不是靠"文档说支持"。

---

## 2. 横向对比：三条技术路线，选 A

| 路线 | 代表项目 | 做法 | 结构化程度 | 结论 |
|---|---|---|---|---|
| **A. ACP 客户端** | Zed、cc-connect 的 `agent/acp`、OpenCode、Goose | 子进程 + stdio JSON-RPC，事件与权限走协议字段 | ★★★★★ | **选它** |
| B. 各 CLI 私有 stream-json | cc-connect 的 `agent/claudecode`、`agent/codex`、`agent/qoder` 等 12 个适配器 | 每个 agent 一套参数与解析器 | ★★★ | 只作为 fallback |
| C. 终端镜像（PTY） | `siteboon/claudecodeui`（CloudCLI：express + ws + node-pty）、cc-connect 的 `agent/tmux` | 把终端画面搬到浏览器 | ★ | 聊天可以，审计不行 |

**判断依据（源码级）**：

- cc-connect 同时存在 B 与 A 两代适配器，`agent/acp/agent.go` 的注释直说：`Agent runs an ACP (Agent Client Protocol) agent subprocess over stdio JSON-RPC.`，且它的配置只需 `command` + `args`——ACP 适配器是它的**通用兜底**，per-agent 适配器是历史包袱。
- `claudecodeui` 走的是 PTY 镜像（`node-pty` + `ws` + `claude --resume`），适合“把终端搬到网页”，但**拿不到结构化的 tool_call / 权限请求**，无法满足我们对因果链记录的要求。

---

## 3. ACP 协议要点（我们实际会用到的全部）

对端能力（agent 侧）与方法（来自 `agent-client-protocol-schema/src/v1`）：

| 方法 | 方向 | 用途 |
|---|---|---|
| `initialize` | C→A | 版本与能力协商（`loadSession`、`sessionCapabilities.{list,resume}`） |
| `authenticate` | C→A | 登录（如 `cursor_login`） |
| `session/new` | C→A | 建会话，**参数含 `cwd` 与 `mcpServers`** ← 我们注入 PIT 网关的入口 |
| `session/prompt` | C→A | 推进一个“交易日” |
| `session/update` | A→C（通知） | 流式事件：`tool_call` / `tool_call_update` / `agent_message_chunk` / `usage` / `plan` … |
| `session/request_permission` | A→C | agent 请求授权（**Client 侧实现**） |
| `session/cancel` | C→A（通知） | 中断当前 turn（用于“已下单，提前收工”） |
| `session/load` / `session/resume` | C→A | 恢复历史（能力可选，两个都要兼容） |

`session/new` 的 `mcpServers` 支持四种传输（`agent.rs:3749` 起）：

- `McpServerStdio`（`command` / `args` / `env`）、`McpServerHttp`、`McpServerSse`
- `McpServerAcp`（**unstable**，MCP-over-ACP，走 `mcp/message`，服务端就住在我们的 ACP 连接里，不用起子进程）

客户端能力声明的现实含义（cc-connect 的做法值得照抄）：

```go
// agent/acp/session.go:177 handshake()
"clientCapabilities": { "fs": {"readTextFile": false, "writeTextFile": false}, "terminal": false },
"clientInfo": {"name": "cc-connect", "version": "1.0.0"},
```

即：**声明我不提供文件/终端能力，agent 自己做它自己的 IO**，我们只做编排与记录。

---

## 4. 核心设计：Action-as-Tool（动作即工具）

这是整个接入方案里唯一真正需要我们自己想清楚的地方。coding agent 的输出是「一段话」，我们的训练场要的是「一笔合法订单」。

**错误做法**：让它输出 JSON，然后我们正则/JSON 解析，失败就发 repair prompt 重试。
（cc-connect 的 B 路适配器就是这么干的，所以它有大量格式兜底代码。）

**正确做法**：把动作做成 MCP 工具，**结构由工具 Schema 保证，执行发生在我们进程里**。

我们提供的 MCP Server（`openoutcry-gateway`）工具面：

| 工具 | 作用 |
|---|---|
| `market.get_observation()` | 返回当前模拟时点可见的行情摘要 |
| `market.get_bars(ticker, window)` | 时点截断后的日线 |
| `research.search_evidence(query)` / `research.read_evidence(id)` | 冻结语料检索，返回带 `evidence_id` 的片段 |
| `research.get_financials(ticker, period)` | 截至模拟日**已披露**的财报（PIT） |
| `account.get_portfolio()` | 现金 / 持仓 / 可用（T+1 冻结） |
| `run.get_budget()` | 剩余调用次数 / token / 金额预算 |
| `trade.submit_order(...)` | **终局动作**，返回 `accepted / rejected(reason) / filled(price, qty)` |
| `trade.hold(reason)` | 终局动作 |
| `trade.cancel(order_id)` | 撤单 |

这一招同时解决四件事：

1. **A-2 格式准入**：参数不合法时 MCP 层直接报错，模型自己会在 turn 内重试，不需要我们写 repair 循环；我们能拿到的 `rawInput` 已经是合法结构。
2. **A-4 时点隔离**：`run_id` 与 `simulated_time` 在 `session/new` 时绑进 session，工具 handler 在服务端强制过滤，agent 拿不到未来数据。
3. **A-5 人机审批**：`trade.submit_order` 的 handler 可以**阻塞**等待前端审批结果，再把 `approved / modified(qty=500) / rejected` 作为工具返回值回给 agent——agent 自然地在它的 loop 里接受修正，无需额外协议。
4. **A-6 因果链**：每一次工具调用（含 research）本身就是一条带 `toolCallId` 的轨迹记录，直接入库即可回放。

> 反过来说：`session/request_permission` **不要**用来实现下单审批。它是 agent 自己的工具授权通道，语义与选项（`allow_once` / `reject_once` …）由 agent 决定，跨 agent 不一致，且已有实现缺陷（见 §7）。

---

## 5. 交易循环如何映射到 ACP

```
session/new(cwd=run_workspace, mcpServers=[http://gw/mcp?run=..&t=..])   ← 一次运行建一次
  └─ 每个交易日:
      session/prompt(当日观察: 日期/行情摘要/持仓/预算/可用工具)
        └─ agent 内部 loop: 调用 market.* / research.* 若干次（全部记入轨迹）
        └─ 终局: trade.submit_order / trade.hold ──→ 我们执行：规则校验 → ∪人工审批 → 撮合 → 记账
      （收到终局动作后可选 session/cancel 截断尾巴，省 token）
      ledger.settle(day) → 事件流推 WebSocket → 次日
  └─ session/close
```

**会话粒度（实测踩坑点）**：一次 run 用**一个** ACP session 有利于保留 agent 记忆（它记得自己昨天的判断），但 60 个交易日的对话会持续膨胀；cc-connect issue #492 记录过“会话被强制重启导致上下文漂移”。
建议：**按 run 建 session，按天落 `sessionId` 与 checkpoint**，超过 N 天或 token 阈值后主动 `session/new` 并在系统提示里补一份“持仓与近期决策摘要”。我们不依赖 agent 的记忆正确性，账本才是真值。

**多角色团队（A-3）**：不要在 agent 内部用它自己的 subagent 做“分析师团队”——那部分对我们不可见、不可版本化、不可比较。
正确姿势：**团队是 openOutcry 里的 DAG，每个节点是一次独立的 ACP session**（同一份 PIT MCP gateway，不同 role prompt / 模型 / 工具白名单）。节点的输入输出（结构化结论）由我们的 orchestrator 传递，于是“宏观 → 基本面 → 技术 → 风控 → 交易员”每一步都可独立复现与单变量对比。

---

## 6. 三种接入档位（决定代码量）

| 档位 | 适用 | 实现 | 代码量 |
|---|---|---|---|
| **T1 ACP 外部 agent**（主力） | 用户自带 Claude Code / Codex / Gemini / Cursor / OpenCode 等 | `pip install agent-client-protocol`，`connect_to_agent(client, proc.stdin, proc.stdout)`，`conn.new_session(mcp_servers=[...], cwd=...)` | 一个适配器 ≈ 200–300 行 + 每个 agent 一行启动配置 |
| **T2 平台内置模板 agent** | 开箱即用的默认“多角色团队” | `claude-agent-sdk-python`：`ClaudeSDKClient` + `create_sdk_mcp_server()`（**进程内 MCP，无子进程 IPC**）+ `can_use_tool` 回调 + `interrupt()` + `resume` | 直接复用官方 SDK |
| **T3 远程/私有 bot**（兜底） | 用户自己的 HTTP 服务 | 我们定义最小 Action API（POST 观察 / 返回动作，SSE 回流），**只允许探索运行** | 自研少量 |

T2 之所以值得单独列，是因为 `create_sdk_mcp_server` 让我们把 PIT 工具**直接注册进同一个 Python 进程**（无 IPC、可直读我们的账本对象），`can_use_tool` 是逐次工具调用的同步拦截点（做预算/审计/审批最省事）。这比给自带 agent 起 MCP 子进程更干净。

---

## 7. 真实世界的坑（来自源码与 issue，直接进我们的设计约束）

| 现象 | 出处 | 我们的对策 |
|---|---|---|
| `RespondPermission` 是空实现，权限回应被静默丢弃 | cc-connect issue #1100（OpenCode 适配器） | 关键流程不建在权限通道上；审批走工具返回值 |
| `request_permission` 的 `rawInput` 恒为 `{}`，真实入参在随后的 `tool_call_update` 里 | cc-connect 源码注释（OpenCode #7370），他们用 10×50ms 轮询兜底 | 我们只信 `tool_call_update` 的累积状态 |
| 恢复历史时把有界事件通道塞满 → 传输读循环死锁 | cc-connect PR #2038 | 读循环绝不阻塞；事件先进内存队列再异步落库 |
| 会话被定时终止 + `--continue` 循环 → 上下文漂移 | cc-connect issue #492 | 会话生命周期由 run 掌控，不靠 agent 自带机制 |
| 长会话 send 挂起 → 强杀后 nil panic | cc-connect issue #1181 | 看门狗 + 超时重建 session，状态以账本为准 |
| `session/load` 与 `session/resume` 能力不一致，有的 agent 只实现后者 | cc-connect `handshake()` 源码 | 两个都探测，都没有就 `session/new` + 我们自己的 checkpoint |
| “声明 capabilities 不等于沙箱” | 实测文章（Zed ACP 讨论） | 严格运行必须真的上容器 + 出网白名单 |

---

## 8. 落到我们的模块编号上

| 编号 | 原计划 | 用 ACP 后变成 |
|---|---|---|
| A-1 接入与配置 | 自研三类适配器 | **一个 ACP Client 适配器** + agent 启动配置表（command/args/env/model） |
| A-2 准入校验 | 自研握手/格式检测 | `initialize` 握手 + `session/new` 试跑一天 + 工具 Schema 强约束；严格/探索按“是否在容器内 + 出网是否白名单”判定 |
| A-3 编排引擎 | 自研多 agent 编排 | **我们的 DAG**，节点 = 一次 ACP session；自愈变成“重试该节点”，不解析文本 |
| A-4 受控网关 | 自研工具协议 | **MCP Server**（stdio/http 或 unstable MCP-over-ACP），`session/new` 注入 |
| A-5 人机审批 | 自研挂起/回调 | `trade.submit_order` 工具 handler 内 await 审批；事件流转 WebSocket 给前端 |

---

## 9. 下一步（可选，各 1–2 天）

1. **冒烟验证**：本地跑 `npx @agentclientprotocol/codex-acp` 与 `npx @google/gemini-cli --acp`，用 python-sdk 的 `examples/client.py` 起一个最小 client，确认 `session/new` + `mcpServers` 注入可用。
2. **写最小 gateway**：FastMCP 起一个只含 `trade.hold` 和 `trade.submit_order` 的 MCP server，验证“终局动作 = 工具调用”闭环。
3. **写 PIT 校验中间件**：工具 handler 里强制 `simulated_time` 过滤，跑一次“未来数据必被拒”的回归。
4. **再决定 T2**：是否用 `claude-agent-sdk-python` 做内置模板 agent。
