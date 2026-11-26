import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { formatAgent } from '../i18n/helpers'
import { useRun } from '../store/RunProvider'
import { useTraining } from '../store/TrainingProvider'
import { Button } from '../components/ui/Button'
import { MandateTicket } from '../components/studio/MandateTicket'
import { TrainingLedger } from '../components/studio/TrainingLedger'
import { money, signedPct } from '../lib/format'

/**
 * Step 02 · 训练委托台（首屏压实布局）
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
      <div className="vlabel page-vlabel" aria-hidden="true">
        OPENOUTCRY / 02 TRAINING DESK / 2026
      </div>

      <div className="pagehead">
        <div>
          <span className="label">{t('studio.kicker')}</span>
          <h1>{t('studio.title')}</h1>
          <p className="deck">{t('studio.deck')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--bg-1)] px-4 py-2.5">
          <div className="flex flex-col">
            <span className="font-mono text-micro text-[var(--fg-2)]">
              {t('studio.activeRun')} {state.mandateNo ?? current.no}
            </span>
            <span className="font-mono text-note font-semibold text-[var(--fg-0)]">
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

      <MandateTicket />
      <TrainingLedger />

      <div className="foot">
        <span>
          <b>openOutcry</b> — {t('studio.footerDesc')}
        </span>
        <span>v2.0 · 2026-11</span>
      </div>
    </>
  )
}
