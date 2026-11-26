import { useNavigate } from 'react-router-dom'
import { Clock, Lock, RotateCcw, Shield, ShieldCheck, Users } from 'lucide-react'

import { agentOf } from '../../data/agents'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useRun, useWorkspaceKind } from '../../store/RunProvider'
import { bandItemsFor, TRAINING_STATUS_TEXT, TRAINING_STATUS_TEXT_EN } from '../../store/selectors'
import { useToast } from '../../store/ToastProvider'
import type { TrainingPhase, TrainingTask } from '../../types'
import { cn } from '../../lib/utils'
import { ProposalTicket } from '../proposal/ProposalTicket'
import { RunDrawer } from '../run/RunDrawer'
import { StatBand } from '../run/StatBand'
import { WorkbenchTabs } from '../run/WorkbenchTabs'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Stamp } from '../ui/Stamp'

const PHASE_STEPS: Array<{ id: TrainingPhase; time: string; zh: string; en: string }> = [
  { id: 'pre_market', time: '09:15', zh: '盘前研究', en: 'Pre-Market' },
  { id: 'open_match', time: '09:30', zh: '开盘撮合', en: 'Open Match' },
  { id: 'close_settle', time: '15:00', zh: '尾盘结算', en: 'Close Settle' },
]

/** 已结束任务 / 实盘周归档的只读视图 */
function ArchiveBody({ task }: { task: TrainingTask }) {
  const kind = useWorkspaceKind()
  const { open } = useDialog()
  const { notify } = useToast()
  const { bi } = useLocale()
  const archive = task.archive
  if (!archive) return null
  const isLiveArchive = task.kind === 'live'

  return (
    <div className="flex flex-col gap-[var(--sp-5)]">
      <Card variant="dashed">
        <CardHeader>
          <span>{isLiveArchive ? bi('实盘归档', 'Live Archive') : bi('任务档案', 'Run Archive')}</span>
          <Badge variant="outline">{bi('只读 · 原型数据', 'Read-only · Mock')}</Badge>
        </CardHeader>
        <CardContent>
          <div className="kv">
            <span>{isLiveArchive ? bi('辅助对象', 'Advisor') : bi('委托对象', 'Assignee')}</span>
            <span className="dots" />
            <b>{task.assignee.kind === 'team' ? bi('Agent 团队', 'Agent Team') : bi('单个 Agent', 'Single Agent')}</b>
          </div>
          <div className="kv">
            <span>{bi('时间窗', 'Window')}</span>
            <span className="dots" />
            <b>{task.windowLabel}</b>
          </div>
          <div className="kv">
            <span>{isLiveArchive ? bi('建议 / 已记录', 'Advisories / Recorded') : bi('决策 / 成交', 'Decisions / Fills')}</span>
            <span className="dots" />
            <b>
              {archive.decisions} / {archive.fills}
            </b>
          </div>
          {task.assignee.members ? (
            <p className="mt-3 text-note leading-relaxed text-[var(--ink-2)]">
              {bi('成员：', 'Members: ')}
              {task.assignee.members.join('、')}
            </p>
          ) : null}
          <p className="note">{archive.note}</p>
          <div className="proposal-actions">
            <Button variant="ghost" size="sm" onClick={() => open({ kind: 'replay', scope: kind })}>
              {isLiveArchive ? bi('回看建议记录', 'Replay Advisories') : bi('回放该任务', 'Replay Trace')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => notify(bi('原型数据：档案导出尚未接入', 'Prototype: archive export not connected'), 'info')}
            >
              {bi('导出档案', 'Export Archive')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <span>{bi('关键决策', 'Key Decisions')}</span>
          <Badge variant="outline">{archive.log.length}</Badge>
        </CardHeader>
        <CardContent>
          {archive.log.map((line) => (
            <div className="border-b border-[var(--line-soft)] py-3 last:border-b-0" key={line.at + line.title}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{line.kind.toUpperCase()}</Badge>
                <span className="font-mono text-micro text-[var(--ink-3)]">{line.at}</span>
              </div>
              <p className="mt-1.5 text-body font-semibold leading-snug text-[var(--ink)]">{line.title}</p>
              <p className="mt-1 text-note leading-relaxed text-[var(--ink-2)]">{line.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <span>{isLiveArchive ? bi('已记录实盘操作', 'Recorded Live Fills') : bi('成交', 'Fills')}</span>
          <Badge variant="outline">{archive.trades.length}</Badge>
        </CardHeader>
        <CardContent>
          {archive.trades.length === 0 ? (
            <p className="text-note text-[var(--ink-3)]">{bi('该周期没有成交记录。', 'No fills in this window.')}</p>
          ) : (
            archive.trades.map((t) => (
              <div className="report-row" key={t}>
                <span>{t}</span>
                <span className="dots" />
                <b>{isLiveArchive ? bi('已记录', 'Recorded') : bi('已成交', 'Filled')}</b>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function WorkbenchBody({ task }: { task: TrainingTask }) {
  const { state } = useRun()
  const { bi } = useLocale()
  if (!task.live) return <ArchiveBody task={task} />
  const isLive = state.kind === 'live'

  return (
    <div className="flex flex-col gap-[var(--sp-5)]">
      <ProposalTicket />
      <WorkbenchTabs />
      <p className="font-mono text-micro leading-relaxed tracking-[0.04em] text-[var(--ink-3)]">
        {isLive
          ? bi(
              '实战工作台仅提供研究与调仓建议，绝不连真实券商或代客下单 · 全部持仓与盈亏为虚构演示数据',
              'Live Workbench provides research & advisory only — never connected to real brokers · Demo data',
            )
          : bi(
              '审批只提交订单，成交由模拟时钟推进后的市场撮合决定 · 全部数据虚构',
              'Approval only submits intent; fills occur only after advancing the market clock · Demo data',
            )}
      </p>
    </div>
  )
}

/**
 * 工作台 = 头部 + 常驻「时间机器与合规仪器带 / 实盘绿色安全带」+ 四格资产带 + 可滚动正文。
 */
export function WorkbenchPane({ task, className }: { task: TrainingTask; className?: string }) {
  const { state, totals } = useRun()
  const { lang, isEn, bi } = useLocale()
  const navigate = useNavigate()
  const band = bandItemsFor(task, state, totals, lang)
  const isLive = state.kind === 'live'
  const statusMap = isEn ? TRAINING_STATUS_TEXT_EN : TRAINING_STATUS_TEXT
  const phase: TrainingPhase = state.phase ?? 'pre_market'
  const phaseIdx = PHASE_STEPS.findIndex((p) => p.id === phase)
  const team = state.team ?? [state.agent]

  return (
    <section
      aria-label={isLive ? bi('实战工作台', 'Live Workbench') : bi('历史训练场工作台', 'Historical Training Arena')}
      className={cn('bench-work', className)}
    >
      <header className="bench-hd">
        <div className="bench-hd-main">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0">{task.name}</h2>
            <Stamp size="sm" tone={isLive ? 'lime' : 'slate'}>
              {isLive ? bi('LIVE · 实盘辅助', 'LIVE · Advisory Only') : bi('SIM · 历史模拟', 'SIM · Historical')}
            </Stamp>
          </div>
          <p className="bench-hd-meta">
            {task.windowLabel} · {statusMap[task.status]}
          </p>
        </div>
        <RunDrawer />
      </header>

      {/* 常驻仪器带：训练场展示时间机器 + 三阶段灯 + 抗污染双盾牌；实战场展示绿色安全边界 */}
      {task.live ? (
        isLive ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-lime)] bg-[var(--lime-soft)] px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2 font-mono text-micro text-[var(--fg-0)]">
              <ShieldCheck size={15} aria-hidden className="text-[var(--lime)]" />
              <span className="font-semibold text-[var(--lime)]">
                {bi('实盘安全边界 · 仅给建议不代下单', 'Live Safety Boundary · Advisory Only, No Auto-Order')}
              </span>
              <span className="text-[var(--fg-1)]">
                · {bi('镜像账本：', 'Shadow Ledger: ')}
                {state.syncLabel ?? bi('手动维护', 'Manual')}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/studio')}>
              <RotateCcw size={14} aria-hidden />
              {bi('异常回炉历史训练', 'Replay in Arena')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 border-b border-[var(--line)] bg-[var(--bg-2)] px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* 模拟时钟与三阶段推进灯 */}
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-micro">
                <span className="inline-flex items-center gap-1.5 rounded bg-[var(--bg-1)] px-2 py-1 font-semibold text-[var(--fg-0)]">
                  <Clock size={14} aria-hidden className="text-[var(--lime)]" />
                  {state.clock}
                </span>
                {PHASE_STEPS.map((st, idx) => {
                  const active = idx === phaseIdx
                  const passed = idx < phaseIdx
                  return (
                    <span
                      key={st.id}
                      className={cn(
                        'inline-flex items-center gap-1 rounded px-2 py-1 transition-colors',
                        active
                          ? 'bg-[var(--lime-soft)] font-semibold text-[var(--lime)]'
                          : passed
                            ? 'bg-[var(--bg-1)] text-[var(--fg-1)]'
                            : 'text-[var(--fg-2)]',
                      )}
                    >
                      <span>{passed ? '✓' : active ? '●' : '○'}</span>
                      <span>
                        {st.time} {isEn ? st.en : st.zh}
                      </span>
                    </span>
                  )
                })}
              </div>

              {/* 抗污染双盾牌 */}
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-micro">
                <span className="inline-flex items-center gap-1 rounded bg-[var(--warn-soft)] px-2 py-1 text-[var(--warn)]">
                  <Lock size={13} aria-hidden />
                  {bi(`PIT 截止 ${state.pitCutoff ?? '04-22 23:59'}`, `PIT ≤ ${state.pitCutoff ?? '04-22 23:59'}`)}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-1)] px-2 py-1 text-[var(--fg-1)]">
                  <Shield size={13} aria-hidden className="text-[var(--lime)]" />
                  {state.blindMask !== false
                    ? bi('双盲匿名 · 公司-017', 'Blind Mask · Co-017')
                    : bi('明牌模式', 'Unmasked')}
                </span>
              </div>
            </div>

            {team.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line-soft)] pt-1.5 font-mono text-micro text-[var(--fg-1)]">
                <Users size={13} aria-hidden className="text-[var(--lime)]" />
                <span>{bi('单执行者团队：', 'Single-Executor Team: ')}</span>
                {team.map((id, idx) => (
                  <span key={id} className="rounded bg-[var(--bg-1)] px-2 py-0.5 text-[var(--fg-0)]">
                    {idx === 0
                      ? bi('主交易员', 'Lead')
                      : idx === 1
                        ? bi('研究员·只读', 'Research·RO')
                        : bi('风控·只读', 'Risk·RO')}{' '}
                    · {agentOf(id).name.split(' · ')[0]}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )
      ) : null}

      <div className="bench-band">
        <StatBand items={band} />
      </div>

      <div className="bench-body">
        <WorkbenchBody task={task} />
      </div>
    </section>
  )
}
