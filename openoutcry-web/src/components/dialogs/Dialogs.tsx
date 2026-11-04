import { useDialog } from '../../store/DialogProvider'
import { SnapshotDialog } from './SnapshotDialog'
import { ReplayDialog } from './ReplayDialog'
import { DetailDialog } from './DetailDialog'
import { ModifyDialog } from './ModifyDialog'
import { AgentConfigDialog } from './AgentConfigDialog'
import { AbortDialog, GoalDialog, SwitchAgentDialog } from './ConfirmDialogs'

/** 全站弹窗集中挂载：任何页面都可通过 useDialog().open() 唤起 */
export function Dialogs() {
  const { dialog } = useDialog()
  return (
    <>
      <SnapshotDialog open={dialog.kind === 'snapshot'} />
      <ReplayDialog open={dialog.kind === 'replay'} />
      <DetailDialog open={dialog.kind === 'detail'} id={dialog.kind === 'detail' ? dialog.id : ''} />
      <ModifyDialog open={dialog.kind === 'modify'} />
      <AbortDialog open={dialog.kind === 'abort'} />
      <GoalDialog open={dialog.kind === 'goal'} />
      <SwitchAgentDialog
        open={dialog.kind === 'switchAgent'}
        agentId={dialog.kind === 'switchAgent' ? dialog.agentId : 'codex'}
      />
      <AgentConfigDialog
        open={dialog.kind === 'agent'}
        agentId={dialog.kind === 'agent' ? dialog.agentId : 'native'}
      />
    </>
  )
}
