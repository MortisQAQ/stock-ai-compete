import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { cn } from '../../lib/utils'
import { StatBand } from '../run/StatBand'
import { bandItemsFor, TRAINING_STATUS_TEXT } from '../../store/selectors'
import { useToast } from '../../store/ToastProvider'
import type { TrainingTask } from '../../types'
import { WorkbenchTabs } from '../run/WorkbenchTabs'
import { RunDrawer } from '../run/RunDrawer'
import { ProposalTicket } from '../proposal/ProposalTicket'

/** 已结束任务的只读档案 */
function ArchiveBody({ task }: { task: TrainingTask }) {
  const { open } = useDialog()
  const { notify } = useToast()
  const archive = task.archive
  if (!archive) return null

  return (
    <div className="flex flex-col gap-[var(--sp-5)]">
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
            <p className="mt-3 text-[length:var(--fs-sm)] leading-relaxed text-[var(--ink-2)]">
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
            <div className="border-b border-[var(--line-soft)] py-3 last:border-b-0" key={line.at + line.title}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{line.kind.toUpperCase()}</Badge>
                <span className="font-mono text-[length:var(--fs-micro)] text-[var(--ink-3)]">{line.at}</span>
              </div>
              <p className="mt-1.5 text-[length:var(--fs-body)] font-semibold leading-snug text-[var(--ink)]">
                {line.title}
              </p>
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

/** 中栏本体：审批卡 + 一张带页签的台账卡；非当前任务换成只读档案 */
export function WorkbenchBody({ task }: { task: TrainingTask }) {
  if (!task.live) return <ArchiveBody task={task} />

  return (
    <div className="flex flex-col gap-[var(--sp-5)]">
      <ProposalTicket />
      <WorkbenchTabs />
      <p className="font-mono text-[length:var(--fs-micro)] leading-relaxed tracking-[0.04em] text-[var(--ink-3)]">
        审批只提交订单，成交由撮合时点决定 · 全部数据虚构
      </p>
    </div>
  )
}

/**
 * 工作台 = 任务头（名称 + 一个「运行」抽屉按钮）+ 四格表头 + 可滚动正文。
 *
 * 表头只留四个数字；原来挂在表头下面的那行「仪器脊」（资料时点 / 研究出口 /
 * 轨迹完整性 / 评测资格）已移进右侧抽屉 —— 它是偶尔核对的口径，不是常驻读数。
 */
export function WorkbenchPane({ task, className }: { task: TrainingTask; className?: string }) {
  const { state, totals } = useRun()
  const band = bandItemsFor(task, state, totals)

  return (
    <section aria-label="训练任务工作台" className={cn('bench-work', className)}>
      <header className="bench-hd">
        <div className="bench-hd-main">
          <h2>{task.name}</h2>
          <p className="bench-hd-meta">
            {task.windowLabel} · {TRAINING_STATUS_TEXT[task.status]}
          </p>
        </div>
        <RunDrawer />
      </header>

      <div className="bench-band">
        <StatBand items={band} />
      </div>

      <div className="bench-body">
        <WorkbenchBody task={task} />
      </div>
    </section>
  )
}
