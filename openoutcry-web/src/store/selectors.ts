import { fixedT } from '../i18n'
import type { Lang } from '../i18n/detectLang'
import { formatSyncLabel } from '../i18n/helpers'
import type { BandItem, RunState, Totals, TrainingStatus, TrainingTask } from '../types'
import { money, round, signed, tone } from '../lib/format'

/**
 * 派生数据（选择器）—— 页面只负责布局，口径都在这里。
 */

export function trainingStatusText(status: TrainingStatus, lang: Lang = 'zh'): string {
  const t = fixedT(lang)
  switch (status) {
    case 'running':
      return t('status.task.running')
    case 'pending':
      return t('status.task.pending')
    case 'done':
      return t('status.task.done')
  }
}

/* ---------------- 账户表头 ---------------- */

export function accountBandItems(state: RunState, totals: Totals, lang: Lang = 'zh'): BandItem[] {
  const t = fixedT(lang)
  const cashPct = totals.equity ? ((state.cash / totals.equity) * 100).toFixed(1) : '0.0'
  const netPct = state.initial ? ((totals.net / state.initial) * 100).toFixed(2) : '0.00'

  if (state.kind === 'live') {
    return [
      {
        label: t('tabs.accountBand.liveEquity'),
        value: money(totals.equity),
        note: formatSyncLabel(state.syncKey, state.syncLabel, t),
      },
      {
        label: t('tabs.accountBand.netPnl'),
        value: signed(totals.net),
        note: t('tabs.accountBand.netPnlNote', { pct: netPct }),
        tone: totals.net >= 0 ? 'up' : 'dn',
      },
      {
        label: t('tabs.accountBand.cash'),
        value: money(state.cash),
        note: t('tabs.accountBand.cashShareNote', { pct: cashPct }),
      },
      {
        label: t('tabs.accountBand.marketValue'),
        value: money(totals.market),
        note: t('tabs.accountBand.liveMarketNote', { count: state.holdings.length }),
      },
    ]
  }

  return [
    {
      label: t('tabs.accountBand.simEquity'),
      value: money(totals.equity),
      note: t('tabs.accountBand.initialNote', { amount: money(state.initial) }),
    },
    {
      label: t('tabs.accountBand.netPnl'),
      value: signed(totals.net),
      note: t('tabs.accountBand.netPnlNote', { pct: netPct }),
      tone: totals.net >= 0 ? 'up' : 'dn',
    },
    {
      label: t('tabs.accountBand.cash'),
      value: money(state.cash),
      note: t('tabs.accountBand.cashShareNote', { pct: cashPct }),
    },
    {
      label: t('tabs.accountBand.marketValue'),
      value: money(totals.market),
      note: t('tabs.accountBand.simMarketNote', { count: state.holdings.length }),
    },
  ]
}

/** 已结束任务用冻结档案，不读实时账户 */
export function archiveBandItems(task: TrainingTask, lang: Lang = 'zh'): BandItem[] {
  const archive = task.archive
  if (!archive) return []
  const t = fixedT(lang)
  const liveArchive = task.kind === 'live'
  return [
    {
      label: liveArchive ? t('tabs.accountBand.archiveLiveEquity') : t('tabs.accountBand.archiveSimEquity'),
      value: money(archive.equity),
      note: liveArchive ? t('tabs.accountBand.archiveLiveNote') : t('tabs.accountBand.archiveSimNote'),
    },
    {
      label: t('tabs.accountBand.netPnl'),
      value: signed(archive.net),
      note: liveArchive ? t('tabs.accountBand.archiveLiveNetNote') : t('tabs.accountBand.archiveSimNetNote'),
      tone: archive.net >= 0 ? 'up' : 'dn',
    },
    {
      label: t('tabs.accountBand.archiveCash'),
      value: money(archive.cash),
      note: t('tabs.accountBand.archiveEndSnapshot'),
    },
    {
      label: t('tabs.accountBand.marketValue'),
      value: money(archive.market),
      note: archive.market === 0 ? t('tabs.accountBand.archiveFullyClosed') : t('tabs.accountBand.archiveEndSnapshot'),
    },
  ]
}

/** 当前任务取实时快照，非当前任务取冻结档案 */
export function bandItemsFor(
  task: TrainingTask,
  state: RunState,
  totals: Totals,
  lang: Lang = 'zh',
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
