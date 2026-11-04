import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRun } from '../store/RunProvider'
import { LIVE_TASK_ID, trainingTasksOf } from '../store/trainingTasks'
import { ConversationPane } from '../components/training/ConversationPane'
import { WorkbenchPane } from '../components/training/WorkbenchPane'
import { TaskSwitcher } from '../components/training/TaskSwitcher'
import { MobileTaskView } from '../components/training/MobileTaskView'
import { AssistantSheet } from '../components/training/AssistantSheet'

const assistantInHistory = (): boolean =>
  Boolean((window.history.state as Record<string, unknown> | null)?.ooAssistant)

/**
 * 训练场 —— VSCode 式工作台。
 *
 * 桌面（≥1100px）：三栏固定高度，中栏内部滚动，页面本身不出现纵向滚动。
 *   左 / 会话流 · 中 / 当前任务工作台 · 右 / 训练任务切换器
 * 移动（<1100px）：单列任务视图 + 右下浮动按钮拉起的全屏助手页。
 *
 * 高度推导：走带 28 + 报头 59 = 87；.page 的上下 padding（桌面 20/34 与 90）
 * 用负 margin 抵消，因此工作台高度恒为 100dvh − 87。
 */
export function TrainingPage() {
  const { state } = useRun()
  const tasks = useMemo(() => trainingTasksOf(state), [state])
  const [taskId, setTaskId] = useState(LIVE_TASK_ID)
  const current = tasks.find((task) => task.id === taskId) ?? tasks[0]

  // 刷新后如果 history 里还带着助手页标记，就直接恢复成打开态（惰性初值，不用 effect 补）
  const [assistantOpen, setAssistantOpen] = useState(assistantInHistory)
  const fabRef = useRef<HTMLButtonElement>(null)

  /**
   * 助手页是「页面」而不是弹窗：打开时压一条 history，浏览器后退即可关闭。
   *
   * 状态由 history 决定，而不是自己再记一个 pushed 标志：
   * 用户可能按浏览器前进/后退，只有读 history.state 才不会和真实栈脱节。
   */
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
      <h1 className="sr-only">训练场 · {current.name}</h1>

      <div
        className={
          'min-[1100px]:-mx-[38px] min-[1100px]:-mt-5 min-[1100px]:-mb-[90px] ' +
          'min-[1100px]:w-[calc(100%+76px)] min-[1100px]:h-[calc(100dvh-87px)] ' +
          'min-[1100px]:[@media(min-height:1121px)]:-mt-[34px]'
        }
      >
        {/* ---------- 桌面：三栏 ---------- */}
        <div className="hidden min-[1100px]:grid min-[1100px]:h-full min-[1100px]:grid-cols-[396px_minmax(0,1fr)_252px] min-[1100px]:overflow-hidden">
          <ConversationPane className="min-h-0" />
          <WorkbenchPane
            task={current}
            className="min-h-0 border-l border-r border-[var(--rule-strong)]"
          />
          <TaskSwitcher tasks={tasks} currentId={current.id} onSelect={setTaskId} className="min-h-0" />
        </div>

        {/* ---------- 移动：任务视图 ---------- */}
        <MobileTaskView
          task={current}
          tasks={tasks}
          onSelect={setTaskId}
          assistantOpen={assistantOpen}
          onOpenAssistant={openAssistant}
          fabRef={fabRef}
        />
      </div>

      <AssistantSheet open={assistantOpen} onClose={closeAssistant} returnFocusRef={fabRef} />
    </>
  )
}