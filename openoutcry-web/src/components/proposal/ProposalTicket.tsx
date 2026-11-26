import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, FastForward } from 'lucide-react'

import { money, round, signed } from '../../lib/format'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useRun, useWorkspaceKind } from '../../store/RunProvider'
import { approvalNote, canDecide, proposalStampOf, proposalTextOf } from '../../store/derive'
import { PitPriceStrip } from '../charts/PitPriceStrip'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Stamp } from '../ui/Stamp'

/**
 * 决策主卡：
 * - 历史训练场：Order Proposal + PIT 截断走势条 + A 股确定性规则预检 + 审批/推进至 09:30 开盘撮合/尾盘结算/前往复盘；
 * - 实战工作台：Advisory Proposal（去下单步进器，仅提供 按建议记账 / 按实际录入 / 暂不采纳）。
 */
export function ProposalTicket() {
  const kind = useWorkspaceKind()
  const { state, actions } = useRun()
  const { open } = useDialog()
  const { lang, bi } = useLocale()
  const navigate = useNavigate()
  const { proposal } = state
  const decidable = canDecide(state)
  const isLive = state.kind === 'live'
  const asset = proposal.asset ?? '公司-017'
  const side = proposal.side ?? '卖出'
  const matchedHolding = state.holdings.find((h) => h.name === asset)
  const costBasis = matchedHolding?.cost ?? proposal.price
  const sellableShares = matchedHolding?.sellable ?? 600
  const maxQty =
    side === '卖出'
      ? Math.max(100, sellableShares || matchedHolding?.quantity || proposal.original || 600)
      : Math.max(1000, proposal.original * 3)

  const phase = state.phase ?? 'pre_market'

  const finishAndReview = () => {
    actions.completeGoalRun()
    navigate('/review')
  }

  return (
    <Card>
      <CardHeader className="items-start">
        <div className="min-w-0">
          <div className="label">
            {isLive ? bi('Advisory Proposal · 调仓建议单', 'Advisory Proposal · Non-Executing') : bi('Order Proposal · 订单提案', 'Order Proposal')}
          </div>
          <h3 className="mt-1.5 font-sans text-row font-semibold leading-snug tracking-[-0.02em] text-ink">
            {side} {asset} · {proposal.quantity} {bi('股', 'shs')}
          </h3>
        </div>
        <Stamp
          tone={
            proposal.status === 'filled'
              ? 'pine'
              : proposal.status === 'rejected'
                ? 'slate'
                : 'ver'
          }
        >
          {proposalStampOf(state, lang)}
        </Stamp>
      </CardHeader>

      <CardContent className="py-3">
        {/* 历史训练场专属：PIT 截断走势条（撮合时实时解锁 04-23 开盘价） */}
        {!isLive ? (
          <PitPriceStrip
            asset={asset}
            costBasis={costBasis}
            limitPrice={proposal.price}
            phase={phase}
            filled={proposal.status === 'filled'}
          />
        ) : null}

        <dl className="proposal-facts">
          <div>
            <dt>{isLive ? bi('参考区间', 'Ref Band') : bi('限价', 'Limit Price')}</dt>
            <dd>{isLive ? (proposal.priceBand ?? money(proposal.price)) : money(proposal.price)}</dd>
          </div>
          <div>
            <dt>{isLive ? bi('AI 建议股数', 'AI Suggested') : bi('原始提案', 'Proposed')}</dt>
            <dd>
              {proposal.original} {bi('股', 'shs')}
            </dd>
          </div>
          <div>
            <dt>{bi('状态', 'Status')}</dt>
            <dd className="font-mono text-note tracking-normal">{proposalTextOf(state, lang)}</dd>
          </div>
        </dl>

        {/* 历史训练场专属：确定性 A 股规则预检条 */}
        {!isLive ? (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--line-soft)] bg-[var(--bg-2)] px-3 py-2 font-mono text-micro text-[var(--lime)]">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 size={13} aria-hidden />
              {bi('100 股整手', '100-lot OK')}
            </span>
            <span className="text-[var(--fg-2)]">·</span>
            <span>{bi(`✓ T+1 可卖 ${sellableShares} 股`, `✓ T+1 Sellable ${sellableShares}`)}</span>
            <span className="text-[var(--fg-2)]">·</span>
            <span>{bi('✓ ±10% 涨跌停内', '✓ Within ±10% Limit')}</span>
            <span className="text-[var(--fg-2)]">·</span>
            <span className="text-[var(--fg-1)]">{bi('预计费 ¥7.00', 'Est. Fee ¥7.00')}</span>
          </div>
        ) : null}

        <p className="proposal-note">
          {isLive ? (
            <>
              {proposal.reason ?? bi('结合当前持仓集中度与实时波动给出调仓建议。', 'Rebalance advisory based on live volatility and concentration.')}
              {proposal.invalidation ? ` ${bi('失效条件：', 'Invalidation: ')}${proposal.invalidation}。` : ''}
            </>
          ) : (
            <>
              {proposal.quantity} {bi('股 · 限价', 'shs · Limit')} {money(proposal.price)} ·{' '}
              {bi('参考估值下毛收益约', 'Est. gross PnL')}{' '}
              {signed(round(proposal.quantity * (proposal.price - costBasis)))}，
              {bi('实际结果取决于后续撮合与费用。', 'actual outcome depends on market fill & fees.')}
            </>
          )}
        </p>

        <div className="proposal-actions">
          {decidable ? (
            isLive ? (
              <>
                <Button
                  variant="ver"
                  size="sm"
                  onClick={() => actions.recordLiveFill(proposal.quantity, proposal.price, '按建议执行')}
                >
                  {bi('按建议记账', 'Log as Suggested')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => open({ kind: 'modify', scope: kind })}>
                  {bi('按实际录入', 'Log Actual Fill')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => actions.reject()}>
                  {bi('暂不采纳', 'Ignore')}
                </Button>
              </>
            ) : (
              <ApprovalControls
                key={`${state.kind}:${proposal.status}:${proposal.quantity}`}
                initial={proposal.quantity}
                maxQty={maxQty}
                side={side}
                onApprove={(qty) =>
                  actions.approve(qty, qty === proposal.original ? '人工确认' : '人工修改后批准')
                }
                onModify={() => open({ kind: 'modify', scope: kind })}
                onReject={() => actions.reject()}
              />
            )
          ) : null}

          {!isLive && proposal.status === 'submitted' ? (
            <Button variant="solid" size="sm" onClick={() => actions.match()}>
              {bi('推进至 09:30 开盘撮合', 'Advance to 09:30 Open Match')}
              <ArrowRight size={14} aria-hidden />
            </Button>
          ) : null}

          {!isLive && proposal.status === 'filled' && phase === 'open_match' ? (
            <>
              <Button variant="outline" size="sm" onClick={() => actions.advanceClose()}>
                {bi('推进至 15:00 尾盘结算', 'Advance to 15:00 Close Settle')}
              </Button>
              <Button variant="solid" size="sm" onClick={finishAndReview}>
                <FastForward size={14} aria-hidden />
                {bi('/goal 跑完剩余交易日 → 复盘', '/goal Finish Run → Review')}
              </Button>
            </>
          ) : null}

          {!isLive && proposal.status === 'filled' && phase === 'close_settle' ? (
            <Button variant="solid" size="sm" onClick={() => navigate('/review')}>
              {bi('前往复盘与对照 →', 'Go to Review & Compare →')}
            </Button>
          ) : null}

          <Button variant="ghost" size="sm" onClick={() => open({ kind: 'detail', id: 'proposal', scope: kind })}>
            {bi('凭证', 'Trace')}
          </Button>
        </div>

        <p className="proposal-note">{approvalNote(state, lang)}</p>
      </CardContent>
    </Card>
  )
}

interface ApprovalControlsProps {
  initial: number
  maxQty: number
  side: '买入' | '卖出'
  onApprove: (quantity: number) => void
  onModify: () => void
  onReject: () => void
}

/** 训练场审批控件（含 100 股 A 股整手步进器） */
function ApprovalControls({ initial, maxQty, side, onApprove, onModify, onReject }: ApprovalControlsProps) {
  const { bi } = useLocale()
  const [qty, setQty] = useState(initial)
  const step = (delta: number) => {
    const next = Math.min(maxQty, Math.max(100, qty + delta))
    setQty(next - (next % 100))
  }

  return (
    <>
      <div className="stepper" role="group" aria-label={bi(`调整${side}数量`, 'Adjust order quantity')}>
        <button type="button" onClick={() => step(-100)} aria-label={bi('减少 100 股', 'Decrease 100 shares')}>
          −
        </button>
        <span>
          {qty} {bi('股', 'shs')}
        </span>
        <button type="button" onClick={() => step(100)} aria-label={bi('增加 100 股', 'Increase 100 shares')}>
          +
        </button>
      </div>

      <Button variant="ver" size="sm" onClick={() => onApprove(qty)}>
        {bi('批准', 'Approve')}
      </Button>

      <Button variant="ghost" size="sm" onClick={onModify}>
        {bi('精确改单', 'Modify')}
      </Button>

      <Button variant="ghost" size="sm" onClick={onReject}>
        {bi('拒绝', 'Reject')}
      </Button>
    </>
  )
}
