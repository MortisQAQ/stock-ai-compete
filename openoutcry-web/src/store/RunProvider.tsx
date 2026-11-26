import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { create } from 'zustand'

import { createInitialLiveRun } from '../data/live'
import { createInitialRun } from '../data/run'
import type { WorkspaceKind } from '../types'
import { runStatusLabel, totalsOf } from './derive'
import { useLocaleStore } from './LocaleProvider'
import { runReducer } from './runReducer'
import type {
  ApproveActor,
  LiveFillActor,
  RunAction,
  RunActions,
  RunContextValue,
  RunStoreState,
} from './runTypes'
import { useToastStore } from './ToastProvider'

export type { ApproveActor, LiveFillActor, RunActions, RunContextValue, RunStoreState }

const WorkbenchScopeContext = createContext<WorkspaceKind>('training')

/** 标识当前子树属于历史训练场还是实战工作台；默认 training */
export function WorkbenchScopeProvider({
  kind,
  children,
}: {
  kind: WorkspaceKind
  children: ReactNode
}) {
  return <WorkbenchScopeContext.Provider value={kind}>{children}</WorkbenchScopeContext.Provider>
}

export function useWorkspaceKind(): WorkspaceKind {
  return useContext(WorkbenchScopeContext)
}

/** 初值在模块加载时算一次：reducer 不会原地修改它们 */
const INITIAL_RUN = createInitialRun('native')
const INITIAL_LIVE_RUN = createInitialLiveRun('native')

export const useRunStore = create<RunStoreState>((set) => {
  const dispatchScope = (scope: WorkspaceKind, action: RunAction) => {
    set((store) => {
      const prev = store[scope]
      const next = runReducer(prev, action)
      return next === prev ? store : { [scope]: next }
    })
  }

  return {
    training: INITIAL_RUN,
    live: INITIAL_LIVE_RUN,

    switchAgent: (id, scope = 'training') => {
      dispatchScope(scope, { type: 'switchAgent', agent: id })
    },

    applyMandate: (mandate, scope = 'training') => {
      dispatchScope(scope, { type: 'applyMandate', mandate })
      useToastStore.getState().notifyKey('toasts.mandateIssued', 'success', {
        i18nParams: { no: mandate.no },
      })
    },

    deployAgentToLive: (id) => {
      dispatchScope('live', { type: 'bindAgent', agent: id })
      useToastStore.getState().notifyKey('toasts.deployedToLive', 'success')
    },

    approve: (quantity, actor = '人工确认', scope = 'training') => {
      dispatchScope(scope, { type: 'approve', quantity, actor })
      useToastStore.getState().notifyKey('toasts.orderSubmitted', 'info', {
        actionLabelKey: 'toasts.undo',
        onAction: () => {
          dispatchScope(scope, { type: 'undoApprove' })
          useToastStore.getState().notifyKey('toasts.approveUndone', 'warn')
        },
        durationMs: 3600,
      })
    },

    undoApprove: (scope = 'training') => {
      dispatchScope(scope, { type: 'undoApprove' })
      useToastStore.getState().notifyKey('toasts.approveUndone', 'warn')
    },

    reject: (scope = 'training') => {
      dispatchScope(scope, { type: 'reject' })
      useToastStore.getState().notifyKey(
        scope === 'live' ? 'toasts.advisoryIgnored' : 'toasts.proposalRejected',
        'warn',
      )
    },

    match: (scope = 'training') => {
      dispatchScope(scope, { type: 'fill' })
      useToastStore.getState().notifyKey('toasts.orderFilled', 'success')
    },

    advanceClose: (scope = 'training') => {
      dispatchScope(scope, { type: 'advanceClose' })
      useToastStore.getState().notifyKey('toasts.advancedClose', 'success')
    },

    completeGoalRun: (scope = 'training') => {
      dispatchScope(scope, { type: 'completeGoalRun' })
      useToastStore.getState().notifyKey('toasts.goalCompleted', 'success')
    },

    recordLiveFill: (quantity, price, actor = '按建议执行', scope = 'live') => {
      dispatchScope(scope, { type: 'recordLiveFill', quantity, price, actor })
      useToastStore.getState().notifyKey('toasts.liveFillRecorded', 'success')
    },

    upsertHolding: (holding, scope = 'live') => {
      dispatchScope(scope, { type: 'upsertHolding', holding })
      useToastStore.getState().notifyKey('toasts.holdingUpdated', 'success')
    },

    removeHolding: (name, scope = 'live') => {
      dispatchScope(scope, { type: 'removeHolding', name })
      useToastStore.getState().notifyKey('toasts.holdingRemoved', 'warn', { assetRef: name })
    },

    setCash: (cash, scope = 'live') => {
      dispatchScope(scope, { type: 'setCash', cash })
      useToastStore.getState().notifyKey('toasts.cashUpdated', 'success')
    },

    togglePause: (scope = 'training') => {
      dispatchScope(scope, { type: 'togglePause' })
    },

    abort: (scope = 'training') => {
      dispatchScope(scope, { type: 'abort' })
      useToastStore.getState().notifyKey('toasts.runAborted', 'warn')
    },

    sendGuidance: (text, scope = 'training') => {
      dispatchScope(scope, { type: 'guidance', text })
      useToastStore.getState().notifyKey(
        scope === 'live' ? 'toasts.livePromptSent' : 'toasts.guidanceAdded',
        'success',
      )
    },

    enterGoalMode: (scope = 'training') => {
      if (scope === 'live') {
        useToastStore.getState().notifyKey('toasts.liveGoalBlocked', 'warn')
        return
      }
      dispatchScope(scope, { type: 'goalMode' })
      useToastStore.getState().notifyKey('toasts.enteredGoalMode', 'success')
    },
  }
})

function bindScopeActions(scope: WorkspaceKind): RunActions {
  return {
    switchAgent: (id) => useRunStore.getState().switchAgent(id, scope),
    applyMandate: (mandate) => useRunStore.getState().applyMandate(mandate, scope),
    deployAgentToLive: (id) => useRunStore.getState().deployAgentToLive(id),
    approve: (quantity, actor) => useRunStore.getState().approve(quantity, actor, scope),
    undoApprove: () => useRunStore.getState().undoApprove(scope),
    reject: () => useRunStore.getState().reject(scope),
    match: () => useRunStore.getState().match(scope),
    advanceClose: () => useRunStore.getState().advanceClose(scope),
    completeGoalRun: () => useRunStore.getState().completeGoalRun(scope),
    recordLiveFill: (quantity, price, actor) => useRunStore.getState().recordLiveFill(quantity, price, actor, scope),
    upsertHolding: (holding) => useRunStore.getState().upsertHolding(holding, scope),
    removeHolding: (name) => useRunStore.getState().removeHolding(name, scope),
    setCash: (cash) => useRunStore.getState().setCash(cash, scope),
    togglePause: () => useRunStore.getState().togglePause(scope),
    abort: () => useRunStore.getState().abort(scope),
    sendGuidance: (text) => useRunStore.getState().sendGuidance(text, scope),
    enterGoalMode: () => useRunStore.getState().enterGoalMode(scope),
  }
}

const SCOPED_ACTIONS: Record<WorkspaceKind, RunActions> = {
  training: bindScopeActions('training'),
  live: bindScopeActions('live'),
}

export function useRun(explicitScope?: WorkspaceKind): RunContextValue {
  const ambientScope = useContext(WorkbenchScopeContext)
  const scope = explicitScope ?? ambientScope
  const state = useRunStore((s) => s[scope])
  const lang = useLocaleStore((s) => s.lang)
  const totals = useMemo(() => totalsOf(state), [state])
  const status = useMemo(() => runStatusLabel(state, lang), [state, lang])
  const actions = SCOPED_ACTIONS[scope]

  return useMemo<RunContextValue>(
    () => ({ state, totals, status, actions }),
    [state, totals, status, actions],
  )
}
