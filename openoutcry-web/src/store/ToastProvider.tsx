import { create } from 'zustand'

import i18n, { fixedT, translateKey } from '../i18n'
import type { Lang } from '../i18n/detectLang'
import { formatAsset } from '../i18n/helpers'
import type { I18nParams, ToastMessage, TranslationKey } from '../types'

type ToastKind = ToastMessage['kind']

export interface ToastOptions {
  actionLabel?: string
  actionLabelKey?: TranslationKey
  onAction?: () => void
  durationMs?: number
  i18nParams?: I18nParams
  assetRef?: string
}

export interface ToastContextValue {
  toasts: ToastMessage[]
  notify: (text: string, kind?: ToastKind, options?: ToastOptions) => void
  notifyKey: (textKey: TranslationKey, kind?: ToastKind, options?: ToastOptions) => void
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

export const useToastStore = create<ToastContextValue>((set, get) => {
  const pushToast = (entry: Omit<ToastMessage, 'id'>, durationMs?: number) => {
    const id = ++toastSeq
    const lifetime = durationMs ?? (entry.onAction ? 4200 : LIFETIME_MS)
    set((state) => {
      const overflowCount = Math.max(0, state.toasts.length - (MAX_VISIBLE - 1))
      for (const dropped of state.toasts.slice(0, overflowCount)) {
        clearToastTimer(dropped.id)
      }
      return {
        toasts: [...state.toasts.slice(-(MAX_VISIBLE - 1)), { ...entry, id }],
      }
    })
    toastTimers.set(
      id,
      setTimeout(() => get().dismiss(id), lifetime),
    )
  }

  return {
    toasts: [],

    dismiss: (id: number) => {
      clearToastTimer(id)
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }))
    },

    notify: (text: string, kind: ToastKind = 'info', options?: ToastOptions) => {
      const boundT = fixedT((i18n.language === 'en' ? 'en' : 'zh') as Lang)
      const actionLabel = options?.actionLabelKey
        ? translateKey(boundT, options.actionLabelKey)
        : options?.actionLabel
      pushToast(
        {
          kind,
          text,
          actionLabel,
          actionLabelKey: options?.actionLabelKey,
          onAction: options?.onAction,
        },
        options?.durationMs,
      )
    },

    notifyKey: (textKey: TranslationKey, kind: ToastKind = 'info', options?: ToastOptions) => {
      const boundT = fixedT((i18n.language === 'en' ? 'en' : 'zh') as Lang)
      const params: Record<string, string | number | undefined> = { ...options?.i18nParams }
      if (options?.assetRef) {
        params.asset = formatAsset(options.assetRef, boundT)
      }
      const text = translateKey(boundT, textKey, params)
      const actionLabel = options?.actionLabelKey
        ? translateKey(boundT, options.actionLabelKey)
        : options?.actionLabel
      pushToast(
        {
          kind,
          text,
          textKey,
          i18nParams: options?.i18nParams,
          assetRef: options?.assetRef,
          actionLabel,
          actionLabelKey: options?.actionLabelKey,
          onAction: options?.onAction,
        },
        options?.durationMs,
      )
    },
  }
})

export function useToast(): ToastContextValue {
  return useToastStore()
}
