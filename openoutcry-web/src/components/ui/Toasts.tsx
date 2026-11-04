import { useToast } from '../../store/ToastProvider'

export function Toasts() {
  const { toasts, dismiss } = useToast()
  if (!toasts.length) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          className={'toast ' + t.kind}
          onClick={() => dismiss(t.id)}
          title="点击关闭"
        >
          {t.text}
        </button>
      ))}
    </div>
  )
}
