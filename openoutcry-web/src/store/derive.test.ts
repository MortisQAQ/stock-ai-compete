import { describe, expect, it } from 'vitest'

import { canDecide, runStatusLabel, totalsOf } from './derive'
import { createInitialRun } from '../data/run'
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
