import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'

import type { ToastMessage } from '../types'

type ToastKind = ToastMessage['kind']

export interface ToastOptions {
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
}

interface ToastContextValue {
  toasts: ToastMessage[]
  notify: (text: string, kind?: ToastKind, options?: ToastOptions) => void
  dismiss: (id: number) => void
}

const MAX_VISIBLE = 3
const LIFETIME_MS = 3600

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const seq = useRef(0)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((list) => list.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (text: string, kind: ToastKind = 'info', options?: ToastOptions) => {
      const id = ++seq.current
      const lifetime = options?.durationMs ?? (options?.onAction ? 4200 : LIFETIME_MS)
      setToasts((list) => [
        ...list.slice(-(MAX_VISIBLE - 1)),
        { id, kind, text, actionLabel: options?.actionLabel, onAction: options?.onAction },
      ])
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), lifetime),
      )
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending.values()) window.clearTimeout(timer)
      pending.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, notify, dismiss }),
    [toasts, notify, dismiss],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内部使用')
  return ctx
}
