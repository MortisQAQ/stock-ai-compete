import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { create } from 'zustand'

import type {
  AgentId,
  Holding,
  MandatePayload,
  RunEvent,
  RunState,
  Totals,
  TranslationKey,
  WorkspaceKind,
} from '../types'
import { CLOCK_CLOSE, CLOCK_MATCHED, createInitialRun } from '../data/run'
import { createInitialLiveRun } from '../data/live'
import { agentOf } from '../data/agents'
import { totalsOf, runStatusLabel } from './derive'
import { round } from '../lib/format'
import { useLocaleStore } from './LocaleProvider'
import { useToastStore } from './ToastProvider'

type ApproveActor = '人工确认' | '人工修改后批准' | 'Agent 自主提交'
type LiveFillActor = '按建议执行' | '按实际修改记录'

const APPROVE_ACTOR_KEY: Record<ApproveActor, TranslationKey> = {
  人工确认: 'events.actors.humanConfirm',
  人工修改后批准: 'events.actors.humanModify',
  'Agent 自主提交': 'events.actors.agentAuto',
}

const LIVE_ACTOR_KEY: Record<LiveFillActor, TranslationKey> = {
  按建议执行: 'events.actors.liveAsSuggested',
  按实际修改记录: 'events.actors.liveAsModified',
}

type Action =
  | { type: 'switchAgent'; agent: AgentId }
  | { type: 'applyMandate'; mandate: MandatePayload }
  | { type: 'bindAgent'; agent: AgentId }
  | { type: 'approve'; quantity: number; actor: ApproveActor }
  | { type: 'undoApprove' }
  | { type: 'reject' }
  | { type: 'fill' }
  | { type: 'advanceClose' }
  | { type: 'completeGoalRun' }
  | { type: 'recordLiveFill'; quantity: number; price: number; fee?: number; actor: LiveFillActor }
  | { type: 'upsertHolding'; holding: Omit<Holding, 'entryFee'> }
  | { type: 'removeHolding'; name: string }
  | { type: 'setCash'; cash: number }
  | { type: 'togglePause' }
  | { type: 'abort' }
  | { type: 'guidance'; text: string }
  | { type: 'goalMode' }

const MAX_EVENT_ID = (state: RunState) => state.events.reduce((m, e) => Math.max(m, e.id), 0)

function withEvent(state: RunState, ev: Omit<RunEvent, 'id' | 'at'> & { at?: string }): RunState {
  const event: RunEvent = {
    ...ev,
    id: MAX_EVENT_ID(state) + 1,
    at: ev.at ?? state.clock.slice(-5),
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
          titleKey: 'events.dynamic.bindAgentTitle',
          body: '当前镜像持仓与现金保持不变，后续研究与调仓建议将由该 Agent 提供。',
          bodyKey: 'events.dynamic.bindAgentBody',
          meta: 'agent.bound · 刚刚',
          metaKey: 'events.dynamic.bindAgentMeta',
          at: '刚刚',
          atKey: 'common.justNow',
          agentRef: action.agent,
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
        titleKey: 'events.dynamic.approveTitle',
        body:
          quantity +
          ' 股 · 限价 ¥' +
          state.proposal.price.toFixed(2) +
          '；原始提案 ' +
          state.proposal.original +
          ' 股保留。此刻账户现金与持仓零变化。',
        bodyKey: 'events.dynamic.approveBody',
        meta: 'order.submitted · 09:15',
        actorKey: APPROVE_ACTOR_KEY[action.actor],
        i18nParams: {
          qty: quantity,
          price: state.proposal.price.toFixed(2),
          original: state.proposal.original,
        },
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
          titleKey: isLive ? 'events.dynamic.rejectLiveTitle' : 'events.dynamic.rejectSimTitle',
          body: isLive
            ? asset + ' 调仓建议单已标记为暂不采纳，镜像持仓与现金不变，原始建议保留供复盘对照。'
            : '卖出提案被拒绝，未提交撮合。账户与持仓不变。',
          bodyKey: isLive ? 'events.dynamic.rejectLiveBody' : 'events.dynamic.rejectSimBody',
          meta: isLive ? 'advisory.ignored · 刚刚' : 'order.rejected · 09:16',
          metaKey: isLive ? 'events.dynamic.rejectLiveMeta' : undefined,
          at: isLive ? '刚刚' : undefined,
          atKey: isLive ? 'common.justNow' : undefined,
          assetRef: isLive ? asset : undefined,
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
            timeKey: 'common.simTrades.sell17.time',
            pnl,
            reason: '开盘后按提案减仓，兑现部分浮盈。',
            reasonKey: 'common.simTrades.sell17.reason',
            evidence: state.proposal.evidence ?? 'ev_018',
            status: '已成交',
            statusKey: 'status.trade.filled',
          },
        ],
        proposal: { ...state.proposal, status: 'filled' },
        clock: CLOCK_MATCHED,
        phase: 'open_match',
      }
      return withEvent(next, {
        kind: 'order',
        divider: '09:30 开盘撮合窗口 · 真实开盘价揭示',
        dividerKey: 'events.dynamic.fillDivider',
        title: '开盘撮合完成 · 卖出 ' + asset + ' ' + qty + ' 股 @ ¥20.36',
        titleKey: 'events.dynamic.fillTitle',
        body:
          '开盘价 ¥20.36 满足限价 ¥' +
          state.proposal.price.toFixed(2) +
          '，已按未复权真实价成交（费用 ¥7.00）。现金、T+1 持仓与已实现盈亏同步刷新。',
        bodyKey: 'events.dynamic.fillBody',
        meta: 'order.filled · 09:30',
        at: '09:30',
        assetRef: asset,
        i18nParams: {
          qty,
          limit: state.proposal.price.toFixed(2),
        },
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
          dividerKey: 'events.dynamic.closeDivider',
          title: '日终清算完成 · 持仓估值与 T+1 额度已更新',
          titleKey: 'events.dynamic.closeTitle',
          body: '公司-017 收盘价 ¥20.18，早盘 ¥20.36 减仓躲过了尾盘回落。全部事件与账户快照已封存，可继续推进或前往复盘。',
          bodyKey: 'events.dynamic.closeBody',
          meta: 'day.settled · 15:00',
          at: '15:00',
          assetRef: '公司-017',
        },
      )
    }

    case 'completeGoalRun': {
      if (state.kind !== 'training') return state
      const totalDays = state.totalDays ?? 20
      return withEvent(
        {
          ...state,
          day: totalDays,
          phase: 'close_settle',
          clock: '2024-04-26 15:00',
          mode: 'goal',
          collaboration: state.collaboration === '人工确认' ? '人机混合' : state.collaboration,
        },
        {
          kind: 'system',
          divider: `Day ${totalDays} / ${totalDays} · /goal 自主推进完成`,
          dividerKey: 'events.dynamic.goalDoneDivider',
          title: '已完成剩余交易日模拟 · 可进入复盘与对照',
          titleKey: 'events.dynamic.goalDoneTitle',
          body: '已按同一委托口径跑完本周期全部 20 个交易日，完整事件流与账本快照已就绪。',
          bodyKey: 'events.dynamic.goalDoneBody',
          meta: 'run.completed · 15:00',
          at: '15:00',
          i18nParams: { totalDays },
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
            timeKey: 'live.tradeTimeJustNow',
            pnl,
            reason: state.proposal.reason ?? '根据调仓建议单在券商端执行后手动回填。',
            reasonKey: state.proposal.reasonKey ?? 'live.tradeReasonDefault',
            evidence: state.proposal.evidence ?? 'live_ev_003',
            status: '已记录',
            statusKey: 'status.trade.recorded',
          },
        ],
        proposal: { ...state.proposal, quantity: qty, executedPrice: price, status: 'filled' },
        collaboration: exactMatch ? '人工确认' : '人机混合',
        syncLabel: '已录实盘成交 · 刚刚',
        syncKey: 'live.syncFilledJustNow',
      }

      return withEvent(next, {
        kind: 'order',
        title: action.actor + '，镜像账本已更新',
        titleKey: 'events.dynamic.liveFillTitle',
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
        bodyKey: 'events.dynamic.liveFillBody',
        meta: 'live.filled · 刚刚',
        metaKey: 'events.dynamic.liveFillMeta',
        at: '刚刚',
        atKey: 'common.justNow',
        actorKey: LIVE_ACTOR_KEY[action.actor],
        assetRef: asset,
        sideRef: side,
        i18nParams: {
          qty,
          price: price.toFixed(2),
          fee: fee.toFixed(2),
          original: state.proposal.original,
          origPrice: state.proposal.price.toFixed(2),
        },
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
          syncKey: 'live.syncManualJustNow',
        },
        {
          kind: 'user',
          title: (exists ? '更新镜像持仓 · ' : '新增镜像持仓 · ') + name,
          titleKey: exists ? 'events.dynamic.upsertUpdateTitle' : 'events.dynamic.upsertAddTitle',
          body:
            incoming.quantity +
            ' 股（可卖 ' +
            sellable +
            ' 股）· 成本 ¥' +
            round(incoming.cost).toFixed(2) +
            ' · 现价 ¥' +
            round(incoming.price).toFixed(2) +
            '。',
          bodyKey: 'events.dynamic.upsertBody',
          meta: 'mirror.holding · 手动维护',
          metaKey: 'events.dynamic.upsertMeta',
          at: '刚刚',
          atKey: 'common.justNow',
          assetRef: name,
          i18nParams: {
            qty: incoming.quantity,
            sellable,
            cost: round(incoming.cost).toFixed(2),
            price: round(incoming.price).toFixed(2),
          },
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
          syncKey: 'live.syncManualJustNow',
        },
        {
          kind: 'user',
          title: '移除镜像持仓 · ' + action.name,
          titleKey: 'events.dynamic.removeHoldingTitle',
          body: '已从实盘镜像账本中移除该持仓记录。',
          bodyKey: 'events.dynamic.removeHoldingBody',
          meta: 'mirror.holding · 已移除',
          metaKey: 'events.dynamic.removeHoldingMeta',
          at: '刚刚',
          atKey: 'common.justNow',
          assetRef: action.name,
        },
      )
    }

    case 'setCash': {
      const cash = round(Math.max(0, action.cash))
      const formattedCash = cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      return withEvent(
        {
          ...state,
          cash,
          syncLabel: '手动维护 · 刚刚',
          syncKey: 'live.syncManualJustNow',
        },
        {
          kind: 'user',
          title: '调整镜像可用现金',
          titleKey: 'events.dynamic.setCashTitle',
          body: '可用现金已更新为 ¥' + formattedCash + '。',
          bodyKey: 'events.dynamic.setCashBody',
          meta: 'mirror.cash · 手动维护',
          metaKey: 'events.dynamic.setCashMeta',
          at: '刚刚',
          atKey: 'common.justNow',
          i18nParams: { cash: formattedCash },
        },
      )
    }

    case 'togglePause': {
      if (state.status === 'aborted') return state
      if (state.status === 'active') {
        return withEvent({ ...state, status: 'paused' }, {
          kind: 'error',
          title: '运行已暂停',
          titleKey: 'events.dynamic.pausedTitle',
          body: '用户暂停运行。时钟、账户与轨迹保持不变，可继续。',
          bodyKey: 'events.dynamic.pausedBody',
          meta: 'run.paused',
        })
      }
      return withEvent({ ...state, status: 'active' }, {
        kind: 'agent',
        title: '运行已继续',
        titleKey: 'events.dynamic.resumedTitle',
        body: '从暂停时点恢复，未重放已发生事件。',
        bodyKey: 'events.dynamic.resumedBody',
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
        titleKey: 'events.dynamic.abortedTitle',
        body: '用户中止本次运行。账户与轨迹保留，可继续复盘但不能续跑。',
        bodyKey: 'events.dynamic.abortedBody',
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
          titleKey: isLive ? 'events.dynamic.guidanceLiveTitle' : 'events.dynamic.guidanceSimTitle',
          body: isLive
            ? action.text + '\n（已记录实时上下文追问，Agent 只提供分析与建议，不直接修改账户。）'
            : action.text + '\n（指导以带时间戳的消息追加，不改变已提交的动作。）',
          bodyKey: isLive ? 'events.dynamic.guidanceLiveBody' : 'events.dynamic.guidanceSimBody',
          meta: isLive ? 'live.prompt · 人机协作' : 'guidance · 人机协作',
          metaKey: isLive ? 'events.dynamic.guidanceLiveMeta' : 'events.dynamic.guidanceSimMeta',
          at: isLive ? '刚刚' : undefined,
          atKey: isLive ? 'common.justNow' : undefined,
          i18nParams: { text: action.text },
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
          titleKey: 'events.dynamic.goalModeTitle',
          body: '后续交易日由 Agent 连续处理，订单不再逐单等待人工确认；仍可追加带时间戳的指导。',
          bodyKey: 'events.dynamic.goalModeBody',
          meta: 'mode.goal · 已确认',
          metaKey: 'events.dynamic.goalModeMeta',
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
  approve: (quantity: number, actor?: ApproveActor) => void
  undoApprove: () => void
  reject: () => void
  match: () => void
  advanceClose: () => void
  completeGoalRun: () => void
  recordLiveFill: (quantity: number, price: number, actor?: LiveFillActor) => void
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

export interface RunStoreState {
  training: RunState
  live: RunState
  switchAgent: (id: AgentId, scope?: WorkspaceKind) => void
  applyMandate: (mandate: MandatePayload, scope?: WorkspaceKind) => void
  deployAgentToLive: (id: AgentId) => void
  approve: (quantity: number, actor?: ApproveActor, scope?: WorkspaceKind) => void
  undoApprove: (scope?: WorkspaceKind) => void
  reject: (scope?: WorkspaceKind) => void
  match: (scope?: WorkspaceKind) => void
  advanceClose: (scope?: WorkspaceKind) => void
  completeGoalRun: (scope?: WorkspaceKind) => void
  recordLiveFill: (quantity: number, price: number, actor?: LiveFillActor, scope?: WorkspaceKind) => void
  upsertHolding: (holding: Omit<Holding, 'entryFee'>, scope?: WorkspaceKind) => void
  removeHolding: (name: string, scope?: WorkspaceKind) => void
  setCash: (cash: number, scope?: WorkspaceKind) => void
  togglePause: (scope?: WorkspaceKind) => void
  abort: (scope?: WorkspaceKind) => void
  sendGuidance: (text: string, scope?: WorkspaceKind) => void
  enterGoalMode: (scope?: WorkspaceKind) => void
}

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

export const useRunStore = create<RunStoreState>((set) => {
  const dispatchScope = (scope: WorkspaceKind, action: Action) => {
    set((store) => {
      const prev = store[scope]
      const next = reducer(prev, action)
      return next === prev ? store : { [scope]: next }
    })
  }

  return {
    training: INITIAL_RUN,
    live: INITIAL_LIVE_RUN,

    switchAgent: (id, scope = 'training') => {
      dispatchScope(scope, { type: 'switchAgent', agent: id })
    },

    applyMandate: (mandate, scope = 'training') => {
      dispatchScope(scope, { type: 'applyMandate', mandate })
      useToastStore.getState().notifyKey('toasts.mandateIssued', 'success', {
        i18nParams: { no: mandate.no },
      })
    },

    deployAgentToLive: (id) => {
      dispatchScope('live', { type: 'bindAgent', agent: id })
      useToastStore.getState().notifyKey('toasts.deployedToLive', 'success')
    },

    approve: (quantity, actor = '人工确认', scope = 'training') => {
      dispatchScope(scope, { type: 'approve', quantity, actor })
      useToastStore.getState().notifyKey('toasts.orderSubmitted', 'info', {
        actionLabelKey: 'toasts.undo',
        onAction: () => {
          dispatchScope(scope, { type: 'undoApprove' })
          useToastStore.getState().notifyKey('toasts.approveUndone', 'warn')
        },
        durationMs: 3600,
      })
    },

    undoApprove: (scope = 'training') => {
      dispatchScope(scope, { type: 'undoApprove' })
      useToastStore.getState().notifyKey('toasts.approveUndone', 'warn')
    },

    reject: (scope = 'training') => {
      dispatchScope(scope, { type: 'reject' })
      useToastStore.getState().notifyKey(
        scope === 'live' ? 'toasts.advisoryIgnored' : 'toasts.proposalRejected',
        'warn',
      )
    },

    match: (scope = 'training') => {
      dispatchScope(scope, { type: 'fill' })
      useToastStore.getState().notifyKey('toasts.orderFilled', 'success')
    },

    advanceClose: (scope = 'training') => {
      dispatchScope(scope, { type: 'advanceClose' })
      useToastStore.getState().notifyKey('toasts.advancedClose', 'success')
    },

    completeGoalRun: (scope = 'training') => {
      dispatchScope(scope, { type: 'completeGoalRun' })
      useToastStore.getState().notifyKey('toasts.goalCompleted', 'success')
    },

    recordLiveFill: (quantity, price, actor = '按建议执行', scope = 'live') => {
      dispatchScope(scope, { type: 'recordLiveFill', quantity, price, actor })
      useToastStore.getState().notifyKey('toasts.liveFillRecorded', 'success')
    },

    upsertHolding: (holding, scope = 'live') => {
      dispatchScope(scope, { type: 'upsertHolding', holding })
      useToastStore.getState().notifyKey('toasts.holdingUpdated', 'success')
    },

    removeHolding: (name, scope = 'live') => {
      dispatchScope(scope, { type: 'removeHolding', name })
      useToastStore.getState().notifyKey('toasts.holdingRemoved', 'warn', { assetRef: name })
    },

    setCash: (cash, scope = 'live') => {
      dispatchScope(scope, { type: 'setCash', cash })
      useToastStore.getState().notifyKey('toasts.cashUpdated', 'success')
    },

    togglePause: (scope = 'training') => {
      dispatchScope(scope, { type: 'togglePause' })
    },

    abort: (scope = 'training') => {
      dispatchScope(scope, { type: 'abort' })
      useToastStore.getState().notifyKey('toasts.runAborted', 'warn')
    },

    sendGuidance: (text, scope = 'training') => {
      dispatchScope(scope, { type: 'guidance', text })
      useToastStore.getState().notifyKey(
        scope === 'live' ? 'toasts.livePromptSent' : 'toasts.guidanceAdded',
        'success',
      )
    },

    enterGoalMode: (scope = 'training') => {
      if (scope === 'live') {
        useToastStore.getState().notifyKey('toasts.liveGoalBlocked', 'warn')
        return
      }
      dispatchScope(scope, { type: 'goalMode' })
      useToastStore.getState().notifyKey('toasts.enteredGoalMode', 'success')
    },
  }
})

function bindScopeActions(scope: WorkspaceKind): RunActions {
  return {
    switchAgent: (id) => useRunStore.getState().switchAgent(id, scope),
    applyMandate: (mandate) => useRunStore.getState().applyMandate(mandate, scope),
    deployAgentToLive: (id) => useRunStore.getState().deployAgentToLive(id),
    approve: (quantity, actor) => useRunStore.getState().approve(quantity, actor, scope),
    undoApprove: () => useRunStore.getState().undoApprove(scope),
    reject: () => useRunStore.getState().reject(scope),
    match: () => useRunStore.getState().match(scope),
    advanceClose: () => useRunStore.getState().advanceClose(scope),
    completeGoalRun: () => useRunStore.getState().completeGoalRun(scope),
    recordLiveFill: (quantity, price, actor) => useRunStore.getState().recordLiveFill(quantity, price, actor, scope),
    upsertHolding: (holding) => useRunStore.getState().upsertHolding(holding, scope),
    removeHolding: (name) => useRunStore.getState().removeHolding(name, scope),
    setCash: (cash) => useRunStore.getState().setCash(cash, scope),
    togglePause: () => useRunStore.getState().togglePause(scope),
    abort: () => useRunStore.getState().abort(scope),
    sendGuidance: (text) => useRunStore.getState().sendGuidance(text, scope),
    enterGoalMode: () => useRunStore.getState().enterGoalMode(scope),
  }
}

const SCOPED_ACTIONS: Record<WorkspaceKind, RunActions> = {
  training: bindScopeActions('training'),
  live: bindScopeActions('live'),
}

export function useRun(explicitScope?: WorkspaceKind): RunContextValue {
  const ambientScope = useContext(WorkbenchScopeContext)
  const scope = explicitScope ?? ambientScope
  const state = useRunStore((s) => s[scope])
  const lang = useLocaleStore((s) => s.lang)
  const totals = useMemo(() => totalsOf(state), [state])
  const status = useMemo(() => runStatusLabel(state, lang), [state, lang])
  const actions = SCOPED_ACTIONS[scope]

  return useMemo<RunContextValue>(
    () => ({ state, totals, status, actions }),
    [state, totals, status, actions],
  )
}
