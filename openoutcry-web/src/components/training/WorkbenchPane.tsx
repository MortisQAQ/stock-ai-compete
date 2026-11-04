import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Button, buttonVariants } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { cn } from '../../lib/utils'
import { money, signed } from '../../lib/format'
import { StatBand } from '../run/StatBand'
import type { BandItem } from '../run/StatBand'
import { AccountLedger } from '../run/AccountLedger'
import { HoldingsList } from '../run/HoldingsList'
import { RunStatusCard } from '../run/RunStatusCard'
import { DetailTabs } from '../run/DetailTabs'
import { ProposalTicket } from '../proposal/ProposalTicket'
import { agentOf } from '../../data/agents'
import { STATUS_TEXT } from '../../store/trainingTasks'
import type { TaskArchive, TrainingTask } from '../../store/trainingTasks'

/** 训练场页头的两个动作（回放 / 更多），桌面放在中栏栏头，移动端放在任务视图里 */
export function WorkbenchActions({ className }: { className?: string }) {
  const { state, actions } = useRun()
  const { open } = useDialog()

  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      <Button variant="ghost" size="sm" onClick={() => open({ kind: 'replay' })}>
        回放轨迹
      </Button>
      <details className="more-menu group/more">
        <summary
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'list-none cursor-pointer',
            'group-open/more:border-ink group-open/more:bg-ink group-open/more:text-primary-foreground',
            '[-webkit-details-marker]:hidden [&::-webkit-details-marker]:hidden',
          )}
        >
          更多 ▾
        </summary>
        <div className="more-menu-list">
          <button type="button" onClick={() => open({ kind: 'snapshot' })}>
            运行快照
          </button>
          <button type="button" onClick={() => actions.togglePause()} disabled={state.status === 'aborted'}>
            {state.status === 'paused' ? '继续运行' : '暂停运行'}
          </button>
          <button type="button" onClick={() => open({ kind: 'abort' })} disabled={state.status === 'aborted'}>
            中止运行
          </button>
        </div>
      </details>
    </div>
  )
}

function liveBandItems(equity: number, net: number, cash: number, market: number, initial: number, holdings: number): BandItem[] {
  return [
    { label: '账户净值', value: money(equity), note: '初始资金 ' + money(initial) },
    { label: '累计净收益', value: signed(net), note: ((net / initial) * 100).toFixed(2) + '% · 已扣费用', tone: net >= 0 ? 'up' : 'dn' },
    { label: '可用现金', value: money(cash), note: '占总资产 ' + ((cash / equity) * 100).toFixed(1) + '%' },
    { label: '持仓市值', value: money(market), note: holdings + ' 个标的 · 当前估值' },
  ]
}

export interface BandSnapshot {
  equity: number
  net: number
  cash: number
  market: number
  initial: number
  holdings: number
}

/** 当前任务取实时快照，非当前任务取冻结档案 */
export function bandItemsFor(task: TrainingTask, snap: BandSnapshot): BandItem[] {
  return task.live
    ? liveBandItems(snap.equity, snap.net, snap.cash, snap.market, snap.initial, snap.holdings)
    : archiveBandItems(task.archive as TaskArchive)
}

function archiveBandItems(archive: TaskArchive): BandItem[] {
  return [
    { label: '账户净值', value: money(archive.equity), note: '任务结束时冻结' },
    {
      label: '累计净收益',
      value: signed(archive.net),
      note: '已扣费用 · 含全部平仓',
      tone: archive.net >= 0 ? 'up' : 'dn',
    },
    { label: '可用现金', value: money(archive.cash), note: '结束时快照' },
    { label: '持仓市值', value: money(archive.market), note: archive.market === 0 ? '已全部平仓' : '结束时快照' },
  ]
}

function ArchiveBody({ task }: { task: TrainingTask }) {
  const { notify } = useRun()
  const { open } = useDialog()
  const archive = task.archive
  if (!archive) return null

  return (
    <div className="flex flex-col gap-3.5">
      <Card variant="dashed">
        <CardHeader>
          <span>任务档案</span>
          <Badge variant="outline">只读 · 原型数据</Badge>
        </CardHeader>
        <CardContent>
          <div className="kv">
            <span>委托对象</span>
            <span className="dots" />
            <b>{task.assignee.kind === 'team' ? 'Agent 团队' : '单个 Agent'}</b>
          </div>
          <div className="kv">
            <span>时间窗</span>
            <span className="dots" />
            <b>{task.windowLabel}</b>
          </div>
          <div className="kv">
            <span>决策 / 成交</span>
            <span className="dots" />
            <b>
              {task.decisions} 条 / {task.fills} 笔
            </b>
          </div>
          {task.assignee.members ? (
            <p className="mt-2 text-[length:var(--fs-sm)] leading-relaxed text-[var(--ink-2)]">
              成员：{task.assignee.members.join('、')}
            </p>
          ) : null}
          <p className="note">{archive.note}</p>
          <div className="proposal-actions">
            <Button variant="ghost" size="sm" onClick={() => open({ kind: 'replay' })}>
              回放该任务
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => notify('原型数据：任务档案导出尚未接入', 'info')}
            >
              导出档案
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <span>关键决策</span>
          <Badge variant="outline">{archive.log.length} 条节选</Badge>
        </CardHeader>
        <CardContent>
          {archive.log.map((line) => (
            <div className="border-b border-[var(--rule-soft)] py-2.5 last:border-b-0" key={line.at + line.title}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{line.kind.toUpperCase()}</Badge>
                <span className="font-mono text-[length:var(--fs-micro)] text-[var(--ink-3)]">{line.at}</span>
              </div>
              <p className="mt-1 text-[length:var(--fs-body)] font-semibold leading-snug text-[var(--ink)]">{line.title}</p>
              <p className="mt-1 text-[length:var(--fs-sm)] leading-relaxed text-[var(--ink-2)]">{line.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <span>成交</span>
          <Badge variant="outline">{archive.trades.length} 笔</Badge>
        </CardHeader>
        <CardContent>
          {archive.trades.length === 0 ? (
            <p className="text-[length:var(--fs-sm)] text-[var(--ink-3)]">该任务没有成交记录。</p>
          ) : (
            archive.trades.map((t) => (
              <div className="report-row" key={t}>
                <span>{t}</span>
                <span className="dots" />
                <b>已成交</b>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** 中栏本体：审批卡 → 账户 / 持仓 → 明细页签 → 运行状态；非当前任务换成只读档案 */
export function WorkbenchBody({ task }: { task: TrainingTask }) {
  const { state } = useRun()

  if (!task.live) return <ArchiveBody task={task} />

  return (
    <div className="flex flex-col gap-3.5">
      {/* ProposalTicket 自带 mt-3.5，这里抵消掉，让审批卡贴住栏内顶部 */}
      <div className="-mt-3.5">
        <ProposalTicket />
      </div>
      <div className="grid gap-3.5 min-[1280px]:grid-cols-2">
        <AccountLedger />
        <HoldingsList />
      </div>
      <DetailTabs />
      <RunStatusCard />
      <p className="font-mono text-[length:var(--fs-micro)] leading-relaxed tracking-[0.04em] text-[var(--ink-3)]">
        {state.clock} · 审批只提交订单，成交由撮合时点决定 · 全部数据虚构
      </p>
    </div>
  )
}

/**
 * 中栏 = 当前训练任务的工作台。
 * 顶部是四格纸面结算表头（.band）+ 仪器脊（.band-tags），中段是唯一可滚动的主区域。
 */
export function WorkbenchPane({ task, className }: { task: TrainingTask; className?: string }) {
  const { state, totals } = useRun()
  const agent = agentOf(state.agent)
  const band = bandItemsFor(task, {
    equity: totals.equity,
    net: totals.net,
    cash: state.cash,
    market: totals.market,
    initial: state.initial,
    holdings: state.holdings.length,
  })

  return (
    <section aria-label="训练任务工作台" className={cn('flex min-h-0 min-w-0 flex-col bg-[var(--bone)]', className)}>
      <div className="flex items-center justify-between gap-3 px-5 pb-1.5 pt-2">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="label">工作台</span>
          <h2 className="truncate font-serif text-[length:var(--fs-sm)] font-bold tracking-[-0.01em] text-[var(--ink)]">
            {task.name}
          </h2>
          <span className="shrink-0 font-mono text-[length:var(--fs-micro)] tracking-[0.06em] text-[var(--ink-3)]">
            {STATUS_TEXT[task.status]}
          </span>
        </div>
        <WorkbenchActions />
      </div>

      <div className="[&_.band-cell]:px-4 [&_.band-cell]:py-2.5 min-[1100px]:[&_.band-cell_b]:text-[length:calc(var(--fs-kpi)*0.8)] max-[1280px]:[&_.band-in]:grid-cols-2">
        <StatBand
          items={band}
          tags={
            task.live ? (
              <>
                <span>
                  资料时点 <b>2024-04-22 23:59:58</b>
                </span>
                <span>
                  研究出口 <b>受控</b>
                </span>
                <span>
                  轨迹完整性 <s>100%</s>
                </span>
                <span>
                  评测资格 <b>{agent.qualification}</b>
                </span>
              </>
            ) : (
              <>
                <span>
                  任务 <b>{task.windowLabel}</b>
                </span>
                <span>
                  轨迹 <b>已归档</b>
                </span>
                <span>
                  委托对象 <b>{task.assignee.name}</b>
                </span>
              </>
            )
          }
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <WorkbenchBody task={task} />
      </div>
    </section>
  )
}
