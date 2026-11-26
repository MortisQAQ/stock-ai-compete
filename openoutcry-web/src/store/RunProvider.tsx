import { createContext, useContext, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'

import type {
  AgentId,
  EventKind,
  Holding,
  MandatePayload,
  RunEvent,
  RunState,
  Totals,
  WorkspaceKind,
} from '../types'
import { CLOCK_CLOSE, CLOCK_MATCHED, createInitialRun } from '../data/run'
import { createInitialLiveRun } from '../data/live'
import { agentOf } from '../data/agents'
import { totalsOf, runStatusLabel } from './derive'
import { round } from '../lib/format'
import { useToast, type ToastOptions } from './ToastProvider'

type Action =
  | { type: 'switchAgent'; agent: AgentId }
  | { type: 'applyMandate'; mandate: MandatePayload }
  | { type: 'bindAgent'; agent: AgentId }
  | { type: 'approve'; quantity: number; actor: '人工确认' | '人工修改后批准' | 'Agent 自主提交' }
  | { type: 'undoApprove' }
  | { type: 'reject' }
  | { type: 'fill' }
  | { type: 'advanceClose' }
  | { type: 'completeGoalRun' }
  | { type: 'recordLiveFill'; quantity: number; price: number; fee?: number; actor: '按建议执行' | '按实际修改记录' }
  | { type: 'upsertHolding'; holding: Omit<Holding, 'entryFee'> }
  | { type: 'removeHolding'; name: string }
  | { type: 'setCash'; cash: number }
  | { type: 'togglePause' }
  | { type: 'abort' }
  | { type: 'guidance'; text: string }
  | { type: 'goalMode' }

const MAX_EVENT_ID = (state: RunState) => state.events.reduce((m, e) => Math.max(m, e.id), 0)

function withEvent(
  state: RunState,
  ev: { kind: EventKind; title: string; body: string; meta: string; at?: string; divider?: string },
): RunState {
  const event: RunEvent = {
    id: MAX_EVENT_ID(state) + 1,
    kind: ev.kind,
    title: ev.title,
    body: ev.body,
    meta: ev.meta,
    at: ev.at ?? state.clock.slice(-5),
    divider: ev.divider,
  }
  return { ...state, events: [...state.events, event] }
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case 'switchAgent':
      return state.kind === 'live' ? createInitialLiveRun(action.agent) : createInitialRun(action.agent)

    case 'applyMandate':
      return createInitialRun(action.mandate.team[0] ?? 'native', action.mandate)

    case 'bindAgent': {
      const nextAgent = agentOf(action.agent)
      return withEvent(
        { ...state, agent: action.agent },
        {
          kind: 'agent',
          title: '已切换绑定 Agent · ' + nextAgent.name,
          body: '当前镜像持仓与现金保持不变，后续研究与调仓建议将由该 Agent 提供。',
          meta: 'agent.bound · 刚刚',
          at: '刚刚',
        },
      )
    }

    case 'approve': {
      if (state.status !== 'active' || state.proposal.status !== 'pending') return state
      const quantity = action.quantity
      const autonomy = action.actor === 'Agent 自主提交'
      const next: RunState = {
        ...state,
        proposal: { ...state.proposal, quantity, status: 'submitted' },
        collaboration: autonomy
          ? state.collaboration === '人工确认'
            ? '自主运行'
            : state.collaboration
          : quantity === state.proposal.original
            ? '人工确认'
            : '人机混合',
      }
      return withEvent(next, {
        kind: autonomy ? 'agent' : 'user',
        title: action.actor + '，已提交待开盘撮合',
        body:
          quantity +
          ' 股 · 限价 ¥' +
          state.proposal.price.toFixed(2) +
          '；原始提案 ' +
          state.proposal.original +
          ' 股保留。此刻账户现金与持仓零变化。',
        meta: 'order.submitted · 09:15',
      })
    }

    case 'undoApprove': {
      if (state.status !== 'active' || state.proposal.status !== 'submitted') return state
      const events = state.events.filter((e) => !e.meta.startsWith('order.submitted'))
      return {
        ...state,
        proposal: { ...state.proposal, quantity: state.proposal.original, status: 'pending' },
        events,
      }
    }

    case 'reject': {
      if (state.status !== 'active' || state.proposal.status !== 'pending') return state
      const isLive = state.kind === 'live'
      const asset = state.proposal.asset ?? '标的'
      return withEvent(
        {
          ...state,
          proposal: { ...state.proposal, status: 'rejected' },
          collaboration: '人工确认',
        },
        {
          kind: 'user',
          title: isLive ? '已记录暂不采纳' : '人工拒绝提案',
          body: isLive
            ? asset + ' 调仓建议单已标记为暂不采纳，镜像持仓与现金不变，原始建议保留供复盘对照。'
            : '卖出提案被拒绝，未提交撮合。账户与持仓不变。',
          meta: isLive ? 'advisory.ignored · 刚刚' : 'order.rejected · 09:16',
          at: isLive ? '刚刚' : undefined,
        },
      )
    }

    case 'fill': {
      if (state.proposal.status !== 'submitted') return state
      const price = 20.36
      const qty = state.proposal.quantity
      const fee = 7
      const asset = state.proposal.asset ?? '公司-017'
      const matchedHolding = state.holdings.find((h) => h.name === asset)
      const costBasis = matchedHolding?.cost ?? 18.2
      const holdings = state.holdings
        .map((h) =>
          h.name === asset
            ? { ...h, quantity: h.quantity - qty, sellable: Math.max(0, h.sellable - qty) }
            : h,
        )
        .filter((h) => h.quantity > 0)
      const pnl = round((price - costBasis) * qty - fee)
      const next: RunState = {
        ...state,
        cash: round(state.cash + price * qty - fee),
        realized: round(state.realized + pnl),
        fees: round(state.fees + fee),
        holdings,
        trades: [
          ...state.trades,
          {
            id: 'sell17',
            name: asset,
            side: '卖出',
            quantity: qty,
            price,
            fee,
            time: '2024-04-23 开盘',
            pnl,
            reason: '开盘后按提案减仓，兑现部分浮盈。',
            evidence: state.proposal.evidence ?? 'ev_018',
            status: '已成交',
          },
        ],
        proposal: { ...state.proposal, status: 'filled' },
        clock: CLOCK_MATCHED,
        phase: 'open_match',
      }
      return withEvent(next, {
        kind: 'order',
        divider: '09:30 开盘撮合窗口 · 真实开盘价揭示',
        title: '开盘撮合完成 · 卖出 ' + asset + ' ' + qty + ' 股 @ ¥20.36',
        body:
          '开盘价 ¥20.36 满足限价 ¥' +
          state.proposal.price.toFixed(2) +
          '，已按未复权真实价成交（费用 ¥7.00）。现金、T+1 持仓与已实现盈亏同步刷新。',
        meta: 'order.filled · 09:30',
        at: '09:30',
      })
    }

    case 'advanceClose': {
      if (state.kind !== 'training' || state.phase === 'close_settle') return state
      const holdings = state.holdings.map((h) =>
        h.name === '公司-017' ? { ...h, price: 20.18, sellable: h.quantity } : { ...h, sellable: h.quantity },
      )
      return withEvent(
        {
          ...state,
          phase: 'close_settle',
          clock: CLOCK_CLOSE,
          holdings,
        },
        {
          kind: 'system',
          divider: '15:00 尾盘结算 · 日终快照与 T+1 解冻',
          title: '日终清算完成 · 持仓估值与 T+1 额度已更新',
          body: '公司-017 收盘价 ¥20.18，早盘 ¥20.36 减仓躲过了尾盘回落。全部事件与账户快照已封存，可继续推进或前往复盘。',
          meta: 'day.settled · 15:00',
          at: '15:00',
        },
      )
    }

    case 'completeGoalRun': {
      if (state.kind !== 'training') return state
      return withEvent(
        {
          ...state,
          day: state.totalDays ?? 20,
          phase: 'close_settle',
          clock: '2024-04-26 15:00',
          mode: 'goal',
          collaboration: state.collaboration === '人工确认' ? '人机混合' : state.collaboration,
        },
        {
          kind: 'system',
          divider: `Day ${state.totalDays ?? 20} / ${state.totalDays ?? 20} · /goal 自主推进完成`,
          title: '已完成剩余交易日模拟 · 可进入复盘与对照',
          body: '已按同一委托口径跑完本周期全部 20 个交易日，完整事件流与账本快照已就绪。',
          meta: 'run.completed · 15:00',
          at: '15:00',
        },
      )
    }

    case 'recordLiveFill': {
      if (state.kind !== 'live' || state.status !== 'active' || state.proposal.status !== 'pending') return state
      const asset = state.proposal.asset ?? '示例-制造B'
      const side = state.proposal.side ?? '卖出'
      const qty = action.quantity
      const price = round(action.price)
      const fee = action.fee ?? Math.max(5, round(price * qty * 0.0005))
      const matchedHolding = state.holdings.find((h) => h.name === asset)

      let holdings = state.holdings
      let cash = state.cash
      let realized = state.realized
      let pnl: number | null = null

      if (side === '卖出') {
        const costBasis = matchedHolding?.cost ?? price
        pnl = round((price - costBasis) * qty - fee)
        cash = round(state.cash + price * qty - fee)
        realized = round(state.realized + pnl)
        holdings = state.holdings
          .map((h) =>
            h.name === asset
              ? { ...h, quantity: Math.max(0, h.quantity - qty), sellable: Math.max(0, h.sellable - qty), price }
              : h,
          )
          .filter((h) => h.quantity > 0)
      } else {
        cash = round(Math.max(0, state.cash - price * qty - fee))
        if (matchedHolding) {
          const totalQty = matchedHolding.quantity + qty
          const avgCost = round((matchedHolding.cost * matchedHolding.quantity + price * qty) / totalQty)
          holdings = state.holdings.map((h) =>
            h.name === asset
              ? { ...h, quantity: totalQty, cost: avgCost, price, entryFee: round(h.entryFee + fee) }
              : h,
          )
        } else {
          holdings = [
            ...state.holdings,
            { name: asset, quantity: qty, sellable: 0, cost: price, price, entryFee: fee },
          ]
        }
      }

      const exactMatch =
        action.actor === '按建议执行' && qty === state.proposal.original && Math.abs(price - state.proposal.price) < 0.005

      const next: RunState = {
        ...state,
        cash,
        realized,
        fees: round(state.fees + fee),
        holdings,
        trades: [
          ...state.trades,
          {
            id: 'live-fill-' + (state.trades.length + 1),
            name: asset,
            side,
            quantity: qty,
            price,
            fee,
            time: '刚刚 · 实盘回填',
            pnl,
            reason: state.proposal.reason ?? '根据调仓建议单在券商端执行后手动回填。',
            evidence: state.proposal.evidence ?? 'live_ev_003',
            status: '已记录',
          },
        ],
        proposal: { ...state.proposal, quantity: qty, executedPrice: price, status: 'filled' },
        collaboration: exactMatch ? '人工确认' : '人机混合',
        syncLabel: '已录实盘成交 · 刚刚',
      }

      return withEvent(next, {
        kind: 'order',
        title: action.actor + '，镜像账本已更新',
        body:
          side +
          ' ' +
          asset +
          ' ' +
          qty +
          ' 股 · 实际成交 ¥' +
          price.toFixed(2) +
          ' · 费用 ¥' +
          fee.toFixed(2) +
          '（AI 原始建议 ' +
          state.proposal.original +
          ' 股 @ ¥' +
          state.proposal.price.toFixed(2) +
          '）。',
        meta: 'live.filled · 刚刚',
        at: '刚刚',
      })
    }

    case 'upsertHolding': {
      const incoming = action.holding
      const name = incoming.name.trim()
      if (!name || incoming.quantity <= 0) return state
      const sellable = Math.max(0, Math.min(incoming.quantity, incoming.sellable))
      const exists = state.holdings.some((h) => h.name === name)
      const holdings = exists
        ? state.holdings.map((h) =>
            h.name === name
              ? { ...h, quantity: incoming.quantity, sellable, cost: round(incoming.cost), price: round(incoming.price) }
              : h,
          )
        : [
            ...state.holdings,
            { name, quantity: incoming.quantity, sellable, cost: round(incoming.cost), price: round(incoming.price), entryFee: 0 },
          ]

      return withEvent(
        {
          ...state,
          holdings,
          syncLabel: '手动维护 · 刚刚',
        },
        {
          kind: 'user',
          title: (exists ? '更新镜像持仓 · ' : '新增镜像持仓 · ') + name,
          body:
            incoming.quantity +
            ' 股（可卖 ' +
            sellable +
            ' 股）· 成本 ¥' +
            round(incoming.cost).toFixed(2) +
            ' · 现价 ¥' +
            round(incoming.price).toFixed(2) +
            '。',
          meta: 'mirror.holding · 手动维护',
          at: '刚刚',
        },
      )
    }

    case 'removeHolding': {
      const exists = state.holdings.some((h) => h.name === action.name)
      if (!exists) return state
      return withEvent(
        {
          ...state,
          holdings: state.holdings.filter((h) => h.name !== action.name),
          syncLabel: '手动维护 · 刚刚',
        },
        {
          kind: 'user',
          title: '移除镜像持仓 · ' + action.name,
          body: '已从实盘镜像账本中移除该持仓记录。',
          meta: 'mirror.holding · 已移除',
          at: '刚刚',
        },
      )
    }

    case 'setCash': {
      const cash = round(Math.max(0, action.cash))
      return withEvent(
        {
          ...state,
          cash,
          syncLabel: '手动维护 · 刚刚',
        },
        {
          kind: 'user',
          title: '调整镜像可用现金',
          body: '可用现金已更新为 ¥' + cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '。',
          meta: 'mirror.cash · 手动维护',
          at: '刚刚',
        },
      )
    }

    case 'togglePause': {
      if (state.status === 'aborted') return state
      if (state.status === 'active') {
        return withEvent({ ...state, status: 'paused' }, {
          kind: 'error',
          title: '运行已暂停',
          body: '用户暂停运行。时钟、账户与轨迹保持不变，可继续。',
          meta: 'run.paused',
        })
      }
      return withEvent({ ...state, status: 'active' }, {
        kind: 'agent',
        title: '运行已继续',
        body: '从暂停时点恢复，未重放已发生事件。',
        meta: 'run.resumed',
      })
    }

    case 'abort': {
      if (state.status === 'aborted') return state
      const proposal =
        state.proposal.status === 'pending' || state.proposal.status === 'submitted'
          ? { ...state.proposal, status: 'cancelled' as const }
          : state.proposal
      return withEvent({ ...state, status: 'aborted', proposal }, {
        kind: 'error',
        title: '运行已中止',
        body: '用户中止本次运行。账户与轨迹保留，可继续复盘但不能续跑。',
        meta: 'run.aborted',
      })
    }

    case 'guidance': {
      if (state.status === 'aborted') return state
      const isLive = state.kind === 'live'
      return withEvent(
        { ...state, collaboration: '人机混合' },
        {
          kind: 'user',
          title: isLive ? '实盘追问 / 补充说明' : '人工指导',
          body: isLive
            ? action.text + '\n（已记录实时上下文追问，Agent 只提供分析与建议，不直接修改账户。）'
            : action.text + '\n（指导以带时间戳的消息追加，不改变已提交的动作。）',
          meta: isLive ? 'live.prompt · 人机协作' : 'guidance · 人机协作',
          at: isLive ? '刚刚' : undefined,
        },
      )
    }

    case 'goalMode': {
      // 实战工作台严禁自动无确认下单，直接忽略 /goal 切换
      if (state.kind === 'live' || state.status === 'aborted') return state
      return withEvent(
        { ...state, mode: 'goal', collaboration: '自主运行' },
        {
          kind: 'agent',
          title: '进入自主推进模式',
          body: '后续交易日由 Agent 连续处理，订单不再逐单等待人工确认；仍可追加带时间戳的指导。',
          meta: 'mode.goal · 已确认',
        },
      )
    }

    default:
      return state
  }
}

export interface RunActions {
  switchAgent: (id: AgentId) => void
  applyMandate: (mandate: MandatePayload) => void
  deployAgentToLive: (id: AgentId) => void
  approve: (quantity: number, actor?: '人工确认' | '人工修改后批准' | 'Agent 自主提交') => void
  undoApprove: () => void
  reject: () => void
  match: () => void
  advanceClose: () => void
  completeGoalRun: () => void
  recordLiveFill: (quantity: number, price: number, actor?: '按建议执行' | '按实际修改记录') => void
  upsertHolding: (holding: Omit<Holding, 'entryFee'>) => void
  removeHolding: (name: string) => void
  setCash: (cash: number) => void
  togglePause: () => void
  abort: () => void
  sendGuidance: (text: string) => void
  enterGoalMode: () => void
}

export interface RunContextValue {
  state: RunState
  totals: Totals
  status: string
  actions: RunActions
}

interface DualRunStore {
  training: RunContextValue
  live: RunContextValue
}

const DualRunContext = createContext<DualRunStore | null>(null)
const WorkbenchScopeContext = createContext<WorkspaceKind>('training')

/** 标识当前子树属于历史训练场还是实战工作台；默认 training */
export function WorkbenchScopeProvider({
  kind,
  children,
}: {
  kind: WorkspaceKind
  children: ReactNode
}) {
  return <WorkbenchScopeContext.Provider value={kind}>{children}</WorkbenchScopeContext.Provider>
}

export function useWorkspaceKind(): WorkspaceKind {
  return useContext(WorkbenchScopeContext)
}

/** 初值在模块加载时算一次：reducer 不会原地修改它们 */
const INITIAL_RUN = createInitialRun('native')
const INITIAL_LIVE_RUN = createInitialLiveRun('native')

function makeActions(
  dispatch: React.Dispatch<Action>,
  dispatchLive: React.Dispatch<Action>,
  kind: WorkspaceKind,
  notify: (text: string, tone?: 'info' | 'success' | 'warn', options?: ToastOptions) => void,
): RunActions {
  const isLive = kind === 'live'
  return {
    switchAgent: (id) => dispatch({ type: 'switchAgent', agent: id }),
    applyMandate: (mandate) => {
      dispatch({ type: 'applyMandate', mandate })
      notify(`已开具委托单 ${mandate.no} 并同步团队与口径`, 'success')
    },
    deployAgentToLive: (id) => {
      dispatchLive({ type: 'bindAgent', agent: id })
      notify('已将该 Agent 应用到实战工作台', 'success')
    },
    approve: (quantity, actor = '人工确认') => {
      dispatch({ type: 'approve', quantity, actor })
      notify('已提交待开盘撮合（账户尚未变化）', 'info', {
        actionLabel: '撤销',
        onAction: () => {
          dispatch({ type: 'undoApprove' })
          notify('已撤销提交，提案回到待确认态', 'warn')
        },
        durationMs: 3600,
      })
    },
    undoApprove: () => {
      dispatch({ type: 'undoApprove' })
      notify('已撤销提交，提案回到待确认态', 'warn')
    },
    reject: () => {
      dispatch({ type: 'reject' })
      notify(isLive ? '已标记为暂不采纳' : '已拒绝该提案', 'warn')
    },
    match: () => {
      dispatch({ type: 'fill' })
      notify('09:30 开盘撮合完成，账本已刷新', 'success')
    },
    advanceClose: () => {
      dispatch({ type: 'advanceClose' })
      notify('已推进至 15:00 尾盘结算', 'success')
    },
    completeGoalRun: () => {
      dispatch({ type: 'completeGoalRun' })
      notify('已按 /goal 模式完成剩余交易日', 'success')
    },
    recordLiveFill: (quantity, price, actor = '按建议执行') => {
      dispatch({ type: 'recordLiveFill', quantity, price, actor })
      notify('已记录实盘成交并更新镜像账本', 'success')
    },
    upsertHolding: (holding) => {
      dispatch({ type: 'upsertHolding', holding })
      notify('镜像持仓已更新', 'success')
    },
    removeHolding: (name) => {
      dispatch({ type: 'removeHolding', name })
      notify('已移除持仓 ' + name, 'warn')
    },
    setCash: (cash) => {
      dispatch({ type: 'setCash', cash })
      notify('可用现金已更新', 'success')
    },
    togglePause: () => dispatch({ type: 'togglePause' }),
    abort: () => {
      dispatch({ type: 'abort' })
      notify('运行已中止', 'warn')
    },
    sendGuidance: (text: string) => {
      dispatch({ type: 'guidance', text })
      notify(isLive ? '已发送追问' : '指导已追加', 'success')
    },
    enterGoalMode: () => {
      if (isLive) {
        notify('实战工作台禁用自动下单推进', 'warn')
        return
      }
      dispatch({ type: 'goalMode' })
      notify('已进入自主推进', 'success')
    },
  }
}

export function RunProvider({ children }: { children: ReactNode }) {
  const [trainingState, dispatchTraining] = useReducer(reducer, INITIAL_RUN)
  const [liveState, dispatchLive] = useReducer(reducer, INITIAL_LIVE_RUN)
  const { notify } = useToast()

  const trainingActions = useMemo(
    () => makeActions(dispatchTraining, dispatchLive, 'training', notify),
    [notify],
  )
  const liveActions = useMemo(
    () => makeActions(dispatchLive, dispatchLive, 'live', notify),
    [notify],
  )

  const trainingTotals = useMemo(() => totalsOf(trainingState), [trainingState])
  const trainingStatus = useMemo(() => runStatusLabel(trainingState), [trainingState])

  const liveTotals = useMemo(() => totalsOf(liveState), [liveState])
  const liveStatus = useMemo(() => runStatusLabel(liveState), [liveState])

  const store = useMemo<DualRunStore>(
    () => ({
      training: {
        state: trainingState,
        totals: trainingTotals,
        status: trainingStatus,
        actions: trainingActions,
      },
      live: {
        state: liveState,
        totals: liveTotals,
        status: liveStatus,
        actions: liveActions,
      },
    }),
    [trainingState, trainingTotals, trainingStatus, trainingActions, liveState, liveTotals, liveStatus, liveActions],
  )

  return <DualRunContext.Provider value={store}>{children}</DualRunContext.Provider>
}

export function useRun(explicitScope?: WorkspaceKind): RunContextValue {
  const store = useContext(DualRunContext)
  if (!store) throw new Error('useRun 必须在 RunProvider 内部使用')
  const ambientScope = useContext(WorkbenchScopeContext)
  return store[explicitScope ?? ambientScope]
}
