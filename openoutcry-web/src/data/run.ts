import type { AgentId, Holding, MandatePayload, RunEvent, RunState, Trade } from '../types'
import { agentOf } from './agents'

const HOLDINGS: Holding[] = [
  { name: '公司-017', quantity: 600, sellable: 600, cost: 18.2, price: 20.3, entryFee: 20 },
  { name: '公司-042', quantity: 300, sellable: 300, cost: 31.6, price: 33.22, entryFee: 20 },
  { name: '公司-008', quantity: 100, sellable: 100, cost: 46.8, price: 45.88, entryFee: 20 },
]

const TRADES: Trade[] = [
  {
    id: 'buy17',
    name: '公司-017',
    side: '买入',
    quantity: 600,
    price: 18.2,
    fee: 20,
    time: '2024-04-18 开盘',
    pnl: null,
    reason: '以估值与现金流披露建立观察仓位。',
    evidence: 'ev_011',
    status: '已成交',
  },
  {
    id: 'buy42',
    name: '公司-042',
    side: '买入',
    quantity: 300,
    price: 31.6,
    fee: 20,
    time: '2024-04-19 开盘',
    pnl: null,
    reason: '分散持仓，跟踪经营现金回收。',
    evidence: 'ev_012',
    status: '已成交',
  },
  {
    id: 'buy08',
    name: '公司-008',
    side: '买入',
    quantity: 100,
    price: 46.8,
    fee: 20,
    time: '2024-04-22 开盘',
    pnl: null,
    reason: '小仓位观察经营修复，控制单一标的风险。',
    evidence: 'ev_015',
    status: '已成交',
  },
  {
    id: 'closed',
    name: '公司-026',
    side: '卖出',
    quantity: 1000,
    price: 22.3086,
    fee: 140,
    time: '2024-04-22 开盘',
    pnl: 2168.6,
    reason: '达到原定退出条件后完成平仓。',
    evidence: 'ev_016',
    status: '已成交',
  },
]

export const CLOCK_START = '2024-04-23 09:15'
export const CLOCK_MATCHED = '2024-04-23 09:30'
export const CLOCK_CLOSE = '2024-04-23 15:00'

/** 公司-017 近 10 个交易日截断走势（截至 04-22 收盘），以及 04-23 撮合后才揭示的开盘价 */
export const PIT_PRICE_HISTORY = [
  { date: '04-09', close: 18.05 },
  { date: '04-10', close: 18.22 },
  { date: '04-11', close: 18.48 },
  { date: '04-12', close: 18.35 },
  { date: '04-15', close: 18.62 },
  { date: '04-16', close: 18.95 },
  { date: '04-17', close: 18.4 },
  { date: '04-18', close: 19.12 },
  { date: '04-19', close: 19.78 },
  { date: '04-22', close: 20.3 },
] as const

export const PIT_REVEALED_OPEN = {
  date: '04-23',
  open: 20.36,
  close: 20.18,
} as const

function buildInitialEvents(team: AgentId[], day: number, totalDays: number): RunEvent[] {
  const leadName = agentOf(team[0] ?? 'native').name.split(' · ')[0]
  const events: Omit<RunEvent, 'id'>[] = [
    {
      kind: 'agent',
      divider: `Day ${day} / ${totalDays} · 2024-04-23 (D+0) · 09:15 盘前研究（只读禁下单）`,
      speakerRole: team.length > 1 ? `主交易员 · ${leadName}` : undefined,
      title: '已接收截至昨收的 PIT 受控观察',
      body: '当前阶段：09:15 盘前研究。行情与公告严格截断于 2024-04-22 23:59，不包含今日开盘价、最高/最低价或盘后披露。',
      meta: 'observation · PIT 截止 04-22 23:59',
      at: '09:15',
    },
    {
      kind: 'tool',
      title: '检索并阅读 公司-017 现金流资料（命中 2 条合格证据）',
      body: '通过受控 MCP 工具读取冻结历史证据库：返回 ev_018（经营披露）与 ev_024（现金流补充说明），全部已通过时点与双盲匿名校验。',
      meta: 'MCP search/read · 截止 04-22 23:59',
      at: '09:15',
      evidenceItems: [
        {
          id: 'ev_018',
          title: '公司-017 季度经营简报（匿名化）',
          publishedAt: '2024-04-22 18:40',
          pitPass: true,
          summary: '营收环比平稳，但大客户结算账期由 48 天拉长至 61 天，短期经营性现金净流入承压。',
        },
        {
          id: 'ev_024',
          title: '公司-017 现金流与应收补充说明',
          publishedAt: '2024-04-22 20:15',
          pitPass: true,
          summary: '二季度预计加大原料备货，短期自由现金流弹性收窄，建议关注持仓浮盈保护。',
        },
      ],
      interceptedNote: '时点闸门已自动拦截 2 条 2024-04-23 盘后披露资料，未返回给 Agent。',
    },
  ]

  if (team.length >= 2) {
    const advisorName = agentOf(team[1]).name.split(' · ')[0]
    events.push({
      kind: 'agent',
      speakerRole: `研究员（只读）· ${advisorName}`,
      title: '研究备忘录：建议小幅减仓锁盈，不追高',
      body: '仅作只读研究意见输入：公司-017 近 5 日累计反弹逾 10% 且账期拉长，建议主交易员卖出 100 股兑现部分浮盈；本角色无下单权限。',
      meta: 'committee.memo · 只读顾问',
      at: '09:15',
    })
  }

  events.push(
    {
      kind: 'agent',
      speakerRole: team.length > 1 ? `主交易员 · ${leadName}` : undefined,
      title: '判断：适度减仓 100 股，保留 500 股观察仓位',
      body: '结合 ev_018 与 ev_024 显示的回款周期延长信号，拟在开盘窗口减持 公司-017 100 股（限价 ¥20.30），保留核心观察仓位。历史资料不保证未来价格走势。',
      meta: '结构化理由 · ev_018 / ev_024',
      at: '09:15',
    },
    {
      kind: 'order',
      speakerRole: team.length > 1 ? `唯一执行者 · ${leadName}` : undefined,
      title: '提交卖出提案 · 公司-017 · 100 股 @ ¥20.30',
      body: '仅为盘前交易意图提案，尚未通过撮合，账户现金与持仓零变化。等待右侧确定性规则预检与人工审批。',
      meta: 'order.proposed · 09:15',
      at: '09:15',
    },
  )

  return events.map((e, i) => ({ ...e, id: i + 1 }))
}

/** 每次切 Agent 或开具新委托单都从这里构造干净的运行状态 */
export function createInitialRun(agent: AgentId = 'native', mandate?: Partial<MandatePayload>): RunState {
  const team: AgentId[] = mandate?.team && mandate.team.length > 0 ? mandate.team : [agent]
  const lead = team[0]
  const initial = mandate?.capital ?? 100000
  const cashDelta = initial - 100000
  const totalDays = mandate?.days ?? 20
  const day = Math.min(17, totalDays)

  return {
    kind: 'training',
    agent: lead,
    mandateNo: mandate?.no ?? '№ 0042',
    team,
    universeLabel: mandate?.universeLabel ?? '沪深 300 成分池',
    cadenceLabel: mandate?.cadenceLabel ?? '日频三阶段（MVP 默认）',
    day,
    totalDays,
    phase: 'pre_market',
    pitCutoff: '2024-04-22 23:59',
    blindMask: mandate?.blindMask ?? true,
    interceptedCount: 2,
    initial,
    cash: 77028.6 + cashDelta,
    realized: 2168.6,
    fees: 200,
    status: 'active',
    mode: mandate?.mode ?? 'approval',
    collaboration: mandate?.mode === 'goal' ? '自主运行' : '人工确认',
    proposal: {
      status: 'pending',
      asset: '公司-017',
      side: '卖出',
      original: 100,
      quantity: 100,
      price: 20.3,
      evidence: 'ev_018 / ev_024',
      reason: '示例资料显示回款周期延长，建议减少 公司-017 的 100 股敞口，保留其余持仓。',
    },
    clock: CLOCK_START,
    holdings: HOLDINGS.map((h) => ({ ...h })),
    trades: TRADES.map((t) => ({ ...t })),
    events: buildInitialEvents(team, day, totalDays),
  }
}
