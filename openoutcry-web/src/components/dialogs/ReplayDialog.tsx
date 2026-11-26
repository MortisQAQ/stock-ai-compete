import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatEvent } from '../../i18n/helpers'
import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Modal } from '../ui/Modal'
import { Prose } from '../ui/Prose'
import { seq } from '../../lib/format'

export function ReplayDialog({ open }: { open: boolean }) {
  const { state } = useRun()
  const { close } = useDialog()
  const { t } = useTranslation()
  const [selected, setSelected] = useState(0)
  const events = state.events
  const current = events[Math.min(selected, events.length - 1)]
  const currentView = current ? formatEvent(current, t) : null

  return (
    <Modal open={open} kicker={t('dialogs.replay.kicker')} title={t('dialogs.replay.title')} onClose={close}>
      <Prose className="mb-2.5 text-note text-ink-3">{t('dialogs.replay.desc')}</Prose>
      <div className="replay-list">
        {events.map((e, i) => {
          const view = formatEvent(e, t)
          return (
            <button
              key={e.id}
              type="button"
              className="replay-item"
              aria-pressed={i === selected}
              onClick={() => setSelected(i)}
            >
              <b>
                {seq(e.id)} · {view.title}
              </b>
              <small>{view.meta}</small>
            </button>
          )
        })}
      </div>
      <div className="replay-detail">{currentView ? currentView.body : t('dialogs.replay.empty')}</div>
    </Modal>
  )
}
