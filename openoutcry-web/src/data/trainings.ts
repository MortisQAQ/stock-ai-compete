import type { AgentId, TrainingStatus } from '../types'

/**
 * 原型数据：训练（training）是委托单位，而不是 Agent。
 * 一次训练 = 时间段 × 标的池 × Agent 团队 × 规则。
 * 后端接入前，这里只服务新建训练页的设计稿演示。
 */

export interface TrainingRecord {
  id: string
  /** 委托单号，形如 № 0042 */
  no: string
  title: string
  team: AgentId[]
  from: string
  to: string
  /** 已走过的交易日 / 总交易日 */
  day: number
  days: number
  universe: string
  status: TrainingStatus
  /** 已结束训练的结果，做原型展示用 */
  result?: string
}

export const TRAINING_SEED: TrainingRecord[] = [
  {
    id: 'trn_0042',
    no: '№ 0042',
    title: '四月全月 · 沪深 300 成分池',
    team: ['native'],
    from: '2024-04-01',
    to: '2024-04-26',
    day: 17,
    days: 20,
    universe: '沪深 300 成分池',
    status: 'running',
  },
  {
    id: 'trn_0041',
    no: '№ 0041',
    title: '四月全月 · 双 Agent 同口径对照',
    team: ['native', 'kimi'],
    from: '2024-04-01',
    to: '2024-04-26',
    day: 20,
    days: 20,
    universe: '沪深 300 成分池',
    status: 'done',
    result: '+2.42%',
  },
  {
    id: 'trn_0040',
    no: '№ 0040',
    title: '三月整月 · 全市场 A 股宽池',
    team: ['codex'],
    from: '2024-03-01',
    to: '2024-03-29',
    day: 20,
    days: 20,
    universe: '全市场 A 股池',
    status: 'done',
    result: '+2.10%',
  },
  {
    id: 'trn_0039',
    no: '№ 0039',
    title: '二月专项 · 自选 6 只压测',
    team: ['native'],
    from: '2024-02-01',
    to: '2024-02-29',
    day: 20,
    days: 20,
    universe: '专项自选池（6 只）',
    status: 'done',
    result: '-0.78%',
  },
]

/** 标的池三级漏斗预设：底池可宽可全，Agent 通过受控工具筛入 ≤12 只活跃关注池 */
export const UNIVERSE_PRESETS = [
  {
    id: 'csi300',
    name: '沪深 300 成分池',
    nameEn: 'CSI 300 Constituents',
    code: 'CSI300_PIT',
    note: '同口径对照首选 · 剔除 ST/停牌 · 关注池 ≤12 只',
    noteEn: 'Best for A/B comparison · Ex-ST/Suspended · Focus ≤12',
  },
  {
    id: 'all_a',
    name: '全市场 A 股池（~4,800 只）',
    nameEn: 'Full A-Share Universe (~4,800)',
    code: 'ALL_A_EX_ST',
    note: '防选池偏差 · 盘前受控工具自主初筛入关注池',
    noteEn: 'Zero cherry-picking · Screened via MCP into watchlist',
  },
  {
    id: 'watch6',
    name: '专项自选池（6 只）',
    nameEn: 'Custom Watchlist (6 Stocks)',
    code: 'WATCHLIST_6',
    note: '验证个人自选股，或将实盘持仓回炉压测',
    noteEn: 'Test personal watchlist or replay live holdings',
  },
] as const

export type UniverseId = (typeof UNIVERSE_PRESETS)[number]['id']

/** 决策节拍预设（快慢双时钟架构） */
export const SESSION_PRESETS = [
  {
    id: 'daily-3phase',
    name: '日频三阶段（MVP 默认）',
    nameEn: 'Daily 3-Phase (MVP Default)',
    note: '09:15 盘前研究 → 09:30 开盘撮合 → 15:00 尾盘结算',
    noteEn: '09:15 Pre-market → 09:30 Open Match → 15:00 Close Settle',
  },
  {
    id: 'dual-window',
    name: '早晚双窗口 + 5 分钟条件单（二期）',
    nameEn: 'Dual-Window + 5m Conditional (Phase 2)',
    note: '09:30 开盘 + 14:30 尾盘 + 盘中异动快时钟中断',
    noteEn: '09:30 Open + 14:30 Close + Intraday Fast-Clock Interrupt',
  },
] as const

export type SessionId = (typeof SESSION_PRESETS)[number]['id']