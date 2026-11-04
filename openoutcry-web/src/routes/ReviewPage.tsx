import { useRun } from '../store/RunProvider'
import { useDialog } from '../store/DialogProvider'
import { agentOf } from '../data/agents'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Stamp } from '../components/ui/Stamp'
import { StatBand } from '../components/run/StatBand'
import type { BandItem } from '../components/run/StatBand'
import { EquityChart } from '../components/charts/EquityChart'
import { DrawdownChart } from '../components/charts/DrawdownChart'
import { ToolUsageChart } from '../components/charts/ToolUsageChart'
import { BENCH_SERIES, NAV_SERIES, TOOL_USAGE } from '../data/market'
import { money, signed, tone } from '../lib/format'
import { PROPOSAL_TEXT } from '../store/derive'

export function ReviewPage() {
  const { state, totals } = useRun()
  const { open } = useDialog()
  const agent = agentOf(state.agent)

  const band: BandItem[] = [
    { label: '账户净值', value: money(totals.equity), note: '初始资金 ' + money(state.initial) },
    {
      label: '累计净收益',
      value: signed(totals.net),
      note: ((totals.net / state.initial) * 100).toFixed(2) + '% · 已扣费用',
      tone: totals.net >= 0 ? 'up' : 'dn',
    },
    {
      label: '可用现金',
      value: money(state.cash),
      note: '占总资产 ' + ((state.cash / totals.equity) * 100).toFixed(1) + '%',
    },
    { label: '持仓市值', value: money(totals.market), note: state.holdings.length + ' 个标的 · 当前估值' },
  ]

  const facts: Array<[string, string]> = [
    ['已成交记录', state.trades.length + ' 笔（含开仓）'],
    ['费用累计', money(state.fees)],
    ['本次提案', PROPOSAL_TEXT[state.proposal.status]],
    ['决策轨迹', state.events.length + ' 条，可离线回看'],
    ['评测资格', agent.qualification],
    ['样本与结论', '样本不足，不排名'],
  ]

  return (
    <>
      <div className="pagehead">
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="label">№ 03 — Review</span>
            <Stamp tone="brass">样本不足 · 不排名</Stamp>
          </div>
          <h1>看结果，也看过程。</h1>
          <p className="deck">
            {state.status === 'aborted' ? '运行已中止，仅保留已发生结果。' : '运行尚未完成，以下仅为当前快照。'}{' '}
            {state.clock} · {state.collaboration}
          </p>
        </div>
        <div className="pagehead-actions">
          <Button variant="ghost" size="sm" onClick={() => open({ kind: 'replay' })}>
            回放轨迹
          </Button>
          <Button variant="ghost" size="sm" onClick={() => open({ kind: 'agent', agentId: state.agent })}>
            复制配置重跑
          </Button>
        </div>
      </div>

      <StatBand
        items={band}
        tags={
          <>
            <span>
              基准 <b>沪深 300 · 同期</b>
            </span>
            <span>
              样本 <b>20 交易日</b>
            </span>
            <span>
              门槛 <b>60 交易日</b>
            </span>
            <span>
              Deflated Sharpe <b>未评估</b>
            </span>
          </>
        }
      />

      <div className="charts">
        <div className="chart-card">
          <div className="chart-hd">
            <b>Equity vs Benchmark</b>
            <span>净值 · 基准 = 100,000</span>
          </div>
          <div className="chart-bd">
            <EquityChart nav={NAV_SERIES} bench={BENCH_SERIES} />
          </div>
          <div className="legend">
            <span>
              <i style={{ background: '#E8785F' }} />
              Agent 净值
            </span>
            <span>
              <i style={{ background: '#B9C7BD' }} />
              沪深 300
            </span>
            <span>
              <i style={{ background: '#42584C' }} />
              零轴
            </span>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-hd">
            <b>Underwater</b>
            <span>距峰值回撤</span>
          </div>
          <div className="chart-bd">
            <DrawdownChart nav={NAV_SERIES} />
          </div>
          <div className="legend">
            <span>
              <i style={{ background: '#D6BE6E' }} />
              回撤深度
            </span>
          </div>
        </div>
      </div>

      <div className="charts wide-left">
        <div className="chart-card">
          <div className="chart-hd">
            <b>Tool Usage</b>
            <span>调用分布</span>
          </div>
          <div className="chart-bd">
            <ToolUsageChart data={TOOL_USAGE} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-hd">
            <b>Run Facts</b>
            <span>口径与边界</span>
          </div>
          <div className="chart-bd flush">
            {facts.map(([k, v]) => (
              <div className="report-row" key={k}>
                <span className="dim">{k}</span>
                <span className="dots" />
                <b>{v}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-hd">
        <h2>逐笔与决策轨迹</h2>
        <span className="label">Trace</span>
      </div>

      <Card className="px-4">
        {state.trades.map((tr) => (
          <button className="rowlink" type="button" key={tr.id} onClick={() => open({ kind: 'detail', id: tr.id })}>
            <span>
              <b>
                {tr.side} {tr.name} · {tr.quantity} 股
              </b>
              <small>
                {tr.time} · {money(tr.price)} · 费用 {money(tr.fee)} · {tr.evidence}
              </small>
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--fs-data)' }} className={tr.pnl === null ? 'dim' : tone(tr.pnl)}>
              {tr.pnl === null ? '建仓' : signed(tr.pnl)}
            </span>
          </button>
        ))}
      </Card>

      <div className="note" style={{ marginTop: 16, maxWidth: '78ch' }}>
        账户总资产 = 现金 + 持仓市值。净收益 = 已实现净盈亏 + 持仓浮盈 − 未平仓买入费用。浮盈不是已实现收益。样本不足 60
        个交易日时，平台不会给出排名或「DSR 显著」这类结论。
      </div>

      <div className="foot">
        <span>
          <b>口径</b> — 不复权成交价 / 单边费用 / T+1
        </span>
        <span>全部为虚构样例</span>
      </div>
    </>
  )
}
