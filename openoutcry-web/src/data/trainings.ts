import type { AgentId } from '../types'

/**
 * 原型数据：训练（training）是委托单位，而不是 Agent。
 * 一次训练 = 时间段 × 标的池 × Agent 团队 × 规则。
 * 后端接入前，这里只服务新建训练页的设计稿演示。
 */

export type TrainingStatus = 'running' | 'pending' | 'done'

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

export const STATUS_TEXT: Record<TrainingStatus, string> = {
  running: '进行中',
  pending: '待确认',
  done: '已结束',
}

export const TRAINING_SEED: TrainingRecord[] = [
  {
    id: 'trn_0042',
    no: '№ 0042',
    title: '四月盘前 · 大盘前 20',
    team: ['native'],
    from: '2024-04-23',
    to: '2024-05-21',
    day: 3,
    days: 20,
    universe: '沪深 300 前 20',
    status: 'running',
  },
  {
    id: 'trn_0041',
    no: '№ 0041',
    title: '自选六只 · 双 Agent 对照',
    team: ['native', 'kimi'],
    from: '2024-04-16',
    to: '2024-05-14',
    day: 2,
    days: 20,
    universe: '自选 6 只 · 含 1 只 ST',
    status: 'pending',
  },
  {
    id: 'trn_0040',
    no: '№ 0040',
    title: '三月整月 · 大盘前 20',
    team: ['codex'],
    from: '2024-03-01',
    to: '2024-03-29',
    day: 20,
    days: 20,
    universe: '沪深 300 前 20',
    status: 'done',
    result: '+2.10%',
  },
  {
    id: 'trn_0039',
    no: '№ 0039',
    title: '二月单标的 · 白酒龙头',
    team: ['native'],
    from: '2024-02-01',
    to: '2024-02-29',
    day: 20,
    days: 20,
    universe: '单只 · 白酒龙头',
    status: 'done',
    result: '-0.78%',
  },
]

/** 标的池预设：原型里就是三档，接后端后换成真实快照清单 */
export const UNIVERSE_PRESETS = [
  { id: 'csi20', name: '沪深 300 前 20', code: 'csi300.top20', note: '受控快照 · 剔除 ST 与停牌' },
  { id: 'watch6', name: '自选 6 只', code: 'watchlist.6', note: '个人自选 · 含 1 只 ST' },
  { id: 'single', name: '单只标的', code: 'single', note: '只跑一只，便于对照' },
] as const

export type UniverseId = (typeof UNIVERSE_PRESETS)[number]['id']

/** 交易时段预设 */
export const SESSION_PRESETS = [
  { id: 'pre-close', name: '盘前至收盘', note: '09:15 研究 · 09:30 起撮合' },
  { id: 'open-half', name: '仅开盘半小时', note: '09:30–10:00 快照' },
  { id: 'manual', name: '指定时段', note: '自填起止时刻' },
] as const

export type SessionId = (typeof SESSION_PRESETS)[number]['id']
