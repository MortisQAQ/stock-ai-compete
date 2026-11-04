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

/**
 * 全站提示队列。
 *
 * 之前 toast 挂在 RunProvider 里：任何页面想提示一句，都得先依赖「运行状态」。
 * 运行状态将来换成服务端数据源时，toast 也要跟着搬家。现在它是独立的一层，
 * 放在 RunProvider 外层，两者只通过 useToast() 通信。
 *
 * 定时器集中管理：组件卸载时统一清掉，不会在卸载后 setState。
 */
type ToastKind = ToastMessage['kind']

interface ToastContextValue {
  toasts: ToastMessage[]
  notify: (text: string, kind?: ToastKind) => void
  dismiss: (id: number) => void
}

/** 同时最多显示三条，新的挤掉最旧的 */
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
    (text: string, kind: ToastKind = 'info') => {
      const id = ++seq.current
      setToasts((list) => [...list.slice(-(MAX_VISIBLE - 1)), { id, kind, text }])
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), LIFETIME_MS),
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
