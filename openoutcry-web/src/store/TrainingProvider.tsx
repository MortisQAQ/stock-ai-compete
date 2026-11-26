import { useMemo } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { TRAINING_SEED, type TrainingRecord } from '../data/trainings'
import { useRunStore, useWorkspaceKind } from './RunProvider'
import { LIVE_TASK_ID, LIVE_WORKSPACE_ID, liveTasksOf, trainingTasksOf } from './trainingTasks'
import type { AgentId, MandatePayload, TrainingConversation, TrainingTask } from '../types'

export interface CompareRunItem {
  id: string
  no: string
  label: string
  labelEn: string
  variableChanged: string
  variableChangedEn: string
  returnPct: number
  alphaPct: number
  maxDrawdownPct: number
  trades: number
  fees: number
  isCurrent?: boolean
}

const INITIAL_COMPARE_RUNS: CompareRunItem[] = [
  {
    id: 'run-a',
    no: '№ 0042',
    label: 'Run A · 当前基线（事件驱动 · 均衡）',
    labelEn: 'Run A · Current Baseline (Event-Driven · Balanced)',
    variableChanged: '基线版本（单票上限 25% · 止损 -5%）',
    variableChangedEn: 'Baseline (Max single pos 25% · Stop -5%)',
    returnPct: 3.76,
    alphaPct: 4.52,
    maxDrawdownPct: -1.18,
    trades: 5,
    fees: 207,
    isCurrent: true,
  },
  {
    id: 'run-b',
    no: '№ 0041',
    label: 'Run B · 同口径对照（仅改止损线）',
    labelEn: 'Run B · Controlled Variant (Tighter Stop Only)',
    variableChanged: '单一改动：止损阈值 -5% → -3%（同区间/资金/池）',
    variableChangedEn: 'Single change: Stop-loss -5% → -3% (same window/cash/pool)',
    returnPct: 2.42,
    alphaPct: 3.18,
    maxDrawdownPct: -0.74,
    trades: 7,
    fees: 268,
  },
]

export interface TrainingStoreState {
  records: TrainingRecord[]
  draftAgent: AgentId
  compareRuns: CompareRunItem[]
  taskId: string
  convId: string
  liveTaskId: string
  liveConvId: string
  setDraftAgent: (id: AgentId) => void
  issueMandate: (mandate: Omit<MandatePayload, 'no'>) => MandatePayload
  addCompareVariant: (variant: Omit<CompareRunItem, 'id' | 'no'>) => void
  selectTask: (taskId: string) => void
  selectConversation: (taskId: string, convId: string) => void
  selectLiveTask: (taskId: string) => void
  selectLiveConversation: (taskId: string, convId: string) => void
}

export interface TrainingCtxValue {
  /** 委托台账列表（支持真实新增 № 0043） */
  records: TrainingRecord[]
  /** 下一个可用委托号 */
  nextMandateNo: string
  /** Step 1 选中的预选 Agent，带入 Step 2 委托单 */
  draftAgent: AgentId
  setDraftAgent: (id: AgentId) => void
  /** 开具新委托单：写入台账并同步到历史训练场状态机 */
  issueMandate: (mandate: Omit<MandatePayload, 'no'>) => MandatePayload
  /** 同口径对照运行列表（Step 4 复盘页展示 & 单变量重跑追加） */
  compareRuns: CompareRunItem[]
  addCompareVariant: (variant: Omit<CompareRunItem, 'id' | 'no'>) => void

  /** 历史训练场：全部任务（当前运行 + 冻结档案） */
  tasks: TrainingTask[]
  current: TrainingTask
  conversation: TrainingConversation
  selectTask: (taskId: string) => void
  selectConversation: (taskId: string, convId: string) => void

  /** 实战工作台：账户与归档列表 */
  liveTasks: TrainingTask[]
  liveCurrent: TrainingTask
  liveConversation: TrainingConversation
  selectLiveTask: (taskId: string) => void
  selectLiveConversation: (taskId: string, convId: string) => void
}

function nextMandateNoOf(records: TrainingRecord[]): string {
  const nextMandateSeq = 42 + (records.length - TRAINING_SEED.length) + 1
  return `№ ${String(nextMandateSeq).padStart(4, '0')}`
}

export const useTrainingStore = create<TrainingStoreState>((set, get) => ({
  records: TRAINING_SEED,
  draftAgent: 'native',
  compareRuns: INITIAL_COMPARE_RUNS,
  taskId: LIVE_TASK_ID,
  convId: '',
  liveTaskId: LIVE_WORKSPACE_ID,
  liveConvId: '',

  setDraftAgent: (id: AgentId) => {
    set({ draftAgent: id })
  },

  issueMandate: (draft: Omit<MandatePayload, 'no'>): MandatePayload => {
    const no = nextMandateNoOf(get().records)
    const mandate: MandatePayload = { ...draft, no }
    const newRec: TrainingRecord = {
      id: 'trn_' + no.replace(/\D/g, ''),
      no,
      title: mandate.title,
      team: mandate.team,
      from: mandate.from,
      to: mandate.to,
      day: Math.min(17, mandate.days),
      days: mandate.days,
      universe: mandate.universeLabel,
      status: 'running',
    }
    set((prev) => ({
      records: [
        newRec,
        ...prev.records.map((r) =>
          r.status === 'running' ? { ...r, status: 'done' as const, result: r.result ?? '+3.76%' } : r,
        ),
      ],
      taskId: LIVE_TASK_ID,
    }))
    useRunStore.getState().applyMandate(mandate, 'training')
    return mandate
  },

  addCompareVariant: (variant: Omit<CompareRunItem, 'id' | 'no'>) => {
    set((prev) => {
      const seq = 42 + prev.compareRuns.length
      return {
        compareRuns: [
          ...prev.compareRuns,
          {
            ...variant,
            id: 'run-' + (prev.compareRuns.length + 1),
            no: `№ ${String(seq).padStart(4, '0')}`,
          },
        ],
      }
    })
  },

  selectTask: (id: string) => {
    const tasks = trainingTasksOf(useRunStore.getState().training)
    const next = tasks.find((task) => task.id === id)
    set({
      taskId: id,
      convId: next?.conversations[0]?.id ?? '',
    })
  },

  selectConversation: (id: string, next: string) => {
    set({ taskId: id, convId: next })
  },

  selectLiveTask: (id: string) => {
    const liveTasks = liveTasksOf(useRunStore.getState().live)
    const next = liveTasks.find((task) => task.id === id)
    set({
      liveTaskId: id,
      liveConvId: next?.conversations[0]?.id ?? '',
    })
  },

  selectLiveConversation: (id: string, next: string) => {
    set({ liveTaskId: id, liveConvId: next })
  },
}))

export function useTraining(): TrainingCtxValue {
  const trainingState = useRunStore((s) => s.training)
  const liveState = useRunStore((s) => s.live)
  const {
    records,
    draftAgent,
    compareRuns,
    taskId,
    convId,
    liveTaskId,
    liveConvId,
    setDraftAgent,
    issueMandate,
    addCompareVariant,
    selectTask,
    selectConversation,
    selectLiveTask,
    selectLiveConversation,
  } = useTrainingStore(
    useShallow((s) => ({
      records: s.records,
      draftAgent: s.draftAgent,
      compareRuns: s.compareRuns,
      taskId: s.taskId,
      convId: s.convId,
      liveTaskId: s.liveTaskId,
      liveConvId: s.liveConvId,
      setDraftAgent: s.setDraftAgent,
      issueMandate: s.issueMandate,
      addCompareVariant: s.addCompareVariant,
      selectTask: s.selectTask,
      selectConversation: s.selectConversation,
      selectLiveTask: s.selectLiveTask,
      selectLiveConversation: s.selectLiveConversation,
    })),
  )

  const tasks = useMemo(() => trainingTasksOf(trainingState), [trainingState])
  const liveTasks = useMemo(() => liveTasksOf(liveState), [liveState])

  const nextMandateNo = useMemo(() => nextMandateNoOf(records), [records])

  const current = useMemo(
    () => tasks.find((task) => task.id === taskId) ?? tasks[0],
    [tasks, taskId],
  )
  const conversation = useMemo(
    () => current.conversations.find((item) => item.id === convId) ?? current.conversations[0],
    [current, convId],
  )

  const liveCurrent = useMemo(
    () => liveTasks.find((task) => task.id === liveTaskId) ?? liveTasks[0],
    [liveTasks, liveTaskId],
  )
  const liveConversation = useMemo(
    () => liveCurrent.conversations.find((item) => item.id === liveConvId) ?? liveCurrent.conversations[0],
    [liveCurrent, liveConvId],
  )

  return useMemo<TrainingCtxValue>(
    () => ({
      records,
      nextMandateNo,
      draftAgent,
      setDraftAgent,
      issueMandate,
      compareRuns,
      addCompareVariant,
      tasks,
      current,
      conversation,
      selectTask,
      selectConversation,
      liveTasks,
      liveCurrent,
      liveConversation,
      selectLiveTask,
      selectLiveConversation,
    }),
    [
      records,
      nextMandateNo,
      draftAgent,
      setDraftAgent,
      issueMandate,
      compareRuns,
      addCompareVariant,
      tasks,
      current,
      conversation,
      selectTask,
      selectConversation,
      liveTasks,
      liveCurrent,
      liveConversation,
      selectLiveTask,
      selectLiveConversation,
    ],
  )
}

export function useActiveWorkbenchTask(): { task: TrainingTask; conversation: TrainingConversation } {
  const kind = useWorkspaceKind()
  const runState = useRunStore((s) => (kind === 'live' ? s.live : s.training))
  const { activeTaskId, activeConvId } = useTrainingStore(
    useShallow((s) =>
      kind === 'live'
        ? { activeTaskId: s.liveTaskId, activeConvId: s.liveConvId }
        : { activeTaskId: s.taskId, activeConvId: s.convId },
    ),
  )

  const tasks = useMemo(
    () => (kind === 'live' ? liveTasksOf(runState) : trainingTasksOf(runState)),
    [kind, runState],
  )
  const task = useMemo(
    () => tasks.find((item) => item.id === activeTaskId) ?? tasks[0],
    [tasks, activeTaskId],
  )
  const conversation = useMemo(
    () => task.conversations.find((item) => item.id === activeConvId) ?? task.conversations[0],
    [task, activeConvId],
  )

  return useMemo(() => ({ task, conversation }), [task, conversation])
}
