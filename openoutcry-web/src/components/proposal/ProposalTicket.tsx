import { useState } from 'react'

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

  // 审批卡是这一页唯一需要人动手的东西，所以给它一档更亮的底色。
  return (
    <Card>
      <CardHeader className="items-start">
        <div className="min-w-0">
          <div className="label">Order Proposal</div>
          <h3 className="mt-1.5 font-sans text-note font-semibold leading-snug tracking-[-0.02em] text-ink">
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
            <ApprovalControls
              /* 提案变化时按新数量重挂载，草稿数量自然归位（不用 effect 里 setState） */
              key={`${proposal.status}:${proposal.quantity}`}
              initial={proposal.quantity}
              onApprove={(qty) =>
                actions.approve(qty, qty === proposal.original ? '人工确认' : '人工修改后批准')
              }
              onModify={() => open({ kind: 'modify' })}
              onReject={() => actions.reject()}
            />
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
interface ApprovalControlsProps {
  initial: number
  onApprove: (quantity: number) => void
  onModify: () => void
  onReject: () => void
}

/** 审批控件自带草稿数量：挂载时取提案数量，提案变化时由 key 触发重挂载 */
function ApprovalControls({ initial, onApprove, onModify, onReject }: ApprovalControlsProps) {
  const [qty, setQty] = useState(initial)
  const maxQty = 600
  const step = (delta: number) => {
    const next = Math.min(maxQty, Math.max(100, qty + delta))
    setQty(next - (next % 100))
  }

  return (
    <>
      <div className="stepper" role="group" aria-label="调整卖出数量">
        <button type="button" onClick={() => step(-100)} aria-label="减少 100 股">
          −
        </button>
        <span>{qty} 股</span>
        <button type="button" onClick={() => step(100)} aria-label="增加 100 股">
          +
        </button>
      </div>

      <Button variant="ver" size="sm" onClick={() => onApprove(qty)}>
        批准
      </Button>

      <Button variant="ghost" size="sm" onClick={onModify}>
        精确改单
      </Button>

      <Button variant="ghost" size="sm" onClick={onReject}>
        拒绝
      </Button>
    </>
  )
}
