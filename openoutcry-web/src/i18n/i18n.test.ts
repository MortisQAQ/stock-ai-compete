import { afterEach, describe, expect, it } from 'vitest'

import { AGENT_ORDER } from '../data/agents'
import { createInitialLiveRun } from '../data/live'
import { createInitialRun } from '../data/run'
import { TRAINING_SEED } from '../data/trainings'
import { useLocaleStore } from '../store/LocaleProvider'
import { useRunStore } from '../store/RunProvider'
import { useToastStore } from '../store/ToastProvider'
import { liveTasksOf, trainingTasksOf } from '../store/trainingTasks'
import i18n, { fixedT } from './index'
import {
  formatAgent,
  formatAgentCardJson,
  formatAsset,
  formatCollab,
  formatConversation,
  formatEvent,
  formatEvidence,
  formatProposal,
  formatSide,
  formatTask,
  formatTrade,
  formatTrainingRecord,
} from './helpers'
import en from './locales/en.json'
import zh from './locales/zh.json'

const CJK_RE = /[\u4e00-\u9fff]/

function collectLeafPaths(node: unknown, prefix = ''): string[] {
  if (Array.isArray(node)) {
    return [prefix]
  }
  if (node !== null && typeof node === 'object') {
    const out: string[] = []
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${k}` : k
      out.push(...collectLeafPaths(v, next))
    }
    return out.sort()
  }
  return [prefix]
}

function collectLeafEntries(node: unknown, prefix = ''): Array<[string, unknown]> {
  if (Array.isArray(node)) {
    return [[prefix, node]]
  }
  if (node !== null && typeof node === 'object') {
    const out: Array<[string, unknown]> = []
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${k}` : k
      out.push(...collectLeafEntries(v, next))
    }
    return out
  }
  return [[prefix, node]]
}

describe('i18n catalogs & reactive localization', () => {
  afterEach(() => {
    useLocaleStore.getState().setLang('zh')
    for (const toast of useToastStore.getState().toasts) {
      useToastStore.getState().dismiss(toast.id)
    }
    useRunStore.setState({
      training: createInitialRun('native'),
      live: createInitialLiveRun('native'),
    })
  })

  it('maintains 100% deep key parity between zh.json and en.json', () => {
    const zhPaths = collectLeafPaths(zh)
    const enPaths = collectLeafPaths(en)

    const missingInEn = zhPaths.filter((k) => !enPaths.includes(k))
    const extraInEn = enPaths.filter((k) => !zhPaths.includes(k))

    expect(missingInEn).toEqual([])
    expect(extraInEn).toEqual([])
    expect(zhPaths.length).toBeGreaterThan(200)
  })

  it('contains zero stray Chinese characters in en.json values (except the language toggle label)', () => {
    const allowedKeys = new Set(['sidebar.switchLangLabel'])
    const offenders: Array<[string, string]> = []

    for (const [key, value] of collectLeafEntries(en)) {
      if (allowedKeys.has(key)) continue
      const text = Array.isArray(value) ? value.join(' | ') : String(value)
      if (CJK_RE.test(text)) {
        offenders.push([key, text])
      }
    }

    expect(offenders).toEqual([])
  })

  it('syncs i18next language reactively when useLocaleStore toggles ZH <-> EN', () => {
    useLocaleStore.getState().setLang('zh')
    expect(i18n.language).toBe('zh')
    expect(i18n.t('nav.connect.label')).toBe('Agent 库')

    useLocaleStore.getState().toggleLang()
    expect(useLocaleStore.getState().lang).toBe('en')
    expect(i18n.language).toBe('en')
    expect(i18n.t('nav.connect.label')).toBe('Agent Roster')

    useLocaleStore.getState().toggleLang()
    expect(useLocaleStore.getState().lang).toBe('zh')
    expect(i18n.language).toBe('zh')
  })

  it('renders agents, training/live events, evidence, trades, proposals, tasks, and records with zero Chinese leakage in EN mode', () => {
    useLocaleStore.getState().setLang('en')
    const t = fixedT('en')

    // 1. Agents & Agent Card JSON
    for (const id of AGENT_ORDER) {
      const a = formatAgent(id, t)
      const json = formatAgentCardJson(id, t)
      const fields = [
        a.name,
        a.shortName,
        a.source,
        a.version,
        a.qualification,
        a.description,
        a.model,
        a.persona,
        a.riskProfile,
        a.holdingPeriod,
        a.lastSession,
        ...a.strategyTags,
        json,
      ]
      for (const f of fields) {
        expect(f).not.toMatch(CJK_RE)
      }
    }

    // 2. Initial multi-agent training run + dynamic actions
    const multiRun = createInitialRun('native', {
      no: '№ 0043',
      team: ['native', 'kimi'],
      universeId: 'all_a',
      universeLabel: '全市场 A 股池（~4,800 只）',
    })
    useRunStore.setState({ training: multiRun })
    const store = useRunStore.getState()
    store.approve(200, '人工修改后批准')
    store.match()
    store.advanceClose()
    store.completeGoalRun()

    const simState = useRunStore.getState().training
    for (const ev of simState.events) {
      const view = formatEvent(ev, t)
      expect(view.title).not.toMatch(CJK_RE)
      expect(view.body).not.toMatch(CJK_RE)
      expect(view.meta).not.toMatch(CJK_RE)
      expect(view.at).not.toMatch(CJK_RE)
      if (view.divider) expect(view.divider).not.toMatch(CJK_RE)
      if (view.speakerRole) expect(view.speakerRole).not.toMatch(CJK_RE)
      if (view.interceptedNote) expect(view.interceptedNote).not.toMatch(CJK_RE)
      for (const item of ev.evidenceItems ?? []) {
        const evView = formatEvidence(item, t)
        expect(evView.title).not.toMatch(CJK_RE)
        expect(evView.summary).not.toMatch(CJK_RE)
      }
    }

    for (const tr of simState.trades) {
      const tv = formatTrade(tr, t)
      expect(tv.name).not.toMatch(CJK_RE)
      expect(tv.side).not.toMatch(CJK_RE)
      expect(tv.time).not.toMatch(CJK_RE)
      expect(tv.reason).not.toMatch(CJK_RE)
      expect(tv.status).not.toMatch(CJK_RE)
    }

    const simProposal = formatProposal(simState.proposal, t)
    expect(simProposal.asset).not.toMatch(CJK_RE)
    expect(simProposal.side).not.toMatch(CJK_RE)
    if (simProposal.reason) expect(simProposal.reason).not.toMatch(CJK_RE)

    // 3. Live run + dynamic live actions
    store.deployAgentToLive('kimi')
    store.recordLiveFill(200, 38.0, '按实际修改记录')
    store.setCash(80000, 'live')

    const liveState = useRunStore.getState().live
    for (const ev of liveState.events) {
      const view = formatEvent(ev, t)
      expect(view.title).not.toMatch(CJK_RE)
      expect(view.body).not.toMatch(CJK_RE)
      expect(view.meta).not.toMatch(CJK_RE)
      expect(view.at).not.toMatch(CJK_RE)
    }

    // 4. Tasks & archives & ledger records
    for (const task of [...trainingTasksOf(simState), ...liveTasksOf(liveState)]) {
      const view = formatTask(task, t)
      expect(view.name).not.toMatch(CJK_RE)
      expect(view.windowLabel).not.toMatch(CJK_RE)
      expect(view.assigneeName).not.toMatch(CJK_RE)
      if (view.archiveNote) expect(view.archiveNote).not.toMatch(CJK_RE)
      for (const log of view.archiveLogs ?? []) {
        expect(log.title).not.toMatch(CJK_RE)
        expect(log.body).not.toMatch(CJK_RE)
        expect(log.at).not.toMatch(CJK_RE)
      }
      for (const tr of view.archiveTrades ?? []) {
        expect(tr).not.toMatch(CJK_RE)
      }
      for (const conv of task.conversations) {
        const cv = formatConversation(task, conv, t)
        expect(cv.name).not.toMatch(CJK_RE)
        expect(cv.meta).not.toMatch(CJK_RE)
      }
    }

    for (const rec of TRAINING_SEED) {
      const rv = formatTrainingRecord(rec, t)
      expect(rv.title).not.toMatch(CJK_RE)
      expect(rv.universe).not.toMatch(CJK_RE)
    }

    // 5. Toasts emitted in EN mode
    for (const toast of useToastStore.getState().toasts) {
      expect(toast.text).not.toMatch(CJK_RE)
    }

    // 6. Core formatters
    expect(formatSide('买入', t)).toBe('Buy')
    expect(formatSide('卖出', t)).toBe('Sell')
    expect(formatAsset('公司-017', t)).toBe('Co-017')
    expect(formatAsset('示例-制造B', t)).toBe('Demo-Mfg B')
    expect(formatCollab('人机混合', t)).toBe('Human-AI Hybrid')
  })
})
