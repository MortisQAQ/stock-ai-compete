import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

import { agentOf } from '../../data/agents'
import type { TrainingRecord } from '../../data/trainings'
import { useLocale } from '../../store/LocaleProvider'
import { useTraining } from '../../store/TrainingProvider'
import { TRAINING_STATUS_TEXT, TRAINING_STATUS_TEXT_EN } from '../../store/selectors'
import { LIVE_TASK_ID } from '../../store/trainingTasks'
import type { TrainingStatus } from '../../types'
import { cn } from '../../lib/utils'

const AGENT_CODE: Record<string, string> = { codex: 'CX', native: 'OC', kimi: 'KM', custom: '??' }

const TONE: Record<TrainingStatus, string> = {
  running: 'text-[var(--lime)]',
  pending: 'text-[var(--warn)]',
  done: 'text-[var(--fg-2)]',
}

/**
 * 训练台账：读取全局 TrainingProvider.records，新开具的 № 0043 会立刻出现在首行；
 * 点击任意行可真实切换当前训练任务并跳转至 /training。
 */
export function TrainingLedger() {
  const navigate = useNavigate()
  const { records, tasks, selectTask } = useTraining()
  const { isEn, bi } = useLocale()
  const running = records.filter((t) => t.status === 'running').length

  const openRecord = (rec: TrainingRecord) => {
    if (rec.status === 'running') {
      selectTask(LIVE_TASK_ID)
    } else {
      const archiveTask = tasks.find((t) => !t.live)
      selectTask(archiveTask ? archiveTask.id : LIVE_TASK_ID)
    }
    navigate('/training')
  }

  return (
    <section aria-labelledby="ledger-h" className="mt-9">
      <div className="section-hd">
        <h2 id="ledger-h">{bi('训练台账', 'Training Ledger')}</h2>
        <div className="section-hd-side">
          <span className="count">
            {bi(`${records.length} 次委托 · ${running} 进行中`, `${records.length} mandates · ${running} running`)}
          </span>
        </div>
      </div>

      <div className="plate">
        <div
          className="hidden items-center gap-4 px-[var(--sp-5)] pb-[var(--sp-3)] pt-[var(--sp-4)] md:flex"
          aria-hidden
        >
          <Col className="flex-1">{bi('训练委托', 'Mandate')}</Col>
          <Col className="w-[148px] shrink-0">{bi('团队', 'Team')}</Col>
          <Col className="w-[176px] shrink-0">{bi('时段', 'Window')}</Col>
          <Col className="w-[96px] shrink-0 text-right">{bi('进度', 'Progress')}</Col>
          <Col className="w-[88px] shrink-0 text-right">{bi('状态', 'Status')}</Col>
          <span className="w-4 shrink-0" />
        </div>

        <ul className="mt-2">
          {records.map((t) => (
            <TrainingRow key={t.id} training={t} isEn={isEn} onOpen={() => openRecord(t)} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function Col({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('cond text-micro font-semibold text-[var(--fg-2)]', className)}>{children}</span>
}

function TrainingRow({
  training,
  isEn,
  onOpen,
}: {
  training: TrainingRecord
  isEn: boolean
  onOpen: () => void
}) {
  const pct = Math.round((training.day / training.days) * 100)
  const active = training.status === 'running'
  const statusMap = isEn ? TRAINING_STATUS_TEXT_EN : TRAINING_STATUS_TEXT

  return (
    <li className="relative border-b border-[var(--line-soft)] last:border-b-0">
      {active ? <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-[var(--lime)]" /> : null}
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-4 px-[var(--sp-5)] py-3.5 text-left transition-colors hover:bg-[var(--bg-2)] focus-visible:bg-[var(--bg-2)]"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="shrink-0 font-mono text-micro tracking-[0.08em] text-[var(--ink-3)]">
              {training.no}
            </span>
            <span className="line-clamp-2 min-w-0 font-sans text-row font-semibold leading-snug tracking-[-0.02em] text-ink md:truncate">
              {training.title}
            </span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-note text-[var(--fg-2)]">
            <span className="md:hidden">
              {training.from.slice(5)} → {training.to.slice(5)}
            </span>
            <span>{training.universe}</span>
            {training.result ? (
              <span
                className={cn(
                  'font-mono text-note font-semibold',
                  training.result.startsWith('-') ? 'text-[var(--down)]' : 'text-[var(--up)]',
                )}
              >
                {training.result}
              </span>
            ) : null}
          </span>
        </span>

        <span className="hidden w-[148px] shrink-0 items-center gap-1 md:flex">
          {training.team.map((id) => (
            <span
              key={id}
              title={agentOf(id).name}
              className="grid size-8 place-items-center border border-[var(--rule)] bg-[var(--bg-1)] font-mono text-micro font-semibold uppercase text-ink-2"
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

        <span className={cn('w-[88px] shrink-0 text-right font-mono text-micro font-semibold', TONE[training.status])}>
          {statusMap[training.status]}
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
