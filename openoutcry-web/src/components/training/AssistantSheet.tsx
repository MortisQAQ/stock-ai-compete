import type { RefObject } from 'react'
import { Sparkles, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

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
      className="fixed bottom-5 right-4 z-[70] flex size-16 flex-col items-center justify-center gap-0.5 rounded-full border border-[var(--accent)] bg-[var(--bg-2)] text-[var(--accent)] transition-transform duration-150 ease-[var(--ease-out-quart)] active:translate-y-px"
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
 *
 * 无障碍不再手写：焦点陷阱、ESC、滚动锁定、背景 aria-hidden 全由 Radix Dialog 负责，
 * 与站内其它弹窗保持同一套实现。这里只覆写外观（全屏 + 从底部推入）。
 */
export function AssistantSheet({ open, onClose, returnFocusRef }: SheetProps) {
  const { state } = useRun()
  const agent = agentOf(state.agent)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocusRef?.current?.focus()
          }}
          className={
            'fixed inset-0 z-[80] flex h-[100dvh] w-full flex-col bg-[var(--bg-0)] ' +
            "[&_[data-slot='button']]:min-h-11 " +
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300 ' +
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:duration-200 ' +
            'data-[state=open]:ease-[var(--ease-out-quart)]'
          }
        >
          <DialogPrimitive.Title className="sr-only">Agent 助手会话</DialogPrimitive.Title>

          <header className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--bg-1)] px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="label">会话</span>
                <span className="font-mono text-[length:var(--fs-micro)] font-semibold tracking-[0.1em] text-[var(--ink-3)]">
                  ● 连接正常
                </span>
              </div>
              <p className="mt-1 truncate font-sans text-[length:var(--fs-body)] font-semibold leading-snug text-[var(--ink)]">
                {agent.name}
              </p>
            </div>
            <DialogPrimitive.Close
              aria-label="关闭助手，返回任务视图"
              className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--bg-2)] text-[var(--ink-2)] transition-colors hover:bg-[var(--bg-3)]"
            >
              <X aria-hidden size={18} />
            </DialogPrimitive.Close>
          </header>

          <ConversationPane hideHeader className="min-h-0 flex-1" />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
