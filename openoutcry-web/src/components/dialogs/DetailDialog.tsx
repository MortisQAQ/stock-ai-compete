import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { money, signed } from '../../lib/format'
import { PROPOSAL_TEXT } from '../../store/derive'

export function DetailDialog({ open, id }: { open: boolean; id: string }) {
  const { state } = useRun()
  const { close } = useDialog()

  const isProposal = id === 'proposal'
  const trade = state.trades.find((t) => t.id === id)
  const title = isProposal ? '卖出提案 · 公司-017' : trade ? trade.side + ' ' + trade.name : '操作详情'

  return (
    <Modal
      open={open}
      kicker="Trace Detail"
      title={title}
      onClose={close}
      footer={<Button size="sm" variant="ghost" onClick={close}>关闭</Button>}
    >
      {isProposal ? (
        <>
          <dl className="snapshot-list">
            <div>
              <dt>原始 / 最终</dt>
              <dd>
                {state.proposal.original} / {state.proposal.quantity} 股
              </dd>
            </div>
            <div>
              <dt>限价</dt>
              <dd>{money(state.proposal.price)}</dd>
            </div>
            <div>
              <dt>当前状态</dt>
              <dd>{PROPOSAL_TEXT[state.proposal.status]}</dd>
            </div>
            <div>
              <dt>证据</dt>
              <dd>ev_018 / ev_024</dd>
            </div>
          </dl>
          <p style={{ fontSize: 'var(--fs-body)', lineHeight: 1.7, color: 'var(--ink-2)' }}>
            示例经营披露显示回款周期延长，Agent 因此提出减仓。平台只负责返回资料，不替 Agent 下投资结论。
          </p>
          <div className="note">
            T+1：原仓位已过结算日，可卖 600 股。后续开盘价只在点击「演示开盘撮合」后由环境揭示；满足规则也不保证真实市场能成交。
          </div>
          <details className="audit">
            <summary>结构化动作与校验</summary>
            <pre>
              {JSON.stringify(
                {
                  type: 'order',
                  side: 'sell',
                  asset: '公司-017',
                  original_quantity: state.proposal.original,
                  final_quantity: state.proposal.quantity,
                  limit: state.proposal.price,
                  evidence: ['ev_018', 'ev_024'],
                  status: state.proposal.status,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </>
      ) : trade ? (
        <>
          <dl className="snapshot-list">
            <div>
              <dt>操作</dt>
              <dd>
                {trade.side} {trade.name} × {trade.quantity}
              </dd>
            </div>
            <div>
              <dt>时点</dt>
              <dd>{trade.time}</dd>
            </div>
            <div>
              <dt>成交价 / 费用</dt>
              <dd>
                {money(trade.price)} / {money(trade.fee)}
              </dd>
            </div>
            <div>
              <dt>对应盈亏</dt>
              <dd>{trade.pnl === null ? '仅建立持仓，尚未实现收益' : signed(trade.pnl) + '（已扣费用）'}</dd>
            </div>
            <div>
              <dt>证据</dt>
              <dd>{trade.evidence}</dd>
            </div>
          </dl>
          <h3 style={{ font: '700 13px/1.4 var(--serif)', margin: '10px 0 4px' }}>当时的结构化理由</h3>
          <p style={{ fontSize: 'var(--fs-body)', lineHeight: 1.7, color: 'var(--ink-2)' }}>{trade.reason}</p>
          <div className="note">
            {trade.pnl === null
              ? '当前浮动盈亏请看持仓页，不能把浮盈计作这笔买入的已实现利润。'
              : '净实现盈亏 = 数量 ×（成交价 − 成本价）− 对应费用。'}{' '}
            本条为虚构历史样例。
          </div>
        </>
      ) : (
        <p className="dim">未找到对应的操作记录。</p>
      )}
    </Modal>
  )
}
