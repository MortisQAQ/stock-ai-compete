import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { formatAgent, formatCollab, formatStateClock } from '../../i18n/helpers'
import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Modal } from '../ui/Modal'
import { Prose } from '../ui/Prose'
import { Button } from '../ui/Button'
import type { AgentId } from '../../types'

export function AbortDialog({ open }: { open: boolean }) {
  const { actions } = useRun()
  const { close } = useDialog()
  const { t } = useTranslation()
  return (
    <Modal
      open={open}
      kicker={t('dialogs.abort.kicker')}
      title={t('dialogs.abort.title')}
      onClose={close}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close}>
            {t('dialogs.abort.btnContinue')}
          </Button>
          <Button
            size="sm"
            variant="ver"
            onClick={() => {
              actions.abort()
              close()
            }}
          >
            {t('dialogs.abort.btnConfirm')}
          </Button>
        </>
      }
    >
      <Prose>{t('dialogs.abort.body')}</Prose>
      <div className="note">{t('dialogs.abort.note')}</div>
    </Modal>
  )
}

export function GoalDialog({ open }: { open: boolean }) {
  const { actions } = useRun()
  const { close } = useDialog()
  const { t } = useTranslation()
  return (
    <Modal
      open={open}
      kicker={t('dialogs.goal.kicker')}
      title={t('dialogs.goal.title')}
      onClose={close}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close}>
            {t('dialogs.cancel')}
          </Button>
          <Button
            size="sm"
            variant="solid"
            onClick={() => {
              actions.enterGoalMode()
              close()
            }}
          >
            {t('dialogs.goal.btnConfirm')}
          </Button>
        </>
      }
    >
      <Prose>{t('dialogs.goal.body')}</Prose>
      <div className="note">{t('dialogs.goal.note')}</div>
    </Modal>
  )
}

export function SwitchAgentDialog({ open, agentId }: { open: boolean; agentId: AgentId }) {
  const { state, actions } = useRun()
  const { close } = useDialog()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const agent = formatAgent(agentId, t)
  return (
    <Modal
      open={open}
      kicker={t('dialogs.switchAgent.kicker')}
      title={t('dialogs.switchAgent.title', { name: agent.name })}
      onClose={close}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close}>
            {t('dialogs.cancel')}
          </Button>
          <Button
            size="sm"
            variant="solid"
            onClick={() => {
              actions.switchAgent(agentId)
              close()
              navigate('/training')
            }}
          >
            {t('dialogs.switchAgent.btnConfirm')}
          </Button>
        </>
      }
    >
      <Prose>
        {t('dialogs.switchAgent.body', {
          clock: formatStateClock(state, t),
          collab: formatCollab(state.collaboration, t),
        })}
      </Prose>
      <div className="note">{t('dialogs.switchAgent.note')}</div>
    </Modal>
  )
}
