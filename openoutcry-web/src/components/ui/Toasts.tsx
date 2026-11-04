import { useRun } from '../../store/RunProvider'

export function Toasts() {
  const { toasts, dismissToast } = useRun()
  if (!toasts.length) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          className={'toast ' + t.kind}
          onClick={() => dismissToast(t.id)}
          title="点击关闭"
        >
          {t.text}
        </button>
      ))}
    </div>
  )
}
