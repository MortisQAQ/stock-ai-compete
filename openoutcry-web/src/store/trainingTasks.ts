import type { RunState, TrainingTask } from '../types'
import { MOCK_ARCHIVES } from '../mocks/trainingArchives'
import { LIVE_ARCHIVE_TASKS } from '../data/live'
import { agentOf } from '../data/agents'
import { canDecide } from './derive'

/**
 * 训练任务与实战账户派生。
 *
 * 实体形状与冻结档案分别在 types.ts、mocks/ 与 data/live.ts 里，这里只做两件事：
 *   1. 把当前运行折算成各自工作区的首位活跃实体（live: true）；
 *   2. 拼上只读档案，供左栏任务树与工作台复用同一套类型渲染。
 */
export const LIVE_TASK_ID = 'task-live'
export const LIVE_WORKSPACE_ID = 'live-main'

function taskStatusOf(state: RunState): TrainingTask['status'] {
  if (state.status === 'aborted') return 'done'
  if (canDecide(state) || state.proposal.status === 'submitted') return 'pending'
  return 'running'
}

/**
 * 进度口径：决策 = 思考/订单类事件条数；成交 = trades 中已成交/已记录的笔数。
 */
export function trainingTasksOf(state: RunState): TrainingTask[] {
  const decisions = state.events.filter((e) => e.kind === 'agent' || e.kind === 'order').length
  const fills = state.trades.filter((t) => t.status === '已成交').length
  const status = taskStatusOf(state)
  const agent = agentOf(state.agent)

  const teamIds = state.team && state.team.length > 0 ? state.team : [state.agent]
  const teamNames = teamIds.map((id) => agentOf(id).name.split(' · ')[0])
  const mandateNo = state.mandateNo ?? '№ 0042'

  const live: TrainingTask = {
    id: LIVE_TASK_ID,
    name: `${mandateNo} · ${state.universeLabel ?? '沪深 300 成分池'}`,
    kind: 'training',
    mandateNo,
    universeId: state.universeId ?? 'csi300',
    universeLabel: state.universeLabel ?? '沪深 300 成分池',
    cadenceId: state.cadenceId ?? 'daily-3phase',
    cadenceLabel: state.cadenceLabel ?? '日频三阶段',
    day: state.day ?? 17,
    totalDays: state.totalDays ?? 20,
    clock: state.clock,
    clockKey: state.clockKey,
    conversations: [
      {
        id: 'conv-main',
        name: `${mandateNo} · 训练轨迹`,
        meta: `${state.clock} · ${state.cadenceLabel ?? '日频三阶段'}`,
        status,
      },
    ],
    assignee:
      teamIds.length > 1
        ? { kind: 'team', name: teamNames.join(' + '), memberIds: teamIds, members: teamNames }
        : { kind: 'agent', name: agent.name, agentId: state.agent },
    startAt: '2024-04-01 09:15',
    endAt: '2024-04-26 15:00',
    windowLabel: `2024-04-01 → 04-26 · Day ${state.day ?? 17}/${state.totalDays ?? 20}`,
    status,
    live: true,
    decisions,
    fills,
  }

  return [live, ...MOCK_ARCHIVES]
}

export function liveTasksOf(state: RunState): TrainingTask[] {
  const decisions = state.events.filter((e) => e.kind === 'agent' || e.kind === 'order').length
  const fills = state.trades.filter((t) => t.status === '已记录').length
  const status = taskStatusOf(state)
  const agent = agentOf(state.agent)

  const activeAccount: TrainingTask = {
    id: LIVE_WORKSPACE_ID,
    name: 'A 股主仓 · 实时辅助',
    kind: 'live',
    clock: state.clock,
    clockKey: state.clockKey,
    syncKey: state.syncKey,
    syncLabel: state.syncLabel,
    marketSessionKey: state.marketSessionKey,
    marketSession: state.marketSession,
    conversations: [
      {
        id: 'live-conv-check',
        name: '盘中持仓体检',
        meta: '14:15 · 实时快照与仓位诊断',
        status,
      },
      {
        id: 'live-conv-advise',
        name: '调仓建议讨论',
        meta: '14:20 · 建议单与自主执行记录',
        status,
      },
    ],
    assignee: { kind: 'agent', name: agent.name, agentId: state.agent },
    startAt: '今日 09:30',
    endAt: '实时',
    windowLabel: (state.marketSession ?? 'A 股实时行情') + ' · ' + (state.syncLabel ?? '手动维护'),
    status,
    live: true,
    decisions,
    fills,
  }

  return [activeAccount, ...LIVE_ARCHIVE_TASKS]
}
