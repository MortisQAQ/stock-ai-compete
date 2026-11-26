import type { ProposalStatus, RunState, Totals } from '../types'
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
  if (state.kind === 'live') {
    switch (state.proposal.status) {
      case 'pending':
        return '待决策'
      case 'submitted':
        return '待记录'
      case 'rejected':
        return '已忽略'
      case 'filled':
        return '已记录'
      case 'cancelled':
        return '已取消'
      default:
        return '辅助中'
    }
  }
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

export const PROPOSAL_TEXT: Record<ProposalStatus, string> = {
  pending: '等待确认',
  submitted: '已提交 · 未成交',
  rejected: '已拒绝',
  filled: '已成交',
  cancelled: '已终止',
}

export const PROPOSAL_STAMP: Record<ProposalStatus, string> = {
  pending: '待确认',
  submitted: '待撮合',
  rejected: '已拒绝',
  filled: '已成交',
  cancelled: '已终止',
}

export const LIVE_PROPOSAL_TEXT: Record<ProposalStatus, string> = {
  pending: '等待决策 · 仅建议',
  submitted: '待回填实盘成交',
  rejected: '暂不采纳',
  filled: '已录实盘成交',
  cancelled: '已取消',
}

export const LIVE_PROPOSAL_STAMP: Record<ProposalStatus, string> = {
  pending: '待决策',
  submitted: '待记录',
  rejected: '已忽略',
  filled: '已记录',
  cancelled: '已取消',
}

export const PROPOSAL_TEXT_EN: Record<ProposalStatus, string> = {
  pending: 'Awaiting Approval',
  submitted: 'Submitted · Unfilled',
  rejected: 'Rejected',
  filled: 'Filled',
  cancelled: 'Cancelled',
}

export const PROPOSAL_STAMP_EN: Record<ProposalStatus, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  rejected: 'Rejected',
  filled: 'Filled',
  cancelled: 'Stopped',
}

export const LIVE_PROPOSAL_TEXT_EN: Record<ProposalStatus, string> = {
  pending: 'Awaiting Decision · Advisory',
  submitted: 'Awaiting Fill Log',
  rejected: 'Ignored',
  filled: 'Logged in Mirror',
  cancelled: 'Cancelled',
}

export const LIVE_PROPOSAL_STAMP_EN: Record<ProposalStatus, string> = {
  pending: 'Advisory',
  submitted: 'Pending',
  rejected: 'Ignored',
  filled: 'Logged',
  cancelled: 'Cancelled',
}

export function proposalTextOf(state: RunState, lang: 'zh' | 'en' = 'zh'): string {
  if (lang === 'en') {
    return state.kind === 'live'
      ? LIVE_PROPOSAL_TEXT_EN[state.proposal.status]
      : PROPOSAL_TEXT_EN[state.proposal.status]
  }
  return state.kind === 'live'
    ? LIVE_PROPOSAL_TEXT[state.proposal.status]
    : PROPOSAL_TEXT[state.proposal.status]
}

export function proposalStampOf(state: RunState, lang: 'zh' | 'en' = 'zh'): string {
  if (lang === 'en') {
    return state.kind === 'live'
      ? LIVE_PROPOSAL_STAMP_EN[state.proposal.status]
      : PROPOSAL_STAMP_EN[state.proposal.status]
  }
  return state.kind === 'live'
    ? LIVE_PROPOSAL_STAMP[state.proposal.status]
    : PROPOSAL_STAMP[state.proposal.status]
}

/** 是否允许人工介入（批准 / 修改 / 拒绝 或 实盘采纳/忽略） */
export const canDecide = (state: RunState) =>
  state.status === 'active' && state.mode === 'approval' && state.proposal.status === 'pending'

export function approvalNote(state: RunState, lang: 'zh' | 'en' = 'zh'): string {
  const en = lang === 'en'
  if (state.kind === 'live') {
    switch (state.proposal.status) {
      case 'filled':
        return en
          ? 'Mirror holdings and cash updated; both AI advisory and actual fill are archived.'
          : '已按实际执行更新镜像持仓与现金；AI 原始建议与实盘成交均保留对照。'
      case 'rejected':
        return en
          ? 'Marked ignored. Mirror holdings unchanged; original advisory preserved for review.'
          : '已记录暂不采纳，镜像持仓与现金不变；原始建议保留供复盘对照。'
      case 'cancelled':
        return en ? 'Advisory cancelled; mirror ledger preserved.' : '建议单已取消，镜像账本记录保留。'
      default:
        return en
          ? 'Advisory only — no automatic broker execution. Log your fill here after executing on your broker.'
          : '仅提供调仓建议，不会自动下单；在券商端操作完成后可在此回填实盘成交更新镜像账本。'
    }
  }
  switch (state.proposal.status) {
    case 'filled':
      return en
        ? 'Fill, fees, and T+1 holdings synced; both proposed and executed quantities preserved.'
        : '成交、费用与持仓已同步更新；原始与最终数量均保留。'
    case 'rejected':
      return en
        ? 'Human rejection logged. Order will not match; cash and holdings unchanged.'
        : '已记录人工拒绝。不会撮合，现金与持仓没有变化。'
    case 'cancelled':
      return en ? 'Run aborted; proposal cancelled and ledger preserved.' : '运行已中止，提案终止，账户记录保留。'
    case 'submitted':
      return en
        ? 'Submitted — account balance unchanged until the environment reveals 09:30 open price.'
        : '已提交，等待环境在下一时点揭示可成交价格（账户尚未变化）。'
    default:
      return en
        ? 'Approval only submits order intent — it does not fill or alter account balances.'
        : '批准仅提交订单，不等于成交；预计盈亏不计入已实现收益。'
  }
}
