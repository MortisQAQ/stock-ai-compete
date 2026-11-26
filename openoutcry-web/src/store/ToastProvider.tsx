import { create } from 'zustand'

import type { ToastMessage } from '../types'

type ToastKind = ToastMessage['kind']

export interface ToastOptions {
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
}

export interface ToastContextValue {
  toasts: ToastMessage[]
  notify: (text: string, kind?: ToastKind, options?: ToastOptions) => void
  dismiss: (id: number) => void
}

const MAX_VISIBLE = 3
const LIFETIME_MS = 3600

let toastSeq = 0
const toastTimers = new Map<number, ReturnType<typeof setTimeout>>()

function clearToastTimer(id: number): void {
  const timer = toastTimers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    toastTimers.delete(id)
  }
}

export const useToastStore = create<ToastContextValue>((set, get) => ({
  toasts: [],

  dismiss: (id: number) => {
    clearToastTimer(id)
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }))
  },

  notify: (text: string, kind: ToastKind = 'info', options?: ToastOptions) => {
    const id = ++toastSeq
    const lifetime = options?.durationMs ?? (options?.onAction ? 4200 : LIFETIME_MS)
    set((state) => {
      const overflowCount = Math.max(0, state.toasts.length - (MAX_VISIBLE - 1))
      for (const dropped of state.toasts.slice(0, overflowCount)) {
        clearToastTimer(dropped.id)
      }
      return {
        toasts: [
          ...state.toasts.slice(-(MAX_VISIBLE - 1)),
          { id, kind, text, actionLabel: options?.actionLabel, onAction: options?.onAction },
        ],
      }
    })
    toastTimers.set(
      id,
      setTimeout(() => get().dismiss(id), lifetime),
    )
  },
}))

export function useToast(): ToastContextValue {
  return useToastStore()
}
