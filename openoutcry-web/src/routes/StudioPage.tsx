import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { formatAgent } from '../i18n/helpers'
import { money, signedPct } from '../lib/format'
import { useRun } from '../store/RunProvider'
import { useTraining } from '../store/TrainingProvider'
import { Button } from '../components/ui/Button'
import { MandateTicket } from '../components/studio/MandateTicket'
import { TrainingLedger } from '../components/studio/TrainingLedger'

/**
 * Step 02 · 训练委托台：
 * 紧凑头部与当前在跑摘要 + 2×2 委托单 + 训练台账。
 */
export function StudioPage() {
  const { state, totals } = useRun('training')
  const { records } = useTraining()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const netPct = state.initial ? (totals.net / state.initial) * 100 : 0
  const current = records.find((r) => r.status === 'running') ?? records[0]
  const teamNames = (state.team ?? [state.agent]).map((id) => formatAgent(id, t).shortName).join(' + ')

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{t('studio.title')}</h1>
          <p className="deck">{t('studio.deck')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--line-soft)] bg-[var(--bg-1)] px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-micro text-[var(--fg-2)]">
              {t('studio.activeRun')}{' '}
              <span className="font-mono">{state.mandateNo ?? current.no}</span>
            </span>
            <span className="font-mono text-note font-semibold tabular-nums text-[var(--fg-0)]">
              {teamNames} · {money(totals.equity)}{' '}
              <em className={totals.net >= 0 ? 'not-italic text-[var(--up)]' : 'not-italic text-[var(--down)]'}>
                ({signedPct(netPct)})
              </em>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/training')}>
            {t('studio.btnOpenArena')}
            <ArrowRight size={14} aria-hidden />
          </Button>
        </div>
      </div>

      <div className="space-y-10">
        <MandateTicket />
        <TrainingLedger />
      </div>
    </>
  )
}
