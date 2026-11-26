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

export const TRAINING_STATUS_TEXT_EN = {
  running: 'Running',
  pending: 'Pending',
  done: 'Completed',
} as const

/* ---------------- 账户表头 ---------------- */

export function accountBandItems(state: RunState, totals: Totals, lang: 'zh' | 'en' = 'zh'): BandItem[] {
  const cashPct = totals.equity ? ((state.cash / totals.equity) * 100).toFixed(1) : '0.0'
  const netPct = state.initial ? ((totals.net / state.initial) * 100).toFixed(2) : '0.00'
  const en = lang === 'en'

  if (state.kind === 'live') {
    return [
      {
        label: en ? 'Mirror Equity (Est.)' : '总资产（估算）',
        value: money(totals.equity),
        note: en ? 'Manual mirror' : (state.syncLabel ?? '手动维护'),
      },
      {
        label: en ? 'Net PnL' : '累计净收益',
        value: signed(totals.net),
        note: netPct + (en ? '% · net of fees' : '% · 已扣费用'),
        tone: totals.net >= 0 ? 'up' : 'dn',
      },
      {
        label: en ? 'Available Cash' : '可用现金',
        value: money(state.cash),
        note: (en ? 'Share ' : '占总资产 ') + cashPct + '%',
      },
      {
        label: en ? 'Market Value' : '持仓市值',
        value: money(totals.market),
        note: state.holdings.length + (en ? ' positions · live ref' : ' 个标的 · 实时参考'),
      },
    ]
  }

  return [
    {
      label: en ? 'Account Equity' : '账户净值',
      value: money(totals.equity),
      note: (en ? 'Initial ' : '初始资金 ') + money(state.initial),
    },
    {
      label: en ? 'Net PnL' : '累计净收益',
      value: signed(totals.net),
      note: netPct + (en ? '% · net of fees' : '% · 已扣费用'),
      tone: totals.net >= 0 ? 'up' : 'dn',
    },
    {
      label: en ? 'Available Cash' : '可用现金',
      value: money(state.cash),
      note: (en ? 'Share ' : '占总资产 ') + cashPct + '%',
    },
    {
      label: en ? 'Market Value' : '持仓市值',
      value: money(totals.market),
      note: state.holdings.length + (en ? ' positions · mark-to-market' : ' 个标的 · 当前估值'),
    },
  ]
}

/** 已结束任务用冻结档案，不读实时账户 */
export function archiveBandItems(task: TrainingTask, lang: 'zh' | 'en' = 'zh'): BandItem[] {
  const archive = task.archive
  if (!archive) return []
  const liveArchive = task.kind === 'live'
  const en = lang === 'en'
  return [
    {
      label: liveArchive ? (en ? 'Snapshot Equity' : '总资产快照') : (en ? 'Final Equity' : '账户净值'),
      value: money(archive.equity),
      note: liveArchive ? (en ? 'Mirror archive' : '归档时镜像') : (en ? 'Frozen at close' : '任务结束时冻结'),
    },
    {
      label: en ? 'Net PnL' : '累计净收益',
      value: signed(archive.net),
      note: liveArchive ? (en ? 'Net of fees · live' : '已扣费用 · 实盘记录') : (en ? 'Net of fees' : '已扣费用 · 含全部平仓'),
      tone: archive.net >= 0 ? 'up' : 'dn',
    },
    { label: en ? 'Cash' : '可用现金', value: money(archive.cash), note: en ? 'End snapshot' : '结束时快照' },
    {
      label: en ? 'Market Value' : '持仓市值',
      value: money(archive.market),
      note: archive.market === 0 ? (en ? 'Fully closed' : '已全部平仓') : (en ? 'End snapshot' : '结束时快照'),
    },
  ]
}

/** 当前任务取实时快照，非当前任务取冻结档案 */
export function bandItemsFor(
  task: TrainingTask,
  state: RunState,
  totals: Totals,
  lang: 'zh' | 'en' = 'zh',
): BandItem[] {
  return task.live ? accountBandItems(state, totals, lang) : archiveBandItems(task, lang)
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
