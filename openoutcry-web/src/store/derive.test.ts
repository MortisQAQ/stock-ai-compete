import { describe, expect, it } from 'vitest'

import { canDecide, proposalStampOf, proposalTextOf, runStatusLabel, totalsOf } from './derive'
import { accountBandItems } from './selectors'
import { createInitialRun } from '../data/run'
import { createInitialLiveRun } from '../data/live'
import type { RunState } from '../types'

const markSubmitted = (state: RunState): RunState => ({
  ...state,
  proposal: { ...state.proposal, status: 'submitted' },
})

describe('totalsOf', () => {
  it('净值 = 现金 + 持仓市值，净收益 = 净值 − 初始资金', () => {
    const state = createInitialRun('native')
    const totals = totalsOf(state)
    const market = state.holdings.reduce((sum, h) => sum + h.quantity * h.price, 0)
    expect(totals.market).toBeCloseTo(market)
    expect(totals.equity).toBeCloseTo(state.cash + market)
    expect(totals.net).toBeCloseTo(totals.equity - state.initial)
  })

  it('浮动盈亏只看持仓，不含已实现', () => {
    const state = createInitialRun('native')
    const expected = state.holdings.reduce((sum, h) => sum + h.quantity * (h.price - h.cost), 0)
    expect(totalsOf(state).floating).toBeCloseTo(expected)
  })

  it('实战工作台镜像账本同样适用总资产与浮盈口径', () => {
    const live = createInitialLiveRun('native')
    const totals = totalsOf(live)
    const market = live.holdings.reduce((sum, h) => sum + h.quantity * h.price, 0)
    const floating = live.holdings.reduce((sum, h) => sum + h.quantity * (h.price - h.cost), 0)
    expect(totals.market).toBeCloseTo(market)
    expect(totals.equity).toBeCloseTo(live.cash + market)
    expect(totals.net).toBeCloseTo(totals.equity - live.initial)
    expect(totals.floating).toBeCloseTo(floating)
  })
})

describe('runStatusLabel', () => {
  it('提案状态优先于运行中', () => {
    const state = createInitialRun('native')
    expect(runStatusLabel(state)).toBe('待确认')
    expect(runStatusLabel(markSubmitted(state))).toBe('待撮合')
  })

  it('中止与暂停压过提案状态', () => {
    const state = createInitialRun('native')
    expect(runStatusLabel({ ...state, status: 'paused' })).toBe('已暂停')
    expect(runStatusLabel({ ...state, status: 'aborted' })).toBe('已中止')
  })

  it('实战工作台映射为待决策 / 已记录 / 已忽略口径', () => {
    const live = createInitialLiveRun('native')
    expect(runStatusLabel(live)).toBe('待决策')
    expect(proposalStampOf(live)).toBe('待决策')
    expect(proposalTextOf(live)).toBe('等待决策 · 仅建议')
    expect(runStatusLabel({ ...live, proposal: { ...live.proposal, status: 'filled' } })).toBe('已记录')
    expect(runStatusLabel({ ...live, proposal: { ...live.proposal, status: 'rejected' } })).toBe('已忽略')
  })
})

describe('canDecide', () => {
  it('只有「审批模式 + 运行中 + 待确认」允许人工介入', () => {
    const state = createInitialRun('native')
    expect(canDecide(state)).toBe(true)
    expect(canDecide(markSubmitted(state))).toBe(false)
    expect(canDecide({ ...state, mode: 'goal' })).toBe(false)
    expect(canDecide({ ...state, status: 'paused' })).toBe(false)
  })
})

describe('v2 mandate & bilingual selectors', () => {
  it('多 Agent 委托单会写入单执行者团队口径并注入只读研究员备忘录', () => {
    const state = createInitialRun('native', {
      no: '№ 0043',
      team: ['native', 'kimi'],
      universeLabel: '全市场 A 股池（~4,800 只）',
      capital: 200000,
    })
    expect(state.mandateNo).toBe('№ 0043')
    expect(state.team).toEqual(['native', 'kimi'])
    expect(state.phase).toBe('pre_market')
    expect(state.initial).toBe(200000)
    expect(state.events.some((e) => e.meta.includes('committee.memo'))).toBe(true)
  })

  it('英文模式返回英文印章、提案状态与四格资产带文案', () => {
    const state = createInitialRun('native')
    expect(proposalStampOf(state, 'en')).toBe('Pending')
    expect(proposalTextOf(state, 'en')).toBe('Awaiting Approval')
    const band = accountBandItems(state, totalsOf(state), 'en')
    expect(band[0].label).toBe('Account Equity')
    expect(band[1].label).toBe('Net PnL')
  })

  it('实战工作台首条基线说明使用 system 类型而非冒充用户气泡', () => {
    const live = createInitialLiveRun('native')
    expect(live.events[0].kind).toBe('system')
  })
})
