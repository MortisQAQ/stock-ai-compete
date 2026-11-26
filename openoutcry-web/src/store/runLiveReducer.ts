import { round } from '../lib/format'
import type { RunState } from '../types'
import { LIVE_ACTOR_KEY, withEvent, type LiveRunAction } from './runTypes'

/** 实战工作台镜像账本纯 reducer（成交回填、持仓增删改、现金调整） */
export function reduceLiveAction(state: RunState, action: LiveRunAction): RunState {
  switch (action.type) {
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

    default:
      return state
  }
}
