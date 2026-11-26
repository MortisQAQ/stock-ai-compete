import { useCallback, useEffect, useRef, useState } from 'react'

import { ConversationPane } from './ConversationPane'
import { WorkbenchPane } from './WorkbenchPane'
import { MobileTaskView } from './MobileTaskView'
import { AssistantSheet } from './AssistantSheet'
import { useMediaQuery } from '../../lib/useMediaQuery'
import type { TrainingTask } from '../../types'

const assistantInHistory = (): boolean =>
  Boolean((window.history.state as Record<string, unknown> | null)?.ooAssistant)

/**
 * 工作台共用布局 —— 历史训练场与实战工作台共享同一套两栏/移动端自适应骨架。
 *
 * 桌面端：左「和 Agent 的会话」，右「工作台（建议/审批 + 四页签台账）」。
 * 移动端：单列工作台视图 + 右下角拉起全屏助手页。
 */
export function BenchLayout({ task, srTitle }: { task: TrainingTask; srTitle: string }) {
  const wide = useMediaQuery('(min-width: 1024px)')
  const [assistantOpen, setAssistantOpen] = useState(assistantInHistory)
  const fabRef = useRef<HTMLButtonElement>(null)

  const openAssistant = useCallback(() => {
    setAssistantOpen(true)
    if (assistantInHistory()) return
    window.history.pushState({ ...window.history.state, ooAssistant: true }, '')
  }, [])

  const closeAssistant = useCallback(() => {
    setAssistantOpen(false)
    if (assistantInHistory()) window.history.back()
  }, [])

  useEffect(() => {
    const sync = () => setAssistantOpen(assistantInHistory())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return (
    <>
      <h1 className="sr-only">{srTitle}</h1>

      {wide ? (
        <div className="bench-grid">
          <ConversationPane className="bench-conv" />
          <WorkbenchPane task={task} className="bench-work" />
        </div>
      ) : (
        <MobileTaskView
          task={task}
          assistantOpen={assistantOpen}
          onOpenAssistant={openAssistant}
          fabRef={fabRef}
        />
      )}

      <AssistantSheet open={assistantOpen} onClose={closeAssistant} returnFocusRef={fabRef} />
    </>
  )
}
