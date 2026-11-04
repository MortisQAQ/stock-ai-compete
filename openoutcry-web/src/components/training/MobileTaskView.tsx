import type { RefObject } from 'react'

import { useRun } from '../../store/RunProvider'
import { agentOf } from '../../data/agents'
import { cn } from '../../lib/utils'
import { Stamp } from '../ui/Stamp'
import { StatBand } from '../run/StatBand'
import { AssistantFab } from './AssistantSheet'
import { WorkbenchActions, WorkbenchBody, bandItemsFor } from './WorkbenchPane'
import { assigneeLabel, progressLabel, STATUS_TEXT } from '../../store/trainingTasks'
import type { TrainingTask } from '../../store/trainingTasks'

interface Props {
  task: TrainingTask
  tasks: TrainingTask[]
  onSelect: (id: string) => void
  assistantOpen: boolean
  onOpenAssistant: () => void
  fabRef: RefObject<HTMLButtonElement | null>
}

/**
 * 移动端主屏 = 任务视图（表头 + 中栏核心内容）。
 * 右栏的「训练任务」折成一排可横滑的按钮，左栏的对话流收进右下角的助手页。
 */
export function MobileTaskView({ task, tasks, onSelect, assistantOpen, onOpenAssistant, fabRef }: Props) {
  const { state, totals } = useRun()
  const agent = agentOf(state.agent)
  const band = bandItemsFor(task, {
    equity: totals.equity,
    net: totals.net,
    cash: state.cash,
    market: totals.market,
    initial: state.initial,
    holdings: state.holdings.length,
  })

  return (
    <div className="min-[1100px]:hidden pb-24 [&_[data-slot='button']]:min-h-11 [&_[role='tab']]:min-h-11 [&_.more-menu-list_button]:min-h-11 [&_.stepper_button]:min-h-11 [&_.stepper_button]:min-w-11">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="label">训练任务</span>
            <Stamp tone={task.status === 'done' ? 'brass' : task.status === 'pending' ? 'ver' : 'pine'} size="sm">
              {STATUS_TEXT[task.status]}
            </Stamp>
          </div>
          <h2 className="mt-1.5 font-serif text-[length:var(--fs-h2)] font-bold leading-snug tracking-[-0.01em] text-[var(--ink)]">
            {task.name}
          </h2>
          <p className="mt-1 font-mono text-[length:var(--fs-micro)] leading-relaxed tracking-[0.04em] text-[var(--ink-3)]">
            {task.windowLabel} · {assigneeLabel(task)}
          </p>
        </div>
      </div>

      <nav aria-label="训练任务（切换）" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1.5">
        {tasks.map((item) => {
          const active = item.id === task.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 w-[196px] shrink-0 flex-col justify-center rounded-xs border px-2.5 py-1.5 text-left transition-colors',
                active ? 'border-[var(--ink)] bg-[var(--bone-hi)]' : 'border-[var(--rule)] bg-transparent',
              )}
            >
              <span className="truncate text-[length:var(--fs-sm)] font-semibold text-[var(--ink)]">{item.name}</span>
              <span className="mt-0.5 truncate font-mono text-[length:var(--fs-micro)] tracking-[0.04em] text-[var(--ink-3)]">
                {STATUS_TEXT[item.status]} · {progressLabel(item)}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-3 [&_.band-cell]:px-3.5 [&_.band-cell]:py-2.5">
        <StatBand
          items={band}
          tags={
            <>
              <span>
                资料时点 <b>2024-04-22 23:59:58</b>
              </span>
              <span>
                轨迹完整性 <s>100%</s>
              </span>
            </>
          }
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[length:var(--fs-micro)] tracking-[0.08em] text-[var(--ink-3)]">
          {state.clock} · {agent.source}
        </span>
        <WorkbenchActions />
      </div>

      <div className="mt-4">
        <WorkbenchBody task={task} />
      </div>

      <div className="foot">
        <span>
          <b>run_demo_001</b> · sess_demo_001 · {agent.name}
        </span>
        <span>全部数据虚构</span>
      </div>

      <AssistantFab expanded={assistantOpen} onOpen={onOpenAssistant} fabRef={fabRef} />
    </div>
  )
}
