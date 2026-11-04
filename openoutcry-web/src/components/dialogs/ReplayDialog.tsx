import { useState } from 'react'
import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Modal } from '../ui/Modal'
import { Prose } from '../ui/Prose'
import { seq } from '../../lib/format'

export function ReplayDialog({ open }: { open: boolean }) {
  const { state } = useRun()
  const { close } = useDialog()
  const [selected, setSelected] = useState(0)
  const events = state.events
  const current = events[Math.min(selected, events.length - 1)]

  return (
    <Modal open={open} kicker="Replay" title="原轨迹回放" onClose={close}>
      <Prose className="mb-2.5 text-note text-ink-3">
        按事件序号顺序回放，不重新调用模型，不改变账户。
      </Prose>
      <div className="replay-list">
        {events.map((e, i) => (
          <button
            key={e.id}
            type="button"
            className="replay-item"
            aria-pressed={i === selected}
            onClick={() => setSelected(i)}
          >
            <b>
              {seq(e.id)} · {e.title}
            </b>
            <small>{e.meta}</small>
          </button>
        ))}
      </div>
      <div className="replay-detail">{current ? current.body : '暂无事件'}</div>
    </Modal>
  )
}
