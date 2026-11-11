# openOutcry × Cordis：万物皆插件的架构设计（前端 + 后端）

> 附录：`openOutcry-Cordis附录A-客户端插件源码研究.md`（浏览器侧逐文件考据）、
> `openOutcry-Cordis附录B-宿主cordis源码研究.md`（Node 侧逐文件考据）。
>
> 依据：本地 DSH 0.2.1-rc.3 解包源码（`D:\J\dsh\resources\app.asar`）、
> 其官方插件开发 skill（`@deepseek-ai/dsh-agent-preset/skills/cordis-plugin-development`）、
> 以及 `D:\dsh-home\profiles\desktop\cordis.yml`（418 行插件行）与 `cordis.patch.yml`。
> 文中标 **[源码确认]** 的是从代码里读到的；标 **[我们的设计]** 的是照其思路为 openOutcry 新定的。

---

## 0. 一句话结论

DSH 的"万物皆插件"不是"插件很多"，而是**四条硬约束**同时成立：

1. **一个容器**：cordis 的 `Context` 是唯一的依赖与生命周期容器，没有任何模块能绕过它拿到别的模块。
2. **一种形状**：每个能力都是一个 npm 包，导出固定形状（`apply(ctx, config)` 或 Service 类），前端再加一个 `./client` 半边。
3. **配置即架构**：`cordis.yml` 是一张 418 行的插件表，装/卸/换实现全部靠改这张表，不改代码。
4. **单一真相**：会话日志（session log）是唯一事实，其余全是它的投影（projection）。

openOutcry 要学到底，就必须把这四条一起搬过来 —— 只搬"插件目录结构"是没用的，
因为真正让 DSH 可扩展的是第 3、4 条：**换实现不用改调用方**、**状态可以从日志重算**。

对我们的映射只有一句话：

> **把"一次训练运行（run）"当作 DSH 的"一个 session"，把 run 的事件日志当作唯一真相，
> 其余（账本、持仓、盈亏、复盘、UI）全部是它的投影。**

---

## 1. DSH 到底怎么做到的（源码证据）

### 1.1 cordis 的四个概念 **[源码确认]**

`@deepseek-ai/cordis/src/` 里就四个文件值得看：`context.ts` / `service.ts` / `fiber.ts` / `registry.ts`。

| 概念 | 是什么 | 对我们的意义 |
|---|---|---|
| `Context` | 依赖容器 + 事件总线 + 服务注册表 | 全局只有一个，任何插件拿到的都是它的子上下文 |
| `Service` | 挂在 `ctx.<name>` 上的能力对象 | `ctx.ledger`、`ctx.clock`、`ctx.market` 都是这么来的 |
| `Fiber` | 一个插件实例的生命周期句柄 | 卸载插件 = dispose 它的 fiber = 它注册的一切自动消失 |
| `inject` | 依赖声明 | 依赖的服务不存在时插件**不启动**，而不是抛异常 |

README 里的最小例子（真实文件）：

```ts
class Counter extends Service {
  value = 0
  constructor(ctx: Context) { super(ctx, 'counter') }
  next() { return ++this.value }
}

const greeter = Object.assign((ctx: Context) => {
  ctx.on('app/ready', (m) => ctx.logger.info('%s #%d', m, ctx.counter.next()))
}, { inject: ['counter'] })

const root = new Context()
await root.plugin(Counter)
await root.plugin(greeter)
await root.fiber.dispose()
```

三个细节决定了它的可扩展性：

- `inject: ['counter']` 让 greeter 在 Counter 就绪前**不运行**，而不是报错。这就是"插件可以随便装，装错了也不会炸"。
- `ctx.on(...)` 注册的监听器**属于这个 fiber**，dispose 时自动摘掉。插件作者不需要写"清理代码"，只需要用 `ctx.effect` / `ctx.on`。
- `root.fiber.dispose()` 一行拆掉整棵树。

### 1.2 一个插件包的两种形状 **[源码确认]**

**Host 半边**（`references/host-plugin.md`）—— 二选一，不许混用：

```js
// 形状 A：函数式
export function apply(ctx, config) {}
export const inject = ['tools']
export const Config = /* schemastery schema */

// 形状 B：Service 类作为默认导出
export default class LedgerMemory extends Ledger {}
```

**Client 半边**（`references/ui-plugin.md`）—— 浏览器里由 `window.__ModuleLoader__` 装载：

```js
window.__ModuleLoader__.load({
  id: '@local/my-decoration',
  factory(require) {
    const React = require('react')
    function Decoration() { return React.createElement('svg', { /* ... */ }) }
    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
          { name: 'conversation.composer.dock', id: 'my-decoration', order: 5 },
          Decoration,
        ))
      },
    }
  },
})
```

`package.json` 里用 `dsh` 字段把两半接起来：

```json
{
  "exports": { ".": "./index.js", "./client": "./client.js", "./locale/*.json": "./locale/*.json", "./icon": "./icon.svg" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "immediately": true, "inject": ["@deepseek-ai/dsh-client-ui-conversation"] }
  }
}
```

> **这是整个设计里最关键的一条**：UI 插件不是"网页"，是"往一个叫 slot 的注册表里插一条记录"。
> 宿主负责渲染，插件只提供组件 + 插在哪个位置。所以插件永远拿得到主题、语言、布局，不会出现 iframe 那种割裂感。

### 1.3 配置即架构 **[源码确认]**

`D:\dsh-home\profiles\desktop\cordis.yml` 就是一个 YAML 数组，**418 条**：

```yaml
- id: session
  name: '@deepseek-ai/dsh-session'
- id: agent-default-model
  name: '@deepseek-ai/dsh-agent-default-model'
  config:
    provider: deepseek-account
    model: deepseek-flash
- id: plugin-manager
  name: '@deepseek-ai/dsh-plugin-manager'
  disabled: !!js '!ctx.get(''profileContext'')'
- id: tool-str-replace-editor
  name: '@deepseek-ai/dsh-tool-str-replace-editor'
  disabled: true
```

规则（README + dsh-base README 双重确认）：

- `id` 是行标识，`name` 是包名，**可以是子路径导出**（`@deepseek-ai/dsh-plugin-manager/tools`）。
- `config` 会在插件激活时按 `Config` schema 校验。
- `disabled` 支持 `!!js` 表达式，可以按平台、按 profile 条件挂载。
- **补丁层**：bundle 层 → profile 层 → 用户 `cordis.patch.yml`，同 `id` **整块替换**（不是深合并），最后写入者胜。
- `insert:` 往树里加新行。
- **同一服务被两个插件注册 → 整个 profile 拒绝加载**（dsh-base README 明确写了这条）。

最后这条很重要：它不是限制，而是保证"任何时刻 `ctx.fs` 只有一个实现"，
所以**换实现只需要换一行配置，调用方一行不改**。

### 1.4 接口 / 实现 / 策略 三分法 **[源码确认]**

从根 `package.json` 的依赖清单就能读出这套命名法：

| 类别 | 例子 | 作用 |
|---|---|---|
| 接口包 | `dsh-fs`、`dsh-llm`、`dsh-session`、`dsh-tools` | 只定义 Service 抽象 + 类型，不含 I/O |
| 实现包 | `dsh-fs-local`、`dsh-fs-sandbox`、`dsh-session-persistence-jsonl`、`dsh-session-query-sqlite` | 一个包一个实现 |
| 策略包 | `dsh-fs-observation-policy`、`dsh-sandbox-policy`、`dsh-spill-policy`、`dsh-tool-call-timeout-policy` | 不实现能力，只**约束**能力 |
| 投影包 | `dsh-session-projection`、`dsh-session-projection-cache` | 从日志折叠出可读状态 |
| 格式 + 迁移 | `dsh-session-format`、`-catalog`、`-v0-to-v1` … `-v3-to-v4` | 日志格式版本化，可升级 |
| 表面/套装 | `dsh-base`、`dsh-web`、`dsh-headless`、`dsh-sdk-*`、`dsh-acp` | 一组插件行的 bundle |
| 客户端 | `dsh-client-*`、`dsh-client-ui-*` | 浏览器半边 |

**这套分类本身就是可扩展性的来源**：加一个数据源 = 加一个 `market-*` 实现包，
加一条风控 = 加一个 `rules-*` 策略包，谁都不用改。

### 1.5 单一真相：session log **[源码确认]**

`references/practices.md` 第一条原文：

> **The session log is the only source of truth.** Anything the model sees must be
> reconstructable from committed session events; fork, resume, and replay derive from
> the log. Plugin memory is a derived cache.

配套的机制：`ctx.sessionProjections` 提供 `apply(state, event)` 纯函数折叠、
`stateVersion` 版本号、`view()` 返回相同引用以抑制重渲染、缓存可 checkpoint。

**这一条直接决定了 openOutcry 能不能做 A-6（全链路因果审计与复盘）**：
只要 run 日志是唯一的、可重放的，复盘就不是"再跑一遍"，而是"把日志重新折叠一遍"。

---

## 2. 能照搬什么、不能照搬什么

| DSH 的东西 | 我们怎么办 |
|---|---|
| cordis 容器 | **直接用**（`@deepseek-ai/cordis` 是独立包，不绑定 DSH） |
| loader / include / group | **直接用**（同一套 YAML 方言） |
| `window.__ModuleLoader__` + slots | **照契约自己写一个**（约 200 行，见 §5.1/§5.2） |
| `dsh.client` 的 package.json 字段 | **改名成 `outcry.client`**，字段语义一致 |
| session log / projection | **照抄机制**，但对象换成 run log |
| 418 行插件树 | **不要抄规模**。我们 30–40 行就够，规模是演化出来的 |
| Plugin Manager / Market 那套 | **先不做**。那是生态，不是内核 |
| Agent 那一整套（tools/loop/prompt） | **不抄**。我们的 agent 是外部进程，走 ACP；我们只提供工具面和事件面 |

---

## 3. openOutcry 的目标架构

### 3.1 三层 **[我们的设计]**

```
┌─ Surface（表面）───────────────────────────────────────────┐
│  @outcry/api-*            HTTP/WS 网关与控制器              │
│  @outcry/client-ui-*      浏览器插件（slot 注册）           │
│  @outcry/tool-*           MCP 工具面（给外部 Agent 调）     │
└──────────────────────────────────────────────────────────┘
                          ↓ 只依赖接口
┌─ Domain（领域）────────────────────────────────────────────┐
│  @outcry/clock  market  research  rules  ledger  analytics │
│  @outcry/agent  approval  run  trace                       │
│  每个 = 接口包；实现与策略另起包                            │
└──────────────────────────────────────────────────────────┘
                          ↓ 只依赖接口
┌─ Kernel（内核）────────────────────────────────────────────┐
│  @deepseek-ai/cordis     容器                               │
│  @outcry/log             run 事件日志（唯一真相）           │
│  @outcry/projection      日志 → 状态折叠                    │
│  @outcry/core            类型、事件 schema、错误            │
└──────────────────────────────────────────────────────────┘
```

依赖方向单向：Surface → Domain → Kernel。**反向依赖一律通过事件**。

### 3.2 包地图 **[我们的设计]**

把 `research/openOutcry-后端功能规划与调研清单.md` 里的 13 个模块原样搬成包：

| 模块 | 接口包 | 实现包 | 策略 / 附加包 |
|---|---|---|---|
| D-3 模拟时钟 | `@outcry/clock` | `clock-sim`、`clock-real` | `clock-driver`（按剧本推进） |
| D-1 行情 | `@outcry/market` | `market-csv`、`market-tushare` | `market-cache` |
| D-2 基本面/文本 | `@outcry/fundamentals` | `fundamentals-pit` | `fundamentals-anon`（匿名化） |
| D-4 A 股规则 | `@outcry/rules` | `rules-ashare` | `rules-t1`、`rules-price-limit` |
| D-5 撮合与账本 | `@outcry/ledger` | `ledger-memory`、`ledger-pg` | `matching-ashare` |
| D-6 绩效 | `@outcry/analytics` | `analytics-basic` | `analytics-risk` |
| D-7 事件总线 | `@outcry/log` | `log-jsonl`、`log-sqlite` | `log-projection` |
| A-1 接入 | `@outcry/agent` | `agent-acp`、`agent-mock` | `agent-registry` |
| A-2 准入 | `@outcry/handshake` | `handshake-acp` | `handshake-validator` |
| A-3 调度 | `@outcry/run` | `run-orchestrator` | `run-team` |
| A-4 受控研究 | `@outcry/research` | `research-pit` | `research-exit-policy` |
| A-5 人机审批 | `@outcry/approval` | `approval-local` | — |
| A-6 审计复盘 | `@outcry/trace` | `trace-jsonl` | `trace-replay` |

前端：

> **一处更正**：DSH 里的 `dsh-client-ui-cordis` **不是**浏览器 cordis 容器，
> 它是渲染 `cordis_define` / `cordis_run` 工具卡片的普通 UI 插件（名字撞了）。
> 真正的容器 = vendored cordis + Loader + `client-modules`（供 `internal`）+ `ui-renderer`（供 slots）。
> 所以我们的包叫 `client-loader`，不叫 `client-ui-cordis`。

| 包 | 作用 |
|---|---|
| `@outcry/client-modules` | 宿主半边：扫 Loader 条目、组装 boot graph、发 `/plugins` 路由 |
| `@outcry/client-loader` | 浏览器半边：两态 `__ModuleLoader__` facade + lazy-CJS 模块表（Loader 的 `internal`） |
| `@outcry/client-ui-slots` | slot 注册表（纯逻辑，不依赖 React） |
| `@outcry/client-ui-renderer` | slot → React 绑定 + `ctx.uiRenderer.mount()` |
| `@outcry/client-api` | 与宿主通信的 remotes（HTTP + WS） |
| `@outcry/client-ui-layout` | 外壳：左栏 + 主区，占据 `root` slot |
| `@outcry/client-ui-studio` | 委托台页 |
| `@outcry/client-ui-training` | 训练场页（会话 + 工作台） |
| `@outcry/client-ui-review` | 复盘页 |
| `@outcry/client-ui-connect` | 接入页 |
| `@outcry/client-ui-protocol` | 协议页 |
| `@outcry/client-ui-guide` | 产品说明页 |

仓库布局：

```
openoutcry/
  packages/
    core/        log/        projection/
    clock/       clock-sim/
    market/      market-csv/
    rules/       rules-ashare/
    ledger/      ledger-memory/   matching-ashare/
    analytics/
    agent/       agent-acp/      handshake/
    research/    approval/       run/        trace/
    api-gateway/ api-run/        api-ledger/
    tool-market/ tool-order/     tools/
    client-modules/ client-loader/  client-ui-slots/ client-ui-renderer/ client-api/
    client-ui-layout/ client-ui-studio/ client-ui-training/ ...
    bundle-base/  bundle-web/
  apps/
    server/      # 一个 profile：package.json + cordis.yml + cordis.patch.yml
    web/         # 只构建外壳（boot 页 + 模块表），页面全在插件里
```

> 和现在的 `openoutcry-web` 的关系：`openoutcry-web` 保留为 `apps/web` 的外壳 + 开发服务器，
> 现有 6 个页面逐个搬成 `client-ui-*` 插件。**不推倒重来**（见 §6）。

### 3.3 落地前提：依赖都拿得到 **[已核实 npm]**

```
@deepseek-ai/cordis                 4.1.0     ← 容器本体，公开包
@deepseek-ai/cordis-plugin-loader   1.1.0     ← YAML 插件树装载器
@deepseek-ai/cordis-plugin-include  1.1.0     ← 配置包含
@deepseek-ai/cordis-plugin-group    1.1.0     ← 插件分组
@deepseek-ai/cordis-plugin-timer    1.2.0     ← 可回收的定时器
@deepseek-ai/schemastery            3.19.0    ← Config schema
```

六个包全部在公共 npm 上，`npm i` 即可，**不需要从 DSH 里抠代码**。
（另外 `cordis@4.0.0-rc.12` 是上游开源版；我们跟 DSH 保持一致，用 `@deepseek-ai/cordis`。）

DSH 自己的客户端包也发了一部分（`@deepseek-ai/dsh-client-ui-slots@0.0.1-rc.1`），
但版本是 `0.0.1-rc`，API 未冻结 —— **建议自己写 slots（约 150 行），只借它的语义**，
不要把毕业设计的地基压在别人的 rc 版本上。

---

## 4. 后端怎么写

### 4.1 内核启动 **[我们的设计，形状照 cordis README]**

`apps/server/src/main.ts`：

```ts
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'

const ctx = new Context()
await ctx.plugin(Loader, { root: new URL('./cordis.yml', import.meta.url).pathname })
await new Promise<void>((resolve) => ctx.on('ready', resolve))
ctx.logger.info('openOutcry kernel up')
```

`apps/server/cordis.yml` —— **这就是整个后端**：

```yaml
# ---------- 内核 ----------
- id: log
  name: '@outcry/log-jsonl'
  config: { dir: ./runs }
- id: projection
  name: '@outcry/projection'

# ---------- 领域 ----------
- id: clock
  name: '@outcry/clock-sim'
  config: { start: '2024-04-22T09:15:00+08:00', stepSeconds: 60 }
- id: market
  name: '@outcry/market-csv'
  config: { root: ./data/market }
- id: fundamentals
  name: '@outcry/fundamentals-pit'
  config: { root: ./data/pit }
- id: rules
  name: '@outcry/rules-ashare'
- id: ledger
  name: '@outcry/ledger-memory'
- id: matching
  name: '@outcry/matching-ashare'
  config: { slippageBps: 2 }
- id: analytics
  name: '@outcry/analytics-basic'

# ---------- Agent ----------
- id: agent
  name: '@outcry/agent-acp'
  config:
    command: ['codex', 'acp']
    cwd: ./workspace
    timeoutMs: 120000
- id: approval
  name: '@outcry/approval-local'
- id: run
  name: '@outcry/run-orchestrator'
- id: trace
  name: '@outcry/trace-jsonl'

# ---------- 表面 ----------
- id: api-gateway
  name: '@outcry/api-gateway'
  config: { port: 8787 }
- id: api-run
  name: '@outcry/api-run'
- id: api-ledger
  name: '@outcry/api-ledger'

# ---------- 工具面（给外部 Agent 用） ----------
- id: tools
  name: '@outcry/tools'
- id: tool-market
  name: '@outcry/tool-market'
- id: tool-order
  name: '@outcry/tool-order'
```

注意：**换数据库 = 把 `ledger-memory` 改成 `ledger-pg` 一行**，别的代码一个字不动。
这就是 §1.3 那条"同一服务只能有一个实现"换来的收益。

### 4.2 接口包怎么写 **[我们的设计]**

`packages/ledger/src/index.ts` —— 只有抽象与类型，没有 I/O：

```ts
import { Service, type Context } from '@deepseek-ai/cordis'
import type { Fill, Order, Position, RunId } from '@outcry/core'

/** 账本：唯一的持仓与现金事实来源。实现方负责把 Fill 折进状态。 */
export abstract class Ledger extends Service {
  constructor(ctx: Context) {
    super(ctx, 'ledger')
  }
  /** 把一笔成交写进账本（幂等：同 fillId 只生效一次） */
  abstract post(runId: RunId, fill: Fill): Promise<void>
  /** 当前持仓快照 */
  abstract positions(runId: RunId): Position[]
  /** 现金余额 */
  abstract cash(runId: RunId): number
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    ledger: Ledger
  }
}
```

`declare module` 的合并是关键：任何插件里写 `ctx.ledger` 都有类型，
**但类型不来自实现包** —— 换实现不影响编译。

### 4.3 实现插件怎么写 **[我们的设计]**

`packages/ledger-memory/src/index.ts`：

```ts
import { Context, Schema } from '@deepseek-ai/cordis'
import { Ledger } from '@outcry/ledger'
import type { Fill, Position, RunId } from '@outcry/core'

import { z } from 'schemastery'

export default class LedgerMemory extends Ledger {
  static inject = ['log']                       // 没有 log 就不启动
  static Config = z.object({
    baseCurrency: z.string().default('CNY'),
  })

  private state = new Map<RunId, { cash: number; pos: Map<string, Position> }>()

  constructor(ctx: Context, config: { baseCurrency: string }) {
    super(ctx)
    this.baseCurrency = config.baseCurrency
    // 关键：把"重放"接进日志投影，重启后账本自动重建
    ctx.effect(() =>
      ctx.log.projection({
        name: 'ledger',
        stateVersion: 1,
        init: () => ({ runs: new Map() }),
        apply: (state, event) => {
          if (event.type !== 'order/filled') return state
          // 纯函数折叠，返回新引用才会触发下游重算
          return foldFill(state, event.payload)
        },
      }),
    )
  }
  async post(runId: RunId, fill: Fill) { /* ... */ }
  positions(runId: RunId) { /* ... */ }
  cash(runId: RunId) { /* ... */ }
}
```

三个必须遵守的写法：

1. **所有副作用包在 `ctx.effect(() => dispose)` 里**，fiber dispose 时自动回收。
2. **不要自己维护真相**，状态从 `ctx.log` 折叠出来；内存只是缓存。
3. **可调参数一律进 `static Config`**，用户改 `cordis.patch.yml` 就能调，不用改代码。
4. **`static Config` 必须挂在类上**，不能写成同级的 `export const Config` —— 见 §4.10 坑 2。

### 4.4 run 日志与投影 **[我们的设计]**

这是整个后端的地基，必须先写、先冻结格式。

`packages/core/src/event.ts`：

```ts
export type RunId = string

/** 事件信封。v 是格式版本，迁移包按 v 逐级升级。 */
export interface RunEvent<T = unknown> {
  /** run 内单调递增，重放顺序的唯一依据 */
  seq: number
  /** 模拟时钟（不是墙钟） */
  at: string
  /** 事件类型，如 'agent/decision'、'order/submitted'、'order/filled' */
  type: string
  /** 载荷格式版本 */
  v: number
  payload: T
  /** 写入方插件 id，用于审计"谁写的" */
  by: string
}
```

`packages/log/src/index.ts`：

```ts
export abstract class Log extends Service {
  constructor(ctx: Context) { super(ctx, 'log') }
  /** 追加事件；这是全系统唯一的写入口 */
  abstract append(runId: RunId, event: Omit<RunEvent, 'seq' | 'by'>): Promise<RunEvent>
  /** 按 seq 读取 */
  abstract read(runId: RunId, fromSeq?: number): AsyncIterable<RunEvent>
  /** 注册一个投影 */
  abstract projection<T>(spec: ProjectionSpec<T>): () => void
  /** 某个投影的当前状态 */
  abstract stateOf<T>(runId: RunId, name: string): T
}
```

投影的价值（照抄 DSH 的 `practices.md`）：

- `apply(state, event)` 是**纯函数**，忽略的事件必须**返回同一个引用**，下游就零成本。
- `stateVersion` 变了就丢弃旧 checkpoint。
- 冷启动只重放 checkpoint 之后的尾巴。

**这直接就是 A-6 复盘引擎**：复盘 = 新建一个只读投影，从头折叠，不执行任何副作用。

### 4.5 API 网关：三条通道，别用错 **[源码确认]**

DSH 的网关不是"一个自己发明的 ctx.api"，而是**三条各有分工的通道**：

| 通道 | 注册 API | 用途 |
|---|---|---|
| **Remote（Typert RPC）** | 继承 `TypertRemoteService` + `@Remote` 装饰器 | **业务方法的默认形态**，一元 + 流式 |
| **原生 HTTP 路由** | `ctx.connection.fetch.register({ path, methods, requestBody, fetch })` | 文件下载/上传这类非 RPC 请求 |
| **WebSocket upgrade** | `ctx.webServer.registerUpgrade({ path, handler })` | 自定义 WS 端点 |

**业务 API 的真实写法**（照 `dsh-api-session-controller`）：

```ts
import { TypertRemoteService, Remote } from '@outcry/typert'
import { z } from 'schemastery'

export class RunController extends TypertRemoteService {
  static inject = ['log', 'run', 'clock']
  static Config = z.object({ maxRuns: z.natural().default(32) })

  constructor(ctx: Context, config: typeof Config) {
    super(ctx, 'runController', { namespace: 'run' })   // ← 客户端命名空间
  }

  /** 一元：客户端调 ctx.remote.run.start(...) */
  @Remote('start')
  async start(request: CreateRunRequest): Promise<CreateRunValue> { /* ... */ }

  /** 流式：客户端 for await (const f of ctx.remote.run.follow(...)) */
  @Remote({ mode: 'stream' })
  async follow(request: FollowRequest, signal: AbortSignal): Promise<AsyncIterable<RunFrame>> { /* ... */ }
}

export default RunController      // ← 必须是 default，见 §4.10 坑 2
```

三条硬规则：

1. **`AbortSignal` 必须是最后一个参数**（取消信号）。
2. **流方法返回 `Iterable` / `AsyncIterable`**，并标 `mode: 'stream'`。
3. **客户端产物是代码生成的**（DSH 里是 `lib/typert.remote-client.js`），不是手写。

**原生 HTTP 路由**（文件类请求，handler 就是标准 Fetch API）：

```ts
const RunExport = {
  inject: ['connection', 'log'],
  apply(ctx: Context) {
    ctx.effect(() => ctx.connection.fetch.register({
      path: '/api/run/export',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
      fetch: async (request: Request) => {
        const runId = new URL(request.url).searchParams.get('id')!
        const body = await exportRunJsonl(ctx.log.read(runId))
        return new Response(body, {
          headers: {
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      },
    }), 'run-export: /api/run/export')
  },
}
```

**WS 端点**（实时推送 run 事件）：

```ts
ctx.effect(() => ctx.webServer.registerUpgrade({
  path: '/api/run/events',
  handler: (req, socket, head) => {
    const admission = ctx.connection.admitConnection(req)   // 鉴权，返回 {peer} 或 {rejection}
    if ('rejection' in admission) return rejectUpgrade(socket, admission.rejection)
    attachRunEventStream(socket, ctx.log, admission.peer)
  },
}), 'run-events: WebSocket')
```

**约定：前端业务只走 `ctx.remote`，不读"业务表"。**
这样换成 `ledger-pg` 前端毫无感知 —— 这是 §4.9 第 3 条在前端的镜像。

### 4.6 MCP 工具面 **[我们的设计]**

`packages/tool-order/src/index.ts` —— 外部 Agent（Codex/Claude Code）通过 MCP 调我们的工具：

```ts
export const inject = ['tools', 'market', 'approval']

export function apply(ctx: Context) {
  ctx.effect(() => ctx.tools.register({
    name: 'submit_order',
    description: '提交一笔 A 股委托。会进入人工审批队列，批准后由撮合器成交。',
    schema: SubmitOrderSchema,
    /** 工具执行完只是"提案"，不是成交 */
    handler: async (input) => {
      const proposal = await ctx.approval.submit(input)
      return { proposalId: proposal.id, status: 'pending-approval' }
    },
  }))

  ctx.effect(() => ctx.tools.register({
    name: 'quote',
    description: '查询当前模拟时点的行情快照（受时点约束，不会泄漏未来数据）。',
    schema: QuoteSchema,
    handler: ({ symbol }) => ctx.market.snapshot(symbol, ctx.clock.now()),
  }))
}
```

这条对应你们 A-1 文档里的 **Action-as-Tool**：
agent 只能"提交提案"，成交由 `matching-ashare` 决定。工具面就是权限边界。

### 4.7 ACP 控制面 **[我们的设计]**

`packages/agent-acp/src/index.ts` —— 一个插件负责一个外部 agent 进程的完整生命周期：

```ts
export default class AgentAcp extends Agent {
  static inject = ['log', 'clock']
  static Config = Schema.object({
    command: Schema.array(String).required(),
    cwd: Schema.string(),
    timeoutMs: Schema.number().default(120_000),
  })

  constructor(ctx: Context, config: typeof Config) {
    super(ctx)
    ctx.effect(() => {
      const proc = spawn(config.command[0], config.command.slice(1), { cwd: config.cwd })
      // ACP 的 session/update → 我们的 run 事件
      const client = new AcpClient(proc)
      client.on('session/update', (update) => {
        ctx.log.append(this.runId, { at: ctx.clock.now(), type: mapAcpType(update), v: 1, payload: update })
      })
      return () => { client.close(); proc.kill() }
    })
  }
}
```

你们已有的 `openOutcry-A1-外部Agent接入-开发文档.md` 里的握手顺序、失败态枚举、看门狗，
全部原样搬进这个插件内部 —— **它不感知 cordis，cordis 也不感知 ACP**。

### 4.8 Python 侧车 **[我们的设计]**

数值计算（pandas/numpy 的 PIT 对齐、因子计算）不要用 TS 重写。
照 DSH 的做法：Node 内核 + Python 子进程，Python 只是**一个能力提供者**。

`packages/quant/src/index.ts`：

```ts
export abstract class Quant extends Service {
  constructor(ctx: Context) { super(ctx, 'quant') }
  /** 调用 Python 侧车的一个函数 */
  abstract call<T>(fn: string, args: unknown): Promise<T>
}
```

`packages/quant-python/src/index.ts` 用 stdio JSON-RPC 起 `python -m outcry_quant`。
换语言/换实现只换这一行配置。

> **为什么内核必须是 Node**：cordis 是 TS 的。插件系统的价值在于**一个容器管住所有生命周期**，
> 一旦拆成两种语言各管一半，"万物皆插件"就退化成"两套插件系统 + 一个 RPC 边界"。
> 把 Python 收敛成叶子能力（纯函数、无状态、可重启）是唯一不损失可扩展性的做法。

### 4.9 后端的三条硬规矩 **[我们的设计]**

1. **一个服务一个实现**。两个包都 `super(ctx, 'ledger')` → 启动失败。这是特性，不是 bug。
2. **写只走 `ctx.log.append`**。任何插件都不许直接改别人的状态；要改就发事件。
3. **读只走投影**。`ctx.ledger.positions()` 内部也是读投影，不许有"影子状态"。

### 4.10 宿主侧四个坑 **[源码确认]**

**坑 1：cordis 没有 `onStart` / `onStop` / `onDispose`。**
在 `cordis/src` 全目录 grep 命中 0。生命周期只有三种：

| 机制 | 用途 |
|---|---|
| 插件体本身 | 启动逻辑（但会跑多次，见坑 4） |
| `ctx.effect(execute, label)` | 一切需要回收的资源；返回 disposer |
| `ctx.on(event, fn)` | 事件监听，随 fiber 自动摘除 |
| `[Service.init]` generator | 类插件的**异步**启动（`yield async () => …`） |

**坑 2：导出形态不能混用。**
`loader.unwrapExports` 取的是 `default ?? namespace`。
一旦你写了 `export default class X`，**同级的命名导出（`export const Config`、`export const inject`）全部被丢弃**。
所以：

```ts
// ✅ 类插件：元数据全部挂在类上
export default class X extends Service {
  static inject = ['a', 'b']
  static Config = z.object({ /* ... */ })
}

// ✅ 对象插件：没有 default，命名导出才有效
export const inject = ['a', 'b']
export const Config = z.object({ /* ... */ })
export function apply(ctx, config) {}

// ❌ 混用：Config 会被静默丢掉
export const Config = z.object({})
export default class Y extends Service {}
```

**坑 3：Loader 里 `id` 不是包名，`name` 才是 module specifier。**
`id` 只是行标识（用于 patch 定位、禁用、改配置）；`name` 决定加载哪个模块。
裸名用 Node 内部 ESM loader 以**配置文件目录为父 URL** 解析，
`cordis:*` 走 `loader.builtins`，`./` 相对 baseUrl。
这也是为什么 patch 能靠 `id` 精确改某一行而不动别的。

**坑 4：`apply` 可能跑多次，必须幂等。**
依赖服务变化时，cordis 不是"重新建一个 fiber"，而是**同一个 fiber 先 unload 再 reload**
（内部用 epoch 指纹 `':uid1:uid2...'` 判断依赖集合是否真的变了）。
所以：**不要在插件体里做不可逆的事**（写文件、占端口、建全局单例），
一切副作用都要挂在 `ctx.effect` 里，靠 disposer 保证可重复。

---

## 5. 前端怎么写

### 5.1 启动：宿主组装 boot graph，浏览器按 classic script 拉插件 **[源码确认]**

这一节我原先按"前端 fetch 一个 roster 然后 `import()`"来设想，**读了源码后发现是错的**。
DSH 的真实链路是"宿主组装 + 浏览器拉 classic script"，比 ESM 方案更简单也更可控：

```
① 宿主（Node）  扫 Loader 已启用条目 → 读每个包的 package.json → 取 dsh.client
                 → 按 external 拓扑排序 → 拼成 combo URL → 注入 <head>
② 浏览器        先装一个"只排队"的 __ModuleLoader__ facade
                 → 执行 <script src="/plugins/??a/client.js,b/client.js&rev=…">
                 → 每个脚本只做一件事：把 {id, factory} 推进 pendingQueue
③ 浏览器        shell 调 __ModuleLoader__.create() → 实例化 lazy-CJS 模块表
                 → facade 切成 mode:"live" → 交给 vendored cordis Loader 建条目
④ 浏览器        Loader 逐条 import → 得到 {inject, apply} → registry.plugin(...)
                 → 全部 fiber 就绪后 ctx.uiRenderer.mount(container)
```

四个关键事实（`dsh-client-modules` 源码）：

1. **发现靠扫 Host Loader，不靠前端清单。**
   `ClientModuleRegistry extends Service`，`static inject = ['loader']`，
   构造时 `for (const entry of ctx.loader.entries()) this.dirty.add(entry.options.name)`。
   **没有 host 行，就没有 loader 条目，也就不会被扫到** —— 这就是为什么纯 UI 插件也必须有一个空的 host `apply()`。

2. **产物是一条 combo URL，不是一个个文件。**
   `/plugins/??a/client.js,b/client.js&rev=<hash>`，单 URL 上限 3 KiB，超了自动分区；
   分 `bootstrap`（模块系统自身）和 `application`（其余插件）两个 phase。
   rev 由 `mtimeMs/ctimeMs/size` 三元组算出来，**不 hash 内容**。

3. **`__ModuleLoader__` 是两态的。**
   HTML 里先注入一个 queue 态 facade（只 `pendingQueue.push`），
   等 shell 调 `create()` 才真正实例化模块系统并切成 `live`。
   这样插件脚本可以先于 shell 执行而不报错 —— 这是"无闪烁"的另一个前提。

4. **lazy-CJS：脚本执行 ≠ 模块求值。**
   执行一个插件 bundle 只**注册工厂**；工厂体（包括 CSS 注入）在第一次 `require` 时才跑，
   结果 memo 在 `ClientModuleLoader.loadCache` 里。
   所以插件的副作用天然延迟到"真的被用到"。

我们的对应实现（**去掉 combo/分区/rev 这些为规模化服务的东西，保留结构**）：

`apps/web/src/boot.ts`：

```ts
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { installModuleFacade } from './moduleLoader'

// ① 装 queue 态 facade（必须在任何插件脚本之前）
installModuleFacade()

const ctx = new Context()
ctx.plugin(Loader, {
  /** boot graph 由宿主注入到 window.__OUTCry_BOOT__（见 §5.7） */
  root: (window as any).__OUTCry_BOOT__.entries.map((row: any) => ({
    id: row.id,
    name: row.id,          // 行名 = 包名，Loader 用这个名字去 import
    config: {},
  })),
})

await new Promise<void>((resolve) => ctx.on('ready', resolve))
await ctx.uiRenderer.mount(document.getElementById('app')!)
```

`apps/web/src/moduleLoader.ts` —— 两态 facade + lazy-CJS 表（约 60 行，照 `dsh-client-modules/lib/client.js` 的模型）：

```ts
import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import * as jsx from 'react/jsx-runtime'

/** baseline 模块表：全站唯一的 React / jsx 实例 */
const BASELINE: Record<string, unknown> = {
  react: React,
  'react-dom': ReactDOM,
  'react-dom/client': ReactDOM,
  'react/jsx-runtime': jsx,
}

const factories = new Map<string, (req: Require) => unknown>()
const cache = new Map<string, unknown>()

type Require = (name: string) => unknown

function makeRequire(): Require {
  return (name) => {
    if (cache.has(name)) return cache.get(name)
    if (name in BASELINE) return BASELINE[name]
    // 未声明的模块一律抛错：运行期镜像"打包纯净性"检查
    throw new Error('[outcry] 未声明的模块：' + name + '（请在 dsh.client.external 里声明）')
  }
}

export function installModuleFacade() {
  ;(window as any).__ModuleLoader__ = {
    mode: 'queue',
    pendingQueue: [] as any[],
    /** 插件脚本只调这个：登记工厂，不求值 */
    load(reg: { id: string; factory: (req: Require) => unknown }) {
      if (this.mode === 'live') return register(reg)
      this.pendingQueue.push(reg)
    },
    /** shell 调这个：实例化模块系统并切到 live */
    create() {
      for (const reg of this.pendingQueue) register(reg)
      this.pendingQueue.length = 0
      this.mode = 'live'
    },
  }
}

function register(reg: { id: string; factory: (req: Require) => unknown }) {
  if (factories.has(reg.id)) return
  factories.set(reg.id, reg.factory)
}

/** Loader 通过这个拿模块命名空间（对应 DSH 的 internal.import） */
export function importModule(id: string) {
  if (cache.has(id)) return cache.get(id)
  const factory = factories.get(id)
  if (!factory) throw new Error('[outcry] 未知插件模块：' + id)
  const exports = factory(makeRequire())     // ← 工厂体在这里才第一次执行
  cache.set(id, exports)
  return exports
}
```

> **为什么用 classic script 而不是 ESM**：DSH 的理由是 vendored Loader 唯一消费代码的入口是
> `internal.import`，把它换成 lazy-CJS 表之后，"代码怎么到达"由模块层拥有，
> "条目治理（fiber、inject 等待、update/refresh）"仍留在 cordis 侧。我们照抄这个分层，
> 好处是**插件可以在任何时刻被换掉**，而不需要整页刷新。

### 5.1.1 三种 `inject` 不要混淆 **[源码确认]**

这是 DSH 里最容易踩的坑，三处都叫 inject，含义完全不同：

| 位置 | 值 | 语义 |
|---|---|---|
| `package.json` → `dsh.client.inject` | **包名**数组 | 客户端包的**激活顺序**（wire 上的 `entries[].inject`） |
| `client.js` 导出的 `inject` | **service 名**数组 | cordis 依赖注入，缺一个就**不激活**（如 `['slots','sessions','remote','locale']`） |
| `package.json` → `dsh.client.external` | **模块 specifier** | 超出 baseline 模块表的 `require` 请求 |

我们改成 `outcry.client`，字段语义完全一致。

### 5.2 slot 模型：这是前端插件化的全部 **[源码确认]**

从 `dsh-client-ui-layout/lib/client.js` 的真实注册代码（原样摘录）：

```js
const disposeRegistration = ctx.slots.register({
  name: "root",
  children: {
    "sidebar":       { kind: "single", scope: "root" },
    "main":          { kind: "keyed",  scope: "root" },
    "rightbar":      { kind: "single", scope: "root" },
    "shell.bottom":  { kind: "single", scope: "root" },
    "shell.overlay": { kind: "list",   scope: "root" },
    "shell.leading": { kind: "single", scope: "root" },
  },
  store,                      // 给子树提供的 store
}, AppFrame)
```

三条规则：

1. **注册一个 slot 时，同时声明它的子 slot 和"子 slot 的容量语义"**：
   - `single` —— 同时只能有一个占位者（如 `sidebar`、`shell.bottom`）
   - `list` —— 有序列表，多个插件各插一条（如 `shell.overlay`、导航项）
   - `keyed` —— 多份并存，按 key 选择渲染哪一份（**页面就是这个**）
2. **每个注册都是 effect**：`ctx.slots.register(...)` **内部已经调用了 `ctx.effect`**
   （`ui-renderer` 源码：`return this.ctx.effect(() => this._register(options, component), "slots.register()")`），
   所以**不要再套一层 `ctx.effect`**；它返回 disposer，fiber 卸载时整棵子树自动消失。
3. **`ctx.slots.inject(ownerKey, cb)`** 建立父子依赖：只有 `ownerKey` 那个 slot 有人占位时，
   `cb` 里的注册才生效；占位者消失时自动撤销、回来时自动重装。

**已验证存在的 slots API**（从 `dsh-client-ui-renderer` 与 `dsh-client-ui-layout` 源码里逐一确认）：

| API | 语义 |
|---|---|
| `ctx.slots.register(options, Component)` | 注册一个占位者；`options.children` 同时声明子 slot 及其容量语义 |
| `ctx.slots.inject(ownerKey, cb)` | 仅在 `ownerKey` 有人占位时执行 `cb`，随之撤销/重装 |
| `ctx.slots.entries(name)` | 列出某个 slot 的全部注册（含 `options.key`） |
| `ctx.slots.subscribe(name, cb)` | 订阅某 slot 的注册集合变化（layout 靠它感知"新页面出现"） |
| `ctx.slots.provideRoot({ hooks })` | 给整棵子树注入 selector hooks（数据在这里一次性绑定） |
| `ctx.slots.renderSlot(name, props)` | 唯一的 context 级渲染入口，只由 renderer 调用一次（`'root'`） |

openOutcry 的 slot 树（**我们的设计**，直接对应现在的界面）：

```
root                          ← client-ui-layout 占位
├── app.sidebar.brand         (single)   品牌 + 新建训练
├── app.sidebar.nav           (list)     页面索引（每个页面插件插一条）
├── app.sidebar.tasks         (list)     训练任务树
├── app.sidebar.footer        (single)   原型数据说明
├── app.mobile.bar            (single)   移动端细顶栏 + 抽屉按钮
├── app.main                  (keyed)    页面主体，key = 路由 id
├── app.overlay               (list)     抽屉 / 弹层
└── app.toast                 (single)   通知
```

### 5.3 layout 插件 **[我们的设计，形状照 layout 源码]**

`packages/client-ui-layout/src/client.js`：

```js
window.__ModuleLoader__.load({
  id: '@outcry/client-ui-layout',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    function AppFrame(props) {
      const { slots } = props
      return h('div', { className: 'app-frame' },
        h('aside', { className: 'rail' },
          slots.render('app.sidebar.brand', {}),
          h('nav', { className: 'rail-nav' }, slots.render('app.sidebar.nav', {})),
          h('div', { className: 'rail-sec' }, slots.render('app.sidebar.tasks', {})),
          slots.render('app.sidebar.footer', {}),
        ),
        h('main', { className: 'page app-main' }, slots.render('app.main', { key: props.page })),
        slots.render('app.overlay', {}),
        slots.render('app.toast', {}),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        // slots.register 内部已经包了 ctx.effect，不要再套一层
        ctx.slots.register({
          name: 'root',
          children: {
            'app.sidebar.brand':  { kind: 'single' },
            'app.sidebar.nav':    { kind: 'list' },
            'app.sidebar.tasks':  { kind: 'list' },
            'app.sidebar.footer': { kind: 'single' },
            'app.mobile.bar':     { kind: 'single' },
            'app.main':           { kind: 'keyed' },
            'app.overlay':        { kind: 'list' },
            'app.toast':          { kind: 'single' },
          },
        }, AppFrame)
      },
    }
  },
})
```

> **注意 AppFrame 里没有任何业务知识**。它不知道"训练场"存在，只负责把 slot 摆到格子里。
> 这就是为什么加一个页面不用改 layout。

### 5.4 页面插件：以训练场为例 **[我们的设计]**

`packages/client-ui-training/package.json`：

```json
{
  "name": "@outcry/client-ui-training",
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg"
  },
  "dsh": { "client": { "platform": "web", "inject": ["@outcry/client-ui-layout"] } }
}
```

`index.js`（host 半边，纯 UI 插件就空着）：

```js
/** 训练场页面的宿主半边：没有宿主行为，存在只是为了让这一行出现在 cordis.yml 里。 */
export function apply() {}
```

`client.js`（浏览器半边，**一个插件同时注册导航项 + 页面主体**）：

```js
window.__ModuleLoader__.load({
  id: '@outcry/client-ui-training',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    function NavItem() {
      const active = useCurrentPage() === 'training'
      return h('a', { href: '#/training', 'aria-current': active ? 'page' : undefined },
        h(IconMessages), h('span', null, t('nav.training')))
    }

    function TrainingPage(props) {
      // props 里带的是 selector hooks，不是数据本身（见 §5.5）
      const runId = props.useActiveRun()
      return h('div', { className: 'bench-grid' },
        h(Slot, { name: 'training.conversation', runId }),
        h(Slot, { name: 'training.workbench', runId }),
      )
    }

    return {
      inject: ['slots', 'nav', 'locale'],
      apply(ctx) {
        // 1) 往左栏导航里插一条（list slot，靠 order 排序）
        ctx.slots.register(
          { name: 'app.sidebar.nav', id: 'nav-training', order: 20 }, NavItem)

        // 2) 往主区插一个 keyed 页面，并在同一次注册里声明它的子 slot
        //    （children 只能跟 register 一起给，没有单独的 provideChildren）
        ctx.slots.register({
          name: 'app.main',
          key: 'training',
          children: {
            'training.conversation': { kind: 'single' },
            'training.workbench':    { kind: 'single' },
          },
        }, TrainingPage)

        // 3) 注册路由：加页面 = 加插件，不用改中心路由表
        ctx.effect(() => ctx.nav.register({ id: 'training', path: '/training', order: 20 }))
      },
    }
  },
})
```

**这就是"万物皆插件"在前端的落点**：`nav.ts` / `routes.ts` 这两个"中心表"被 `ctx.nav` 服务取代。
现在 `APP_ROUTES` 里加一行要改代码 + 改 nav；之后只要装一个包。

### 5.5 数据怎么进来：wire.view 投影 **[源码确认 + 我们的设计]**

DSH 的铁律（`practices.md`）：

> When the Client needs a value derived from a session, declare `wire.view` on the Host projection.
> The value reaches the Client already computed; the Client does not fold session events itself.

翻成 openOutcry：

- **前端不折叠 run 事件**。折叠在后端做（`@outcry/projection`），前端只拿结果。
- 后端在投影上声明 `wire.view`，网关自动生成一个只读接口：

```ts
// packages/projection-ledger/src/index.ts
export const inject = ['log', 'api']

export function apply(ctx: Context) {
  const projection = ctx.log.projection({ name: 'ledger', /* ... */ })

  ctx.effect(() => ctx.api.view({
    name: 'ledger.summary',
    /** 输入是 runId，输出是这个 view 的形状 */
    read: (runId: string) => projection.stateOf(runId).summary,
  }))
}
```

- 前端通过 `ctx.api` 拿一个 observable 源，slot 的 props 把它绑成 hook：

```js
const summary = props.useView('ledger.summary', runId)   // 只订阅这一片
```

**收益**：换 `ledger-memory` → `ledger-pg`，view 的名字和形状不变，前端零改动。
这正是 DSH 那句"the value reaches the Client already computed"的意义。

实时性走 WS：`ctx.api.channel('run/events')` 推送增量事件，但**推送的是事件，不是状态**；
前端拿到事件只用来触发 view 重取，不自己折叠（避免前后端两套折叠逻辑漂移）。

### 5.5.1 与宿主通信：`ctx.remote` 与 `RemoteResult` **[源码确认]**

DSH 客户端调宿主**只有一个业务通道**：`ctx.remote`（宿主侧怎么写见 §4.5 的 `TypertRemoteService`）。

- 一元调用走 `ctx.connection.rpc.call('/api', …)`；
- 流式走共享 WebSocket `/api/remote.mux`；
- 事件用 `$on` 订阅；
- **返回值永远折叠成 `RemoteResult<T>`，不 reject**：

```ts
export type RemoteResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string; data?: unknown } }
```

这条契约值得原样抄，理由有三：

1. **错误可序列化**：异常栈跨进程没意义，`{code, message}` 才有意义，而且能直接映射成 UI 文案。
2. **前端不用 try/catch**：每个调用点都是 `if (!r.ok) return showError(r.error)`，分支统一。
3. **错误码集中定义**：正好落在 `@outcry/core` 里，和 A-1 文档的"失败态枚举"共用一套。

我们的映射：

```ts
// packages/client-api/src/client.ts
export const inject = ['remote']

export function apply(ctx: Context) {
  ctx.remote.runs   = { start, pause, abort, snapshot }   // 运行控制
  ctx.remote.market = { quote, depth, calendar }          // 行情查询（受时点约束）
  ctx.remote.ledger = { positions, cash, fills }          // 账本快照
  ctx.remote.trace  = { events, replay }                  // 事件流与复盘
}
```

服务端一侧，每个 `ctx.remote.x.y` 对应 `@outcry/api-*` 里的一条 `ctx.api.route(...)`，
错误码统一从 `@outcry/core/errors` 取。

> 注意：`/plugins/events`（HMR 的 SSE）和 `ctx.remote` **不是一回事**，前者只管热更，别混用。

### 5.6 构建：把 TSX 打成 `__ModuleLoader__` 形状 **[源码确认，工具我们的设计]**

DSH 的 `lib/client.js` 是**预打包**的，长这样（真实文件结构）：

```js
window.__ModuleLoader__.load({
  id: "@deepseek-ai/dsh-client-ui-goal",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    /* …… esbuild 的 CJS 输出，require('react') 之类都指向模块表 …… */
    return module.exports
  },
})
```

我们用一个 20 行的 esbuild 包装脚本产出同样形状：

```js
// scripts/build-client.mjs
import { build } from 'esbuild'

const id = process.env.PKG_NAME

const result = await build({
  entryPoints: ['src/client.tsx'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  // 基线模块一律外置，运行时从模块表 require
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  outfile: 'client.js',
})

const body = result.outputFiles[0].text
const wrapped =
  `window.__ModuleLoader__.load({\n  id: ${JSON.stringify(id)},\n  factory: (require) => {\n` +
  `    var module = { exports: {} }; var exports = module.exports;\n` +
  body +
  `\n    return module.exports;\n  },\n});\n`

await fs.writeFile('client.js', wrapped)
```

**要点**：`external` 里只有基线模块。任何业务组件依赖都必须打进这个 bundle ——
所以两个插件不能共享业务代码，共享的部分必须下沉成 `@outcry/client-ui-*` 之外的**纯契约包**（如 `@outcry/core`）。

### 5.7 开发期热更新 **[我们的设计]**

DSH 有 `dsh-client-hmr`。我们的最小版本：

```ts
// packages/client-hmr/src/client.ts
export const inject = ['cordis']

export function apply(ctx: Context) {
  const ws = new WebSocket('/__hmr')
  ws.onmessage = async ({ data }) => {
    const { pluginId } = JSON.parse(data)
    // 1) 拆掉这个插件的 fiber（它注册的 slot 全部消失）
    await ctx.fiber.children[pluginId]?.dispose()
    // 2) 加 cache-busting 重新 import，模块表里的旧实例被覆盖
    await import(`/plugins/${pluginId}/client.js?t=${Date.now()}`)
    // 3) 重新激活
    await ctx.plugin(pluginId)
  }
}
```

Vite 只负责编译 `apps/web` 外壳；插件由各自的 `build-client.mjs --watch` 产出，
dev server 静态服务 `packages/*/client.js`。**两者互不干扰**，这也是 DSH 的做法。

---

## 6. 迁移路径：不推倒重来 **[我们的设计]**

现在的 `openoutcry-web` 是一个 6 路由的单体 React 应用，`src/styles/*` 里已经有一套成熟的
Signal Grid 设计系统。**这套 CSS 和组件库要保留**，只换"谁来决定渲染什么"。

分五步，每一步都可以停：

| 步 | 做什么 | 产出 | 可停？ |
|---|---|---|---|
| **S0** | 冻结契约：写 `@outcry/core`（RunEvent、RunId、错误码）+ `@outcry/log` + `@outcry/projection` | 后端能 append/read/replay 一个 run | 可停：此时已能支撑 A-6 复盘 |
| **S1** | 后端内核：`apps/server` + `cordis.yml` + `clock-sim` + `market-csv` + `ledger-memory` + `matching-ashare` + `rules-ashare` + `api-gateway` | `POST /api/runs` 能跑完一次"开盘→撮合→收盘" | 可停：后端已可独立 demo |
| **S2** | 前端外壳：`client-modules` + `client-loader` + `client-ui-slots` + `client-ui-renderer` + `client-ui-layout`（把现在的 `Sidebar.tsx` 搬进来） | 左栏 + 空主区，页面还是旧的 | 可停：外观不变 |
| **S3** | 逐页搬迁：把 `routes/*.tsx` 一个个变成 `client-ui-*` 插件，**组件代码原样搬，只改注册方式** | 6 个页面插件 | 可停：每搬一个都能跑 |
| **S4** | Agent 面：`agent-acp` + `tools` + `tool-order` + `approval-local` | 外部 Agent 能接进来下单 | 可停 |
| **S5** | 生态化（可选）：plugin-manager、插件市场、`outcry.client.external` | 装第三方插件 | 可不做 |

**S3 是唯一有真实工作量的地方，也是最安全的**：每个页面插件的 `client.tsx` 里就是
`export function TrainingPage() { /* 现在 TrainingPage.tsx 的内容原样 */ }`，
外面套一层 `apply(ctx) { ctx.slots.register(...) }`。

一个具体的搬迁示例（`routes/TrainingPage.tsx` → `packages/client-ui-training/src/client.tsx`）：

```tsx
// 之前：由 createHashRouter 的路由表决定渲染
export function TrainingPage() {
  const { current } = useTraining()
  const wide = useMediaQuery('(min-width: 1024px)')
  return wide ? <div className="bench-grid">…</div> : <MobileTaskView … />
}

// 之后：同样的组件，外面加一个插件壳
function TrainingPage() { /* 内容一个字不改 */ }

export const inject = ['slots', 'nav']
export function apply(ctx: ClientContext) {
  ctx.slots.register({ name: 'app.main', key: 'training' }, TrainingPage)
  ctx.effect(() => ctx.nav.register({ id: 'training', path: '/training', order: 20 }))
}
```

`useTraining()` 这个 Context 也可以变成客户端服务 `ctx.training`，
于是"左栏任务树"和"训练场工作台"这两个插件**共享选中态而不互相 import** ——
现在它们已经这么做了（`TrainingProvider`），只是容器从 React Context 换成 cordis Context。

---

## 7. 反模式（都是从 DSH 源码/文档里读出来的硬教训）

1. **不要让实现包被别的包 import。**
   只 import 接口包。一旦 `api-run` import 了 `ledger-pg`，换实现就要改代码，
   插件系统立刻退化成普通模块化。

2. **不要给插件自己留状态。**
   DSH：`Plugin memory is a derived cache`。所有状态从 `ctx.log` 折叠；
   插件重启后能重建，才叫可扩展。

3. **客户端插件不要 `require` 别的 UI 包。**
   DSH 原文：`Do not require('...dsh-client-ui-primitives') or load any other Harness Client package`。
   它们会变、没有类型检查，一个抛错就让你整个 slot 白屏。**控件自己写，样式抄主题令牌。**

4. **不要在客户端折叠事件。**
   折叠逻辑必须只有一份（在后端投影里）。前端再折一遍，两边迟早不一致。

5. **不要用 iframe 承载插件页面。**
   DSH 明确禁止：iframe 拿不到主题令牌、语言和明暗切换，视觉上永远割裂。

6. **同一个服务不要注册两次。**
   cordis 的 loader 会直接拒绝加载整个 profile。这不是限制，是保证"任何时刻只有一个实现"。

7. **补丁层是整块替换，不是深合并。**
   改一个 `config` 字段要重述整个 config 块，否则你会静默丢掉别的设置。

8. **不要给 run 事件加自定义 type 而不升级 `v`。**
   DSH 的 session 格式有 v0→v4 五个迁移包。我们从 v1 开始就要留迁移位。

---

## 8. 里程碑与工作量估计

| 里程碑 | 内容 | 估计 |
|---|---|---|
| M1 | `@outcry/core` + `log-jsonl` + `projection` + 单元测试（重放一致性） | 3–4 天 |
| M2 | 后端内核 + 撮合/账本/规则/时钟 + `api-gateway` | 6–8 天 |
| M3 | 前端 boot 内核（模块表 / loader / slots / renderer / layout） | 4–5 天 |
| M4 | 6 个页面插件搬迁 | 5–6 天 |
| M5 | `agent-acp` + `tools` + `approval` | 6–8 天（依赖 A-1 已有成果） |
| M6 | 端到端：外部 Agent 跑完一次训练 + 复盘回放 | 3–4 天 |

**最小可交付（能写进论文的形态）**：M1 + M2 + M3 + M4 + 一个 mock agent。
此时已经具备：插件化架构、可重放日志、可换实现、可加页面 —— 这四点就是"可扩展性"的全部论据。

---

## 附录：DSH 源码里值得反复看的 6 个文件

| 路径 | 为什么值得看 |
|---|---|
| `@deepseek-ai/cordis/src/context.ts` | 容器的全部真相，300 行 |
| `@deepseek-ai/cordis/src/fiber.ts` | 生命周期与 effect 回收 |
| `@deepseek-ai/dsh-client-ui-layout/lib/client.js` | 一个真实的 `root` slot 注册，含 children 语义 |
| `@deepseek-ai/dsh-client-ui-goal/lib/client.js` | 最小的完整客户端插件（含 inject / register / 数据订阅） |
| `@deepseek-ai/dsh-agent-preset/skills/cordis-plugin-development/references/practices.md` | 12 条硬规矩，每一条都是踩过的坑 |
| `D:\dsh-home\profiles\desktop\cordis.yml` | 418 行插件树，看"配置即架构"长什么样 |
