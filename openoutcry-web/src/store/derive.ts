import { fixedT } from '../i18n'
import type { Lang } from '../i18n/detectLang'
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

/** 页头运行状态：中止/暂停优先，其次看提案状态 */
export function runStatusLabel(state: RunState, lang: Lang = 'zh'): string {
  const t = fixedT(lang)
  if (state.status !== 'active') {
    switch (state.status) {
      case 'aborted':
        return t('status.run.aborted')
      case 'disconnected':
        return t('status.run.disconnected')
      case 'paused':
        return t('status.run.paused')
    }
  }
  if (state.kind === 'live') {
    switch (state.proposal.status) {
      case 'pending':
        return t('status.live.pending')
      case 'submitted':
        return t('status.live.submitted')
      case 'rejected':
        return t('status.live.rejected')
      case 'filled':
        return t('status.live.filled')
      case 'cancelled':
        return t('status.live.cancelled')
    }
  }
  switch (state.proposal.status) {
    case 'pending':
      return t('status.training.pending')
    case 'submitted':
      return t('status.training.submitted')
    case 'rejected':
      return t('status.training.rejected')
    case 'filled':
      return t('status.training.filled')
    case 'cancelled':
      return t('status.training.cancelled')
  }
}

export function proposalTextOf(state: RunState, lang: Lang = 'zh'): string {
  const t = fixedT(lang)
  if (state.kind === 'live') {
    switch (state.proposal.status) {
      case 'pending':
        return t('status.liveProposalText.pending')
      case 'submitted':
        return t('status.liveProposalText.submitted')
      case 'rejected':
        return t('status.liveProposalText.rejected')
      case 'filled':
        return t('status.liveProposalText.filled')
      case 'cancelled':
        return t('status.liveProposalText.cancelled')
    }
  }
  switch (state.proposal.status) {
    case 'pending':
      return t('status.proposalText.pending')
    case 'submitted':
      return t('status.proposalText.submitted')
    case 'rejected':
      return t('status.proposalText.rejected')
    case 'filled':
      return t('status.proposalText.filled')
    case 'cancelled':
      return t('status.proposalText.cancelled')
  }
}

export function proposalStampOf(state: RunState, lang: Lang = 'zh'): string {
  const t = fixedT(lang)
  if (state.kind === 'live') {
    switch (state.proposal.status) {
      case 'pending':
        return t('status.liveProposalStamp.pending')
      case 'submitted':
        return t('status.liveProposalStamp.submitted')
      case 'rejected':
        return t('status.liveProposalStamp.rejected')
      case 'filled':
        return t('status.liveProposalStamp.filled')
      case 'cancelled':
        return t('status.liveProposalStamp.cancelled')
    }
  }
  switch (state.proposal.status) {
    case 'pending':
      return t('status.proposalStamp.pending')
    case 'submitted':
      return t('status.proposalStamp.submitted')
    case 'rejected':
      return t('status.proposalStamp.rejected')
    case 'filled':
      return t('status.proposalStamp.filled')
    case 'cancelled':
      return t('status.proposalStamp.cancelled')
  }
}

/** 是否允许人工介入（批准 / 修改 / 拒绝 或 实盘采纳/忽略） */
export const canDecide = (state: RunState) =>
  state.status === 'active' && state.mode === 'approval' && state.proposal.status === 'pending'

export function approvalNote(state: RunState, lang: Lang = 'zh'): string {
  const t = fixedT(lang)
  if (state.kind === 'live') {
    switch (state.proposal.status) {
      case 'filled':
        return t('status.approvalNoteLive.filled')
      case 'rejected':
        return t('status.approvalNoteLive.rejected')
      case 'cancelled':
        return t('status.approvalNoteLive.cancelled')
      default:
        return t('status.approvalNoteLive.default')
    }
  }
  switch (state.proposal.status) {
    case 'filled':
      return t('status.approvalNoteSim.filled')
    case 'rejected':
      return t('status.approvalNoteSim.rejected')
    case 'cancelled':
      return t('status.approvalNoteSim.cancelled')
    case 'submitted':
      return t('status.approvalNoteSim.submitted')
    default:
      return t('status.approvalNoteSim.default')
  }
}
