import { useToast } from '../../store/ToastProvider'

export function Toasts() {
  const { toasts, dismiss } = useToast()
  if (!toasts.length) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={'toast ' + t.kind + ' flex items-center gap-3'}>
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => dismiss(t.id)}
            title="点击关闭"
          >
            {t.text}
          </button>
          {t.actionLabel && t.onAction ? (
            <button
              type="button"
              className="shrink-0 rounded px-2 py-0.5 font-mono text-micro font-semibold text-[var(--accent)] underline underline-offset-2 hover:text-[var(--fg-0)]"
              onClick={() => {
                t.onAction?.()
                dismiss(t.id)
              }}
            >
              {t.actionLabel}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
