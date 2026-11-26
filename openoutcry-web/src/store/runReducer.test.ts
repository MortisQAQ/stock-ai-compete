import { describe, expect, it } from 'vitest'

import { createInitialLiveRun } from '../data/live'
import { createInitialRun } from '../data/run'
import { runReducer } from './runReducer'

describe('runReducer pure state transitions', () => {
  it('transitions training run through approve -> undoApprove -> approve -> fill -> advanceClose without mutating inputs', () => {
    const initial = createInitialRun('native')
    const initialEventsLen = initial.events.length
    const initialTradesLen = initial.trades.length

    const approved = runReducer(initial, {
      type: 'approve',
      quantity: initial.proposal.original + 100,
      actor: '人工修改后批准',
    })
    expect(initial.proposal.status).toBe('pending')
    expect(initial.events).toHaveLength(initialEventsLen)
    expect(approved.proposal.status).toBe('submitted')
    expect(approved.collaboration).toBe('人机混合')
    expect(approved.events).toHaveLength(initialEventsLen + 1)

    const undone = runReducer(approved, { type: 'undoApprove' })
    expect(undone.proposal.status).toBe('pending')
    expect(undone.proposal.quantity).toBe(initial.proposal.original)
    expect(undone.events).toHaveLength(initialEventsLen)

    const reApproved = runReducer(undone, {
      type: 'approve',
      quantity: initial.proposal.original,
      actor: '人工确认',
    })
    const filled = runReducer(reApproved, { type: 'fill' })
    expect(filled.proposal.status).toBe('filled')
    expect(filled.phase).toBe('open_match')
    expect(filled.trades).toHaveLength(initialTradesLen + 1)
    expect(filled.cash).toBeGreaterThan(initial.cash)

    const closed = runReducer(filled, { type: 'advanceClose' })
    expect(closed.phase).toBe('close_settle')
    expect(closed.clock).toContain('15:00')
    expect(closed.holdings.every((h) => h.sellable === h.quantity)).toBe(true)
  })

  it('switches training run into /goal autonomous mode and preserves immutability', () => {
    const initial = createInitialRun('native')
    const goal = runReducer(initial, { type: 'goalMode' })

    expect(initial.mode).toBe('approval')
    expect(goal.mode).toBe('goal')
    expect(goal.collaboration).toBe('自主运行')
  })

  it('handles live mirror ledger actions and ignores /goal mode in live workspace', () => {
    const initialLive = createInitialLiveRun('native')

    const ignoredGoal = runReducer(initialLive, { type: 'goalMode' })
    expect(ignoredGoal).toBe(initialLive)

    const filled = runReducer(initialLive, {
      type: 'recordLiveFill',
      quantity: initialLive.proposal.original,
      price: 38.4,
      actor: '按实际修改记录',
    })
    expect(filled.proposal.status).toBe('filled')
    expect(filled.proposal.executedPrice).toBe(38.4)
    expect(filled.trades).toHaveLength(initialLive.trades.length + 1)
    expect(initialLive.trades).toHaveLength(initialLive.trades.length)

    const added = runReducer(filled, {
      type: 'upsertHolding',
      holding: { name: '示例-新标的', quantity: 500, sellable: 500, cost: 12.5, price: 13.0 },
    })
    expect(added.holdings.some((h) => h.name === '示例-新标的')).toBe(true)

    const updatedCash = runReducer(added, { type: 'setCash', cash: 99999 })
    expect(updatedCash.cash).toBe(99999)

    const removed = runReducer(updatedCash, { type: 'removeHolding', name: '示例-新标的' })
    expect(removed.holdings.some((h) => h.name === '示例-新标的')).toBe(false)
  })
})
