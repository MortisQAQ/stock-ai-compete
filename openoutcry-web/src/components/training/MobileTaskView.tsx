import type { RefObject } from 'react'

import { useRun } from '../../store/RunProvider'
import { useTraining } from '../../store/TrainingProvider'
import { StatBand } from '../run/StatBand'
import { AssistantFab } from './AssistantSheet'
import { WorkbenchBody } from './WorkbenchPane'
import { bandItemsFor } from '../../store/selectors'
import type { TrainingTask } from '../../types'

interface Props {
  task: TrainingTask
  assistantOpen: boolean
  onOpenAssistant: () => void
  fabRef: RefObject<HTMLButtonElement | null>
}

/**
 * 移动端主屏 = 任务视图。
 *
 * 任务切换不再在这里重复一遍：它已经在左侧抽屉的任务树里，
 * 正文只放「四格表头 + 工作台」，对话收进右下角的助手页。
 */
export function MobileTaskView({ task, assistantOpen, onOpenAssistant, fabRef }: Props) {
  const { state, totals } = useRun()
  const { conversation } = useTraining()
  const band = bandItemsFor(task, state, totals)

  return (
    <div className="bench-mobile min-[1024px]:hidden">
      <header className="bench-hd">
        <div className="bench-hd-main">
          <h2>{task.name}</h2>
          <p className="bench-hd-meta">{conversation.name}</p>
        </div>
      </header>

      <div className="bench-band">
        <StatBand items={band} />
      </div>

      <div className="bench-body">
        <WorkbenchBody task={task} />
      </div>

      <AssistantFab expanded={assistantOpen} onOpen={onOpenAssistant} fabRef={fabRef} />
    </div>
  )
}
