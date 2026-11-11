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
      {/* 竖排铭牌：只在 ≥1440 显示，给页面右上角一枚「设备编号」 */}
      <div className="vlabel page-vlabel" aria-hidden="true">
        OPENOUTCRY / TRAINING DESK / 2026
      </div>

      <header className="hero hero-slim frame">
        <div className="hero-grid">
          <div>
            <span className="label">№ 01 — Training Desk</span>
            <h1>委托一次训练。</h1>
            <p className="deck">
              选一段时间、一篮子标的、一队 Agent。研究、成交与复盘都落在同一张委托单上，
              结束后按同一口径比较。
            </p>
          </div>

          {/* 规则 5：这里只是 5 行数字，不是数据视窗 —— 回到纸面 */}
          <Card variant="default">
            <CardHeader>
              <span className="min-w-0 truncate">当前训练 {current.no}</span>
            </CardHeader>
            <CardContent className="py-5">
              <div className="run-grid">
                <div className="run-cell">
                  <span>团队</span>
                  <b>{current.team.map((id) => agentOf(id).name.split(' · ')[0]).join(' + ')}</b>
                </div>
                <div className="run-cell">
                  <span>模拟时钟</span>
                  <b>{state.clock.slice(5)}</b>
                </div>
                <div className="run-cell">
                  <span>账户净值</span>
                  <b className="acc">{money(totals.equity)}</b>
                </div>
                <div className="run-cell">
                  <span>累计净收益</span>
                  <b className={totals.net >= 0 ? 'pos' : 'neg'}>{signedPct(netPct)}</b>
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between border-t border-[var(--line-soft)] pt-3.5">
                <span className="cond text-micro text-[var(--fg-2)]">进度</span>
                <b className="font-mono text-micro text-[var(--fg-0)]">
                  {current.day} / {current.days} 交易日
                </b>
              </div>
              {/* 进度 = 系统在跑（结构色），不是可点的东西；轨道走圆角无框 */}
              <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-[var(--bg-3)]">
                <div className="h-full bg-[var(--lime)]" style={{ width: pct + '%' }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      <MandateTicket />
      <TrainingLedger />

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--rule)] pt-6">
        <p className="max-w-[68ch] text-note leading-relaxed text-[var(--fg-2)]">
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
