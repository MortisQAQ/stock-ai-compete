import { Badge } from '../ui/Badge'
import { cn } from '../../lib/utils'
import { assigneeLabel, progressLabel, STATUS_TEXT } from '../../store/trainingTasks'
import type { TrainingTask, TrainingTaskStatus } from '../../store/trainingTasks'

const BADGE: Record<TrainingTaskStatus, 'pine' | 'brass' | 'outline'> = {
  running: 'pine',
  pending: 'brass',
  done: 'outline',
}

interface Props {
  tasks: TrainingTask[]
  currentId: string
  onSelect: (id: string) => void
  className?: string
}

/**
 * 右栏 = 训练任务切换器。
 * 一项任务 = 委托给某个 Agent / 团队的一段时间窗内的交易工作。
 * 当前项用朱砂竖线 + aria-current="page" 标记；点击换中栏内容。
 */
export function TaskSwitcher({ tasks, currentId, onSelect, className }: Props) {
  return (
    <nav aria-label="训练任务" className={cn('flex min-h-0 min-w-0 flex-col bg-[var(--bone)]', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--rule-strong)] px-4 pb-2 pt-2.5">
        <span className="label">训练任务</span>
        <span className="font-mono text-[length:var(--fs-micro)] tracking-[0.08em] text-[var(--ink-3)]">
          {tasks.length} 项
        </span>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tasks.map((task) => {
          const active = task.id === currentId
          return (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onSelect(task.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative block w-full border-b border-[var(--rule-soft)] px-4 py-3 text-left transition-colors',
                  'hover:bg-[var(--bone-hi)]',
                  active && 'bg-[var(--bone-hi)]',
                )}
              >
                {active ? (
                  <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-[var(--ver)]" />
                ) : (
                  <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-transparent" />
                )}

                <span className="flex items-start justify-between gap-2">
                  <b className="line-clamp-2 min-w-0 text-[length:var(--fs-body)] font-semibold leading-snug text-[var(--ink)]">
                    {task.name}
                  </b>
                  <span className="shrink-0">
                    <Badge variant={BADGE[task.status]}>{STATUS_TEXT[task.status]}</Badge>
                  </span>
                </span>
                <span className="mt-1.5 block font-mono text-[length:var(--fs-micro)] tracking-[0.04em] text-[var(--ink-2)]">
                  {task.windowLabel}
                </span>
                <span className="mt-0.5 block truncate font-mono text-[length:var(--fs-micro)] tracking-[0.04em] text-[var(--ink-3)]">
                  {assigneeLabel(task)}
                </span>
                <span className="mt-1 block font-mono text-[length:var(--fs-micro)] tracking-[0.04em] text-[var(--ink-3)]">
                  {progressLabel(task)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="border-t border-[var(--rule-soft)] px-4 py-2.5 font-mono text-[length:var(--fs-micro)] leading-relaxed tracking-[0.04em] text-[var(--ink-3)]">
        任务 = 委托给一个 Agent 或团队的一段时间 · 切换后中栏换成该任务的台账
      </p>
    </nav>
  )
}
