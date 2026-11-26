export type AgentId = 'codex' | 'native' | 'kimi' | 'custom'

export type WorkspaceKind = 'training' | 'live'

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

export type EventKind = 'agent' | 'tool' | 'order' | 'user' | 'error' | 'system'

export interface EvidenceItem {
  id: string
  title: string
  publishedAt: string
  pitPass: boolean
  summary: string
}

export interface RunEvent {
  id: number
  kind: EventKind
  title: string
  body: string
  meta: string
  /** 事件产生时的模拟时钟，用于台账时间列 */
  at: string
  /** 可选阶段分隔条文案（渲染在该事件之前） */
  divider?: string
  /** 可选角色标识（多 Agent 团队时区分 主交易员 / 研究员 / 风控官） */
  speakerRole?: string
  /** 可选 PIT 证据卡片列表（用于工具调用条展开） */
  evidenceItems?: EvidenceItem[]
  /** 可选时点闸门拦截提示 */
  interceptedNote?: string
}

export type ProposalStatus = 'pending' | 'submitted' | 'rejected' | 'filled' | 'cancelled'

export interface Proposal {
  status: ProposalStatus
  /** Agent 原始意图，永远保留 */
  original: number
  /** 人类最终确认数量 */
  quantity: number
  price: number
  /** 标的与方向（供提案单/建议单复用展示） */
  asset?: string
  side?: '买入' | '卖出'
  /** 实战工作台参考价区间与失效条件 */
  priceBand?: string
  invalidation?: string
  evidence?: string
  reason?: string
  /** 实盘回填时记录的实际成交价 */
  executedPrice?: number
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
export type TrainingPhase = 'pre_market' | 'open_match' | 'close_settle'

export interface MandatePayload {
  no: string
  title: string
  from: string
  to: string
  days: number
  universeId: string
  universeLabel: string
  cadenceId: string
  cadenceLabel: string
  team: AgentId[]
  capital: number
  mode: Mode
  blindMask: boolean
}

export interface RunState {
  kind: WorkspaceKind
  agent: AgentId
  /** 当前委托单号与口径元数据（历史训练场） */
  mandateNo?: string
  team?: AgentId[]
  universeLabel?: string
  cadenceLabel?: string
  day?: number
  totalDays?: number
  phase?: TrainingPhase
  pitCutoff?: string
  blindMask?: boolean
  interceptedCount?: number
  initial: number
  cash: number
  realized: number
  fees: number
  status: RunStatus
  mode: Mode
  collaboration: Collaboration
  proposal: Proposal
  clock: string
  /** 实战工作台：镜像持仓维护时间说明 */
  syncLabel?: string
  /** 实战工作台：实时市场阶段说明 */
  marketSession?: string
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
  actionLabel?: string
  onAction?: () => void
}

/** 训练 / 训练任务状态（台账与任务切换器共用一套取值） */
export type TrainingStatus = 'running' | 'pending' | 'done'

/** 账户四格表头的一项 */
export interface BandItem {
  label: string
  value: string
  note: string
  tone?: 'up' | 'dn' | ''
}

/* ---------------- 训练任务 ---------------- */

export interface TrainingAssignee {
  kind: 'agent' | 'team'
  name: string
  /** 团队任务才有的成员名单 */
  members?: string[]
}

/** 冻结档案里的一条决策 —— 形状对齐 RunEvent，方便将来直接替换 */
export interface TaskLogLine {
  kind: EventKind
  title: string
  body: string
  at: string
}

export interface TaskArchive {
  /** 任务结束时的账户快照，只用于非当前任务的只读视图 */
  equity: number
  net: number
  cash: number
  market: number
  decisions: number
  fills: number
  log: TaskLogLine[]
  trades: string[]
  note: string
}

/**
 * 任务下的一个对话。
 * 一个训练任务里可以和 AI 有多次会话（盘前研究 / 开盘撮合 / 复盘追问），
 * 左栏的任务树就是「任务 → 对话」两级。
 */
export interface TrainingConversation {
  id: string
  name: string
  /** 一行摘要：时间窗 / 条数 / 模型 */
  meta: string
  status: TrainingStatus
}

export interface TrainingTask {
  id: string
  name: string
  /** 该任务下的会话列表，至少一条 */
  conversations: TrainingConversation[]
  assignee: TrainingAssignee
  startAt: string
  endAt: string
  /** 右栏直接展示的时间窗文案 */
  windowLabel: string
  status: TrainingStatus
  /** true = 当前运行，数据来自 store；false = 冻结档案 */
  live: boolean
  /** 任务归属工作区，缺省为 training */
  kind?: WorkspaceKind
  decisions: number
  fills: number
  archive?: TaskArchive
}
