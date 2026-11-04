import type { EventKind, RunState } from '../types'
import { agentOf } from '../data/agents'
import { canDecide } from './derive'

/**
 * 训练任务（TrainingTask）—— **原型数据**
 *
 * 形状是猜的：store 里目前没有「训练任务」实体，这里按三栏工作台的右栏需要
 * 先定义一个最小实体：
 *
 *   一个任务 = 把一段时间窗内的交易工作委托给某个 Agent 或 Agent 团队。
 *
 * 字段只保留右栏与中栏真正会读的：任务名 / 委托对象 / 时间窗 / 状态 / 两条进度。
 * 第一个任务（task-live）的进度与状态**由 run/events 实时派生**，
 * 其余三个是冻结的示例档案（archive），只用于演示「切任务 → 中栏换内容」。
 * 接真实 store 时，把 MOCK_ARCHIVES 换成后端返回的任务列表即可，组件不用改。
 */

export type TrainingTaskStatus = 'running' | 'pending' | 'done'

export const STATUS_TEXT: Record<TrainingTaskStatus, string> = {
  running: '进行中',
  pending: '待确认',
  done: '已结束',
}

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

export interface TrainingTask {
  id: string
  name: string
  assignee: TrainingAssignee
  startAt: string
  endAt: string
  /** 右栏直接展示的时间窗文案 */
  windowLabel: string
  status: TrainingTaskStatus
  /** true = 当前运行，数据来自 store；false = 冻结档案 */
  live: boolean
  decisions: number
  fills: number
  archive?: TaskArchive
}

export const LIVE_TASK_ID = 'task-live'

const MOCK_ARCHIVES: TrainingTask[] = [
  {
    id: 'task-team',
    name: '连续委托 · 第 3 个交易日',
    assignee: {
      kind: 'team',
      name: '研究团队 · 3 个 Agent',
      members: ['openOutcry · 研究员', 'Codex · 价值研究', 'Kimi · 研究助手'],
    },
    startAt: '2024-04-24 09:15',
    endAt: '2024-04-24 15:00',
    windowLabel: '2024-04-24 全天 · 第 3 个交易日',
    status: 'pending',
    live: false,
    decisions: 0,
    fills: 0,
    archive: {
      equity: 99840.2,
      net: -159.8,
      cash: 77380.2,
      market: 22460,
      decisions: 3,
      fills: 0,
      log: [
        {
          kind: 'user',
          title: '委托已建立，等待确认',
          body: '团队任务需要人工确认分工与预算后才能开始记录决策。',
          at: '08:55',
        },
        {
          kind: 'agent',
          title: '研究员提交盘前分工建议',
          body: '研究员负责资料检索，Codex 负责估值区间，Kimi 负责横向对照。',
          at: '09:02',
        },
        { kind: 'error', title: '预算未批准，暂停委托', body: '调用预算 20 次 / 日，等待人工放行。', at: '09:04' },
      ],
      trades: [],
      note: '该任务尚未开始记录成交：团队分工与预算需先由人工确认。',
    },
  },
  {
    id: 'task-kimi',
    name: '事件驱动复盘 · 4 月第 3 周',
    assignee: { kind: 'agent', name: 'Kimi · 研究助手' },
    startAt: '2024-04-16 09:15',
    endAt: '2024-04-19 15:00',
    windowLabel: '2024-04-16 → 04-19 · 4 个交易日',
    status: 'done',
    live: false,
    decisions: 0,
    fills: 0,
    archive: {
      equity: 101260.4,
      net: 1260.4,
      cash: 81260.4,
      market: 20000,
      decisions: 9,
      fills: 2,
      log: [
        {
          kind: 'agent',
          title: '以事件强度排序候选标的',
          body: '对 12 条披露做事件打分，只保留经营现金流相关的前 3 条。',
          at: '04-16',
        },
        { kind: 'order', title: '提交买入提案 · 公司-026', body: '600 股 · 限价 ¥19.80，等待人工确认。', at: '04-17' },
        { kind: 'order', title: '平仓 · 公司-026', body: '达到原定退出条件后卖出 600 股，含费用净收益 +¥1,260.40。', at: '04-19' },
      ],
      trades: ['买入 公司-026 · 600 股 @ ¥19.80', '卖出 公司-026 · 600 股 @ ¥22.31'],
      note: '任务已结束，台账只读；可回放全部 9 条决策。',
    },
  },
  {
    id: 'task-codex',
    name: '价值锚定 · 财务披露周',
    assignee: { kind: 'agent', name: 'Codex · 价值研究' },
    startAt: '2024-04-25 09:15',
    endAt: '2024-04-26 15:00',
    windowLabel: '2024-04-25 09:15 → 04-26 15:00',
    status: 'done',
    live: false,
    decisions: 0,
    fills: 0,
    archive: {
      equity: 97320.8,
      net: -2679.2,
      cash: 97320.8,
      market: 0,
      decisions: 11,
      fills: 4,
      log: [
        { kind: 'agent', title: '按现金流折算估值区间', body: '给出三档估值：悲观 / 中性 / 乐观，并标注每条假设的证据编号。', at: '04-25' },
        { kind: 'tool', title: '读取 3 份年报附注', body: '仅返回冻结版本片段；附注 7 与附注 11 指向同一笔应收。', at: '04-25' },
        { kind: 'order', title: '全部清仓', body: '披露低于预期，按风控条款清仓，含费用净亏损 −¥2,679.20。', at: '04-26' },
      ],
      trades: ['卖出 公司-042 · 300 股 @ ¥30.10', '卖出 公司-008 · 100 股 @ ¥44.20'],
      note: '该任务为本地 Runner 运行，轨迹未执行真实隔离验证。',
    },
  },
]

/**
 * 把 store 里的当前运行折算成「第一个任务」，再接上冻结档案。
 * 进度口径：决策 = 思考/订单类事件条数；成交 = trades 中状态为「已成交」的笔数。
 */
export function trainingTasksOf(state: RunState): TrainingTask[] {
  const decisions = state.events.filter((e) => e.kind === 'agent' || e.kind === 'order').length
  const fills = state.trades.filter((t) => t.status === '已成交').length
  const status: TrainingTaskStatus =
    state.status === 'aborted' ? 'done' : canDecide(state) || state.proposal.status === 'submitted' ? 'pending' : 'running'
  const agent = agentOf(state.agent)

  const live: TrainingTask = {
    id: LIVE_TASK_ID,
    name: state.proposal.status === 'pending' ? '减仓 公司-017 · 盘前研究' : '减仓 公司-017 · 开盘撮合',
    assignee: { kind: 'agent', name: agent.name },
    startAt: '2024-04-23 09:15',
    endAt: '2024-04-23 15:00',
    windowLabel: '2024-04-23 09:15 → 15:00',
    status,
    live: true,
    decisions,
    fills,
  }

  return [live, ...MOCK_ARCHIVES]
}

export const progressLabel = (task: TrainingTask) => `${task.decisions} 条决策 · ${task.fills} 笔成交`

export const assigneeLabel = (task: TrainingTask) =>
  task.assignee.kind === 'team' ? `团队 · ${task.assignee.name}` : `Agent · ${task.assignee.name}`
