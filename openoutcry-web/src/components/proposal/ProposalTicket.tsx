import { useEffect, useState } from 'react'

import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Stamp } from '../ui/Stamp'
import { money, signed, round } from '../../lib/format'
import { PROPOSAL_STAMP, PROPOSAL_TEXT, approvalNote, canDecide } from '../../store/derive'

export function ProposalTicket() {
  const { state, actions } = useRun()
  const { open } = useDialog()
  const { proposal } = state
  const decidable = canDecide(state)
  const [qty, setQty] = useState(proposal.quantity)

  // 提案状态变化后重置草稿数量
  useEffect(() => {
    setQty(proposal.quantity)
  }, [proposal.status, proposal.quantity])

  const maxQty = 600
  const step = (delta: number) => {
    const next = Math.min(maxQty, Math.max(100, qty + delta))
    setQty(next - (next % 100))
  }

  return (
    <Card className="perf relative mt-3.5 border-ink shadow-plate">
      <CardHeader className="items-start border-dashed px-4 py-3">
        <div className="min-w-0">
          <div className="label">Order Proposal</div>
          <h3 className="mt-1.5 font-serif text-note font-bold leading-snug tracking-[-0.01em] text-ink">
            卖出 公司-017 · {proposal.quantity} 股
          </h3>
        </div>
        <Stamp tone={proposal.status === 'filled' ? 'pine' : 'ver'}>{PROPOSAL_STAMP[proposal.status]}</Stamp>
      </CardHeader>

      <CardContent className="py-3">
        <dl className="proposal-facts">
          <div>
            <dt>限价</dt>
            <dd>{money(proposal.price)}</dd>
          </div>
          <div>
            <dt>原始提案</dt>
            <dd>{proposal.original} 股</dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd className="font-mono text-note tracking-normal">{PROPOSAL_TEXT[proposal.status]}</dd>
          </div>
        </dl>

        <p className="proposal-note">
          {proposal.quantity} 股 · 限价 {money(proposal.price)} · 参考估值下毛收益约{' '}
          {signed(round(proposal.quantity * (proposal.price - 18.2)))}，实际结果取决于后续撮合与费用。
        </p>

        <div className="proposal-actions">
          {decidable ? (
            <div className="stepper" role="group" aria-label="调整卖出数量">
              <button type="button" onClick={() => step(-100)} aria-label="减少 100 股">
                −
              </button>
              <span>{qty} 股</span>
              <button type="button" onClick={() => step(100)} aria-label="增加 100 股">
                +
              </button>
            </div>
          ) : null}

          {decidable ? (
            <Button
              variant="ver"
              size="sm"
              onClick={() => actions.approve(qty, qty === proposal.original ? '人工确认' : '人工修改后批准')}
            >
              批准
            </Button>
          ) : null}

          {decidable ? (
            <Button variant="ghost" size="sm" onClick={() => open({ kind: 'modify' })}>
              精确改单
            </Button>
          ) : null}

          {decidable ? (
            <Button variant="ghost" size="sm" onClick={() => actions.reject()}>
              拒绝
            </Button>
          ) : null}

          {proposal.status === 'submitted' ? (
            <Button variant="solid" size="sm" onClick={() => actions.match()}>
              演示开盘撮合
            </Button>
          ) : null}

          <Button variant="ghost" size="sm" onClick={() => open({ kind: 'detail', id: 'proposal' })}>
            凭证
          </Button>
        </div>

        <p className="proposal-note">{approvalNote(state)}</p>
      </CardContent>
    </Card>
  )
}
