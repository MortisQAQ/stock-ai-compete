import { useTranslation } from 'react-i18next'

import { formatProposal, formatTrade } from '../../i18n/helpers'
import { money, signed } from '../../lib/format'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useRun } from '../../store/RunProvider'
import { proposalTextOf } from '../../store/derive'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Prose } from '../ui/Prose'

export function DetailDialog({ open, id }: { open: boolean; id: string }) {
  const { state } = useRun()
  const { close } = useDialog()
  const { lang } = useLocale()
  const { t } = useTranslation()
  const isLive = state.kind === 'live'
  const proposalView = formatProposal(state.proposal, t)
  const evidence = state.proposal.evidence ?? 'ev_018 / ev_024'
  const reason = proposalView.reason ?? t('dialogs.detail.defaultReason')

  const isProposal = id === 'proposal'
  const trade = state.trades.find((tr) => tr.id === id)
  const tradeView = trade ? formatTrade(trade, t) : null

  const title = isProposal
    ? isLive
      ? t('dialogs.detail.titleProposalLive', { side: proposalView.side, asset: proposalView.asset })
      : t('dialogs.detail.titleProposalSim', { side: proposalView.side, asset: proposalView.asset })
    : tradeView
      ? `${tradeView.side} ${tradeView.name}`
      : t('dialogs.detail.titleDefault')

  const structuredPayload = isProposal
    ? {
        workspace: state.kind,
        type: isLive ? 'advisory' : 'order',
        side: state.proposal.side === '买入' ? 'buy' : 'sell',
        asset: proposalView.asset,
        original_quantity: state.proposal.original,
        final_quantity: state.proposal.quantity,
        price_ref: state.proposal.priceBand ?? state.proposal.price,
        executed_price: state.proposal.executedPrice ?? null,
        evidence: evidence.split(/\s*\/\s*/),
        pit_cutoff: isLive ? 'realtime' : (state.pitCutoff ?? '2024-04-22 23:59'),
        status: state.proposal.status,
      }
    : trade && tradeView
      ? {
          id: trade.id,
          asset: tradeView.name,
          side: trade.side === '买入' ? 'buy' : 'sell',
          quantity: trade.quantity,
          fill_price: trade.price,
          fee: trade.fee,
          realized_pnl: trade.pnl,
          evidence: trade.evidence,
          status: tradeView.status,
        }
      : {}

  return (
    <Modal
      open={open}
      kicker={isLive ? t('dialogs.detail.kickerLive') : t('dialogs.detail.kickerSim')}
      title={title}
      onClose={close}
      footer={
        <Button size="sm" variant="ghost" onClick={close}>
          {t('dialogs.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {isProposal ? (
          <dl className="snapshot-list">
            <div>
              <dt>{isLive ? t('dialogs.detail.aiActual') : t('dialogs.detail.origFinal')}</dt>
              <dd>
                {state.proposal.original} / {state.proposal.quantity} {t('proposal.sharesUnit')}
              </dd>
            </div>
            <div>
              <dt>{isLive ? t('dialogs.detail.refBand') : t('dialogs.detail.limitPrice')}</dt>
              <dd>{isLive ? (state.proposal.priceBand ?? money(state.proposal.price)) : money(state.proposal.price)}</dd>
            </div>
            <div>
              <dt>{t('dialogs.detail.currentStatus')}</dt>
              <dd>{proposalTextOf(state, lang)}</dd>
            </div>
            <div>
              <dt>{t('dialogs.detail.evidence')}</dt>
              <dd>{evidence}</dd>
            </div>
          </dl>
        ) : trade && tradeView ? (
          <dl className="snapshot-list">
            <div>
              <dt>{t('dialogs.detail.execution')}</dt>
              <dd>
                {tradeView.side} {tradeView.name} × {trade.quantity}
              </dd>
            </div>
            <div>
              <dt>{t('dialogs.detail.timestamp')}</dt>
              <dd>{tradeView.time}</dd>
            </div>
            <div>
              <dt>{t('dialogs.detail.priceFee')}</dt>
              <dd>
                {money(trade.price)} / {money(trade.fee)}
              </dd>
            </div>
            <div>
              <dt>{t('dialogs.detail.realizedPnl')}</dt>
              <dd>{trade.pnl === null ? t('dialogs.detail.entryUnrealized') : signed(trade.pnl)}</dd>
            </div>
          </dl>
        ) : null}

        <details className="audit" open>
          <summary>{t('dialogs.detail.sec01')}</summary>
          <div className="mt-2 space-y-1.5 text-note text-[var(--fg-1)]">
            <p>
              {isLive
                ? t('dialogs.detail.obsLive')
                : t('dialogs.detail.obsSim', {
                    cutoff: state.pitCutoff ?? '2024-04-22 23:59',
                    asset: proposalView.asset,
                  })}
            </p>
            <p className="font-mono text-micro text-[var(--fg-2)]">
              {t('dialogs.detail.evidenceIds')}
              {isProposal ? evidence : (trade?.evidence ?? '—')}
            </p>
          </div>
        </details>

        <details className="audit" open>
          <summary>{t('dialogs.detail.sec02')}</summary>
          <div className="mt-2 space-y-2">
            <Prose>{isProposal ? reason : (tradeView?.reason ?? '—')}</Prose>
            {isLive && isProposal && proposalView.invalidation ? (
              <div className="note">
                {t('dialogs.detail.invalidation')}
                {proposalView.invalidation}
              </div>
            ) : null}
            <p className="font-mono text-micro text-[var(--fg-2)]">
              {t('dialogs.detail.honestDisclosure')}
            </p>
          </div>
        </details>

        <details className="audit">
          <summary>{t('dialogs.detail.sec03')}</summary>
          <pre className="mt-2">{JSON.stringify(structuredPayload, null, 2)}</pre>
        </details>
      </div>
    </Modal>
  )
}
