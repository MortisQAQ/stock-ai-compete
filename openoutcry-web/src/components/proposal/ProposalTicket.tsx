import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, FastForward } from 'lucide-react'

import { formatProposal } from '../../i18n/helpers'
import { money, round, signed } from '../../lib/format'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useRun, useWorkspaceKind } from '../../store/RunProvider'
import { approvalNote, canDecide, proposalStampOf, proposalTextOf } from '../../store/derive'
import { PitPriceStrip } from '../charts/PitPriceStrip'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Stamp } from '../ui/Stamp'

export function ProposalTicket() {
  const kind = useWorkspaceKind()
  const { state, actions } = useRun()
  const { open } = useDialog()
  const { lang } = useLocale()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { proposal } = state
  const decidable = canDecide(state)
  const isLive = state.kind === 'live'
  const rawAsset = proposal.asset ?? '公司-017'
  const rawSide = proposal.side ?? '卖出'
  const view = formatProposal(proposal, t)
  const matchedHolding = state.holdings.find((h) => h.name === rawAsset)
  const costBasis = matchedHolding?.cost ?? proposal.price
  const sellableShares = matchedHolding?.sellable ?? 600
  const maxQty =
    rawSide === '卖出'
      ? Math.max(100, sellableShares || matchedHolding?.quantity || proposal.original || 600)
      : Math.max(1000, proposal.original * 3)

  const phase = state.phase ?? 'pre_market'

  const finishAndReview = () => {
    actions.completeGoalRun()
    navigate('/review')
  }

  return (
    <Card>
      <CardHeader className="items-start">
        <div className="min-w-0">
          <div className="label">
            {isLive ? t('proposal.liveKicker') : t('proposal.simKicker')}
          </div>
          <h3 className="mt-1.5 font-sans text-row font-semibold leading-snug tracking-[-0.02em] text-ink">
            {view.side} {view.asset} · {proposal.quantity} {t('proposal.sharesUnit')}
          </h3>
        </div>
        <Stamp
          tone={
            proposal.status === 'filled'
              ? 'pine'
              : proposal.status === 'rejected'
                ? 'slate'
                : 'ver'
          }
        >
          {proposalStampOf(state, lang)}
        </Stamp>
      </CardHeader>

      <CardContent className="py-3">
        {!isLive ? (
          <PitPriceStrip
            asset={rawAsset}
            costBasis={costBasis}
            limitPrice={proposal.price}
            phase={phase}
            filled={proposal.status === 'filled'}
          />
        ) : null}

        <dl className="proposal-facts">
          <div>
            <dt>{isLive ? t('proposal.refBand') : t('proposal.limitPrice')}</dt>
            <dd>{isLive ? (proposal.priceBand ?? money(proposal.price)) : money(proposal.price)}</dd>
          </div>
          <div>
            <dt>{isLive ? t('proposal.aiSuggested') : t('proposal.proposed')}</dt>
            <dd>
              {proposal.original} {t('proposal.sharesUnit')}
            </dd>
          </div>
          <div>
            <dt>{t('proposal.status')}</dt>
            <dd className="font-mono text-note tracking-normal">{proposalTextOf(state, lang)}</dd>
          </div>
        </dl>

        {!isLive ? (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--line-soft)] bg-[var(--bg-2)] px-3 py-2 font-mono text-micro text-[var(--lime)]">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 size={13} aria-hidden />
              {t('proposal.precheckLot')}
            </span>
            <span className="text-[var(--fg-2)]">·</span>
            <span>{t('proposal.precheckSellable', { count: sellableShares })}</span>
            <span className="text-[var(--fg-2)]">·</span>
            <span>{t('proposal.precheckLimit')}</span>
            <span className="text-[var(--fg-2)]">·</span>
            <span className="text-[var(--fg-1)]">{t('proposal.precheckFee')}</span>
          </div>
        ) : null}

        <p className="proposal-note">
          {isLive ? (
            <>
              {view.reason ?? t('proposal.liveDefaultReason')}
              {view.invalidation ? ' ' + t('proposal.invalidationPrefix', { text: view.invalidation }) : ''}
            </>
          ) : (
            t('proposal.simSummary', {
              qty: proposal.quantity,
              price: money(proposal.price),
              pnl: signed(round(proposal.quantity * (proposal.price - costBasis))),
            })
          )}
        </p>

        <div className="proposal-actions">
          {decidable ? (
            isLive ? (
              <>
                <Button
                  variant="ver"
                  size="sm"
                  onClick={() => actions.recordLiveFill(proposal.quantity, proposal.price, '按建议执行')}
                >
                  {t('proposal.btnLogSuggested')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => open({ kind: 'modify', scope: kind })}>
                  {t('proposal.btnLogActual')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => actions.reject()}>
                  {t('proposal.btnIgnore')}
                </Button>
              </>
            ) : (
              <ApprovalControls
                key={`${state.kind}:${proposal.status}:${proposal.quantity}`}
                initial={proposal.quantity}
                maxQty={maxQty}
                sideLabel={view.side}
                onApprove={(qty) =>
                  actions.approve(qty, qty === proposal.original ? '人工确认' : '人工修改后批准')
                }
                onModify={() => open({ kind: 'modify', scope: kind })}
                onReject={() => actions.reject()}
              />
            )
          ) : null}

          {!isLive && proposal.status === 'submitted' ? (
            <Button variant="solid" size="sm" onClick={() => actions.match()}>
              {t('proposal.btnAdvanceMatch')}
              <ArrowRight size={14} aria-hidden />
            </Button>
          ) : null}

          {!isLive && proposal.status === 'filled' && phase === 'open_match' ? (
            <>
              <Button variant="outline" size="sm" onClick={() => actions.advanceClose()}>
                {t('proposal.btnAdvanceClose')}
              </Button>
              <Button variant="solid" size="sm" onClick={finishAndReview}>
                <FastForward size={14} aria-hidden />
                {t('proposal.btnFinishReview')}
              </Button>
            </>
          ) : null}

          {!isLive && proposal.status === 'filled' && phase === 'close_settle' ? (
            <Button variant="solid" size="sm" onClick={() => navigate('/review')}>
              {t('proposal.btnGoReview')}
            </Button>
          ) : null}

          <Button variant="ghost" size="sm" onClick={() => open({ kind: 'detail', id: 'proposal', scope: kind })}>
            {t('proposal.btnTrace')}
          </Button>
        </div>

        <p className="proposal-note">{approvalNote(state, lang)}</p>
      </CardContent>
    </Card>
  )
}

interface ApprovalControlsProps {
  initial: number
  maxQty: number
  sideLabel: string
  onApprove: (quantity: number) => void
  onModify: () => void
  onReject: () => void
}

function ApprovalControls({ initial, maxQty, sideLabel, onApprove, onModify, onReject }: ApprovalControlsProps) {
  const { t } = useTranslation()
  const [qty, setQty] = useState(initial)
  const step = (delta: number) => {
    const next = Math.min(maxQty, Math.max(100, qty + delta))
    setQty(next - (next % 100))
  }

  return (
    <>
      <div className="stepper" role="group" aria-label={t('proposal.stepperAria', { side: sideLabel })}>
        <button type="button" onClick={() => step(-100)} aria-label={t('proposal.decrease100')}>
          −
        </button>
        <span>
          {qty} {t('proposal.sharesUnit')}
        </span>
        <button type="button" onClick={() => step(100)} aria-label={t('proposal.increase100')}>
          +
        </button>
      </div>

      <Button variant="ver" size="sm" onClick={() => onApprove(qty)}>
        {t('proposal.btnApprove')}
      </Button>

      <Button variant="ghost" size="sm" onClick={onModify}>
        {t('proposal.btnModify')}
      </Button>

      <Button variant="ghost" size="sm" onClick={onReject}>
        {t('proposal.btnReject')}
      </Button>
    </>
  )
}
