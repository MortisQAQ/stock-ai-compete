import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { agentOf } from '../data/agents'
import { useLocale } from '../store/LocaleProvider'
import { useRun } from '../store/RunProvider'
import { useTraining } from '../store/TrainingProvider'
import { Button } from '../components/ui/Button'
import { MandateTicket } from '../components/studio/MandateTicket'
import { TrainingLedger } from '../components/studio/TrainingLedger'
import { money, signedPct } from '../lib/format'

/**
 * Step 02 · 训练委托台（首屏压实布局）：
 * 压缩旧版半屏大 Hero 为紧凑状态带，确保下方 2×2「开具委托单」表单与提交按钮
 * 完整落在 1440×900 首屏内，直接开单后真传参进入 Step 03 历史训练场。
 */
export function StudioPage() {
  const { state, totals } = useRun('training')
  const { records } = useTraining()
  const { bi } = useLocale()
  const navigate = useNavigate()

  const netPct = state.initial ? (totals.net / state.initial) * 100 : 0
  const current = records.find((t) => t.status === 'running') ?? records[0]
  const teamNames = (state.team ?? [state.agent]).map((id) => agentOf(id).name.split(' · ')[0]).join(' + ')

  return (
    <>
      <div className="vlabel page-vlabel" aria-hidden="true">
        OPENOUTCRY / 02 TRAINING DESK / 2026
      </div>

      <div className="pagehead">
        <div>
          <span className="label">{bi('02 — 训练委托', '02 — Training Desk')}</span>
          <h1>{bi('开一张不可变委托单，锁死考场口径。', 'Issue an immutable mandate to lock the test rules.')}</h1>
          <p className="deck">
            {bi(
              '一次训练委托单 = 历史时段 × 标的池漏斗 × 单执行者团队 × 资金与日频三阶段规则。开具后口径冻结，方便同条件对照复测。',
              'One Training Mandate = Historical Window × Universe Funnel × Single-Executor Team × Rules & Cadence. Frozen on issue for fair A/B reruns.',
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--bg-1)] px-4 py-2.5">
          <div className="flex flex-col">
            <span className="font-mono text-micro text-[var(--fg-2)]">
              {bi('当前在跑', 'Active Run')} {state.mandateNo ?? current.no}
            </span>
            <span className="font-mono text-note font-semibold text-[var(--fg-0)]">
              {teamNames} · {money(totals.equity)}{' '}
              <em className={totals.net >= 0 ? 'not-italic text-[var(--up)]' : 'not-italic text-[var(--down)]'}>
                ({signedPct(netPct)})
              </em>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/training')}>
            {bi('进入当前训练', 'Open Arena')}
            <ArrowRight size={14} aria-hidden />
          </Button>
        </div>
      </div>

      <MandateTicket />
      <TrainingLedger />

      <div className="foot">
        <span>
          <b>openOutcry</b> — {bi('受控历史市场 / 确定性回放 / 人机协同审批', 'Controlled Historical Arena / Deterministic Replay / HITL Approval')}
        </span>
        <span>v2.0 · 2026-11</span>
      </div>
    </>
  )
}
