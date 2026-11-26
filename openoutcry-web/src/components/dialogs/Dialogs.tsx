import { useDialog } from '../../store/DialogProvider'
import { WorkbenchScopeProvider, useWorkspaceKind } from '../../store/RunProvider'
import { SnapshotDialog } from './SnapshotDialog'
import { ReplayDialog } from './ReplayDialog'
import { DetailDialog } from './DetailDialog'
import { ModifyDialog } from './ModifyDialog'
import { AgentConfigDialog } from './AgentConfigDialog'
import { HoldingEditorDialog } from './HoldingEditorDialog'
import { OnboardAgentDialog } from './OnboardAgentDialog'
import { AbortDialog, GoalDialog, SwitchAgentDialog } from './ConfirmDialogs'

/**
 * 全站弹窗集中挂载：任何页面都可通过 useDialog().open() 唤起。
 * 若唤起时携带了 scope（例如文档页内嵌的实战工作台演示），
 * 在弹窗子树内覆盖 WorkbenchScopeProvider，保证读写对应的 store。
 */
export function Dialogs() {
  const { dialog } = useDialog()
  const routeScope = useWorkspaceKind()
  const activeScope = dialog.kind !== 'none' && dialog.scope ? dialog.scope : routeScope

  return (
    <WorkbenchScopeProvider kind={activeScope}>
      <SnapshotDialog open={dialog.kind === 'snapshot'} />
      <ReplayDialog open={dialog.kind === 'replay'} />
      <DetailDialog open={dialog.kind === 'detail'} id={dialog.kind === 'detail' ? dialog.id : ''} />
      <ModifyDialog open={dialog.kind === 'modify'} />
      <HoldingEditorDialog
        open={dialog.kind === 'editHolding'}
        targetName={dialog.kind === 'editHolding' ? dialog.name : undefined}
      />
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
      <OnboardAgentDialog open={dialog.kind === 'onboard'} />
    </WorkbenchScopeProvider>
  )
}
