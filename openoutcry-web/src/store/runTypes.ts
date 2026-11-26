import type {
  AgentId,
  Holding,
  MandatePayload,
  RunEvent,
  RunState,
  Totals,
  TranslationKey,
  WorkspaceKind,
} from '../types'

export type ApproveActor = '人工确认' | '人工修改后批准' | 'Agent 自主提交'
export type LiveFillActor = '按建议执行' | '按实际修改记录'

export const APPROVE_ACTOR_KEY: Record<ApproveActor, TranslationKey> = {
  人工确认: 'events.actors.humanConfirm',
  人工修改后批准: 'events.actors.humanModify',
  'Agent 自主提交': 'events.actors.agentAuto',
}

export const LIVE_ACTOR_KEY: Record<LiveFillActor, TranslationKey> = {
  按建议执行: 'events.actors.liveAsSuggested',
  按实际修改记录: 'events.actors.liveAsModified',
}

export type RunAction =
  | { type: 'switchAgent'; agent: AgentId }
  | { type: 'applyMandate'; mandate: MandatePayload }
  | { type: 'bindAgent'; agent: AgentId }
  | { type: 'approve'; quantity: number; actor: ApproveActor }
  | { type: 'undoApprove' }
  | { type: 'reject' }
  | { type: 'fill' }
  | { type: 'advanceClose' }
  | { type: 'completeGoalRun' }
  | { type: 'recordLiveFill'; quantity: number; price: number; fee?: number; actor: LiveFillActor }
  | { type: 'upsertHolding'; holding: Omit<Holding, 'entryFee'> }
  | { type: 'removeHolding'; name: string }
  | { type: 'setCash'; cash: number }
  | { type: 'togglePause' }
  | { type: 'abort' }
  | { type: 'guidance'; text: string }
  | { type: 'goalMode' }

export type LiveRunAction = Extract<
  RunAction,
  { type: 'recordLiveFill' | 'upsertHolding' | 'removeHolding' | 'setCash' }
>

export type TrainingRunAction = Exclude<RunAction, LiveRunAction>

export interface RunActions {
  switchAgent: (id: AgentId) => void
  applyMandate: (mandate: MandatePayload) => void
  deployAgentToLive: (id: AgentId) => void
  approve: (quantity: number, actor?: ApproveActor) => void
  undoApprove: () => void
  reject: () => void
  match: () => void
  advanceClose: () => void
  completeGoalRun: () => void
  recordLiveFill: (quantity: number, price: number, actor?: LiveFillActor) => void
  upsertHolding: (holding: Omit<Holding, 'entryFee'>) => void
  removeHolding: (name: string) => void
  setCash: (cash: number) => void
  togglePause: () => void
  abort: () => void
  sendGuidance: (text: string) => void
  enterGoalMode: () => void
}

export interface RunContextValue {
  state: RunState
  totals: Totals
  status: string
  actions: RunActions
}

export interface RunStoreState {
  training: RunState
  live: RunState
  switchAgent: (id: AgentId, scope?: WorkspaceKind) => void
  applyMandate: (mandate: MandatePayload, scope?: WorkspaceKind) => void
  deployAgentToLive: (id: AgentId) => void
  approve: (quantity: number, actor?: ApproveActor, scope?: WorkspaceKind) => void
  undoApprove: (scope?: WorkspaceKind) => void
  reject: (scope?: WorkspaceKind) => void
  match: (scope?: WorkspaceKind) => void
  advanceClose: (scope?: WorkspaceKind) => void
  completeGoalRun: (scope?: WorkspaceKind) => void
  recordLiveFill: (quantity: number, price: number, actor?: LiveFillActor, scope?: WorkspaceKind) => void
  upsertHolding: (holding: Omit<Holding, 'entryFee'>, scope?: WorkspaceKind) => void
  removeHolding: (name: string, scope?: WorkspaceKind) => void
  setCash: (cash: number, scope?: WorkspaceKind) => void
  togglePause: (scope?: WorkspaceKind) => void
  abort: (scope?: WorkspaceKind) => void
  sendGuidance: (text: string, scope?: WorkspaceKind) => void
  enterGoalMode: (scope?: WorkspaceKind) => void
}

const maxEventId = (state: RunState) => state.events.reduce((m, e) => Math.max(m, e.id), 0)

/** 不可变地向运行状态追加一条带自增 ID 与时间戳的审计事件 */
export function withEvent(state: RunState, ev: Omit<RunEvent, 'id' | 'at'> & { at?: string }): RunState {
  const event: RunEvent = {
    ...ev,
    id: maxEventId(state) + 1,
    at: ev.at ?? state.clock.slice(-5),
  }
  return { ...state, events: [...state.events, event] }
}
