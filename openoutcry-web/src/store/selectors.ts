import type { BandItem, RunState, Totals, TrainingTask } from '../types'
import { money, round, signed, tone } from '../lib/format'

/**
 * 派生数据（选择器）—— 页面只负责布局，口径都在这里。
 *
 * 同一个数字在页面上出现两次，就必须是同一个函数算出来的：
 * 复盘页与训练场工作台的「四格表头」曾各写一遍，持仓盈亏曾在两个组件里各算一遍。
 */

/* ---------------- 训练状态文案 ---------------- */

/** 训练 / 训练任务共用的状态文案（此前 data/trainings.ts 与 store/trainingTasks.ts 各有一份） */
export const TRAINING_STATUS_TEXT = {
  running: '进行中',
  pending: '待确认',
  done: '已结束',
} as const

/* ---------------- 账户表头 ---------------- */

export function accountBandItems(state: RunState, totals: Totals): BandItem[] {
  return [
    { label: '账户净值', value: money(totals.equity), note: '初始资金 ' + money(state.initial) },
    {
      label: '累计净收益',
      value: signed(totals.net),
      note: ((totals.net / state.initial) * 100).toFixed(2) + '% · 已扣费用',
      tone: totals.net >= 0 ? 'up' : 'dn',
    },
    {
      label: '可用现金',
      value: money(state.cash),
      note: '占总资产 ' + ((state.cash / totals.equity) * 100).toFixed(1) + '%',
    },
    { label: '持仓市值', value: money(totals.market), note: state.holdings.length + ' 个标的 · 当前估值' },
  ]
}

/** 已结束任务用冻结档案，不读实时账户 */
export function archiveBandItems(task: TrainingTask): BandItem[] {
  const archive = task.archive
  if (!archive) return []
  return [
    { label: '账户净值', value: money(archive.equity), note: '任务结束时冻结' },
    {
      label: '累计净收益',
      value: signed(archive.net),
      note: '已扣费用 · 含全部平仓',
      tone: archive.net >= 0 ? 'up' : 'dn',
    },
    { label: '可用现金', value: money(archive.cash), note: '结束时快照' },
    {
      label: '持仓市值',
      value: money(archive.market),
      note: archive.market === 0 ? '已全部平仓' : '结束时快照',
    },
  ]
}

/** 当前任务取实时快照，非当前任务取冻结档案 */
export function bandItemsFor(task: TrainingTask, state: RunState, totals: Totals): BandItem[] {
  return task.live ? accountBandItems(state, totals) : archiveBandItems(task)
}

/* ---------------- 持仓行 ---------------- */

export interface HoldingRow {
  name: string
  quantity: number
  sellable: number
  cost: number
  price: number
  pnl: number
  tone: 'pos' | 'neg' | 'flat'
  /** 占账户净值比例（%） */
  sharePct: number
}

export function holdingRowsOf(state: RunState, totals: Totals): HoldingRow[] {
  return state.holdings.map((holding) => {
    const pnl = round(holding.quantity * (holding.price - holding.cost))
    const marketValue = holding.quantity * holding.price
    return {
      name: holding.name,
      quantity: holding.quantity,
      sellable: holding.sellable,
      cost: holding.cost,
      price: holding.price,
      pnl,
      tone: tone(pnl),
      sharePct: totals.equity ? (marketValue / totals.equity) * 100 : 0,
    }
  })
}

/** 未平仓买入费用合计（盈亏页签用） */
export const openFeesOf = (state: RunState): number =>
  state.holdings.reduce((sum, holding) => sum + holding.entryFee, 0)
