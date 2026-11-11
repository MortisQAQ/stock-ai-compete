# A-1 外部 Agent 接入 · 开发文档

| 项 | 内容 |
|---|---|
| 模块 | A-1 Agent 接入与配置服务 |
| 版本 | v1.0（MVP） |
| 状态 | 待评审 |
| 上游文档 | `openOutcry-产品设计与功能-MVP.md`、`openOutcry-后端功能规划与调研清单.md` |
| 调研依据 | `openOutcry-外部Agent接入方案调研-2026-11-06.md` |
| 姊妹文档 | **`openOutcry-A1-前端交互设计-会话界面.md`**（接入台 / 会话台 / 运行观察台） |
| 参考实现 | `chenhg5/cc-connect` 的 `agent/acp/*`、`core/interfaces.go`；`agentclientprotocol/python-sdk`；前端部分见姊妹文档 |

---

## 1. 需求背景

### 1.1 产品对 A-1 的要求

openOutcry 的核心循环是「接入 Agent → 配置启动训练场 → 观察运行与交易 → 查看结果与决策依据 → 调整后重跑」。
这条循环的起点是：**用户要能把自己手里的 coding agent 接进来跑一个交易周期**。

拆成可验收的三条：

1. **多来源接入**：用户自带的 Claude Code / Codex / OpenCode / Cursor / Copilot / Antigravity 等，都能接；不要求用户改 agent 代码。
2. **配置即快照**：一个 Agent 的运行配置（模型、提示词、角色、工具白名单、参数）必须版本化且不可变——否则「改一个变量重跑」这件事不成立。
3. **可观测**：接入之后，用户在界面上能实时看到 agent 在想什么、调了什么工具、下了什么单；接入失败要给出**可行动的错误**，而不是静默。

### 1.2 为什么这件事不简单

| 难点 | 具体表现 |
|---|---|
| 形态异构 | 有的是 CLI 子进程，有的是 HTTP 服务，有的只能开终端交互 |
| 协议私有 | 每家一套流式输出格式，参数不同、事件不同、权限模型不同 |
| 生命周期不可控 | 长会话会挂起、会被强杀、上下文会漂移 |
| 供应商漂移 | 2026-06-18 Google 对消费者档停用 Gemini CLI，主力换成 Antigravity；押注单一 agent 会死 |

历史教训（来自 cc-connect 源码与 issue）：它维护了 **16 个 agent 适配器**（`acp`、`claudecode`、`codex`、`qoder`、`gemini`…），每个都是独立维护负担，并持续产生
`#1100`（权限回应被静默丢弃）、`#492`（会话被强制重启导致上下文漂移）、`#1181`（长会话挂起后强杀 panic）、`#2038`（重放塞满事件通道导致读循环死锁）这类**只在单个适配器里出现**的 bug。

**A-1 的设计目标因此不是「写一个适配器」，而是「让适配器数量恒为 1」。**

### 1.3 目标与非目标

| | 内容 |
|---|---|
| **目标** | 用**一个** ACP 客户端适配器覆盖全部外部 agent；新增 agent = 一行配置；配置版本化；接入可探测、可诊断 |
| **非目标** | 不做 agent 内部编排（属 A-3）；不做工具实现（属 A-4）；不做审批 UI（属 A-5）；不追求与 agent 私有高级能力（subagent/hooks/plan mode）逐一对齐 |

---

## 2. 技术选型

### 2.1 结论

> **A-1 采用 ACP（Agent Client Protocol）作为唯一的控制面协议：openOutcry 后端实现 ACP Client，外部 agent 实现 ACP Agent，二者通过子进程 stdio 上的 JSON-RPC 2.0 通信。**
> 能力面（行情/研报/下单）通过 MCP 注入，见 A-4；本文只约定注入接口。

依赖：

```toml
[project.dependencies]
agent-client-protocol = "^0.4"   # 官方 Python SDK：Pydantic 模型 + JSON-RPC 传输 + Client/Agent 基类
mcp                   = "^1.0"   # 工具面（A-4 使用，A-1 仅注入配置）
```

### 2.2 选型依据（三条硬证据）

**① 覆盖面**：ACP Registry 实测 44 个 agent，头部 9 个里 6 个厂商原生支持 ACP 子命令，2 个由 ACP 组织用厂商官方 SDK 包装，1 个（Antigravity）由 Google 托管发布物。

| Agent | 启动命令 | 来源 |
|---|---|---|
| Claude Code | `npx @agentclientprotocol/claude-agent-acp@0.100.0` | wrapper（内部用 Anthropic 官方 Claude Agent SDK） |
| Codex | `npx @agentclientprotocol/codex-acp@2.5.0` | wrapper |
| Google Antigravity | `./agy_acp_server.par`（`dl.google.com/agy-extensions/`） | 厂商托管 |
| GitHub Copilot | `npx @github/copilot@1.0.105 --acp` | 原生 |
| OpenCode | `opencode acp` | 原生 |
| Cursor | `cursor-agent acp` | 原生 |
| Goose | `goose acp` | 原生 |
| Kimi CLI | `kimi acp` | 原生 |
| Gemini CLI | `npx @google/gemini-cli@0.67.0 --acp` | 原生（消费者档已停服，仅作兼容项） |

**② 抽象已被验证**：cc-connect 的 `core.AgentSession` 接口形状（`Send` / `RespondPermission` / `Events` / `Close`）与 ACP 一一对应，`agent/acp` 的构造参数只有 `command` / `args` / `env` / `auth_method` / `mode`——**说明「一个适配器覆盖多 agent」在工程上成立**。

**③ 供应商漂移已被实测**：Gemini CLI → Antigravity 换掉整个 agent，ACP 客户端侧只改一行配置。这是「押注协议而非押注 agent」的直接收益。

### 2.3 备选方案与否决理由

| 方案 | 做法 | 否决理由 |
|---|---|---|
| B. 厂商官方 SDK 直连 | 每家接自己的 SDK（Claude Agent SDK / Codex app-server / OpenCode serve） | 覆盖 1 家要写 1 套；且这正是 ACP wrapper 内部在做的事，我们没必要重做。**保留为内置模板 agent 的实现方式**（见 2.5） |
| C. 自写 CLI 适配器 | 解析各家 stream-json，或 PTY 镜像 | 每个 agent 一个解析器 + 一个 bug 源；PTY 镜像拿不到 `tool_call` 结构，因果链会断（A-6 直接失效） |
| D. 自定义统一协议 | 我们定一套 HTTP Action API，要求 agent 适配 | 要求 agent 侧改造，与「用户自带 agent」冲突；仅保留为 T3 兜底（私有 bot，只允许探索运行） |

### 2.4 选型的代价（必须承认的三点）

1. **适配器 ≠ 厂商背书**：`claude-agent-acp` / `codex-acp` 是 ACP 组织维护的包，版本可能滞后于 CLI 本体。→ 对策：**运行时准入探测**（§4.4），不靠文档判断可用性。
2. **语义损耗**：subagent 转录、hooks、plan mode、checkpoint 经 wrapper 会丢或变形。→ 对策：我们的关键动作是 MCP 工具调用，**不依赖**这些能力。
3. **协议仍在演进**：`mcp/message`（MCP-over-ACP）目前标记 unstable。→ 对策：只用 stable 方法；MCP 走 HTTP 传输，不依赖 unstable。

### 2.5 分层收敛（本模块的最终形态）

| 档 | 用途 | 实现 | 本模块是否实现 |
|---|---|---|---|
| **T1 ACP 外部 agent** | 用户自带 agent | 本文的 `AcpAgentAdapter` | ✅ 是（唯一实现） |
| **T2 内置模板 agent** | 开箱即用默认团队 | `claude-agent-sdk-python`（进程内 MCP + `can_use_tool`） | ⬜ 否（A-3 阶段，复用同一 `AgentAdapter` 接口） |
| **T3 私有远程 bot** | 用户自研服务 | 自定义 Action API | ⬜ 否（仅探索运行） |

接口必须让 T2 可插拔——这是 `AgentAdapter` 存在的唯一理由。

---

## 3. 架构设计

### 3.1 分层（依赖方向单向）

```
arena/ (A-3 runner)          gateway/ (A-4 MCP server)
        │                            ▲
        ▼                            │ mcpServers 注入
   core/ports.py  ◄──────────────►  agents/acp/
   （领域接口，零依赖）              （唯一的外部 agent 实现）
                                        │
                                        ▼ stdio JSON-RPC
                                 外部 agent 子进程
```

规则（照抄 cc-connect 的 `core/` 纪律）：

- `core/` 只依赖标准库与领域模型，**不得** import `agents/`。
- `agents/acp/` 只依赖 `core/`，不得 import `arena/`。
- 新增 agent **不新增包**，只在 `agents/acp/registry/*.yaml` 加一条。

### 3.2 包结构

```
backend/app/
  core/
    ports.py          # AgentAdapter / AgentSession / AgentEvent 协议
    errors.py         # 失败态枚举与异常层次
    models.py         # AgentDefinition / LaunchSpec / ProbeReport
  agents/
    registry.py       # 从 YAML 加载 agent 定义，含 provenance
    registry/
      claude.yaml  codex.yaml  opencode.yaml  cursor.yaml
      copilot.yaml goose.yaml  kimi.yaml      antigravity.yaml
    acp/
      adapter.py      # AcpAgentAdapter：探测 + 建会话
      session.py      # AcpSession：握手 / prompt / 事件 / 权限 / 关闭
      transport.py    # 子进程 + JSON-RPC 收发（可注入 fake 用于测试）
      mapping.py      # session/update → AgentEvent（领域事件）
      launch.py       # 启动规格解析、二进制定位、环境变量合并
      watchdog.py     # turn 超时、进程存活、僵死重建
```

### 3.3 与相邻模块的边界

| 事项 | 归属 | A-1 的责任 |
|---|---|---|
| agent 进程启动与握手 | A-1 | ✅ 全责 |
| 准入探测报告 | A-2 | 提供 `probe()` 能力，A-2 决定严格/探索判定 |
| 一轮 turn 的推进 | A-3 | 提供 `prompt()` 与事件流，A-3 决定何时推进 |
| MCP 工具实现 | A-4 | 只负责把 `mcpServers` 配置注入 `session/new` |
| 业务审批（下单） | A-5 | **不参与**；审批在 MCP 工具 handler 内完成 |
| 权限请求应答 | A-1 | 默认**一律拒绝**内置工具（见 §5.4） |
| 前端会话界面（Part 模型 / 渲染契约 / 审批卡片） | A-1 前端 | 见姊妹文档《A-1 前端交互设计》；本文只定义它消费的 WS 事件语义 |

### 3.4 工具面边界：只提供我们自己的 MCP 工具

**结论：openOutcry 只实现自己的 MCP 工具；agent 的原生工具（read / write / bash / grep / edit…）由 agent 自己管，我们不实现、不代理、不模拟。**

| 工具类别 | 例子 | 谁实现 | 我们做什么 |
|---|---|---|---|
| **我们的 MCP 工具** | `market.quote`、`market.news`、`research.*`、`trade.submit_order`、`trade.hold`、`trade.cancel`、`account.positions` | A-4（我们的 gateway） | 实现、授权、审计、审批 |
| **agent 原生工具** | `read` / `write` / `bash` / `grep` / `glob` / `edit` | agent 自己 | **只呈现 + 只记录**，见下 |

**两个"不管"不等于"不管"：**

1. **不提供 ≠ 看不见。** ACP 会把 agent 原生工具的 `tool_call` / `tool_call_update` 推给我们。我们必须渲染（前端按 `kind` 分发，见姊妹文档 §5.1）、落库（`tool_call` 表）、进因果链（A-6）。**"agent 自己管工具"说的是实现归属，不是观测归属。**
2. **不管工具 ≠ 不管环境。** 原生工具的能力边界由环境决定，环境是我们的责任：

| 环境杠杆 | 做法 | 目的 |
|---|---|---|
| `clientCapabilities.fs=false, terminal=false` | 不向 agent 提供我们的文件系统与终端服务 | agent 只能用它自己的工具，我们不被穿透 |
| `cwd`（`cwd_policy: readonly_scratch`） | 给一个一次性只读工作目录 | 限制它自己的工具能碰到的范围 |
| 容器 + 出网白名单 | 严格运行模式下只放行 gateway | 防止它用 `bash curl` 绕过时点掩码拿实时行情 |
| `request_permission` 一律拒绝 | 见 §5.4 | 阻断它申请额外能力 |

**这条边界对上游的两个影响：**

- **A-4 的工具清单可以缩到「只有我们自己的工具」**，不需要为每个 agent 复刻一套文件/终端工具。
- **前端的第一级渲染必须按 ACP `kind` 分发**（而不是按工具名）。如果工具全是我们自己的，按 name 分发就够了；正因为 agent 自带不可穷举的工具名，才必须按 `kind` 兜底。

**唯一需要决策的例外**：是否给 agent 一个**受控落盘通道**（如 MCP 工具 `workspace.note`，写进 run 目录）。给：它的笔记可审计、可回放；不给：它会用 `bash` 自己写，我们既看不见也不可控。**建议给**，且只给"写"，不给"读任意路径"。

---

## 4. 开发方案

### 4.1 领域接口

```python
# core/ports.py
from typing import AsyncIterator, Protocol, Literal

class AgentAdapter(Protocol):
    async def probe(self, definition: AgentDefinition) -> ProbeReport: ...
    async def open(self, spec: RunSpec) -> "AgentSession": ...

class AgentSession(Protocol):
    @property
    def acp_session_id(self) -> str: ...
    async def prompt(self, content: PromptContent) -> None: ...
    def events(self) -> AsyncIterator[AgentEvent]: ...
    async def cancel(self) -> None: ...
    async def close(self, reason: str = "normal") -> None: ...

class AgentEvent(Protocol):
    seq: int
    ts: datetime
    session_id: str
    type: Literal[
        "message_chunk",   # agent 说话
        "thought_chunk",   # agent 思考
        "tool_call",       # 工具调用开始（name + raw_input）
        "tool_call_update",# 工具调用进展/结果（权威入参）
        "plan",            # 计划更新
        "usage",           # token / 成本
        "mode",            # 权限模式变化
        "turn_end",        # 一轮结束（stop_reason）
    ]
```

**刻意不做的事**：接口里没有 `respond_permission`。
理由：cc-connect `#1100` 已证明权限通道在部分 agent 上不可靠（`RespondPermission` 空实现、`rawInput` 恒为 `{}`），且选项枚举跨 agent 不一致。
我们的业务审批走 MCP 工具返回值（A-5），权限通道只用于**无脑拒绝**内置工具。

### 4.2 启动规格（配置即代码）

```yaml
# agents/registry/codex.yaml
slug: codex
display_name: Codex
vendor: OpenAI
provenance: wrapper            # native | wrapper | vendor-hosted | community
protocol: acp
launch:
  command: npx
  args: ["-y", "@agentclientprotocol/codex-acp@2.5.0"]
  env: { RUST_LOG: "warn" }
  cwd_policy: run_workspace    # run_workspace | readonly_scratch | inherit
auth:
  method: null                 # 如 cursor 的 cursor_login
capabilities:
  expect: ["session/new", "session/prompt"]
  optional: ["session/load", "session/resume", "session/cancel"]
limits:
  handshake_timeout_s: 30
  turn_timeout_s: 600
  max_concurrent_sessions: 4
```

`provenance` 字段是必须的：`native` / `wrapper` / `vendor-hosted` / `community` 四档，前端据此给用户可信度提示（§2.4 代价 1）。

### 4.3 会话建立流程（严格按 cc-connect `handshake()` 的顺序）

```
1. launch.py  定位二进制（shutil.which / npx 可用性）→ 失败 LaunchFailed
2. spawn      子进程，stdin/stdout=PIPE，stderr 独立收集（用于诊断，不进协议）
3. initialize { protocolVersion: 1,
                clientCapabilities: { fs: {readTextFile:false, writeTextFile:false}, terminal:false },
                clientInfo: { name: "openoutcry", version: ... } }
              → 读回 agentCapabilities：loadSession / sessionCapabilities.resume / .list / modes
4. authenticate（仅当 registry 声明了 auth.method）
5. 建会话，按能力优先级：
     session/resume  （若 sessionCapabilities.resume）
   → session/load    （若 loadSession）
   → session/new
   参数：{ cwd, mcpServers: [ gateway 条目 ] }
6. 记录 acp_session_id，状态 ready
```

**三条来自源码的硬约束：**

1. `clientCapabilities.fs=false, terminal=false`（cc-connect `session.go:180-191`）。我们不做 agent 的文件系统与终端，agent 自己处理自己的 IO。
2. **resume 优先，且不得降级**：cc-connect `session.go:222-231` 注释明确写着「A server advertising neither is simply started fresh. Resuming by a new session id would silently drop the conversation, so this must not degrade to `session/new` while a resume capability is still on the table.」——我们照抄这个判断顺序。
3. `mcpServers` 在 `session/new` 与 `session/resume` 都要传（两个方法的参数结构一致），否则恢复的会话会丢工具。

### 4.4 准入探测（A-1 提供给 A-2 的能力）

参照 cc-connect `list_sessions.go: probeSpawn / probeInitialize` 的「起一个临时进程问一句就关」模式：

```python
async def probe(definition) -> ProbeReport:
    # 1) 可执行性：二进制存在 / npx 可用
    # 2) initialize：拿到 protocol_version 与 capabilities
    # 3) session/new（不带 MCP）→ prompt("ping") → 等任一 update 或 10s 超时
    # 4) close，杀掉进程
    ...
```

```python
@dataclass
class ProbeReport:
    ok: bool
    protocol_version: int | None
    capabilities: dict[str, bool]     # load / resume / list / cancel
    modes: list[str]                  # 权限模式（plan / acceptEdits / ...）
    latency_ms: int | None
    error: AgentError | None          # 见 §4.6
    probed_at: datetime
```

探测结果落 `probe_report` 表，前端「Agent 接入」页展示为：✅ 可用 / ⚠️ 能力受限（缺 resume）/ ❌ 不可用（附错误码与修复建议）。
**A-2 的严格/探索判定直接消费这个报告**，不再二次探测。

### 4.5 一轮 turn 的推进

```python
await session.prompt(PromptContent(text=observation_digest, attachments=[]))
async for ev in session.events():
    await bus.publish(ev)             # 非阻塞投递，见 §4.7
    if ev.type == "tool_call_update" and ev.tool_name in TERMINAL_TOOLS:
        await session.cancel()        # 已下单/已空仓，截断尾巴省 token
        break
    if ev.type == "turn_end":
        break
```

`TERMINAL_TOOLS = {"trade.submit_order", "trade.hold"}`——终局动作的判定靠**工具名**，不靠解析自然语言。

### 4.6 失败态枚举（前端与 A-3 都要消费）

| 错误码 | 触发 | 用户可见建议 | A-3 处置 |
|---|---|---|---|
| `LAUNCH_FAILED` | 二进制不存在 / npx 失败 | 安装对应 CLI 或检查 PATH | 不重试，标记 run 失败 |
| `HANDSHAKE_FAILED` | `initialize` 超时或协议版本不兼容 | 升级 agent 或换版本 | 重试 1 次 |
| `AUTH_REQUIRED` | 需要 `authenticate` 但未配置 | 先在该 agent CLI 里登录 | 不重试 |
| `SESSION_CREATE_FAILED` | `session/new` 报错 | 看错误详情 | 重试 1 次 |
| `TURN_TIMEOUT` | 单轮超 `turn_timeout_s` | — | cancel → 重试该轮 |
| `TRANSPORT_CLOSED` | 子进程退出 / 管道断开 | — | 重建会话，续跑 |
| `AGENT_CRASHED` | 非零退出且非我们 kill | — | 重建会话，续跑，记 `crash` 事件 |
| `CAPABILITY_MISSING` | registry 的 `expect` 未满足 | 换 agent | 不重试 |

### 4.7 并发、背压与看门狗（三个已知事故的直接对策）

| 事故 | 根因 | 我们的对策 |
|---|---|---|
| cc-connect `#2038`：重放历史塞满有界事件通道，传输读循环阻塞死锁 | 事件消费者与 JSON-RPC 读循环共用一条有界通道 | **读循环只做一件事：把帧放进无界内存队列并立即返回**；队列由独立 task 消费、批量落库。落库失败进本地 WAL 重试，绝不反压到读循环 |
| `#1181`：长会话 `send` 挂起，强杀后 nil panic | 会话状态与进程状态未解耦 | 每个 session 有 `watchdog` task：turn 超时 → `cancel` → 30s 无响应 → `SIGTERM` → 5s 后 `SIGKILL` → 状态置 `AGENT_CRASHED`，由 A-3 重建 |
| `#492`：会话被定时重启导致上下文漂移 | 用外部定时器管会话生命周期 | **会话生命周期由 run 掌控**：一次 run 一个 session；按天持久化 `acp_session_id` + checkpoint；超阈值主动重建并在 prompt 里补「持仓与近期决策摘要」 |

每个 session 三个 task：`reader` / `dispatcher` / `watchdog`。所有共享状态一把锁 + 状态机校验（`ready` 才能 `prompt`）。

### 4.8 安全边界

| 项 | 做法 |
|---|---|
| 能力声明 | `fs=false, terminal=false`——不给 agent 任何「通过我们读写文件」的通道 |
| 内置工具 | 收到 `request_permission` **一律拒绝**（`reject_once`），并用 registry 的 `disallowed_tools` 在启动参数里预先禁掉（如 `--disallowedTools Bash,Edit,Write`，按 agent 支持情况） |
| 严格运行 | agent 进程跑在容器内，**出网白名单只放行 gateway**；容器内无宿主凭证 |
| 凭证 | agent 自己的 API key 由其自身环境变量提供，**不进我们的数据库**；我们只存 `env_keys` 名单用于诊断 |
| 注入 | `mcpServers` 的 URL 带一次性 `run_token`，绑定 `run_id` + `simulated_time`，过期即失效 |

### 4.9 数据模型（PostgreSQL）

```sql
-- 不可变配置快照：改一个变量重跑的基础
CREATE TABLE agent_definition (
  id            UUID PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,        -- codex / claude / opencode ...
  display_name  TEXT NOT NULL,
  vendor        TEXT NOT NULL,
  provenance    TEXT NOT NULL CHECK (provenance IN ('native','wrapper','vendor-hosted','community')),
  launch_spec   JSONB NOT NULL,              -- command/args/env/cwd_policy
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_definition_version (      -- 只追加，永不更新
  id                 UUID PRIMARY KEY,
  definition_id      UUID NOT NULL REFERENCES agent_definition(id),
  version            INT  NOT NULL,
  launch_spec        JSONB NOT NULL,
  system_prompt      TEXT  NOT NULL,
  role               TEXT  NOT NULL,          -- analyst / trader / risk ...
  model              TEXT,
  tool_allowlist     JSONB NOT NULL,
  limits             JSONB NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (definition_id, version)
);

CREATE TABLE probe_report (
  id            UUID PRIMARY KEY,
  definition_id UUID NOT NULL REFERENCES agent_definition(id),
  ok            BOOLEAN NOT NULL,
  report        JSONB   NOT NULL,
  probed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_session (
  id              UUID PRIMARY KEY,
  run_id          UUID NOT NULL,
  version_id      UUID NOT NULL REFERENCES agent_definition_version(id),
  role            TEXT NOT NULL,
  acp_session_id  TEXT,                       -- agent 侧会话 id，用于 resume/回放
  status          TEXT NOT NULL,              -- starting|ready|prompting|closed|failed
  error_code      TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ
);

CREATE TABLE agent_event (                    -- 只追加，因果链原料
  id               BIGSERIAL PRIMARY KEY,
  agent_session_id UUID NOT NULL REFERENCES agent_session(id),
  seq              BIGINT NOT NULL,
  ts               TIMESTAMPTZ NOT NULL,
  type             TEXT NOT NULL,
  payload          JSONB NOT NULL,
  UNIQUE (agent_session_id, seq)
);

CREATE TABLE tool_call (
  id               UUID PRIMARY KEY,
  agent_session_id UUID NOT NULL REFERENCES agent_session(id),
  acp_tool_call_id TEXT NOT NULL,
  name             TEXT NOT NULL,
  raw_input        JSONB,                     -- 以 tool_call_update 的累积值为准
  raw_output       JSONB,
  status           TEXT NOT NULL,             -- pending|completed|failed
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  UNIQUE (agent_session_id, acp_tool_call_id)
);
```

### 4.10 事件映射（`session/update` → `AgentEvent`）

参照 cc-connect `agent/acp/mapping.go` 的 `mapSessionUpdate` 分派：

| ACP `sessionUpdate` 类型 | 映射为 | 备注 |
|---|---|---|
| `agent_message_chunk` | `message_chunk` | 流式文本 |
| `agent_thought_chunk` | `thought_chunk` | 思考过程，前端可折叠 |
| `tool_call` | `tool_call` | 记录 `toolCallId` / `title` / `kind` / `rawInput` |
| `tool_call_update` | `tool_call_update` | **权威入参在这里**（`rawInput` 可能为空） |
| `plan` | `plan` | 计划条目 |
| `usage_update` | `usage` | token / 成本，进预算 |
| `current_mode_update` | `mode` | 权限模式变化 |
| 未知类型 | 原样透传 + `type=unknown` | **不丢帧**，便于新版本兼容 |

`tool_call_update` 的 `rawInput` 处理必须做**累积缓存**：cc-connect `session.go:551 cacheToolCallInput` + `:538 evictToolInputCacheIfNeededLocked` 就是为 OpenCode 的 `rawInput={}` 缺陷准备的（它用 10×50ms 轮询兜底）。我们的做法是**只认 `tool_call_update` 的完整快照**，不做轮询。

### 4.11 观测性

| 指标 | 用途 |
|---|---|
| `acp_session_start_seconds{slug}` | 接入耗时，定位 wrapper 慢启动 |
| `acp_turn_seconds{slug,role}` | 单轮耗时，看 A-3 预算 |
| `acp_events_total{slug,type}` | 事件分布，发现 agent 行为异常 |
| `acp_errors_total{slug,code}` | 按失败态聚合，驱动 registry 修正 |
| `acp_crash_total{slug}` | 崩溃率，provenance 可信度的实测依据 |

日志统一带 `run_id` / `agent_session_id` / `acp_session_id`；**stderr 单独收集**并截断落盘（agent 的日志不是协议内容，不能混进 stdout 解析）。

---

## 5. 关键实现约束（来自源码的清单）

| # | 约束 | 出处 |
|---|---|---|
| 1 | `clientCapabilities` 一律声明不支持 fs/terminal | cc-connect `session.go:180-191` |
| 2 | resume 顺序 `session/resume` → `session/load` → `session/new`，有 resume 能力时不得降级 | `session.go:222-231` |
| 3 | `session/new` 与 `session/resume` 都要传 `mcpServers` | ACP schema `agent.rs` |
| 4 | 权限请求只做拒绝兜底，不做业务审批 | `#1100` + `mapping.go pickPermissionOptionID` |
| 5 | `tool_call_update` 是权威入参 | `session.go:551` |
| 6 | 读循环绝不阻塞，事件异步落库 | `#2038` |
| 7 | 看门狗 + 强制重建，状态以账本为准 | `#1181` |
| 8 | 会话生命周期由 run 掌控，按天落 checkpoint | `#492` |
| 9 | 未知通知类型不丢弃，原样透传 | `mapping.go mapSessionUpdateFallback` |
| 10 | 未知请求方法回 `-32601`，不假装成功 | `session.go onServerRequest` |

---

## 6. 里程碑与工作量

| 里程碑 | 内容 | 产出 | 估时 |
|---|---|---|---|
| M1 冒烟 | 用 python-sdk `examples/client.py` 跑通 `opencode acp` 与 `codex-acp`，验证 `session/new + mcpServers` | 技术验证报告 | 3d |
| M2 适配器 | `transport` / `session` / `mapping` / `adapter` 四件套 + fake agent 契约测试 | 可用的 `AcpAgentAdapter` | 5d |
| M3 配置与探测 | YAML registry（8 个 agent）+ `probe()` + `probe_report` 落库 | 接入页可用 | 3d |
| M4 事件与轨迹 | 事件总线、`agent_event` / `tool_call` 落库、WS 推送 | 界面能看实时轨迹 | 3d |
| M5 硬化 | 看门狗、失败态、指标、崩溃重建、真实 agent 冒烟矩阵 | 可上生产 | 4d |
| | | **合计** | **18d** |

---

## 7. 测试方案

| 层 | 做法 |
|---|---|
| 契约测试 | 用 python-sdk `examples/agent.py` 改造出 `FakeAcpAgent`，覆盖：正常 turn / 中途报错 / 未知通知 / 未知请求 / 慢响应 / 崩溃退出 |
| 映射回归 | 把真实 agent 的 ACP 线帧录成 fixture（JSONL），对 `mapping.py` 做快照测试——换 agent 版本时先跑它 |
| 探测测试 | 用坏配置（不存在的二进制、错误版本、缺 resume）断言 `ProbeReport.error.code` |
| 并发测试 | 50 并发 session + 慢消费者，断言读循环延迟 P99 < 50ms（#2038 回归） |
| 真实冒烟 | nightly：`opencode acp`、`npx @agentclientprotocol/codex-acp`、`npx @agentclientprotocol/claude-agent-acp` 各跑一个最小 turn |

---

## 8. 验收标准

1. 新增一个外部 agent **只需要改 YAML**，不改 Python 代码（评审时用 PR diff 证明）。
2. 8 个头部 agent 中至少 5 个能通过 `probe()` 并完成一个含 MCP 工具调用的完整 turn。
3. 任意 agent 崩溃后，run 能在 60s 内自动重建会话并续跑，且 `agent_event` 不丢帧。
4. 慢消费者场景下读循环无阻塞（#2038 回归测试通过）。
5. 前端能看到：`tool_call` 名称 + 入参 + 结果、思考过程、token 用量、每轮耗时。
6. 所有失败都能落到 §4.6 的 8 个错误码之一，且带用户可行动的建议。

---

## 9. 未决问题

| # | 问题 | 建议 |
|---|---|---|
| 1 | Google 侧是否默认只支持 Antigravity，Gemini CLI 标灰？ | 保留但标灰（成本近零，老用户可能仍用 API key） |
| 2 | `mcpServers` 用 HTTP 还是 stdio？ | **HTTP**：gateway 常驻，按 run 发 token；stdio 需要为每个 session 起进程，且要处理进程生命周期 |
| 3 | 是否要支持 MCP-over-ACP（unstable）？ | 暂不；待 stable 后再评估（可省一次网络往返） |
| 4 | 一次 run 的 session 上限（防上下文膨胀）用什么阈值？ | 先按「token 用量 > 模型窗口 60%」触发重建，M5 用实测数据校准 |
