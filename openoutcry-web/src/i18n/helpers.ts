import { AGENTS } from '../data/agents'
import type { TrainingRecord } from '../data/trainings'
import { translateKey, type AppTFunction } from './index'
import type {
  AgentId,
  Collaboration,
  EvidenceItem,
  Proposal,
  RunEvent,
  RunState,
  Trade,
  TrainingConversation,
  TrainingTask,
  TranslationKey,
} from '../types'

const ASSET_KEYS: Record<string, TranslationKey> = {
  '公司-017': 'common.assets.公司-017',
  '公司-042': 'common.assets.公司-042',
  '公司-008': 'common.assets.公司-008',
  '公司-026': 'common.assets.公司-026',
  '示例-电力A': 'common.assets.示例-电力A',
  '示例-制造B': 'common.assets.示例-制造B',
  '示例-红利ETF': 'common.assets.示例-红利ETF',
  '示例-消费C': 'common.assets.示例-消费C',
  标的: 'common.assets.标的',
}

export function formatAsset(asset: string, t: AppTFunction): string {
  const key = ASSET_KEYS[asset]
  return key ? translateKey(t, key) : asset
}

export function formatSide(side: '买入' | '卖出' | undefined, t: AppTFunction): string {
  return side === '买入' ? t('common.side.buy') : t('common.side.sell')
}

export function formatCollab(collab: Collaboration, t: AppTFunction): string {
  switch (collab) {
    case '人工确认':
      return t('status.collab.human')
    case '人机混合':
      return t('status.collab.hybrid')
    case '自主运行':
      return t('status.collab.auto')
  }
}

export function formatUniverse(universeId: string | undefined, fallback: string | undefined, t: AppTFunction): string {
  if (universeId === 'csi300') return t('mandate.universes.csi300.name')
  if (universeId === 'all_a' || universeId === 'all-a') return t('mandate.universes.all_a.name')
  if (universeId === 'watch6') return t('mandate.universes.watch6.name')
  if (fallback === '沪深 300 成分池') return t('mandate.universes.csi300.name')
  if (fallback?.startsWith('全市场 A 股池')) return t('mandate.universes.all_a.name')
  if (fallback?.startsWith('专项自选池')) return t('mandate.universes.watch6.name')
  return fallback ?? t('mandate.universes.csi300.name')
}

export function formatCadence(cadenceId: string | undefined, fallback: string | undefined, t: AppTFunction): string {
  if (cadenceId === 'daily-3phase' || cadenceId === 'daily-3stage') return t('mandate.sessions.daily-3phase.name')
  if (cadenceId === 'dual-window') return t('mandate.sessions.dual-window.name')
  if (fallback?.startsWith('日频三阶段')) return t('mandate.sessions.daily-3phase.name')
  if (fallback?.startsWith('早晚双窗口')) return t('mandate.sessions.dual-window.name')
  return fallback ?? t('mandate.sessions.daily-3phase.name')
}

export function formatSyncLabel(syncKey: TranslationKey | undefined, fallback: string | undefined, t: AppTFunction): string {
  if (syncKey) return translateKey(t, syncKey)
  if (!fallback || fallback === '手动维护') return t('live.syncManual')
  if (fallback === '手动维护 · 今日 14:15') return t('live.syncManualToday')
  if (fallback === '已录实盘成交 · 刚刚') return t('live.syncFilledJustNow')
  if (fallback === '手动维护 · 刚刚') return t('live.syncManualJustNow')
  return fallback
}

export function formatMarketSession(
  marketSessionKey: TranslationKey | undefined,
  fallback: string | undefined,
  t: AppTFunction,
): string {
  if (marketSessionKey) return translateKey(t, marketSessionKey)
  if (!fallback || fallback === 'A 股连续竞价 · 实时快照') return t('live.marketSessionActive')
  if (fallback === '实时快照' || fallback === 'A 股实时快照') return t('tabs.liveSnapshot')
  return fallback
}

export function formatClock(clockKey: TranslationKey | undefined, clock: string, t: AppTFunction): string {
  if (clockKey) return translateKey(t, clockKey)
  if (clock === '今日 14:20') return t('live.clockToday')
  return clock
}

export interface LocalizedAgent {
  id: AgentId
  name: string
  shortName: string
  source: string
  tag: string
  version: string
  qualification: string
  description: string
  model: string
  persona: string
  riskProfile: string
  holdingPeriod: string
  lastSession: string
  strategyTags: string[]
  tools: number
  initialCash: number
  maxPositions: number
  maxPositionPct: number
  builtin: boolean
  cardOrigin: 'builtin' | 'local'
  budgetUsed: number
  budgetTotal: number
}

export function formatAgent(id: AgentId, t: AppTFunction): LocalizedAgent {
  const base = AGENTS[id]
  const tagsRaw = translateKey(t, `agents.${id}.strategyTags` as TranslationKey)
  const strategyTags = tagsRaw ? tagsRaw.split('|').filter(Boolean) : []

  return {
    ...base,
    name: translateKey(t, `agents.${id}.name` as TranslationKey),
    shortName: translateKey(t, `agents.${id}.shortName` as TranslationKey),
    source: translateKey(t, `agents.${id}.source` as TranslationKey),
    version: translateKey(t, `agents.${id}.version` as TranslationKey),
    qualification: translateKey(t, `agents.${id}.qualification` as TranslationKey),
    description: translateKey(t, `agents.${id}.description` as TranslationKey),
    model: translateKey(t, `agents.${id}.model` as TranslationKey),
    persona: translateKey(t, `agents.${id}.persona` as TranslationKey),
    riskProfile: translateKey(t, `agents.${id}.riskProfile` as TranslationKey),
    holdingPeriod: translateKey(t, `agents.${id}.holdingPeriod` as TranslationKey),
    lastSession: translateKey(t, `agents.${id}.lastSession` as TranslationKey),
    strategyTags,
  }
}

export function formatAgentCardJson(id: AgentId, t: AppTFunction): string {
  const meta = formatAgent(id, t)
  return JSON.stringify(
    {
      id: meta.id,
      name: meta.name,
      model: meta.model,
      persona: meta.persona.length > 64 ? `${meta.persona.slice(0, 64)}…` : meta.persona,
      strategy_tags: meta.strategyTags,
      risk_profile: meta.riskProfile,
      holding_period: meta.holdingPeriod,
      allowed_tools: meta.tools,
      initial_cash: meta.initialCash,
      max_positions: meta.maxPositions,
      max_position_pct: meta.maxPositionPct,
    },
    null,
    2,
  )
}

export function formatEvidence(ev: EvidenceItem, t: AppTFunction): { title: string; summary: string } {
  return {
    title: ev.titleKey ? translateKey(t, ev.titleKey) : ev.title,
    summary: ev.summaryKey ? translateKey(t, ev.summaryKey) : ev.summary,
  }
}

export interface LocalizedEventView {
  title: string
  body: string
  meta: string
  at: string
  divider?: string
  speakerRole?: string
  interceptedNote?: string
}

export function formatEvent(ev: RunEvent, t: AppTFunction): LocalizedEventView {
  const params: Record<string, string | number | undefined> = { ...ev.i18nParams }
  if (ev.assetRef) params.asset = formatAsset(ev.assetRef, t)
  if (ev.sideRef) params.side = formatSide(ev.sideRef, t)
  if (ev.actorKey) params.actor = translateKey(t, ev.actorKey)
  if (ev.agentRef) params.agentName = formatAgent(ev.agentRef, t).name

  const speakerParams: Record<string, string | number | undefined> = ev.speakerAgentId
    ? { name: formatAgent(ev.speakerAgentId, t).shortName }
    : params

  const translate = (key: TranslationKey | undefined, fallback: string, p = params) =>
    key ? translateKey(t, key, p) : fallback

  return {
    title: translate(ev.titleKey, ev.title),
    body: translate(ev.bodyKey, ev.body),
    meta: translate(ev.metaKey, ev.meta),
    at: ev.atKey ? translateKey(t, ev.atKey) : ev.at === '刚刚' ? t('common.justNow') : ev.at,
    divider: ev.dividerKey ? translateKey(t, ev.dividerKey, params) : ev.divider,
    speakerRole: ev.speakerRoleKey ? translateKey(t, ev.speakerRoleKey, speakerParams) : ev.speakerRole,
    interceptedNote: ev.interceptedKey ? translateKey(t, ev.interceptedKey, params) : ev.interceptedNote,
  }
}

export interface LocalizedTradeView {
  name: string
  side: string
  time: string
  reason: string
  status: string
}

export function formatTrade(trade: Trade, t: AppTFunction): LocalizedTradeView {
  return {
    name: formatAsset(trade.name, t),
    side: formatSide(trade.side, t),
    time: trade.timeKey ? translateKey(t, trade.timeKey) : trade.time,
    reason: trade.reasonKey ? translateKey(t, trade.reasonKey) : trade.reason,
    status: trade.statusKey
      ? translateKey(t, trade.statusKey)
      : trade.status === '已记录'
        ? t('status.trade.recorded')
        : t('status.trade.filled'),
  }
}

export interface LocalizedProposalView {
  asset: string
  side: string
  reason?: string
  invalidation?: string
}

export function formatProposal(proposal: Proposal, t: AppTFunction): LocalizedProposalView {
  return {
    asset: formatAsset(proposal.asset ?? '公司-017', t),
    side: formatSide(proposal.side ?? '卖出', t),
    reason: proposal.reasonKey ? translateKey(t, proposal.reasonKey) : proposal.reason,
    invalidation: proposal.invalidationKey ? translateKey(t, proposal.invalidationKey) : proposal.invalidation,
  }
}

export function formatTrainingRecord(rec: TrainingRecord, t: AppTFunction): { title: string; universe: string } {
  if (rec.titleParams) {
    const universe = formatUniverse(rec.titleParams.universeId, rec.universe, t)
    const title =
      rec.titleParams.count > 1
        ? t('mandate.titleCommittee', {
            range: rec.titleParams.range,
            universe,
            count: rec.titleParams.count,
          })
        : t('mandate.titleSingle', {
            range: rec.titleParams.range,
            universe,
          })
    return { title, universe }
  }
  const knownIds = ['trn_0042', 'trn_0041', 'trn_0040', 'trn_0039'] as const
  if ((knownIds as readonly string[]).includes(rec.id)) {
    const k = rec.id as (typeof knownIds)[number]
    return {
      title: translateKey(t, `ledger.records.${k}.title` as TranslationKey),
      universe: translateKey(t, `ledger.records.${k}.universe` as TranslationKey),
    }
  }
  return {
    title: rec.title,
    universe: formatUniverse(rec.universeId, rec.universe, t),
  }
}

export interface LocalizedTaskView {
  name: string
  windowLabel: string
  assigneeName: string
  members?: string[]
  archiveNote?: string
  archiveLogs?: Array<{ kind: TrainingTask['archive'] extends infer A ? (A extends { log: Array<{ kind: infer K }> } ? K : never) : never; title: string; body: string; at: string }>
  archiveTrades?: string[]
}

const ARCHIVE_IDS = ['task-team', 'task-kimi', 'task-codex', 'live-weekly'] as const
type ArchiveId = (typeof ARCHIVE_IDS)[number]
const isArchiveId = (id: string): id is ArchiveId => (ARCHIVE_IDS as readonly string[]).includes(id)

export function formatTask(task: TrainingTask, t: AppTFunction): LocalizedTaskView {
  if (task.live) {
    if (task.kind === 'live') {
      const session = formatMarketSession(task.marketSessionKey, task.marketSession, t)
      const sync = formatSyncLabel(task.syncKey, task.syncLabel, t)
      return {
        name: t('training.tasks.liveMainName'),
        windowLabel: `${session} · ${sync}`,
        assigneeName: task.assignee.agentId ? formatAgent(task.assignee.agentId, t).name : task.assignee.name,
      }
    }
    const universe = formatUniverse(task.universeId, task.universeLabel, t)
    const no = task.mandateNo ?? '№ 0042'
    const members = task.assignee.memberIds?.map((id) => formatAgent(id, t).shortName)
    return {
      name: t('training.tasks.liveSimName', { no, universe }),
      windowLabel: `2024-04-01 → 04-26 · Day ${task.day ?? 17}/${task.totalDays ?? 20}`,
      assigneeName: members
        ? members.join(' + ')
        : task.assignee.agentId
          ? formatAgent(task.assignee.agentId, t).name
          : task.assignee.name,
      members,
    }
  }

  if (isArchiveId(task.id)) {
    const id = task.id
    const members = task.assignee.memberIds?.map((aid) => formatAgent(aid, t).name) ?? task.assignee.members
    const assigneeName =
      id === 'task-team'
        ? translateKey(t, 'training.archiveData.task-team__assigneeName')
        : task.assignee.agentId
          ? formatAgent(task.assignee.agentId, t).name
          : task.assignee.name

    const archiveLogs = task.archive?.log.map((line, idx) => ({
      kind: line.kind,
      title: translateKey(t, `training.archiveData.${id}__log__${idx}__title` as TranslationKey),
      body: translateKey(t, `training.archiveData.${id}__log__${idx}__body` as TranslationKey),
      at: translateKey(t, `training.archiveData.${id}__log__${idx}__at` as TranslationKey),
    }))

    const archiveTrades = task.archive?.trades.map((_, idx) =>
      translateKey(t, `training.archiveData.${id}__trade__${idx}` as TranslationKey),
    )

    return {
      name: translateKey(t, `training.archiveData.${id}__name` as TranslationKey),
      windowLabel: translateKey(t, `training.archiveData.${id}__windowLabel` as TranslationKey),
      assigneeName,
      members,
      archiveNote: translateKey(t, `training.archiveData.${id}__note` as TranslationKey),
      archiveLogs,
      archiveTrades,
    }
  }

  return {
    name: task.name,
    windowLabel: task.windowLabel,
    assigneeName: task.assignee.name,
    members: task.assignee.members,
    archiveNote: task.archive?.note,
    archiveLogs: task.archive?.log,
    archiveTrades: task.archive?.trades,
  }
}

export function formatConversation(
  task: TrainingTask,
  conv: TrainingConversation,
  t: AppTFunction,
): { name: string; meta: string } {
  if (task.live) {
    if (conv.id === 'conv-main') {
      return {
        name: t('training.tasks.liveSimConvName', { no: task.mandateNo ?? '№ 0042' }),
        meta: t('training.tasks.liveSimConvMeta', {
          clock: formatClock(task.clockKey, task.clock ?? '', t),
          cadence: formatCadence(task.cadenceId, task.cadenceLabel, t),
        }),
      }
    }
    if (conv.id === 'live-conv-check') {
      return {
        name: t('training.tasks.liveConvCheckName'),
        meta: t('training.tasks.liveConvCheckMeta'),
      }
    }
    if (conv.id === 'live-conv-advise') {
      return {
        name: t('training.tasks.liveConvAdviseName'),
        meta: t('training.tasks.liveConvAdviseMeta'),
      }
    }
  }

  if (isArchiveId(task.id)) {
    return {
      name: translateKey(t, `training.archiveData.${task.id}__conv__${conv.id}__name` as TranslationKey),
      meta: translateKey(t, `training.archiveData.${task.id}__conv__${conv.id}__meta` as TranslationKey),
    }
  }

  return { name: conv.name, meta: conv.meta }
}

export function formatStateClock(state: RunState, t: AppTFunction): string {
  return formatClock(state.clockKey, state.clock, t)
}
