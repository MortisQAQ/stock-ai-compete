import type { RunState, TrainingTask } from '../types'
import { MOCK_ARCHIVES } from '../mocks/trainingArchives'
import { agentOf } from '../data/agents'
import { canDecide } from './derive'

/**
 * 训练任务派生。
 *
 * 实体形状与冻结档案分别在 types.ts 与 mocks/ 里，这里只做两件事：
 *   1. 把当前运行折算成「第一个任务」（live，数据来自 store）；
 *   2. 拼上只读档案，给右栏的任务切换器一份完整列表。
 *
 * 接真实 store 时，把 MOCK_ARCHIVES 换成后端返回的任务列表即可，组件不用改。
 */
export const LIVE_TASK_ID = 'task-live'

/**
 * 进度口径：决策 = 思考/订单类事件条数；成交 = trades 中状态为「已成交」的笔数。
 */
export function trainingTasksOf(state: RunState): TrainingTask[] {
  const decisions = state.events.filter((e) => e.kind === 'agent' || e.kind === 'order').length
  const fills = state.trades.filter((t) => t.status === '已成交').length
  const status: TrainingTask['status'] = state.status === 'aborted'
    ? 'done'
    : canDecide(state) || state.proposal.status === 'submitted'
      ? 'pending'
      : 'running'
  const agent = agentOf(state.agent)

  const live: TrainingTask = {
    id: LIVE_TASK_ID,
    name: '减仓 公司-017 · 当日',
    // 一次训练里可以和 AI 有多次会话：盘前研究、开盘撮合。
    // 两条都指向同一个实时事件流，区分的是「这次对话在谈什么」。
    conversations: [
      {
        id: 'conv-pre',
        name: '盘前研究',
        meta: '09:15 · 资料检索与候选筛选',
        status,
      },
      {
        id: 'conv-open',
        name: '开盘撮合',
        meta: '09:30 · 提案与审批',
        status,
      },
    ],
    assignee: { kind: 'agent', name: agent.name },
    startAt: '2024-04-23 09:15',
    endAt: '2024-04-23 15:00',
    windowLabel: '2024-04-23 09:15 → 15:00',
    status,
    live: true,
    decisions,
    fills,
  }

  return [live, ...MOCK_ARCHIVES]
}

export const progressLabel = (task: TrainingTask) => `${task.decisions} 条决策 · ${task.fills} 笔成交`

export const assigneeLabel = (task: TrainingTask) =>
  task.assignee.kind === 'team' ? `团队 · ${task.assignee.name}` : `Agent · ${task.assignee.name}`
