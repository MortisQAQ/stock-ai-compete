import { useNavigate } from 'react-router-dom'

import { useRun } from '../store/RunProvider'
import { agentOf } from '../data/agents'
import { TRAINING_SEED } from '../data/trainings'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { MandateTicket } from '../components/studio/MandateTicket'
import { TrainingLedger } from '../components/studio/TrainingLedger'
import { money, signedPct } from '../lib/format'

/**
 * 新建训练 = 委托台。
 * 以「训练」为单位：一次训练委托一段时间、一篮子标的、一队 Agent。
 * Agent 退到团队字段里，不再是一个人一张卡片的主语。
 */
export function StudioPage() {
  const { state, totals } = useRun()
  const navigate = useNavigate()
  const netPct = (totals.net / state.initial) * 100

  const current = TRAINING_SEED.find((t) => t.status === 'running') ?? TRAINING_SEED[0]
  const pct = Math.round((current.day / current.days) * 100)

  return (
    <>
      <header className="hero hero-slim">
        <div className="hero-grid">
          <div>
            <span className="label">№ 01 — Training Desk</span>
            <h1>委托一次训练。</h1>
            <p className="deck">
              选一段时间、一篮子标的、一队 Agent。研究、成交与复盘都落在同一张委托单上，
              结束后按同一口径比较。
            </p>
          </div>

          <Card variant="instrument">
            <CardHeader>
              <span className="min-w-0 truncate">当前训练 {current.no}</span>
            </CardHeader>
            <CardContent className="py-3">
              <div className="run-line">
                <span>团队</span>
                <b>{current.team.map((id) => agentOf(id).name.split(' · ')[0]).join(' + ')}</b>
              </div>
              <div className="run-line">
                <span>模拟时钟</span>
                <b>{state.clock.slice(5)}</b>
              </div>
              <div className="run-line">
                <span>账户净值</span>
                <b className="acc">{money(totals.equity)}</b>
              </div>
              <div className="run-line">
                <span>累计净收益</span>
                <b className={totals.net >= 0 ? 'pos' : 'neg'}>{signedPct(netPct)}</b>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-mono text-micro tracking-[0.04em] text-[var(--slate-dim)]">进度</span>
                <b className="font-mono text-micro text-[var(--plate-ink)]">
                  {current.day} / {current.days} 交易日
                </b>
              </div>
              <div className="mt-1.5 h-[3px] w-full bg-[var(--plate-0)]">
                <div className="h-full bg-[var(--brass-hi)]" style={{ width: pct + '%' }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      <MandateTicket />
      <TrainingLedger />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rule)] pt-4">
        <p className="text-note leading-relaxed text-[var(--ink-2)]">
          Agent 在「连接 Agent」里维护；一条训练可指派 1–3 位，角色按委托顺序分配（交易 / 研究 / 风控）。
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/connect')}>
            维护 Agent
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/protocol')}>
            查看委托规则
          </Button>
        </div>
      </div>

      <div className="foot">
        <span>
          <b>openOutcry</b> — 受控历史市场 / 确定性回放 / 人机协同审批
        </span>
        <span>Prototype v3 · 2026-10</span>
      </div>
    </>
  )
}
