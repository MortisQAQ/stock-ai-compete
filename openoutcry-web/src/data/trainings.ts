import type { AgentId, TrainingStatus, TranslationKey } from '../types'

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
  titleParams?: { range: string; universeId: string; count: number }
  team: AgentId[]
  from: string
  to: string
  /** 已走过的交易日 / 总交易日 */
  day: number
  days: number
  universe: string
  universeId?: string
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
    universeId: 'csi300',
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
    universeId: 'csi300',
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
    universeId: 'all_a',
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
    universeId: 'watch6',
    status: 'done',
    result: '-0.78%',
  },
]

/** 标的池三级漏斗预设：底池可宽可全，Agent 通过受控工具筛入 ≤12 只活跃关注池 */
export const UNIVERSE_PRESETS: ReadonlyArray<{
  id: 'csi300' | 'all_a' | 'watch6'
  name: string
  nameKey: TranslationKey
  code: string
  note: string
  noteKey: TranslationKey
}> = [
  {
    id: 'csi300',
    name: '沪深 300 成分池',
    nameKey: 'mandate.universes.csi300.name',
    code: 'CSI300_PIT',
    note: '同口径对照首选 · 剔除 ST/停牌 · 关注池 ≤12 只',
    noteKey: 'mandate.universes.csi300.note',
  },
  {
    id: 'all_a',
    name: '全市场 A 股池（~4,800 只）',
    nameKey: 'mandate.universes.all_a.name',
    code: 'ALL_A_EX_ST',
    note: '防选池偏差 · 盘前受控工具自主初筛入关注池',
    noteKey: 'mandate.universes.all_a.note',
  },
  {
    id: 'watch6',
    name: '专项自选池（6 只）',
    nameKey: 'mandate.universes.watch6.name',
    code: 'WATCHLIST_6',
    note: '验证个人自选股，或将实盘持仓回炉压测',
    noteKey: 'mandate.universes.watch6.note',
  },
]

export type UniverseId = (typeof UNIVERSE_PRESETS)[number]['id']

/** 决策节拍预设（快慢双时钟架构） */
export const SESSION_PRESETS: ReadonlyArray<{
  id: 'daily-3phase' | 'dual-window'
  name: string
  nameKey: TranslationKey
  note: string
  noteKey: TranslationKey
}> = [
  {
    id: 'daily-3phase',
    name: '日频三阶段（MVP 默认）',
    nameKey: 'mandate.sessions.daily-3phase.name',
    note: '09:15 盘前研究 → 09:30 开盘撮合 → 15:00 尾盘结算',
    noteKey: 'mandate.sessions.daily-3phase.note',
  },
  {
    id: 'dual-window',
    name: '早晚双窗口 + 5 分钟条件单（二期）',
    nameKey: 'mandate.sessions.dual-window.name',
    note: '09:30 开盘 + 14:30 尾盘 + 盘中异动快时钟中断',
    noteKey: 'mandate.sessions.dual-window.note',
  },
]

export type SessionId = (typeof SESSION_PRESETS)[number]['id']
