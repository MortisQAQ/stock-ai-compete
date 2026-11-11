import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { useRun } from './RunProvider'
import { LIVE_TASK_ID, trainingTasksOf } from './trainingTasks'
import type { TrainingConversation, TrainingTask } from '../types'

interface TrainingCtxValue {
  /** 全部任务（当前运行 + 冻结档案） */
  tasks: TrainingTask[]
  /** 当前选中的任务 */
  current: TrainingTask
  /** 当前任务里选中的会话 */
  conversation: TrainingConversation
  selectTask: (taskId: string) => void
  selectConversation: (taskId: string, convId: string) => void
}

const TrainingCtx = createContext<TrainingCtxValue | null>(null)

/**
 * 训练任务 / 会话的选择状态。
 *
 * 提到 AppShell 这一层，是因为左栏（任务树）和训练场（工作台）都要读写它：
 * 以前选中态塞在 TrainingPage 的 useState 里，右栏能改、左栏读不到，
 * 只能把任务列表复制成一份放在正文里 —— 那正是「页面上元素太多」的来源之一。
 */
export function TrainingProvider({ children }: { children: ReactNode }) {
  const { state } = useRun()
  const tasks = useMemo(() => trainingTasksOf(state), [state])
  const [taskId, setTaskId] = useState<string>(LIVE_TASK_ID)
  const [convId, setConvId] = useState<string>('')

  const current = tasks.find((task) => task.id === taskId) ?? tasks[0]
  const conversation = current.conversations.find((item) => item.id === convId) ?? current.conversations[0]

  const selectTask = useCallback(
    (id: string) => {
      setTaskId(id)
      const next = tasks.find((task) => task.id === id)
      setConvId(next?.conversations[0]?.id ?? '')
    },
    [tasks],
  )

  const selectConversation = useCallback((id: string, next: string) => {
    setTaskId(id)
    setConvId(next)
  }, [])

  const value = useMemo(
    () => ({ tasks, current, conversation, selectTask, selectConversation }),
    [tasks, current, conversation, selectTask, selectConversation],
  )

  return <TrainingCtx.Provider value={value}>{children}</TrainingCtx.Provider>
}

export function useTraining(): TrainingCtxValue {
  const ctx = useContext(TrainingCtx)
  if (!ctx) throw new Error('useTraining 必须在 TrainingProvider 内使用')
  return ctx
}
