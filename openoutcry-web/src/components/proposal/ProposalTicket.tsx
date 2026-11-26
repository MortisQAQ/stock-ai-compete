import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ChevronDown, FastForward } from 'lucide-react'

import { formatProposal } from '../../i18n/helpers'
import { money, round, signed } from '../../lib/format'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useRun, useWorkspaceKind } from '../../store/RunProvider'
import { approvalNote, canDecide, proposalStampOf } from '../../store/derive'
import { PitPriceStrip } from '../charts/PitPriceStrip'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Stamp } from '../ui/Stamp'

/**
 * 决策主卡：
 * - 历史训练场：Order Proposal + PIT 截断走势条 + 折叠式 A 股规则预检 + 审批/撮合/结算流程；
 * - 实战工作台：Advisory Proposal（仅提供按建议记账 / 按实际录入 / 暂不采纳）。
 */
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
  const estAmount = round(proposal.quantity * proposal.price)

  const finishAndReview = () => {
    actions.completeGoalRun()
    navigate('/review')
  }

  return (
    <Card>
      <CardHeader className="items-center">
        <div className="min-w-0">
          <h3 className="font-sans text-row font-semibold leading-snug text-ink">
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

      <CardContent className="py-5">
        {!isLive ? (
          <PitPriceStrip
            asset={rawAsset}
            costBasis={costBasis}
            limitPrice={proposal.price}
            phase={phase}
            filled={proposal.status === 'filled'}
          />
        ) : null}

        {/* 核心三数：价格、数量、预估金额 */}
        <dl className="proposal-facts">
          <div>
            <dt>{isLive ? t('proposal.refBand') : t('proposal.limitPrice')}</dt>
            <dd>{isLive ? (proposal.priceBand ?? money(proposal.price)) : money(proposal.price)}</dd>
          </div>
          <div>
            <dt>{t('proposal.quantity')}</dt>
            <dd>
              {proposal.quantity} {t('proposal.sharesUnit')}
            </dd>
          </div>
          <div>
            <dt>{t('proposal.estAmount')}</dt>
            <dd>{money(estAmount)}</dd>
          </div>
        </dl>

        {/* 渐进披露：一行通过指示器 + 折叠的 A 股规则预检与详细说明 */}
        {!isLive ? (
          <details className="mt-4 rounded-lg border border-[var(--line-soft)] bg-[var(--bg-1)] px-3.5 py-1.5">
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 py-1 text-micro font-medium text-[var(--lime)] [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} aria-hidden />
                {t('proposal.precheckSummary')}
              </span>
              <ChevronDown size={14} aria-hidden className="shrink-0 text-[var(--fg-2)]" />
            </summary>
            <div className="mt-3 space-y-2 border-t border-[var(--line-soft)] pt-3 text-micro text-[var(--fg-1)]">
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-mono tabular-nums text-[var(--lime)]">
                <span>✓ {t('proposal.precheckLot')}</span>
                <span>✓ {t('proposal.precheckSellable', { count: sellableShares })}</span>
                <span>✓ {t('proposal.precheckLimit')}</span>
                <span className="text-[var(--fg-1)]">{t('proposal.precheckFee')}</span>
              </div>
              <p className="leading-relaxed text-[var(--fg-2)]">
                {t('proposal.precheckDetail', {
                  cost: money(costBasis),
                  pnl: signed(round(proposal.quantity * (proposal.price - costBasis))),
                })}{' '}
                {approvalNote(state, lang)}
              </p>
            </div>
          </details>
        ) : (
          <details className="mt-4 rounded-lg border border-[var(--line-soft)] bg-[var(--bg-1)] px-3.5 py-1.5">
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 py-1 text-micro font-medium text-[var(--fg-1)] [&::-webkit-details-marker]:hidden">
              <span className="truncate">
                {view.invalidation
                  ? t('proposal.invalidationSummary', { text: view.invalidation })
                  : t('proposal.advisoryDetailsSummary')}
              </span>
              <ChevronDown size={14} aria-hidden className="shrink-0 text-[var(--fg-2)]" />
            </summary>
            <p className="mt-2.5 border-t border-[var(--line-soft)] pt-2.5 text-note leading-relaxed text-[var(--fg-2)]">
              {view.reason ?? t('proposal.liveDefaultReason')} {approvalNote(state, lang)}
            </p>
          </details>
        )}

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
              <ArrowRight size={14} aria-hidden />
            </Button>
          ) : null}

          <Button variant="ghost" size="sm" onClick={() => open({ kind: 'detail', id: 'proposal', scope: kind })}>
            {t('proposal.btnTrace')}
          </Button>
        </div>
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
