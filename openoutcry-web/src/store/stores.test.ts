import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createInitialRun } from '../data/run'
import { createInitialLiveRun } from '../data/live'
import { TRAINING_SEED } from '../data/trainings'
import { useDialogStore } from './DialogProvider'
import { useLocaleStore } from './LocaleProvider'
import { WorkbenchScopeProvider, useRunStore } from './RunProvider'
import { useToastStore } from './ToastProvider'
import { useActiveWorkbenchTask, useTraining, useTrainingStore } from './TrainingProvider'
import { LIVE_TASK_ID, LIVE_WORKSPACE_ID } from './trainingTasks'

function resetAllStores() {
  for (const toast of useToastStore.getState().toasts) {
    useToastStore.getState().dismiss(toast.id)
  }
  useDialogStore.setState({ dialog: { kind: 'none' } })
  useLocaleStore.setState({ lang: 'zh', theme: 'dark', marketColors: 'cn' })
  useRunStore.setState({
    training: createInitialRun('native'),
    live: createInitialLiveRun('native'),
  })
  useTrainingStore.setState({
    records: TRAINING_SEED,
    draftAgent: 'native',
    taskId: LIVE_TASK_ID,
    convId: '',
    liveTaskId: LIVE_WORKSPACE_ID,
    liveConvId: '',
  })
}

describe('Zustand global stores', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetAllStores()
  })

  afterEach(() => {
    resetAllStores()
    vi.useRealTimers()
  })

  describe('useRunStore', () => {
    it('supports approve -> undoApprove -> approve -> match -> advanceClose lifecycle', () => {
      const store = useRunStore.getState()
      const initialCash = store.training.cash
      const initialHolding = store.training.holdings.find((h) => h.name === '公司-017')
      expect(initialHolding).toBeDefined()
      const initialQty = initialHolding!.quantity

      // 1. Approve (modified quantity)
      const modifiedQty = store.training.proposal.original + 100
      store.approve(modifiedQty, '人工修改后批准')
      let training = useRunStore.getState().training
      expect(training.proposal.status).toBe('submitted')
      expect(training.proposal.quantity).toBe(modifiedQty)
      expect(training.collaboration).toBe('人机混合')
      expect(training.cash).toBe(initialCash)
      expect(useToastStore.getState().toasts.at(-1)?.actionLabel).toBe('撤销')

      // 2. Undo approve
      store.undoApprove()
      training = useRunStore.getState().training
      expect(training.proposal.status).toBe('pending')
      expect(training.proposal.quantity).toBe(training.proposal.original)
      expect(training.events.some((e) => e.meta.startsWith('order.submitted'))).toBe(false)

      // 3. Re-approve and match at 09:30 open
      store.approve(training.proposal.original, '人工确认')
      store.match()
      training = useRunStore.getState().training
      expect(training.proposal.status).toBe('filled')
      expect(training.phase).toBe('open_match')
      expect(training.cash).toBeGreaterThan(initialCash)
      const afterFillHolding = training.holdings.find((h) => h.name === '公司-017')
      expect(afterFillHolding?.quantity).toBe(initialQty - training.proposal.original)
      expect(training.trades.some((t) => t.id === 'sell17')).toBe(true)

      // 4. Advance to 15:00 close settle
      store.advanceClose()
      training = useRunStore.getState().training
      expect(training.phase).toBe('close_settle')
      expect(training.clock).toContain('15:00')
      const settledHolding = training.holdings.find((h) => h.name === '公司-017')
      expect(settledHolding?.price).toBe(20.18)
      expect(settledHolding?.sellable).toBe(settledHolding?.quantity)
    })

    it('keeps live mirror ledger isolated and blocks /goal mode on live workspace', () => {
      const store = useRunStore.getState()
      const trainingBefore = store.training

      store.deployAgentToLive('kimi')
      expect(useRunStore.getState().live.agent).toBe('kimi')
      expect(useRunStore.getState().training).toBe(trainingBefore)

      store.enterGoalMode('live')
      expect(useRunStore.getState().live.mode).toBe('approval')
      expect(useToastStore.getState().toasts.at(-1)?.text).toContain('禁用自动下单')

      store.setCash(88888, 'live')
      expect(useRunStore.getState().live.cash).toBe(88888)
      expect(useRunStore.getState().training.cash).toBe(trainingBefore.cash)
    })
  })

  describe('useTrainingStore', () => {
    it('issues mandate № 0043, archives prior running record, and syncs useRunStore', () => {
      const mandate = useTrainingStore.getState().issueMandate({
        title: '事件驱动 · 双研究员对照',
        team: ['native', 'kimi'],
        from: '2024-04-01',
        to: '2024-04-26',
        days: 20,
        universeId: 'all-a',
        universeLabel: '全市场 A 股池（~4,800 只）',
        cadenceId: 'daily-3stage',
        cadenceLabel: '日频三阶段',
        capital: 250000,
        mode: 'approval',
        blindMask: true,
      })

      expect(mandate.no).toBe('№ 0043')

      const trainingStore = useTrainingStore.getState()
      expect(trainingStore.records[0].no).toBe('№ 0043')
      expect(trainingStore.records[0].status).toBe('running')
      expect(trainingStore.records[1].status).toBe('done')
      expect(trainingStore.taskId).toBe(LIVE_TASK_ID)

      const runState = useRunStore.getState().training
      expect(runState.mandateNo).toBe('№ 0043')
      expect(runState.team).toEqual(['native', 'kimi'])
      expect(runState.initial).toBe(250000)
      expect(runState.events.some((e) => e.meta.includes('committee.memo'))).toBe(true)
    })

    it('updates selected task and resets conversation id cleanly', () => {
      useTrainingStore.getState().selectConversation(LIVE_TASK_ID, 'conv-main')
      expect(useTrainingStore.getState().convId).toBe('conv-main')

      useTrainingStore.getState().selectLiveTask(LIVE_WORKSPACE_ID)
      expect(useTrainingStore.getState().liveConvId).toBe('live-conv-check')
    })

    it('resolves scoped tasks via useActiveWorkbenchTask and useTraining selectors without cross-scope bleed', () => {
      function ActiveProbe() {
        const { task, conversation } = useActiveWorkbenchTask()
        return createElement('span', null, `${task.id}::${conversation.id}`)
      }

      function TrainingSummaryProbe() {
        const ctx = useTraining()
        return createElement(
          'span',
          null,
          `${ctx.nextMandateNo}|${ctx.current.id}|${ctx.liveCurrent.id}|${ctx.records.length}`,
        )
      }

      const renderScoped = (kind: 'training' | 'live') =>
        renderToStaticMarkup(
          createElement(WorkbenchScopeProvider, { kind } as never, createElement(ActiveProbe)),
        )

      const trainingHtml = renderScoped('training')
      const liveHtml = renderScoped('live')

      expect(trainingHtml).toContain(`${LIVE_TASK_ID}::`)
      expect(liveHtml).toContain(`${LIVE_WORKSPACE_ID}::`)

      // Updating live selection must not change training scope result
      useTrainingStore.getState().selectLiveConversation(LIVE_WORKSPACE_ID, 'live-conv-check')
      const trainingAfterLiveUpdate = renderScoped('training')
      expect(trainingAfterLiveUpdate).toBe(trainingHtml)

      const summaryHtml = renderToStaticMarkup(createElement(TrainingSummaryProbe))
      expect(summaryHtml).toContain(`№ 0043|${LIVE_TASK_ID}|${LIVE_WORKSPACE_ID}|${TRAINING_SEED.length}`)
    })
  })

  describe('useLocaleStore', () => {
    it('toggles lang (syncing marketColors), theme, and marketColors independently', () => {
      expect(useLocaleStore.getState().lang).toBe('zh')
      expect(useLocaleStore.getState().marketColors).toBe('cn')

      useLocaleStore.getState().toggleLang()
      expect(useLocaleStore.getState().lang).toBe('en')
      expect(useLocaleStore.getState().marketColors).toBe('intl')

      useLocaleStore.getState().toggleMarketColors()
      expect(useLocaleStore.getState().lang).toBe('en')
      expect(useLocaleStore.getState().marketColors).toBe('cn')

      useLocaleStore.getState().toggleTheme()
      expect(useLocaleStore.getState().theme).toBe('light')
    })
  })

  describe('useToastStore & useDialogStore', () => {
    it('caps visible toasts at 3 and auto-dismisses after duration', () => {
      const { notify } = useToastStore.getState()
      notify('t1', 'info', { durationMs: 1000 })
      notify('t2', 'info', { durationMs: 1000 })
      notify('t3', 'info', { durationMs: 1000 })
      notify('t4', 'success', { durationMs: 1000 })

      expect(useToastStore.getState().toasts.map((t) => t.text)).toEqual(['t2', 't3', 't4'])

      vi.advanceTimersByTime(1000)
      expect(useToastStore.getState().toasts).toHaveLength(0)
    })

    it('opens and closes dialogs cleanly', () => {
      useDialogStore.getState().open({ kind: 'snapshot', scope: 'live' })
      expect(useDialogStore.getState().dialog).toEqual({ kind: 'snapshot', scope: 'live' })

      useDialogStore.getState().close()
      expect(useDialogStore.getState().dialog).toEqual({ kind: 'none' })
    })
  })
})
