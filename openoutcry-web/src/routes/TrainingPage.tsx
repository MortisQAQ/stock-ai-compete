import { useCallback, useEffect, useRef, useState } from 'react'

import { ConversationPane } from '../components/training/ConversationPane'
import { WorkbenchPane } from '../components/training/WorkbenchPane'
import { MobileTaskView } from '../components/training/MobileTaskView'
import { AssistantSheet } from '../components/training/AssistantSheet'
import { useTraining } from '../store/TrainingProvider'
import { useMediaQuery } from '../lib/useMediaQuery'

const assistantInHistory = (): boolean =>
  Boolean((window.history.state as Record<string, unknown> | null)?.ooAssistant)

/**
 * 训练场 —— 对话 + 工作台两栏。
 *
 * 任务列表不在这里了：它已经搬进左栏的任务树（任务 → 对话）。
 * 于是正文只剩两栏 —— 左「和 Agent 的会话」，右「这次任务的台账」。
 * 移动端单列：任务视图 + 右下角助手页。
 */
export function TrainingPage() {
  const { current } = useTraining()
  /* 二选一渲染：桌面两栏 / 移动单栏共用同一套工作台组件，
     两边同时挂着会得到两份 DOM、两份页签状态。 */
  const wide = useMediaQuery('(min-width: 1024px)')

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

      {wide ? (
        <div className="bench-grid">
          <ConversationPane className="bench-conv" />
          <WorkbenchPane task={current} className="bench-work" />
        </div>
      ) : (
        <MobileTaskView
          task={current}
          assistantOpen={assistantOpen}
          onOpenAssistant={openAssistant}
          fabRef={fabRef}
        />
      )}

      <AssistantSheet open={assistantOpen} onClose={closeAssistant} returnFocusRef={fabRef} />
    </>
  )
}
