import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { TRAINING_SEED, type TrainingRecord } from '../data/trainings'
import { useRun, useWorkspaceKind } from './RunProvider'
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

interface TrainingCtxValue {
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

const TrainingCtx = createContext<TrainingCtxValue | null>(null)

export function TrainingProvider({ children }: { children: ReactNode }) {
  const { state: trainingState, actions: trainingActions } = useRun('training')
  const { state: liveState } = useRun('live')

  const [records, setRecords] = useState<TrainingRecord[]>(TRAINING_SEED)
  const [draftAgent, setDraftAgent] = useState<AgentId>('native')
  const [compareRuns, setCompareRuns] = useState<CompareRunItem[]>(INITIAL_COMPARE_RUNS)

  const tasks = useMemo(() => trainingTasksOf(trainingState), [trainingState])
  const liveTasks = useMemo(() => liveTasksOf(liveState), [liveState])

  const [taskId, setTaskId] = useState<string>(LIVE_TASK_ID)
  const [convId, setConvId] = useState<string>('')

  const [liveTaskId, setLiveTaskId] = useState<string>(LIVE_WORKSPACE_ID)
  const [liveConvId, setLiveConvId] = useState<string>('')

  const nextMandateSeq = 42 + (records.length - TRAINING_SEED.length) + 1
  const nextMandateNo = `№ ${String(nextMandateSeq).padStart(4, '0')}`

  const current = tasks.find((task) => task.id === taskId) ?? tasks[0]
  const conversation = current.conversations.find((item) => item.id === convId) ?? current.conversations[0]

  const liveCurrent = liveTasks.find((task) => task.id === liveTaskId) ?? liveTasks[0]
  const liveConversation =
    liveCurrent.conversations.find((item) => item.id === liveConvId) ?? liveCurrent.conversations[0]

  const selectTask = useCallback(
    (id: string) => {
      setTaskId(id)
      const next = tasks.find((task) => task.id === id)
      setConvId(next?.conversations[0]?.id ?? '')
    },
    [tasks],
  )

  const selectConversation = useCallback((id: string, next: string) => {
    setTaskId(id)
    setConvId(next)
  }, [])

  const selectLiveTask = useCallback(
    (id: string) => {
      setLiveTaskId(id)
      const next = liveTasks.find((task) => task.id === id)
      setLiveConvId(next?.conversations[0]?.id ?? '')
    },
    [liveTasks],
  )

  const selectLiveConversation = useCallback((id: string, next: string) => {
    setLiveTaskId(id)
    setLiveConvId(next)
  }, [])

  const issueMandate = useCallback(
    (draft: Omit<MandatePayload, 'no'>): MandatePayload => {
      const no = nextMandateNo
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
      setRecords((prev) => [
        newRec,
        ...prev.map((r) => (r.status === 'running' ? { ...r, status: 'done' as const, result: r.result ?? '+3.76%' } : r)),
      ])
      trainingActions.applyMandate(mandate)
      setTaskId(LIVE_TASK_ID)
      return mandate
    },
    [nextMandateNo, trainingActions],
  )

  const addCompareVariant = useCallback(
    (variant: Omit<CompareRunItem, 'id' | 'no'>) => {
      const seq = 42 + compareRuns.length
      setCompareRuns((prev) => [
        ...prev,
        {
          ...variant,
          id: 'run-' + (prev.length + 1),
          no: `№ ${String(seq).padStart(4, '0')}`,
        },
      ])
    },
    [compareRuns.length],
  )

  const value = useMemo(
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

  return <TrainingCtx.Provider value={value}>{children}</TrainingCtx.Provider>
}

export function useTraining(): TrainingCtxValue {
  const ctx = useContext(TrainingCtx)
  if (!ctx) throw new Error('useTraining 必须在 TrainingProvider 内使用')
  return ctx
}

export function useActiveWorkbenchTask(): { task: TrainingTask; conversation: TrainingConversation } {
  const kind = useWorkspaceKind()
  const { current, conversation, liveCurrent, liveConversation } = useTraining()
  return kind === 'live'
    ? { task: liveCurrent, conversation: liveConversation }
    : { task: current, conversation }
}
