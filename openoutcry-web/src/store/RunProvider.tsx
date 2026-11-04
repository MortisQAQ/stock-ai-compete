import { createContext, useContext, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'

import type { AgentId, EventKind, RunEvent, RunState, Totals } from '../types'
import { createInitialRun, CLOCK_MATCHED } from '../data/run'
import { totalsOf, runStatusLabel } from './derive'
import { round } from '../lib/format'
import { useToast } from './ToastProvider'

/**
 * 运行状态机。
 *
 * 唯一的业务状态入口：页面不直接改业务数据，只 dispatch。
 * 提示（toast）不在这里——它归 ToastProvider，两者通过 useToast() 通信。
 *
 * 已知欠账（留到接后端时处理，见 docs/code-review-2026-11-05.md）：撮合价格、
 * 费用与标的代码目前写在 `fill` 分支里，接真实环境时应改由 action 携带成交结果。
 */
type Action =
  | { type: 'switchAgent'; agent: AgentId }
  | { type: 'approve'; quantity: number; actor: '人工确认' | '人工修改后批准' | 'Agent 自主提交' }
  | { type: 'reject' }
  | { type: 'fill' }
  | { type: 'togglePause' }
  | { type: 'abort' }
  | { type: 'guidance'; text: string }
  | { type: 'goalMode' }

const MAX_EVENT_ID = (state: RunState) => state.events.reduce((m, e) => Math.max(m, e.id), 0)

function withEvent(
  state: RunState,
  ev: { kind: EventKind; title: string; body: string; meta: string; at?: string },
): RunState {
  const event: RunEvent = {
    id: MAX_EVENT_ID(state) + 1,
    kind: ev.kind,
    title: ev.title,
    body: ev.body,
    meta: ev.meta,
    at: ev.at ?? state.clock.slice(11),
  }
  return { ...state, events: [...state.events, event] }
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case 'switchAgent':
      return createInitialRun(action.agent)

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
        title: action.actor + '，进入待撮合',
        body: quantity + ' 股 · 限价 ¥20.30；原始提案 100 股保留。账户尚未变化。',
        meta: 'order.submitted · 09:15',
      })
    }

    case 'reject': {
      if (state.status !== 'active' || state.proposal.status !== 'pending') return state
      return withEvent(
        {
          ...state,
          proposal: { ...state.proposal, status: 'rejected' },
          collaboration: '人工确认',
        },
        {
          kind: 'user',
          title: '人工拒绝提案',
          body: '卖出提案被拒绝，未提交撮合。账户与持仓不变。',
          meta: 'order.rejected · 09:16',
        },
      )
    }

    case 'fill': {
      if (state.proposal.status !== 'submitted') return state
      const price = 20.36
      const qty = state.proposal.quantity
      const fee = 7
      const holdings = state.holdings
        .map((h) =>
          h.name === '公司-017'
            ? { ...h, quantity: h.quantity - qty, sellable: h.sellable - qty }
            : h,
        )
        .filter((h) => h.quantity > 0)
      const next: RunState = {
        ...state,
        cash: round(state.cash + price * qty - fee),
        realized: round(state.realized + (price - 18.2) * qty - fee),
        fees: round(state.fees + fee),
        holdings,
        trades: [
          ...state.trades,
          {
            id: 'sell17',
            name: '公司-017',
            side: '卖出',
            quantity: qty,
            price,
            fee,
            time: '2024-04-23 开盘',
            pnl: round((price - 18.2) * qty - fee),
            reason: '开盘后按提案减仓，兑现部分浮盈。',
            evidence: 'ev_018',
            status: '已成交',
          },
        ],
        proposal: { ...state.proposal, status: 'filled' },
        clock: CLOCK_MATCHED,
      }
      return withEvent(next, {
        kind: 'order',
        title: '撮合完成',
        body: qty + ' 股 · 成交价 ¥20.36 · 费用 ¥7.00。已实现盈亏同步更新。',
        meta: 'order.filled · 09:30',
        at: '09:30',
      })
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
      return withEvent(
        { ...state, collaboration: '人机混合' },
        {
          kind: 'user',
          title: '人工指导',
          body: action.text + '\n（指导以带时间戳的消息追加，不改变已提交的动作。）',
          meta: 'guidance · 人机协作',
        },
      )
    }

    case 'goalMode': {
      if (state.status === 'aborted') return state
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
  approve: (quantity: number, actor?: '人工确认' | '人工修改后批准' | 'Agent 自主提交') => void
  reject: () => void
  match: () => void
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

const RunContext = createContext<RunContextValue | null>(null)

/** 初值在模块加载时算一次：reducer 不会原地修改它 */
const INITIAL_RUN = createInitialRun('native')

export function RunProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_RUN)
  const { notify } = useToast()

  const actions = useMemo<RunActions>(
    () => ({
      switchAgent: (id) => dispatch({ type: 'switchAgent', agent: id }),
      approve: (quantity, actor = '人工确认') => {
        dispatch({ type: 'approve', quantity, actor })
        notify('订单已提交，尚未成交', 'info')
      },
      reject: () => {
        dispatch({ type: 'reject' })
        notify('已拒绝该提案', 'warn')
      },
      match: () => {
        dispatch({ type: 'fill' })
        notify('演示撮合完成', 'success')
      },
      togglePause: () => dispatch({ type: 'togglePause' }),
      abort: () => {
        dispatch({ type: 'abort' })
        notify('运行已中止', 'warn')
      },
      sendGuidance: (text: string) => {
        dispatch({ type: 'guidance', text })
        notify('指导已追加', 'success')
      },
      enterGoalMode: () => {
        dispatch({ type: 'goalMode' })
        notify('已进入自主推进', 'success')
      },
    }),
    [notify],
  )

  const totals = useMemo(() => totalsOf(state), [state])
  const status = useMemo(() => runStatusLabel(state), [state])

  const value = useMemo<RunContextValue>(
    () => ({ state, totals, status, actions }),
    [state, totals, status, actions],
  )

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>
}

export function useRun(): RunContextValue {
  const ctx = useContext(RunContext)
  if (!ctx) throw new Error('useRun 必须在 RunProvider 内部使用')
  return ctx
}
