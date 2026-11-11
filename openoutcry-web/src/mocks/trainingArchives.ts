import type { TrainingTask } from '../types'

/**
 * 冻结的训练档案（原型数据）。
 *
 * 与 store 的分工：store 只负责「当前运行」派生出的 live 任务，
 * 已结束的任务是**只读档案**，不参与状态机，接后端时整份替换成接口返回。
 */
export const MOCK_ARCHIVES: TrainingTask[] = [
  {
    id: 'task-team',
    name: '连续委托 · 第 3 个交易日',
    conversations: [
      { id: 'team-conv-1', name: '分工与预算', meta: '08:55 · 3 条对话', status: 'pending' },
      { id: 'team-conv-2', name: '盘前资料检索', meta: '09:02 · 待放行', status: 'pending' },
    ],
    assignee: {
      kind: 'team',
      name: '研究团队 · 3 个 Agent',
      members: ['openOutcry · 研究员', 'Codex · 价值研究', 'Kimi · 研究助手'],
    },
    startAt: '2024-04-24 09:15',
    endAt: '2024-04-24 15:00',
    windowLabel: '2024-04-24 全天 · 第 3 个交易日',
    status: 'pending',
    live: false,
    decisions: 0,
    fills: 0,
    archive: {
      equity: 99840.2,
      net: -159.8,
      cash: 77380.2,
      market: 22460,
      decisions: 3,
      fills: 0,
      log: [
        {
          kind: 'user',
          title: '委托已建立，等待确认',
          body: '团队任务需要人工确认分工与预算后才能开始记录决策。',
          at: '08:55',
        },
        {
          kind: 'agent',
          title: '研究员提交盘前分工建议',
          body: '研究员负责资料检索，Codex 负责估值区间，Kimi 负责横向对照。',
          at: '09:02',
        },
        { kind: 'error', title: '预算未批准，暂停委托', body: '调用预算 20 次 / 日，等待人工放行。', at: '09:04' },
      ],
      trades: [],
      note: '该任务尚未开始记录成交：团队分工与预算需先由人工确认。',
    },
  },
  {
    id: 'task-kimi',
    name: '事件驱动复盘 · 4 月第 3 周',
    conversations: [
      { id: 'kimi-conv-1', name: '事件打分', meta: '04-16 · 12 条披露', status: 'done' },
      { id: 'kimi-conv-2', name: '建仓与平仓', meta: '04-17 → 04-19 · 2 笔成交', status: 'done' },
    ],
    assignee: { kind: 'agent', name: 'Kimi · 研究助手' },
    startAt: '2024-04-16 09:15',
    endAt: '2024-04-19 15:00',
    windowLabel: '2024-04-16 → 04-19 · 4 个交易日',
    status: 'done',
    live: false,
    decisions: 0,
    fills: 0,
    archive: {
      equity: 101260.4,
      net: 1260.4,
      cash: 81260.4,
      market: 20000,
      decisions: 9,
      fills: 2,
      log: [
        {
          kind: 'agent',
          title: '以事件强度排序候选标的',
          body: '对 12 条披露做事件打分，只保留经营现金流相关的前 3 条。',
          at: '04-16',
        },
        { kind: 'order', title: '提交买入提案 · 公司-026', body: '600 股 · 限价 ¥19.80，等待人工确认。', at: '04-17' },
        { kind: 'order', title: '平仓 · 公司-026', body: '达到原定退出条件后卖出 600 股，含费用净收益 +¥1,260.40。', at: '04-19' },
      ],
      trades: ['买入 公司-026 · 600 股 @ ¥19.80', '卖出 公司-026 · 600 股 @ ¥22.31'],
      note: '任务已结束，台账只读；可回放全部 9 条决策。',
    },
  },
  {
    id: 'task-codex',
    name: '价值锚定 · 财务披露周',
    conversations: [
      { id: 'codex-conv-1', name: '估值区间', meta: '04-25 · 3 档假设', status: 'done' },
      { id: 'codex-conv-2', name: '清仓决策', meta: '04-26 · 4 笔成交', status: 'done' },
    ],
    assignee: { kind: 'agent', name: 'Codex · 价值研究' },
    startAt: '2024-04-25 09:15',
    endAt: '2024-04-26 15:00',
    windowLabel: '2024-04-25 09:15 → 04-26 15:00',
    status: 'done',
    live: false,
    decisions: 0,
    fills: 0,
    archive: {
      equity: 97320.8,
      net: -2679.2,
      cash: 97320.8,
      market: 0,
      decisions: 11,
      fills: 4,
      log: [
        { kind: 'agent', title: '按现金流折算估值区间', body: '给出三档估值：悲观 / 中性 / 乐观，并标注每条假设的证据编号。', at: '04-25' },
        { kind: 'tool', title: '读取 3 份年报附注', body: '仅返回冻结版本片段；附注 7 与附注 11 指向同一笔应收。', at: '04-25' },
        { kind: 'order', title: '全部清仓', body: '披露低于预期，按风控条款清仓，含费用净亏损 −¥2,679.20。', at: '04-26' },
      ],
      trades: ['卖出 公司-042 · 300 股 @ ¥30.10', '卖出 公司-008 · 100 股 @ ¥44.20'],
      note: '该任务为本地 Runner 运行，轨迹未执行真实隔离验证。',
    },
  },
]
