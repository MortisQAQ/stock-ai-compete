import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Sparkles, X } from 'lucide-react'

import { useRun } from '../../store/RunProvider'
import { agentOf } from '../../data/agents'
import { ConversationPane } from './ConversationPane'

interface FabProps {
  expanded: boolean
  onOpen: () => void
  fabRef: RefObject<HTMLButtonElement | null>
}

/**
 * 移动端入口：右下浮动按钮（朱砂圆钮，64×64，远大于 44 的触控下限）。
 * 桌面端不渲染——桌面三栏里左栏就是这份对话。
 */
export function AssistantFab({ expanded, onOpen, fabRef }: FabProps) {
  return (
    <button
      ref={fabRef}
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label="打开 Agent 助手会话"
      className="fixed bottom-5 right-4 z-[70] flex size-16 flex-col items-center justify-center gap-0.5 rounded-full border border-[var(--ink)] bg-[var(--ver)] text-white shadow-[0_4px_0_rgba(22,33,28,0.24)] transition-transform duration-150 ease-[var(--ease-out-quart)] active:translate-y-px"
    >
      <Sparkles aria-hidden size={20} />
      <span className="font-mono text-[length:var(--fs-micro)] font-semibold tracking-[0.12em]">助手</span>
    </button>
  )
}

interface SheetProps {
  open: boolean
  onClose: () => void
  returnFocusRef?: RefObject<HTMLButtonElement | null>
}

/**
 * 移动端「助手」页：从下方推入的全屏页（不是新路由，靠 history 状态 + ESC 关闭）。
 * 内容是同一份对话流 + 同一个输入区，所以不存在「手机上另说一套话」的情况。
 */
export function AssistantSheet({ open, onClose, returnFocusRef }: SheetProps) {
  const { state } = useRun()
  const agent = agentOf(state.agent)
  const [visible, setVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // 入场：先渲染在屏幕外，下一帧再抬起，才能看到推入动效
  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [open])

  // 锁住背景滚动（只在助手页打开时）
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // ESC 关闭 + Tab 焦点环留在面板内
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea, input, select, a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // 打开时焦点进面板，关闭后归还给浮动按钮
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => closeRef.current?.focus(), 60)
    return () => {
      window.clearTimeout(timer)
      returnFocusRef?.current?.focus()
    }
  }, [open, returnFocusRef])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Agent 助手会话"
      className={
        'fixed inset-0 z-[80] flex flex-col bg-[var(--bone)] shadow-[0_-8px_24px_rgba(22,33,28,0.24)] ' +
        "[&_[data-slot='button']]:min-h-11 " +
        'transition-transform duration-300 ease-[var(--ease-out-quart)] will-change-transform ' +
        (visible ? 'translate-y-0' : 'translate-y-full')
      }
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--ink)] bg-[var(--bone-hi)] px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="label">会话</span>
            <span className="font-mono text-[length:var(--fs-micro)] font-semibold tracking-[0.1em] text-[var(--ink-3)]">
              ● 连接正常
            </span>
          </div>
          <p className="mt-1 truncate font-serif text-[length:var(--fs-body)] font-bold leading-snug text-[var(--ink)]">
            {agent.name}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="关闭助手，返回任务视图"
          className="grid size-11 shrink-0 place-items-center border border-[var(--rule-strong)] bg-[var(--bone)] text-[var(--ink-2)] transition-colors hover:bg-[var(--bone-lo)]"
        >
          <X aria-hidden size={18} />
        </button>
      </header>

      <ConversationPane hideHeader className="min-h-0 flex-1" />
    </div>
  )
}
