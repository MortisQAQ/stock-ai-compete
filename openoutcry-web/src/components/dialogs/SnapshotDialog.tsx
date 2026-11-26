import { useTranslation } from 'react-i18next'

import { formatAgent, formatCollab, formatMarketSession } from '../../i18n/helpers'
import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Modal } from '../ui/Modal'
import { Prose } from '../ui/Prose'
import { Button } from '../ui/Button'
import { money } from '../../lib/format'

export function SnapshotDialog({ open }: { open: boolean }) {
  const { state } = useRun()
  const { close } = useDialog()
  const { t } = useTranslation()
  const agent = formatAgent(state.agent, t)
  const collab = formatCollab(state.collaboration, t)
  const isLive = state.kind === 'live'

  const rows: Array<[string, string]> = isLive
    ? [
        [t('dialogs.snapshot.live.boundAgent'), agent.name + ' / ' + agent.version],
        [t('dialogs.snapshot.live.mode'), t('dialogs.snapshot.live.modeVal')],
        [t('dialogs.snapshot.live.marketSession'), formatMarketSession(state.marketSessionKey, state.marketSession, t)],
        [t('dialogs.snapshot.live.research'), t('dialogs.snapshot.live.researchVal')],
        [t('dialogs.snapshot.live.ledger'), t('dialogs.snapshot.live.ledgerVal')],
        [t('dialogs.snapshot.live.cash'), money(state.cash)],
        [t('dialogs.snapshot.live.boundary'), t('dialogs.snapshot.live.boundaryVal')],
        [t('dialogs.snapshot.live.collab'), t('dialogs.snapshot.live.collabVal', { collab })],
      ]
    : [
        [t('dialogs.snapshot.sim.agent'), agent.name + ' / ' + agent.version],
        [t('dialogs.snapshot.sim.sessionRun'), 'sess_demo_001 / run_demo_001'],
        [t('dialogs.snapshot.sim.window'), t('dialogs.snapshot.sim.windowVal')],
        [t('dialogs.snapshot.sim.capital'), money(state.initial)],
        [t('dialogs.snapshot.sim.pool'), t('dialogs.snapshot.sim.poolVal')],
        [t('dialogs.snapshot.sim.data'), 'market-demo-v1 / evidence-demo-v2'],
        [t('dialogs.snapshot.sim.rules'), t('dialogs.snapshot.sim.rulesVal')],
        [t('dialogs.snapshot.sim.budget'), t('dialogs.snapshot.sim.budgetVal')],
        [t('dialogs.snapshot.sim.fee'), t('dialogs.snapshot.sim.feeVal')],
        [t('dialogs.snapshot.sim.type'), collab + ' · ' + agent.qualification],
      ]

  return (
    <Modal
      open={open}
      kicker={isLive ? t('dialogs.snapshot.kickerLive') : t('dialogs.snapshot.kickerSim')}
      title={isLive ? t('dialogs.snapshot.titleLive') : t('dialogs.snapshot.titleSim')}
      onClose={close}
      footer={
        <Button size="sm" variant="ghost" onClick={close}>
          {t('dialogs.close')}
        </Button>
      }
    >
      <Prose className="mb-2.5 text-note text-ink-3">
        {isLive ? t('dialogs.snapshot.descLive') : t('dialogs.snapshot.descSim')}
      </Prose>
      <dl className="snapshot-list">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}
