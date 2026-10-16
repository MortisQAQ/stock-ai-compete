# openOutCry Agent 工作室与外部 Agent 接入设计建议 v0.1

日期：2026-10-16  
状态：设计建议，待产品冻结  
关联规划：[openOutCry 产品详细功能规划](./openOutCry-产品详细功能规划-v0.1.md)

## 1. 结论

openOutCry 不应该把外部 Agent 接入设计成“把消息转发给 Codex 的聊天窗口”，也不应该要求每个 Agent 都嵌入一套完整的交易场前端。

推荐采用：

> **openOutCry 控制台 + Agent Worker + 训练场协议 + 统一事件流**

- **openOutCry 控制台**负责创建实验、配置权限、控制运行、展示市场状态、展示 Agent 行为、处理人工审批和生成报告。
- **Agent Worker**负责运行内置 Agent 或外部 Agent。它可以是本地进程、Docker 容器、远程服务，或 Codex / Kimi / 自研 Agent 的适配器。
- **训练场协议**负责把受控观察发给 Agent，并接收标准动作。外部 Agent 不直接调用交易数据库，不直接修改账户，不决定撮合规则。
- **统一事件流**负责把模型调用、工具调用、研究结果、订单、拒单、审批和错误转换成平台可展示的事件。

MCP 适合承载“Agent 调用训练场工具”，不适合单独承担运行生命周期、实验配置快照、断线恢复和审计。ACP 适合编辑器和编码 Agent 的交互，不应作为 openOutCry 的交易训练协议。Codex 可以作为一个外部 Agent Worker 接入，也可以通过 MCP 使用 openOutCry 的受控研究工具，但两者不能混为一谈。

## 2. 什么叫接入外部 Agent

“接入”不是注册一个聊天模型名称，而是把一个可运行的 Agent 实例纳入训练场的执行边界，并满足四个条件：

1. **能被启动**：平台或用户本地 Runner 能启动它，并获得一个 `agent_session_id`。
2. **能收发标准消息**：能接收观察，返回 `research`、`order`、`hold`、`cancel` 或 `error`。
3. **能被记录**：原始输入、原始输出、工具调用、版本、延迟、错误和费用都能绑定到 `run_id`。
4. **能被约束**：网络、文件、工具、资金、股票池和订单权限都由训练场控制，而不是由 Agent 自报。

因此外部 Agent 的接入状态应分为：

| 状态 | 含义 | 能否进入严格评测 |
|---|---|---|
| 未连接 | 只保存了配置或地址 | 否 |
| 能力已发现 | 已返回 manifest，知道协议和能力 | 否 |
| 沙盒测试通过 | 通过越权、未来数据、无效订单和恢复测试 | 视测试结果 |
| 可控运行 | 平台能限制其数据和工具出口 | 可以 |
| 探索运行 | 平台无法证明完整约束，例如 Agent 自己访问互联网 | 只能进入探索组 |
| 已失效 | 心跳、协议或版本不再满足要求 | 否 |

## 3. 三种接入形态

### 3.1 内置 Agent

openOutCry 自己启动 Agent Worker，配置、提示词、模型、工具和轨迹都由平台直接控制。这是 MVP 的默认路径，体验最好，也最容易进入严格历史评测。

### 3.2 本地外部 Agent

用户在本机启动 Runner，Runner 连接 openOutCry 的本地服务或云端控制台。适合 Codex CLI、Kimi CLI、自研 Python Agent 和需要本地密钥的 Agent。

建议协议：

- 控制面：HTTPS 或本地 loopback API，用于注册、心跳、启动和停止。
- 数据面：HTTPS 流式响应或 WebSocket，用于观察、动作和控制事件。
- 工具面：MCP，用于暴露 `search_evidence`、`read_evidence`、`compare_evidence` 等受控工具。

本地 Agent 的优势是密钥和代码留在用户机器；缺点是平台难以证明它没有绕过工具协议访问互联网。因此默认标记为“本地探索”，只有经过本地 Runner 沙盒和网络出口控制后才进入严格组。

### 3.3 远程外部 Agent

用户填写远程 Agent Endpoint 或选择官方适配器。openOutCry 通过短期令牌和事件回调与其通信。远程 Agent 不获得平台内部凭据，所有市场数据和研究资料都经过平台出口。

远程 Agent 的能力取决于可信级别：

- **平台托管**：Agent 运行在 openOutCry 管理的沙盒中，可以进入严格组。
- **用户托管**：平台能约束协议和数据，但不能证明执行环境，可进入受限比较组。
- **外部服务**：平台只能看到请求和结果，进入探索组，不与严格榜单混排。

## 4. 推荐协议边界

### 4.1 训练场协议

训练场协议是 openOutCry 自己的业务协议，不依赖某一个 Agent 框架。

平台发给 Agent 的 `observation` 至少包括：

- `run_id`、`step_id`、模拟时间和当前阶段；
- 当前市场状态、允许访问的资料和证据 ID；
- 现金、持仓、可卖数量和未完成订单；
- 规则版本、费用、股票池和剩余预算；
- 上一步工具结果、成交或拒单结果。

Agent 返回的 `action` 至少包括：

```json
{
  "type": "order",
  "symbol": "600519.SH",
  "side": "buy",
  "quantity": 100,
  "order_type": "next_open_limit",
  "reason": {
    "summary": "盈利预期改善且估值回落",
    "evidence_ids": ["ev_018", "ev_024"],
    "confidence": 0.68
  }
}
```

### 4.2 事件协议

前端不应直接解析每个 Agent 的私有日志。平台统一生成版本化事件：

```text
run.started
agent.connected
agent.observation_sent
agent.output_received
tool.requested
tool.approval_required
tool.completed
order.proposed
order.rejected
order.filled
human.intervened
run.paused
run.completed
run.failed
```

每个事件有 `event_id`、`run_id`、递增 `seq`、`timestamp`、`actor`、`visibility` 和 `payload`。前端通过 SSE 订阅，断线后用 `run_id + seq` 补事件；大文本、原始输出、截图和终端日志存为 artifact，不塞入事件本身。

### 4.3 MCP 的位置

openOutCry 暴露一个 MCP Gateway，但它只暴露当前实验允许的工具：

- `search_evidence`
- `read_evidence`
- `compare_evidence`
- `get_market_state`
- `get_account_state`
- `propose_order`

其中 `propose_order` 只产生订单意图，不能直接成交。订单必须回到训练场规则引擎，经过 T+1、涨跌停、现金、数量单位和费用检查后，才可能生成成交或拒单事件。

## 5. 前端信息架构

### 5.1 Agent 工作室

工作室不只是一个“提示词编辑器”，建议包含五个步骤：

1. **身份**：名称、类型、来源、版本、作者和可见范围。
2. **连接**：内置、本地 Runner、远程 Endpoint、官方适配器。
3. **能力**：协议版本、支持的动作、是否支持流式事件、是否支持暂停恢复。
4. **权限**：资料模式、工具 allowlist、网络出口、人工审批、代码执行和预算。
5. **预检**：正常订单、越权资料、未来数据、超时、重复请求、异常退出和恢复。

页面右侧固定显示“可评测性”：数据是否受控、工具是否受控、轨迹是否完整、是否允许人工介入，以及当前能进入哪个评测组。

### 5.2 运行页

运行页是主工作界面，而不是外部 Agent 自己的聊天窗口。建议三栏：

- 左栏：运行状态、模拟日期、净值、现金、持仓和工具预算；
- 中栏：按时间顺序展示 Agent 当前在做什么、调用了什么工具、提出了什么订单；
- 右栏：当前事件详情、证据引用、结构化动作、规则校验和人工审批。

“参与 Agent 决策”应采用结构化协作，而不是把用户塞进模型私聊：

- 在订单提交前显示 `approve / modify / reject`；
- 用户可向 Agent 追加一个带时间戳的观察或约束；
- 平台同时保存 Agent 原始动作和最终执行动作；
- 报告把运行标记为“自主”“人工确认”或“人机混合”。

### 5.3 外部 Agent 接入页

接入页应该先问“你的 Agent 在哪里运行”，而不是先问“你使用哪个模型”：

- **本机启动**：生成一次性命令和 Runner Token，提供连接状态与日志；
- **平台托管**：上传镜像、选择启动命令、配置资源和网络策略；
- **远程服务**：填写 Endpoint、回调地址、认证方式和协议版本；
- **官方适配器**：选择 Codex、Kimi 或其他适配器，逐项完成能力测试。

连接成功后展示一张能力卡：协议版本、动作能力、工具能力、沙盒状态、最后心跳、轨迹覆盖率和评测资格。

## 6. Codex 应该怎么接

Codex 不应该被设计成“openOutCry 前端把每条消息转发给 Codex，再把回答转回来”。这种方式会把平台退化成聊天代理，难以保证时点、预算、订单格式和轨迹完整性。

推荐两种模式：

### 模式 A：Codex 作为外部 Agent Worker

用户在本地启动 `openoutcry-runner`，Runner 启动 Codex CLI 或 Codex App Server，并把训练场 `observation` 转换成 Codex 能理解的任务输入。Codex 通过 MCP 使用受控研究工具，最终由 Runner 解析成标准 `action`。

适用：用户想保留自己的 Codex 配置、项目文件和模型凭据。

限制：默认只能进探索组，除非 Runner 同时控制网络、文件和工具出口。

### 模式 B：Codex 适配器作为平台托管 Worker

平台在沙盒内启动 Codex 适配器，向它注入当前实验的短期凭据和 MCP Gateway 地址，所有事件由平台统一采集。

适用：平台演示、固定版本实验和严格对照。

限制：需要明确 Codex 版本、模型版本、权限边界和用户授权，不应把用户的长期密钥写入轨迹。

## 7. MVP 建议

首版只做三条路径：

1. 内置 Agent：平台托管，完整进入严格历史评测。
2. 本地自定义 Agent：提供 Python/TypeScript SDK 和本地 Runner，使用训练场协议运行。
3. 一个 Codex 适配器：先支持“研究 + 标准动作 + 轨迹回传”，不承诺完整 Codex 工作区复刻。

暂缓：任意远程 Agent 即插即用、ACP 全量兼容、Agent 间自由对话、把模型隐藏思维直接展示给用户，以及把外部 Agent 的聊天界面嵌入为主界面。

验收重点：

- Agent 断线后能继续或明确失败；
- 每个工具调用和订单都有可追溯事件；
- 未来数据请求不会泄漏资料存在性；
- 人工修改后能区分原始动作和最终动作；
- 同一实验能回放，不需要重新调用外部 Agent；
- 外部 Agent 无法直接成交，只能提出标准动作。

## 8. 公开资料依据

- [Model Context Protocol 架构](https://modelcontextprotocol.io/docs/learn/architecture)：MCP 的 Host、Client、Server 和传输层边界。
- [Model Context Protocol Server Concepts](https://modelcontextprotocol.io/docs/learn/server-concepts)：工具、资源和 Prompt 的能力模型。
- [OpenAI Agents SDK Tools](https://openai.github.io/openai-agents-js/guides/tools/)：函数工具、MCP 工具、Agent-as-tool 和审批能力。
- [OpenAI Agents SDK Streaming](https://openai.github.io/openai-agents-python/streaming/)：流式事件与运行完成信号的区别。
- [Agent Client Protocol Introduction](https://agentclientprotocol.com/get-started/introduction)：ACP 面向编辑器与编码 Agent 的协议定位。
- [OpenAI Plugins：Package your plugin](https://developers.openai.com/plugins/build/plugins)：Skills、MCP Server 和 App 的打包边界。
- [LangGraph Streaming](https://docs.langchain.com/oss/python/langgraph/streaming)：状态更新、节点输出和自定义事件流。
- [LangGraph Durable Execution](https://docs.langchain.com/oss/python/langgraph/durable-execution)：暂停、恢复和持久化执行。

## 9. 会话控制台与 Skill 接入

根据最新产品决策，Web 端不是普通聊天代理，而是“一会话一运行”的训练场控制台。用户在 Agent 工作室选择模板和实验参数，在会话控制台中与当前 Agent 交互并观察结构化事件。

### 9.1 一会话一运行

每个 Web 会话绑定一个 `agent_session_id` 和一个 `run_id`。会话负责消息上下文、当前 Agent 和连接状态；运行负责实验配置快照、模拟时钟、账户、工具调用、订单和评测结果。运行开始后，聊天不能静默修改数据集、规则、股票池、资金或预算；需要变更时生成新的实验版本。

### 9.2 两种输入模式

- 普通输入：作为带时间戳的追加指导写入轨迹，默认保持“事件流 + 审批”模式。
- `/goal <目标>`：创建或确认一个运行目标，锁定当前实验配置并进入自动运行到底模式。页面显示“仅追加指导”，不提供普通订单批准按钮；越权、协议错误、预算耗尽、断线和高风险策略节点仍可暂停运行。

Goal 不是让 Agent 自行修改实验参数。股票池、资金、时间窗口、数据集、规则、预算和评测模式必须通过表单或模板确认。

### 9.3 Skill、Runner 与 MCP 的协作

首版对外接入入口是 openOutCry Skill。Skill 负责指导外部 Agent：

1. 发现本机或远程的 openOutCry Runner；
2. 建立本地自动授权的 Agent Session；
3. 读取当前实验的受控观察；
4. 通过 MCP 发现可用研究工具；
5. 返回训练场协议定义的标准动作；
6. 把状态、工具调用和结果作为事件回传。

一键 Runner 同时提供本地 Web、会话网关和 Agent 进程管理。Agent 进程按会话启动，运行结束后销毁；轨迹、报告和 artifact 保留。MCP 只负责工具和资源，不承担会话生命周期、断线恢复或审计。

### 9.4 页面结构

Agent 工作室首页展示 Agent 卡片、来源、Runner 状态、最近会话、版本、能力覆盖和评测资格。配置过程先选 Agent 运行位置，再选实验模板，最后完成权限和预检。

会话控制台采用三栏布局：

- 左栏：当前 Agent、会话状态、运行模式、模拟时钟、净值、账户、预算和暂停/继续/中止；
- 中栏：对话与事件混合时间线，依次显示用户指导、观察、工具调用、证据、动作、审批、规则校验和错误；
- 右栏：选中事件的结构化详情，包括参数摘要、证据 ID、数据截止时间、原始动作、解析动作、规则结果和 artifact。

底部固定输入框显示当前 Agent 名称。普通输入追加指导；输入 `/goal` 显示模式切换确认。聊天是控制和解释入口，事件流是运行事实来源。

### 9.5 失败与恢复

外部 Agent 断线、心跳超时、无效动作、工具越权、资料时点冲突或异常退出时，平台暂停运行并解释原因。用户可以重连、有限重试或中止；不自动切换内置 Agent，不把失败静默计为持有或成功。每次恢复、重试和中止都生成新的事件。

### 9.6 Codex 的产品定位

Codex 作为外部 Agent Worker 或 App Server 适配器接入。openOutCry Web 不复刻 Codex 的 IDE 或终端，而是展示统一的会话消息、结构化事件、研究工具、证据和训练场动作。终端输出、原始模型响应和文件产物按需展开，不作为主界面。
