import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Clock, Lock, RotateCcw, Shield, ShieldCheck, Users } from 'lucide-react'

import {
  formatAgent,
  formatAsset,
  formatStateClock,
  formatSyncLabel,
  formatTask,
} from '../../i18n/helpers'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useRun, useWorkspaceKind } from '../../store/RunProvider'
import { bandItemsFor, trainingStatusText } from '../../store/selectors'
import { useToast } from '../../store/ToastProvider'
import type { TrainingPhase, TrainingTask, TranslationKey } from '../../types'
import { cn } from '../../lib/utils'
import { ProposalTicket } from '../proposal/ProposalTicket'
import { RunDrawer } from '../run/RunDrawer'
import { StatBand } from '../run/StatBand'
import { WorkbenchTabs } from '../run/WorkbenchTabs'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Stamp } from '../ui/Stamp'

const PHASE_STEPS: ReadonlyArray<{ id: TrainingPhase; time: string; labelKey: TranslationKey }> = [
  { id: 'pre_market', time: '09:15', labelKey: 'training.phases.pre_market' },
  { id: 'open_match', time: '09:30', labelKey: 'training.phases.open_match' },
  { id: 'close_settle', time: '15:00', labelKey: 'training.phases.close_settle' },
]

/** 已结束任务 / 实盘周归档的只读视图 */
function ArchiveBody({ task }: { task: TrainingTask }) {
  const kind = useWorkspaceKind()
  const { open } = useDialog()
  const { notifyKey } = useToast()
  const { t } = useTranslation()
  const archive = task.archive
  if (!archive) return null
  const isLiveArchive = task.kind === 'live'
  const view = formatTask(task, t)
  const logs = view.archiveLogs ?? archive.log
  const trades = view.archiveTrades ?? archive.trades

  return (
    <div className="flex flex-col gap-[var(--sp-5)]">
      <Card variant="dashed">
        <CardHeader>
          <span>{isLiveArchive ? t('training.archive.liveTitle') : t('training.archive.simTitle')}</span>
          <Badge variant="outline">{t('training.archive.readOnlyBadge')}</Badge>
        </CardHeader>
        <CardContent>
          <div className="kv">
            <span>{isLiveArchive ? t('training.archive.advisor') : t('training.archive.assignee')}</span>
            <span className="dots" />
            <b>{task.assignee.kind === 'team' ? t('training.archive.agentTeam') : t('training.archive.singleAgent')}</b>
          </div>
          <div className="kv">
            <span>{t('training.archive.window')}</span>
            <span className="dots" />
            <b>{view.windowLabel}</b>
          </div>
          <div className="kv">
            <span>
              {isLiveArchive ? t('training.archive.advisoriesRecorded') : t('training.archive.decisionsFills')}
            </span>
            <span className="dots" />
            <b>
              {archive.decisions} / {archive.fills}
            </b>
          </div>
          {view.members ? (
            <p className="mt-3 text-note leading-relaxed text-[var(--ink-2)]">
              {t('training.archive.membersPrefix')}
              {view.members.join(t('training.archive.membersSeparator'))}
            </p>
          ) : null}
          <p className="note">{view.archiveNote ?? archive.note}</p>
          <div className="proposal-actions">
            <Button variant="ghost" size="sm" onClick={() => open({ kind: 'replay', scope: kind })}>
              {isLiveArchive ? t('training.archive.btnReplayAdvisories') : t('training.archive.btnReplayTrace')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => notifyKey('toasts.archiveExportUnsupported', 'info')}
            >
              {t('training.archive.btnExportArchive')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <span>{t('training.archive.keyDecisions')}</span>
          <Badge variant="outline">{logs.length}</Badge>
        </CardHeader>
        <CardContent>
          {logs.map((line) => (
            <div className="border-b border-[var(--line-soft)] py-3 last:border-b-0" key={line.at + line.title}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{line.kind.toUpperCase()}</Badge>
                <span className="font-mono text-micro text-[var(--ink-3)]">{line.at}</span>
              </div>
              <p className="mt-1.5 text-body font-semibold leading-snug text-[var(--ink)]">{line.title}</p>
              <p className="mt-1 text-note leading-relaxed text-[var(--ink-2)]">{line.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <span>{isLiveArchive ? t('training.archive.recordedLiveFills') : t('training.archive.fills')}</span>
          <Badge variant="outline">{trades.length}</Badge>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-note text-[var(--ink-3)]">{t('training.archive.noFills')}</p>
          ) : (
            trades.map((tr) => (
              <div className="report-row" key={tr}>
                <span>{tr}</span>
                <span className="dots" />
                <b>{isLiveArchive ? t('training.archive.recorded') : t('training.archive.filled')}</b>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function WorkbenchBody({ task }: { task: TrainingTask }) {
  const { state } = useRun()
  const { t } = useTranslation()
  if (!task.live) return <ArchiveBody task={task} />
  const isLive = state.kind === 'live'

  return (
    <div className="flex flex-col gap-[var(--sp-5)]">
      <ProposalTicket />
      <WorkbenchTabs />
      <p className="font-mono text-micro leading-relaxed tracking-[0.04em] text-[var(--ink-3)]">
        {isLive ? t('training.liveFooterNote') : t('training.simFooterNote')}
      </p>
    </div>
  )
}

export function WorkbenchPane({ task, className }: { task: TrainingTask; className?: string }) {
  const { state, totals } = useRun()
  const { lang } = useLocale()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const band = bandItemsFor(task, state, totals, lang)
  const isLive = state.kind === 'live'
  const view = formatTask(task, t)
  const phase: TrainingPhase = state.phase ?? 'pre_market'
  const phaseIdx = PHASE_STEPS.findIndex((p) => p.id === phase)
  const team = state.team ?? [state.agent]

  return (
    <section
      aria-label={isLive ? t('training.livePaneAria') : t('training.paneAria')}
      className={cn('bench-work', className)}
    >
      <header className="bench-hd">
        <div className="bench-hd-main">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0">{view.name}</h2>
            <Stamp size="sm" tone={isLive ? 'lime' : 'slate'}>
              {isLive ? t('training.liveStamp') : t('training.simStamp')}
            </Stamp>
          </div>
          <p className="bench-hd-meta">
            {view.windowLabel} · {trainingStatusText(task.status, lang)}
          </p>
        </div>
        <RunDrawer />
      </header>

      {task.live ? (
        isLive ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-lime)] bg-[var(--lime-soft)] px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2 font-mono text-micro text-[var(--fg-0)]">
              <ShieldCheck size={15} aria-hidden className="text-[var(--lime)]" />
              <span className="font-semibold text-[var(--lime)]">{t('training.liveSafetyTitle')}</span>
              <span className="text-[var(--fg-1)]">
                · {t('training.shadowLedgerPrefix')}
                {formatSyncLabel(state.syncKey, state.syncLabel, t)}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/studio')}>
              <RotateCcw size={14} aria-hidden />
              {t('training.btnReplayInArena')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 border-b border-[var(--line)] bg-[var(--bg-2)] px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-micro">
                <span className="inline-flex items-center gap-1.5 rounded bg-[var(--bg-1)] px-2 py-1 font-semibold text-[var(--fg-0)]">
                  <Clock size={14} aria-hidden className="text-[var(--lime)]" />
                  {formatStateClock(state, t)}
                </span>
                {PHASE_STEPS.map((st, idx) => {
                  const active = idx === phaseIdx
                  const passed = idx < phaseIdx
                  return (
                    <span
                      key={st.id}
                      className={cn(
                        'inline-flex items-center gap-1 rounded px-2 py-1 transition-colors',
                        active
                          ? 'bg-[var(--lime-soft)] font-semibold text-[var(--lime)]'
                          : passed
                            ? 'bg-[var(--bg-1)] text-[var(--fg-1)]'
                            : 'text-[var(--fg-2)]',
                      )}
                    >
                      <span>{passed ? '✓' : active ? '●' : '○'}</span>
                      <span>
                        {st.time} {t(st.labelKey)}
                      </span>
                    </span>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 font-mono text-micro">
                <span className="inline-flex items-center gap-1 rounded bg-[var(--warn-soft)] px-2 py-1 text-[var(--warn)]">
                  <Lock size={13} aria-hidden />
                  {t('training.pitCutoff', { cutoff: state.pitCutoff ?? '04-22 23:59' })}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-1)] px-2 py-1 text-[var(--fg-1)]">
                  <Shield size={13} aria-hidden className="text-[var(--lime)]" />
                  {state.blindMask !== false
                    ? t('training.blindMaskTag', { asset: formatAsset(state.proposal.asset ?? '公司-017', t) })
                    : t('training.unmaskedTag')}
                </span>
              </div>
            </div>

            {team.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line-soft)] pt-1.5 font-mono text-micro text-[var(--fg-1)]">
                <Users size={13} aria-hidden className="text-[var(--lime)]" />
                <span>{t('training.teamPrefix')}</span>
                {team.map((id, idx) => (
                  <span key={id} className="rounded bg-[var(--bg-1)] px-2 py-0.5 text-[var(--fg-0)]">
                    {idx === 0
                      ? t('training.teamLead')
                      : idx === 1
                        ? t('training.teamResearch')
                        : t('training.teamRisk')}{' '}
                    · {formatAgent(id, t).shortName}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )
      ) : null}

      <div className="bench-band">
        <StatBand items={band} />
      </div>

      <div className="bench-body">
        <WorkbenchBody task={task} />
      </div>
    </section>
  )
}
