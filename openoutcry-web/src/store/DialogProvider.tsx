import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { AgentId } from '../types'

export type DialogState =
  | { kind: 'none' }
  | { kind: 'snapshot' }
  | { kind: 'replay' }
  | { kind: 'detail'; id: string }
  | { kind: 'abort' }
  | { kind: 'goal' }
  | { kind: 'modify' }
  | { kind: 'agent'; agentId: AgentId }
  | { kind: 'switchAgent'; agentId: AgentId }

interface DialogContextValue {
  dialog: DialogState
  open: (d: DialogState) => void
  close: () => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

/**
 * 全站弹窗路由 + 焦点归还。
 *
 * 弹窗不是由某个按钮通过 DialogTrigger 打开的（任何组件都能 open()），
 * Radix 不知道"从哪儿来"，所以焦点归还由这里负责：
 * 在 open() 这个**事件回调**里记录触发元素（不在 render 期读 DOM），
 * close() 后等 Radix 卸载完再 focus 回去。
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })
  const restoreRef = useRef<HTMLElement | null>(null)

  const open = useCallback((next: DialogState) => {
    const active = typeof document === 'undefined' ? null : document.activeElement
    restoreRef.current = active instanceof HTMLElement ? active : null
    setDialog(next)
  }, [])

  const close = useCallback(() => {
    setDialog({ kind: 'none' })
    const target = restoreRef.current
    restoreRef.current = null
    if (!target || !target.isConnected) return
    requestAnimationFrame(() => target.focus())
  }, [])

  const value = useMemo(() => ({ dialog, open, close }), [dialog, open, close])
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog 必须在 DialogProvider 内部使用')
  return ctx
}
