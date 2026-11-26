import { agentOf } from '../data/agents'
import { createInitialLiveRun } from '../data/live'
import { CLOCK_CLOSE, CLOCK_MATCHED, createInitialRun } from '../data/run'
import { round } from '../lib/format'
import type { RunState } from '../types'
import { APPROVE_ACTOR_KEY, withEvent, type TrainingRunAction } from './runTypes'

/** 历史训练场与通用生命周期（委托、审批、撮合、日终清算、暂停/中止、引导）纯 reducer */
export function reduceTrainingAction(state: RunState, action: TrainingRunAction): RunState {
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
