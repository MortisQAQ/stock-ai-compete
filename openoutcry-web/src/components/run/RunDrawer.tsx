import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PanelRightOpen, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import {
  formatAgent,
  formatAsset,
  formatMarketSession,
  formatStateClock,
  formatSyncLabel,
} from '../../i18n/helpers'
import { exportRun } from '../../lib/exportRun'
import { useDialog } from '../../store/DialogProvider'
import { useRun, useWorkspaceKind } from '../../store/RunProvider'
import { useToast } from '../../store/ToastProvider'

export function RunDrawer() {
  const kind = useWorkspaceKind()
  const { state, totals, actions } = useRun()
  const { open: openDialog } = useDialog()
  const { notifyKey } = useToast()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const agent = formatAgent(state.agent, t)
  const aborted = state.status === 'aborted'
  const isLive = state.kind === 'live'
  const team = state.team ?? [state.agent]

  const act = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  return (
    <>
      <button type="button" className="bench-act" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <PanelRightOpen size={15} aria-hidden />
        <span>{isLive ? t('drawer.triggerLive') : t('drawer.triggerSim')}</span>
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="drawer-scrim" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={
              'side-drawer ' +
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200 ' +
              'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-150'
            }
          >
            <DialogPrimitive.Title className="sr-only">
              {isLive ? t('drawer.titleLive') : t('drawer.titleSim')}
            </DialogPrimitive.Title>

            <header className="side-drawer-hd">
              <div>
                <span className="label">{isLive ? t('drawer.labelLive') : t('drawer.labelSim')}</span>
                <p className="side-drawer-title">{agent.name}</p>
              </div>
              <DialogPrimitive.Close aria-label={t('drawer.closeAria')} className="side-drawer-x">
                <X size={18} aria-hidden />
              </DialogPrimitive.Close>
            </header>

            <div className="side-drawer-body">
              <section className="side-sec">
                <h3 className="side-sec-hd">{t('drawer.secContract')}</h3>
                {isLive ? (
                  <>
                    <div className="kv">
                      <span>{t('drawer.marketSession')}</span>
                      <span className="dots" />
                      <b>{formatMarketSession(state.marketSessionKey, state.marketSession, t)}</b>
                    </div>
                    <div className="kv">
                      <span>{t('drawer.researchAccess')}</span>
                      <span className="dots" />
                      <b>{t('drawer.realtimeOpen')}</b>
                    </div>
                    <div className="kv">
                      <span>{t('drawer.ledgerSource')}</span>
                      <span className="dots" />
                      <b>{t('drawer.ledgerMirrorManual')}</b>
                    </div>
                    <div className="kv">
                      <span>{t('drawer.execPermission')}</span>
                      <span className="dots" />
                      <b>{t('drawer.advisoryOnly')}</b>
                    </div>
                    <div className="kv">
                      <span>{t('drawer.syncTime')}</span>
                      <span className="dots" />
                      <b>{formatSyncLabel(state.syncKey, state.syncLabel, t)}</b>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="kv">
                      <span>{t('drawer.dataCutoff')}</span>
                      <span className="dots" />
                      <b>{state.pitCutoff ?? '2024-04-22 23:59'}</b>
                    </div>
                    <div className="kv">
                      <span>{t('drawer.blindMaskLabel')}</span>
                      <span className="dots" />
                      <b>
                        {state.blindMask !== false
                          ? t('drawer.blindMaskOn', {
                              asset: formatAsset(state.proposal.asset ?? '公司-017', t),
                            })
                          : t('drawer.blindMaskOff')}
                      </b>
                    </div>
                    <div className="kv">
                      <span>{t('drawer.teamLabel')}</span>
                      <span className="dots" />
                      <b>
                        {team
                          .map((id, idx) => {
                            const role =
                              idx === 0
                                ? t('training.teamLead')
                                : idx === 1
                                  ? t('training.teamResearch')
                                  : t('training.teamRisk')
                            return `${role} · ${formatAgent(id, t).shortName}`
                          })
                          .join(' / ')}
                      </b>
                    </div>
                    <div className="kv">
                      <span>{t('drawer.toolGatewayLabel')}</span>
                      <span className="dots" />
                      <b>{t('drawer.controlled')}</b>
                    </div>
                    <div className="kv">
                      <span>{t('drawer.qualification')}</span>
                      <span className="dots" />
                      <b>{agent.qualification}</b>
                    </div>
                    <div className="kv">
                      <span>{t('drawer.simClock')}</span>
                      <span className="dots" />
                      <b>{formatStateClock(state, t)}</b>
                    </div>
                  </>
                )}
              </section>

              <section className="side-sec">
                <h3 className="side-sec-hd">{t('drawer.secActions')}</h3>
                {isLive ? (
                  <button
                    type="button"
                    className="side-act"
                    onClick={() => act(() => openDialog({ kind: 'editHolding', scope: kind }))}
                  >
                    {t('drawer.actEditHoldings')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="side-act"
                  onClick={() => act(() => openDialog({ kind: 'replay', scope: kind }))}
                >
                  {isLive ? t('drawer.actReplayLive') : t('drawer.actReplaySim')}
                </button>
                <button
                  type="button"
                  className="side-act"
                  onClick={() => act(() => openDialog({ kind: 'snapshot', scope: kind }))}
                >
                  {isLive ? t('drawer.actSnapshotLive') : t('drawer.actSnapshotSim')}
                </button>
                {!isLive ? (
                  <button
                    type="button"
                    className="side-act"
                    disabled={aborted}
                    onClick={() => act(() => actions.togglePause())}
                  >
                    {state.status === 'paused' ? t('drawer.actResume') : t('drawer.actPause')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="side-act"
                  onClick={() =>
                    act(() => {
                      exportRun(state, totals)
                      notifyKey('toasts.jsonExported', 'success')
                    })
                  }
                >
                  {t('drawer.actExportJson')}
                </button>
                {!isLive ? (
                  <button
                    type="button"
                    className="side-act danger"
                    disabled={aborted}
                    onClick={() => act(() => openDialog({ kind: 'abort', scope: kind }))}
                  >
                    {t('drawer.actAbort')}
                  </button>
                ) : null}
              </section>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
