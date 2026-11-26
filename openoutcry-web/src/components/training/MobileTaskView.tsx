import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { formatConversation, formatTask } from '../../i18n/helpers'
import { useLocale } from '../../store/LocaleProvider'
import { useRun } from '../../store/RunProvider'
import { useActiveWorkbenchTask } from '../../store/TrainingProvider'
import { StatBand } from '../run/StatBand'
import { AssistantFab } from './AssistantSheet'
import { WorkbenchBody } from './WorkbenchPane'
import { bandItemsFor } from '../../store/selectors'
import type { TrainingTask } from '../../types'

interface Props {
  task: TrainingTask
  assistantOpen: boolean
  onOpenAssistant: () => void
  fabRef: RefObject<HTMLButtonElement | null>
}

export function MobileTaskView({ task, assistantOpen, onOpenAssistant, fabRef }: Props) {
  const { state, totals } = useRun()
  const { conversation } = useActiveWorkbenchTask()
  const { lang } = useLocale()
  const { t } = useTranslation()
  const band = bandItemsFor(task, state, totals, lang)
  const taskView = formatTask(task, t)
  const convView = formatConversation(task, conversation, t)

  return (
    <div className="bench-mobile min-[1024px]:hidden">
      <header className="bench-hd">
        <div className="bench-hd-main">
          <h2>{taskView.name}</h2>
          <p className="bench-hd-meta">{convView.name}</p>
        </div>
      </header>

      <div className="bench-band">
        <StatBand items={band} />
      </div>

      <div className="bench-body">
        <WorkbenchBody task={task} />
      </div>

      <AssistantFab expanded={assistantOpen} onOpen={onOpenAssistant} fabRef={fabRef} />
    </div>
  )
}
