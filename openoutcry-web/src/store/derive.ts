import type { RunState, Totals } from '../types'
import { round } from '../lib/format'

export function totalsOf(state: RunState): Totals {
  const market = round(state.holdings.reduce((a, h) => a + h.quantity * h.price, 0))
  const floating = round(state.holdings.reduce((a, h) => a + h.quantity * (h.price - h.cost), 0))
  return {
    market,
    floating,
    equity: round(state.cash + market),
    net: round(state.cash + market - state.initial),
  }
}

const STATUS_TEXT = {
  aborted: '已中止',
  disconnected: '断线暂停',
  paused: '已暂停',
} as const

/** 页头运行状态：中止/暂停优先，其次看提案状态 */
export function runStatusLabel(state: RunState): string {
  if (state.status !== 'active') return STATUS_TEXT[state.status]
  switch (state.proposal.status) {
    case 'pending':
      return '待确认'
    case 'submitted':
      return '待撮合'
    case 'rejected':
      return '已拒绝'
    case 'filled':
      return '已成交'
    case 'cancelled':
      return '已终止'
    default:
      return '运行中'
  }
}

export const PROPOSAL_TEXT = {
  pending: '等待确认',
  submitted: '已提交 · 未成交',
  rejected: '已拒绝',
  filled: '已成交',
  cancelled: '已终止',
} as const

export const PROPOSAL_STAMP = {
  pending: '待确认',
  submitted: '待撮合',
  rejected: '已拒绝',
  filled: '已成交',
  cancelled: '已终止',
} as const

/** 是否允许人工介入（批准 / 修改 / 拒绝） */
export const canDecide = (state: RunState) =>
  state.status === 'active' && state.mode === 'approval' && state.proposal.status === 'pending'

export function approvalNote(state: RunState): string {
  switch (state.proposal.status) {
    case 'filled':
      return '成交、费用与持仓已同步更新；原始与最终数量均保留。'
    case 'rejected':
      return '已记录人工拒绝。不会撮合，现金与持仓没有变化。'
    case 'cancelled':
      return '运行已中止，提案终止，账户记录保留。'
    case 'submitted':
      return '已提交，等待环境在下一时点揭示可成交价格。'
    default:
      return '批准仅提交订单，不等于成交；预计盈亏不计入已实现收益。'
  }
}
