import { useTranslation } from 'react-i18next'

import { formatAsset } from '../../i18n/helpers'
import { useToast } from '../../store/ToastProvider'

export function Toasts() {
  const { toasts, dismiss } = useToast()
  const { t } = useTranslation()
  if (!toasts.length) return null

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const params: Record<string, string | number | undefined> = { ...toast.i18nParams }
        if (toast.assetRef) {
          params.asset = formatAsset(toast.assetRef, t)
        }
        const message = toast.textKey
          ? (t(toast.textKey, params as Record<string, unknown>) as string)
          : toast.text
        const actionLabel = toast.actionLabelKey ? t(toast.actionLabelKey) : toast.actionLabel

        return (
          <div key={toast.id} className={'toast ' + toast.kind + ' flex items-center gap-3'}>
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => dismiss(toast.id)}
              title={t('toasts.dismissTitle')}
            >
              {message}
            </button>
            {actionLabel && toast.onAction ? (
              <button
                type="button"
                className="shrink-0 rounded px-2 py-0.5 font-mono text-micro font-semibold text-[var(--accent)] underline underline-offset-2 hover:text-[var(--fg-0)]"
                onClick={() => {
                  toast.onAction?.()
                  dismiss(toast.id)
                }}
              >
                {actionLabel}
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
