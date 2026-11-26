import { money, signed } from '../../lib/format'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useRun } from '../../store/RunProvider'
import { proposalTextOf } from '../../store/derive'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Prose } from '../ui/Prose'

/**
 * 逐笔与提案凭证弹窗：借鉴 Alpha Arena「观察 / 思考 / 动作」三段折叠结构，
 * 并借鉴 TraderHarness 诚实声明不伪造缺失的隐藏思维链。
 */
export function DetailDialog({ open, id }: { open: boolean; id: string }) {
  const { state } = useRun()
  const { close } = useDialog()
  const { bi } = useLocale()
  const isLive = state.kind === 'live'
  const asset = state.proposal.asset ?? '公司-017'
  const side = state.proposal.side ?? '卖出'
  const evidence = state.proposal.evidence ?? 'ev_018 / ev_024'
  const reason =
    state.proposal.reason ??
    '示例经营披露显示回款周期延长，Agent 因此提出减仓。平台只负责返回资料，不替 Agent 下投资结论。'

  const isProposal = id === 'proposal'
  const trade = state.trades.find((t) => t.id === id)
  const title = isProposal
    ? `${side}${isLive ? bi('建议', ' Advisory') : bi('提案', ' Proposal')} · ${asset}`
    : trade
      ? `${trade.side} ${trade.name}`
      : bi('操作详情', 'Trace Detail')

  const structuredPayload = isProposal
    ? {
        workspace: state.kind,
        type: isLive ? 'advisory' : 'order',
        side: side === '买入' ? 'buy' : 'sell',
        asset,
        original_quantity: state.proposal.original,
        final_quantity: state.proposal.quantity,
        price_ref: state.proposal.priceBand ?? state.proposal.price,
        executed_price: state.proposal.executedPrice ?? null,
        evidence: evidence.split(/\s*\/\s*/),
        pit_cutoff: isLive ? 'realtime' : (state.pitCutoff ?? '2024-04-22 23:59'),
        status: state.proposal.status,
      }
    : trade
      ? {
          id: trade.id,
          asset: trade.name,
          side: trade.side === '买入' ? 'buy' : 'sell',
          quantity: trade.quantity,
          fill_price: trade.price,
          fee: trade.fee,
          realized_pnl: trade.pnl,
          evidence: trade.evidence,
          status: trade.status,
        }
      : {}

  return (
    <Modal
      open={open}
      kicker={isLive ? 'Advisory Audit Trace' : '3-Part Decision Trace'}
      title={title}
      onClose={close}
      footer={
        <Button size="sm" variant="ghost" onClick={close}>
          {bi('关闭', 'Close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {isProposal ? (
          <dl className="snapshot-list">
            <div>
              <dt>{isLive ? bi('AI 建议 / 实际', 'AI / Actual') : bi('原始 / 最终', 'Original / Final')}</dt>
              <dd>
                {state.proposal.original} / {state.proposal.quantity} {bi('股', 'shs')}
              </dd>
            </div>
            <div>
              <dt>{isLive ? bi('参考价区间', 'Ref Band') : bi('限价', 'Limit Price')}</dt>
              <dd>{isLive ? (state.proposal.priceBand ?? money(state.proposal.price)) : money(state.proposal.price)}</dd>
            </div>
            <div>
              <dt>{bi('当前状态', 'Status')}</dt>
              <dd>{proposalTextOf(state)}</dd>
            </div>
            <div>
              <dt>{bi('引用证据', 'Evidence')}</dt>
              <dd>{evidence}</dd>
            </div>
          </dl>
        ) : trade ? (
          <dl className="snapshot-list">
            <div>
              <dt>{bi('成交操作', 'Execution')}</dt>
              <dd>
                {trade.side} {trade.name} × {trade.quantity}
              </dd>
            </div>
            <div>
              <dt>{bi('成交时点', 'Timestamp')}</dt>
              <dd>{trade.time}</dd>
            </div>
            <div>
              <dt>{bi('成交价 / 费用', 'Price / Fee')}</dt>
              <dd>
                {money(trade.price)} / {money(trade.fee)}
              </dd>
            </div>
            <div>
              <dt>{bi('已实现盈亏', 'Realized PnL')}</dt>
              <dd>{trade.pnl === null ? bi('建仓，未实现', 'Entry (Unrealized)') : signed(trade.pnl)}</dd>
            </div>
          </dl>
        ) : null}

        {/* 三段折叠：观察 / 思考 / 动作 */}
        <details className="audit" open>
          <summary>{bi('01 · 当时可见观察上下文（Observation）', '01 · Point-in-Time Observation Context')}</summary>
          <div className="mt-2 space-y-1.5 text-note text-[var(--fg-1)]">
            <p>
              {isLive
                ? bi(
                    '环境模式：LIVE 实盘辅助 · 开放实时行情与最新公告，账户真相源为手动维护镜像。',
                    'Mode: LIVE Advisory · Real-time quotes & filings enabled; ledger is user-maintained shadow mirror.',
                  )
                : bi(
                    `环境模式：SIM 历史模拟 · PIT 截断于 ${state.pitCutoff ?? '2024-04-22 23:59'} · 实体匿名化已开启（公司-017）。`,
                    `Mode: SIM Historical · PIT cutoff ${state.pitCutoff ?? '2024-04-22 23:59'} · Entity blind mask active.`,
                  )}
            </p>
            <p className="font-mono text-micro text-[var(--fg-2)]">
              {bi('合格证据编号：', 'Qualified Evidence IDs: ')}
              {isProposal ? evidence : (trade?.evidence ?? '—')}
            </p>
          </div>
        </details>

        <details className="audit" open>
          <summary>{bi('02 · 推理理由与依据（Reasoning）', '02 · Recorded Reasoning & Rationale')}</summary>
          <div className="mt-2 space-y-2">
            <Prose>{isProposal ? reason : (trade?.reason ?? '—')}</Prose>
            {isLive && isProposal && state.proposal.invalidation ? (
              <div className="note">
                {bi('失效条件：', 'Invalidation: ')}
                {state.proposal.invalidation}
              </div>
            ) : null}
            <p className="font-mono text-micro text-[var(--fg-2)]">
              {bi(
                '诚实披露：此处仅展示已记录的可见理由与工具引用；系统绝不伪造缺失的隐藏思维链。',
                'Honest disclosure: displays only recorded rationale & tool refs; hidden chain-of-thought is never fabricated.',
              )}
            </p>
          </div>
        </details>

        <details className="audit">
          <summary>{bi('03 · 结构化动作与规则校验（Action JSON）', '03 · Structured Action & Audit JSON')}</summary>
          <pre className="mt-2">{JSON.stringify(structuredPayload, null, 2)}</pre>
        </details>
      </div>
    </Modal>
  )
}
