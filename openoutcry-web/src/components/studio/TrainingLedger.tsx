import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

import { agentOf } from '../../data/agents'
import { TRAINING_SEED } from '../../data/trainings'
import { TRAINING_STATUS_TEXT } from '../../store/selectors'
import type { TrainingRecord } from '../../data/trainings'
import type { TrainingStatus } from '../../types'
import { cn } from '../../lib/utils'

/** 团队徽记：两字代号，比取名字首字稳定 */
const AGENT_CODE: Record<string, string> = { codex: 'CX', native: 'OC', kimi: 'KM', custom: '??' }

const TONE: Record<TrainingStatus, string> = {
  running: 'text-[var(--ver)]',
  pending: 'text-[var(--brass)]',
  done: 'text-[var(--ink-3)]',
}

/**
 * 训练台账：训练是记录，不是卡片。
 * 一行一次委托 —— 名称、团队、时段、进度、状态，横读一行就能判断要不要进去。
 */
export function TrainingLedger() {
  const navigate = useNavigate()
  const running = TRAINING_SEED.filter((t) => t.status === 'running').length

  return (
    <section aria-labelledby="ledger-h" className="mt-10">
      <div className="section-hd">
        <h2 id="ledger-h">训练台账</h2>
        <div className="section-hd-side">
          <span className="count">
            {TRAINING_SEED.length} 次 · {running} 进行中
          </span>
        </div>
      </div>

      <div className="border-t border-[var(--ink)]">
        <div className="hidden items-center gap-4 px-1 pt-2 pb-1.5 md:flex" aria-hidden>
          <Col className="flex-1">训练</Col>
          <Col className="w-[132px] shrink-0">团队</Col>
          <Col className="w-[176px] shrink-0">时段</Col>
          <Col className="w-[92px] shrink-0 text-right">进度</Col>
          <Col className="w-[88px] shrink-0 text-right">状态</Col>
          <span className="w-4 shrink-0" />
        </div>

        <ul>
          {TRAINING_SEED.map((t) => (
            <TrainingRow key={t.id} training={t} onOpen={() => navigate('/training')} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function Col({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'font-mono text-micro font-semibold uppercase tracking-[0.16em] text-[var(--ink-3)]',
        className,
      )}
    >
      {children}
    </span>
  )
}

function TrainingRow({ training, onOpen }: { training: TrainingRecord; onOpen: () => void }) {
  const pct = Math.round((training.day / training.days) * 100)
  const active = training.status === 'running'

  return (
    <li className="relative border-b border-[var(--rule)]">
      {active ? <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-[var(--ver)]" /> : null}
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-4 px-1 py-3 text-left transition-colors hover:bg-[var(--bone-lo)]/55 focus-visible:bg-[var(--bone-lo)]/55"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="shrink-0 font-mono text-micro tracking-[0.08em] text-[var(--ink-3)]">
              {training.no}
            </span>
            <span className="line-clamp-2 min-w-0 font-serif text-row font-bold leading-snug tracking-[-0.01em] text-ink md:truncate">
              {training.title}
            </span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-note text-[var(--ink-3)]">
            <span className="md:hidden">{training.from.slice(5)} → {training.to.slice(5)}</span>
            <span>{training.universe}</span>
            {training.result ? (
              <span
                className={cn(
                  'font-mono text-note font-semibold',
                  training.result.startsWith('-') ? 'text-[var(--down)]' : 'text-[var(--ver)]',
                )}
              >
                {training.result}
              </span>
            ) : null}
          </span>
        </span>

        <span className="hidden w-[132px] shrink-0 items-center gap-1 md:flex">
          {training.team.map((id) => (
            <span
              key={id}
              title={agentOf(id).name}
              className="grid size-7 place-items-center border border-[var(--rule)] bg-[var(--bone-hi)] font-mono text-micro font-semibold uppercase text-ink-2"
            >
              {AGENT_CODE[id]}
            </span>
          ))}
          <span className="ml-1 font-mono text-micro text-[var(--ink-3)]">{training.team.length} 位</span>
        </span>

        <span className="hidden w-[176px] shrink-0 font-mono text-note text-ink-2 md:block">
          {training.from.slice(5)} → {training.to.slice(5)}
        </span>

        <span className="hidden w-[92px] shrink-0 md:block">
          <span className="block text-right font-mono text-note font-semibold text-ink-2">
            {training.day} / {training.days}
          </span>
          <span className="mt-1 block h-[3px] w-full bg-[var(--bone-3)]">
            <span
              className={cn('block h-full', active ? 'bg-[var(--ver)]' : 'bg-[var(--ink-3)]')}
              style={{ width: pct + '%' }}
            />
          </span>
        </span>

        <span
          className={cn(
            'w-[88px] shrink-0 text-right font-mono text-note font-semibold tracking-[0.06em]',
            TONE[training.status],
          )}
        >
          {TRAINING_STATUS_TEXT[training.status]}
        </span>

        <ArrowUpRight
          aria-hidden
          className="size-4 shrink-0 text-[var(--ink-3)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </button>
    </li>
  )
}
