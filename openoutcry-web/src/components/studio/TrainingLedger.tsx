import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

import type { TrainingRecord } from '../../data/trainings'
import { formatAgent, formatTrainingRecord } from '../../i18n/helpers'
import { cn } from '../../lib/utils'
import { useLocale } from '../../store/LocaleProvider'
import { useTraining } from '../../store/TrainingProvider'
import { trainingStatusText } from '../../store/selectors'
import { LIVE_TASK_ID } from '../../store/trainingTasks'
import type { TrainingStatus } from '../../types'

const AGENT_CODE: Record<string, string> = { codex: 'CX', native: 'OC', kimi: 'KM', custom: '??' }

const TONE: Record<TrainingStatus, string> = {
  running: 'text-[var(--lime)]',
  pending: 'text-[var(--warn)]',
  done: 'text-[var(--fg-2)]',
}

export function TrainingLedger() {
  const navigate = useNavigate()
  const { records, tasks, selectTask } = useTraining()
  const { t } = useTranslation()
  const running = records.filter((r) => r.status === 'running').length

  const openRecord = (rec: TrainingRecord) => {
    if (rec.status === 'running') {
      selectTask(LIVE_TASK_ID)
    } else {
      const archiveTask = tasks.find((task) => !task.live)
      selectTask(archiveTask ? archiveTask.id : LIVE_TASK_ID)
    }
    navigate('/training')
  }

  return (
    <section aria-labelledby="ledger-h" className="mt-9">
      <div className="section-hd">
        <h2 id="ledger-h">{t('ledger.title')}</h2>
        <div className="section-hd-side">
          <span className="count">
            {t('ledger.countSummary', { total: records.length, running })}
          </span>
        </div>
      </div>

      <div className="plate">
        <div
          className="hidden items-center gap-4 px-[var(--sp-5)] pb-[var(--sp-3)] pt-[var(--sp-4)] md:flex"
          aria-hidden
        >
          <Col className="flex-1">{t('ledger.colMandate')}</Col>
          <Col className="w-[148px] shrink-0">{t('ledger.colTeam')}</Col>
          <Col className="w-[176px] shrink-0">{t('ledger.colWindow')}</Col>
          <Col className="w-[96px] shrink-0 text-right">{t('ledger.colProgress')}</Col>
          <Col className="w-[88px] shrink-0 text-right">{t('ledger.colStatus')}</Col>
          <span className="w-4 shrink-0" />
        </div>

        <ul className="mt-2">
          {records.map((rec) => (
            <TrainingRow key={rec.id} training={rec} onOpen={() => openRecord(rec)} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function Col({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('text-micro font-medium text-[var(--fg-2)]', className)}>{children}</span>
}

function TrainingRow({
  training,
  onOpen,
}: {
  training: TrainingRecord
  onOpen: () => void
}) {
  const { lang } = useLocale()
  const { t } = useTranslation()
  const pct = Math.round((training.day / training.days) * 100)
  const active = training.status === 'running'
  const view = formatTrainingRecord(training, t)

  return (
    <li className="relative border-b border-[var(--line-soft)] last:border-b-0">
      {active ? <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-[var(--lime)]" /> : null}
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-4 px-[var(--sp-5)] py-4 text-left transition-colors hover:bg-[var(--bg-2)] focus-visible:bg-[var(--bg-2)]"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="shrink-0 font-mono text-micro tabular-nums text-[var(--ink-3)]">
              {training.no}
            </span>
            <span className="line-clamp-2 min-w-0 font-sans text-row font-semibold leading-snug text-ink md:truncate">
              {view.title}
            </span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-note text-[var(--fg-2)]">
            <span className="md:hidden">
              {training.from.slice(5)} → {training.to.slice(5)}
            </span>
            <span>{view.universe}</span>
            {training.result ? (
              <span
                className={cn(
                  'font-mono text-note font-semibold tabular-nums',
                  training.result.startsWith('-') ? 'text-[var(--down)]' : 'text-[var(--up)]',
                )}
              >
                {training.result}
              </span>
            ) : null}
          </span>
        </span>

        <span className="hidden w-[148px] shrink-0 items-center gap-1.5 md:flex">
          {training.team.map((id) => (
            <span
              key={id}
              title={formatAgent(id, t).name}
              className="grid size-8 place-items-center rounded-md border border-[var(--line-soft)] bg-[var(--bg-2)] font-sans text-micro font-medium text-ink-2"
            >
              {AGENT_CODE[id] ?? id.slice(0, 2)}
            </span>
          ))}
        </span>

        <span className="hidden w-[176px] shrink-0 font-mono text-micro tabular-nums text-[var(--fg-2)] md:block">
          {training.from.slice(5)} → {training.to.slice(5)}
        </span>

        <span className="hidden w-[96px] shrink-0 flex-col items-end gap-1.5 md:flex">
          <span className="font-mono text-micro tabular-nums text-[var(--fg-0)]">
            {training.day}/{training.days}
          </span>
          <span className="h-[4px] w-full overflow-hidden rounded-full bg-[var(--bg-3)]">
            <span className="block h-full bg-[var(--lime)]" style={{ width: pct + '%' }} />
          </span>
        </span>

        <span className={cn('w-[88px] shrink-0 text-right text-micro font-medium', TONE[training.status])}>
          {trainingStatusText(training.status, lang)}
        </span>

        <ArrowUpRight
          size={16}
          aria-hidden
          className="shrink-0 text-[var(--fg-2)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--fg-0)]"
        />
      </button>
    </li>
  )
}
