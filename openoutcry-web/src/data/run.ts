import type { Holding, RunState, Trade } from '../types'

const HOLDINGS: Holding[] = [
  { name: '公司-017', quantity: 600, sellable: 600, cost: 18.2, price: 20.3, entryFee: 20 },
  { name: '公司-042', quantity: 300, sellable: 300, cost: 31.6, price: 33.22, entryFee: 20 },
  { name: '公司-008', quantity: 100, sellable: 100, cost: 46.8, price: 45.88, entryFee: 20 },
]

const TRADES: Trade[] = [
  { id: 'buy17', name: '公司-017', side: '买入', quantity: 600, price: 18.2, fee: 20, time: '2024-04-18 开盘', pnl: null, reason: '以估值与现金流披露建立观察仓位。', evidence: 'ev_011', status: '已成交' },
  { id: 'buy42', name: '公司-042', side: '买入', quantity: 300, price: 31.6, fee: 20, time: '2024-04-19 开盘', pnl: null, reason: '分散持仓，跟踪经营现金回收。', evidence: 'ev_012', status: '已成交' },
  { id: 'buy08', name: '公司-008', side: '买入', quantity: 100, price: 46.8, fee: 20, time: '2024-04-22 开盘', pnl: null, reason: '小仓位观察经营修复，控制单一标的风险。', evidence: 'ev_015', status: '已成交' },
  { id: 'closed', name: '公司-026', side: '卖出', quantity: 1000, price: 22.3086, fee: 140, time: '2024-04-22 开盘', pnl: 2168.6, cost: 20, reason: '达到原定退出条件后完成平仓。', evidence: 'ev_016', status: '已成交' } as Trade,
]

export const CLOCK_START = '2024-04-23 09:15'
export const CLOCK_MATCHED = '2024-04-23 09:30'

const EVENTS = [
  { kind: 'agent' as const, title: '已接收当时可见的观察', body: '当前阶段：盘前研究。行情和资料截至 2024-04-22；不包含当天的开盘或收盘价格。', meta: 'observation · 09:15', at: '09:15' },
  { kind: 'tool' as const, title: '检索并阅读现金流资料', body: '读取证据 ev_018（经营披露）与 ev_024（现金流补充说明）。仅返回冻结版本的片段，无研究助手判断。', meta: 'search / read · 截止 04-22 23:59', at: '09:15' },
  { kind: 'agent' as const, title: '建议适度减仓，保留观察仓位', body: '示例资料显示回款周期延长，建议减少公司-017 的 100 股敞口，保留其余持仓。资料不能保证未来价格走势。', meta: '结构化理由 · ev_018 / ev_024', at: '09:15' },
  { kind: 'order' as const, title: '提交卖出提案，等待确认', body: '公司-017 · 100 股 · 限价 ¥20.30。仅为提案，尚未成交，账户不变。', meta: 'order.proposed · 09:15', at: '09:15' },
]

export function createInitialRun(agent = 'native'): RunState {
  return {
    agent: agent as RunState['agent'],
    initial: 100000,
    cash: 77028.6,
    realized: 2168.6,
    fees: 200,
    status: 'active',
    mode: 'approval',
    collaboration: '人工确认',
    proposal: { status: 'pending', original: 100, quantity: 100, price: 20.3 },
    clock: CLOCK_START,
    holdings: HOLDINGS.map((h) => ({ ...h })),
    trades: TRADES.map((t) => ({ ...t })),
    events: EVENTS.map((e, i) => ({ ...e, id: i + 1 })),
  }
}
