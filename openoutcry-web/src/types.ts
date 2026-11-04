export type AgentId = 'codex' | 'native' | 'kimi' | 'custom'

export interface AgentMeta {
  id: AgentId
  name: string
  source: string
  /** 卡片头部的小标签 */
  tag: string
  version: string
  qualification: string
  description: string
  budgetUsed: number
  budgetTotal: number
  lastSession: string
  builtin: boolean

  /* ---------- Agent 卡字段 ----------
     参照 TraderHarness 的 traderharness/agents/agent_card.py：
     一个 Agent 就是一张 JSON 卡（id / persona / 模型 / 资金与风控上限 / 工具白名单）。
     卡随平台发布的是内置卡（只读），用户目录里同名 id 的本地卡覆盖内置卡。 */

  /** 模型标识；外部 Agent 未上报时写「未上报」，它直接决定评测资格 */
  model: string
  /** 平台允许它调用的工具数（研究 / 账户 / 下单分开计） */
  tools: number
  /** 人格与研究方法，相当于卡里的 persona */
  persona: string
  strategyTags: string[]
  riskProfile: '保守' | '均衡' | '激进'
  holdingPeriod: string
  initialCash: number
  maxPositions: number
  maxPositionPct: number
  /** 卡来自内置发布还是用户目录 */
  cardOrigin: 'builtin' | 'local'
}

export type EventKind = 'agent' | 'tool' | 'order' | 'user' | 'error'

export interface RunEvent {
  id: number
  kind: EventKind
  title: string
  body: string
  meta: string
  /** 事件产生时的模拟时钟，用于台账时间列 */
  at: string
}

export type ProposalStatus = 'pending' | 'submitted' | 'rejected' | 'filled' | 'cancelled'

export interface Proposal {
  status: ProposalStatus
  /** Agent 原始意图，永远保留 */
  original: number
  /** 人类最终确认数量 */
  quantity: number
  price: number
}

export interface Holding {
  name: string
  quantity: number
  /** T+1 可卖数量 */
  sellable: number
  cost: number
  price: number
  entryFee: number
}

export interface Trade {
  id: string
  name: string
  side: '买入' | '卖出'
  quantity: number
  price: number
  fee: number
  time: string
  /** null = 仅建仓，未实现 */
  pnl: number | null
  reason: string
  evidence: string
  status: string
}

export type RunStatus = 'active' | 'paused' | 'aborted' | 'disconnected'
export type Mode = 'approval' | 'goal'
export type Collaboration = '人工确认' | '人机混合' | '自主运行'

export interface RunState {
  agent: AgentId
  initial: number
  cash: number
  realized: number
  fees: number
  status: RunStatus
  mode: Mode
  collaboration: Collaboration
  proposal: Proposal
  clock: string
  holdings: Holding[]
  trades: Trade[]
  events: RunEvent[]
}

export interface Totals {
  market: number
  floating: number
  equity: number
  net: number
}

export interface ToastMessage {
  id: number
  kind: 'info' | 'success' | 'warn'
  text: string
}

/** 台账类型筛选 */
export type LedgerFilter = 'all' | 'agent' | 'work' | 'user'
