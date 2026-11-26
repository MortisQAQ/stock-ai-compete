import { useNavigate } from 'react-router-dom'
import { ArrowRight, GitCompare, History, RotateCcw } from 'lucide-react'

import { DrawdownChart } from '../components/charts/DrawdownChart'
import { EquityChart } from '../components/charts/EquityChart'
import { ToolUsageChart } from '../components/charts/ToolUsageChart'
import { StatBand } from '../components/run/StatBand'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Stamp } from '../components/ui/Stamp'
import { agentOf } from '../data/agents'
import { BENCH_SERIES, NAV_SERIES, TOOL_USAGE, TOOL_USAGE_EN } from '../data/market'
import { money, signed, signedPct, tone } from '../lib/format'
import { useDialog } from '../store/DialogProvider'
import { useLocale } from '../store/LocaleProvider'
import { useRun } from '../store/RunProvider'
import { useTraining } from '../store/TrainingProvider'
import { PROPOSAL_TEXT } from '../store/derive'
import { accountBandItems } from '../store/selectors'

export function ReviewPage() {
  const { state, totals, actions } = useRun('training')
  const { compareRuns } = useTraining()
  const { open } = useDialog()
  const { lang, isEn, bi } = useLocale()
  const navigate = useNavigate()
  const agent = agentOf(state.agent)
  const band = accountBandItems(state, totals, lang)

  const facts: Array<[string, string]> = [
    [bi('委托编号与口径', 'Mandate & Universe'), `${state.mandateNo ?? '№ 0042'} · ${state.universeLabel ?? '沪深 300 成分池'}`],
    [bi('已成交记录', 'Executed Fills'), bi(`${state.trades.length} 笔（含开仓）`, `${state.trades.length} fills (incl. entries)`)],
    [bi('累计费用', 'Total Fees'), money(state.fees)],
    [bi('当日提案状态', 'Proposal Status'), PROPOSAL_TEXT[state.proposal.status]],
    [bi('决策轨迹', 'Decision Trace'), bi(`${state.events.length} 条，可离线指纹回放`, `${state.events.length} events · offline replayable`)],
    [bi('评测资格与结论', 'Qualification'), bi(`${agent.qualification} · 样本不足不排名`, 'Exploratory · Unranked (<60d)')],
  ]

  return (
    <>
      <div className="vlabel page-vlabel" aria-hidden="true">
        OPENOUTCRY / 04 REVIEW &amp; COMPARE / 2026
      </div>

      <div className="pagehead">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="label">{bi('04 — 复盘与对照', '04 — Review & Compare')}</span>
            <Stamp tone="slate">{bi('样本不足（20/60 交易日）· 不排名', 'Insufficient Sample (20/60d) · Unranked')}</Stamp>
          </div>
          <h1>{bi('看成绩，更看同口径对照与证据溯源。', 'Inspect outcomes, controlled comparisons, and evidence.')}</h1>
          <p className="deck">
            {bi(
              `区间 2024-04-01 → 2024-04-26 · 当前快照 ${state.clock} · ${state.collaboration}。锁死同一考场只改一个变量，把“策略变强”与“大盘运气”彻底拆开。`,
              `Window 2024-04-01 → 2024-04-26 · Snapshot ${state.clock}. Lock the window, universe, and rules while changing a single variable to separate skill from market luck.`,
            )}
          </p>
        </div>
        <div className="pagehead-actions">
          <Button variant="ghost" size="sm" onClick={() => open({ kind: 'replay', scope: 'training' })}>
            <History size={15} aria-hidden />
            {bi('回放轨迹', 'Replay Trace')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => open({ kind: 'agent', agentId: state.agent })}>
            <RotateCcw size={15} aria-hidden />
            {bi('复制配置重跑', 'Clone & Rerun')}
          </Button>
          <Button
            variant="solid"
            size="sm"
            onClick={() => {
              actions.deployAgentToLive(state.agent)
              navigate('/live')
            }}
          >
            {bi('应用到实战工作台', 'Promote to Live')}
            <ArrowRight size={15} aria-hidden />
          </Button>
        </div>
      </div>

      <StatBand
        items={band}
        tags={
          <>
            <span>
              {bi('基准', 'Benchmark')} <b>{bi('沪深 300 · 同期', 'CSI 300 · Same Window')}</b>
            </span>
            <span>
              {bi('样本', 'Sample')} <b>{bi('20 交易日', '20 trading days')}</b>
            </span>
            <span>
              {bi('排名门槛', 'Rank Gate')} <b>{bi('60 交易日', '60 trading days')}</b>
            </span>
            <span>
              Deflated Sharpe <b>{bi('未评估', 'Not Evaluated')}</b>
            </span>
          </>
        }
      />

      {/* 核心回应第三项需求：同口径多版本对照表（Run A vs Run B） */}
      <div className="section-hd">
        <h2 className="flex items-center gap-2">
          <GitCompare size={18} aria-hidden className="text-[var(--lime)]" />
          {bi('同口径多版本对照（拆分策略能力 vs 行情运气）', 'Same-Contract Comparison (Skill vs. Market Luck)')}
        </h2>
        <div className="section-hd-side">
          <Badge variant="outline">
            {bi('锁定：04-01→04-26 · 沪深 300 · ¥100,000 · PIT+双盲', 'Locked: 04-01→04-26 · CSI 300 · ¥100k · PIT+Mask')}
          </Badge>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="compare-table">
          <thead>
            <tr>
              <th>{bi('运行版本', 'Run Version')}</th>
              <th>{bi('本次修改的单一变量', 'Single Variable Changed')}</th>
              <th className="text-right">{bi('累计收益', 'Return')}</th>
              <th className="text-right">{bi('相对沪深 300', 'vs CSI 300')}</th>
              <th className="text-right">{bi('最大回撤', 'Max DD')}</th>
              <th className="text-right">{bi('成交 / 费用', 'Fills / Fees')}</th>
            </tr>
          </thead>
          <tbody>
            {compareRuns.map((row) => (
              <tr key={row.id} className={row.isCurrent ? 'is-current' : ''}>
                <td>
                  <div className="font-mono text-micro text-[var(--fg-2)]">{row.no}</div>
                  <div className="font-semibold text-[var(--fg-0)]">{isEn ? row.labelEn : row.label}</div>
                </td>
                <td className="text-[var(--fg-1)]">{isEn ? row.variableChangedEn : row.variableChanged}</td>
                <td className={'num ' + tone(row.returnPct)}>{signedPct(row.returnPct)}</td>
                <td className={'num ' + tone(row.alphaPct)}>{signedPct(row.alphaPct)}</td>
                <td className="num text-[var(--warn)]">{row.maxDrawdownPct.toFixed(2)}%</td>
                <td className="num text-[var(--fg-1)]">
                  {row.trades} / {money(row.fees)}
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <div className="font-mono text-micro text-[var(--fg-2)]">BENCH</div>
                <div className="font-semibold text-[var(--fg-1)]">{bi('沪深 300（被动基准）', 'CSI 300 (Passive Benchmark)')}</div>
              </td>
              <td className="text-[var(--fg-2)]">{bi('同期买入持有基准，不含交易摩擦', 'Buy-and-hold reference over identical window')}</td>
              <td className="num text-[var(--down)]">-0.76%</td>
              <td className="num text-[var(--fg-2)]">0.00%</td>
              <td className="num text-[var(--fg-2)]">-1.06%</td>
              <td className="num text-[var(--fg-2)]">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 图表三件套 */}
      <div className="charts frame mt-8">
        <div className="chart-card">
          <div className="chart-hd">
            <b>Equity vs Benchmark</b>
            <span>{bi('净值 · 基准 = 100,000', 'NAV · Base = 100,000')}</span>
          </div>
          <div className="chart-bd">
            <EquityChart nav={NAV_SERIES} bench={BENCH_SERIES} />
          </div>
          <div className="legend">
            <span>
              <i className="chart-swatch-agent" />
              {bi('Agent 净值', 'Agent NAV')}
            </span>
            <span>
              <i className="chart-swatch-bench" />
              {bi('沪深 300', 'CSI 300')}
            </span>
            <span>
              <i className="chart-swatch-zero" />
              {bi('初始基准线', 'Baseline')}
            </span>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-hd">
            <b>Underwater</b>
            <span>{bi('距峰值水下回撤', 'Drawdown from Peak')}</span>
          </div>
          <div className="chart-bd">
            <DrawdownChart nav={NAV_SERIES} />
          </div>
          <div className="legend">
            <span>
              <i className="chart-swatch-drawdown" />
              {bi('回撤深度', 'Drawdown')}
            </span>
          </div>
        </div>
      </div>

      <div className="charts wide-left">
        <div className="chart-card">
          <div className="chart-hd">
            <b>Tool Usage</b>
            <span>{bi('受控工具调用分布', 'Sandboxed Tool Calls')}</span>
          </div>
          <div className="chart-bd">
            <ToolUsageChart data={isEn ? TOOL_USAGE_EN : TOOL_USAGE} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-hd">
            <b>Run Facts</b>
            <span>{bi('口径与边界', 'Contract & Bounds')}</span>
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
        <h2>{bi('逐笔成交与三段溯源凭证', 'Trade-by-Trade Evidence Trace')}</h2>
        <span className="label">{bi('点击任意行展开观察/思考/动作', 'Click row for 3-part trace')}</span>
      </div>

      <Card className="px-4">
        {state.trades.map((tr) => (
          <button className="rowlink" type="button" key={tr.id} onClick={() => open({ kind: 'detail', id: tr.id })}>
            <span>
              <b>
                {tr.side} {tr.name} · {tr.quantity} {bi('股', 'shs')}
              </b>
              <small>
                {tr.time} · {money(tr.price)} · {bi('费用', 'Fee')} {money(tr.fee)} · {tr.evidence}
              </small>
            </span>
            <span className={'font-mono text-data ' + (tr.pnl === null ? 'dim' : tone(tr.pnl))}>
              {tr.pnl === null ? bi('建仓', 'Entry') : signed(tr.pnl)}
            </span>
          </button>
        ))}
      </Card>

      <div className="note mt-4 max-w-[78ch]">
        {bi(
          '账户总资产 = 现金 + 持仓市值。净收益 = 已实现净盈亏 + 持仓浮盈 − 未平仓买入费用。样本不足 60 个交易日时，平台不给出排名或“显著有效”结论；实盘记录与历史模拟净值严格分口径，禁止混算。',
          'Equity = Cash + Market Value. Net PnL = Realized + Unrealized − Entry Fees. Runs under 60 trading days remain unranked; historical paper returns are strictly isolated from live mirror logs.',
        )}
      </div>

      <div className="foot">
        <span>
          <b>{bi('口径', 'Basis')}</b> — {bi('未复权真实成交价 / 单边费用 / T+1 / 未建模盘中冲击', 'Unadjusted Price / Fees / T+1 / No Market Impact')}
        </span>
        <span>{bi('全部为虚构演示样例', 'Fictional Demo Data')}</span>
      </div>
    </>
  )
}
