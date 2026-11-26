import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, GitCompare, History, RotateCcw } from 'lucide-react'

import { DrawdownChart } from '../components/charts/DrawdownChart'
import { EquityChart } from '../components/charts/EquityChart'
import { ToolUsageChart } from '../components/charts/ToolUsageChart'
import { StatBand } from '../components/run/StatBand'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { BENCH_SERIES, NAV_SERIES, TOOL_USAGE_ITEMS } from '../data/market'
import {
  formatAgent,
  formatCollab,
  formatStateClock,
  formatTrade,
  formatUniverse,
} from '../i18n/helpers'
import { money, signed, signedPct, tone } from '../lib/format'
import { useDialog } from '../store/DialogProvider'
import { useLocale } from '../store/LocaleProvider'
import { useRun } from '../store/RunProvider'
import { useTraining } from '../store/TrainingProvider'
import { proposalTextOf } from '../store/derive'
import { accountBandItems } from '../store/selectors'

export function ReviewPage() {
  const { state, totals, actions } = useRun('training')
  const { compareRuns } = useTraining()
  const { open } = useDialog()
  const { lang } = useLocale()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const agent = formatAgent(state.agent, t)
  const band = accountBandItems(state, totals, lang)
  const universeName = formatUniverse(state.universeId, state.universeLabel, t)

  const toolUsageData = TOOL_USAGE_ITEMS.map((item) => ({
    label: t(item.labelKey),
    count: item.count,
    isRisk: item.isRisk,
  }))

  const facts: Array<[string, string]> = [
    [t('review.factMandate'), `${state.mandateNo ?? '№ 0042'} · ${universeName}`],
    [t('review.factFills'), t('review.factFillsVal', { count: state.trades.length })],
    [t('review.factFees'), money(state.fees)],
    [t('review.factProposalStatus'), proposalTextOf(state, lang)],
    [t('review.factTrace'), t('review.factTraceVal', { count: state.events.length })],
    [t('review.factQualification'), t('review.factQualificationVal', { qualification: agent.qualification })],
  ]

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{t('review.title')}</h1>
          <p className="deck">
            {t('review.deck', {
              clock: formatStateClock(state, t),
              collab: formatCollab(state.collaboration, t),
            })}
          </p>
        </div>
        <div className="pagehead-actions">
          <Button variant="ghost" size="sm" onClick={() => open({ kind: 'replay', scope: 'training' })}>
            <History size={15} aria-hidden />
            {t('review.btnReplay')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => open({ kind: 'agent', agentId: state.agent })}>
            <RotateCcw size={15} aria-hidden />
            {t('review.btnCloneRerun')}
          </Button>
          <Button
            variant="solid"
            size="sm"
            onClick={() => {
              actions.deployAgentToLive(state.agent)
              navigate('/live')
            }}
          >
            {t('review.btnPromoteLive')}
            <ArrowRight size={15} aria-hidden />
          </Button>
        </div>
      </div>

      <StatBand items={band} />

      {/* 同口径多版本对照表 */}
      <div className="section-hd mt-10">
        <h2 className="flex items-center gap-2">
          <GitCompare size={18} aria-hidden className="text-[var(--lime)]" />
          {t('review.compareTitle')}
        </h2>
        <div className="section-hd-side">
          <Badge variant="outline">{t('review.compareBadge')}</Badge>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="compare-table">
          <thead>
            <tr>
              <th>{t('review.colVersion')}</th>
              <th>{t('review.colVariable')}</th>
              <th className="text-right">{t('review.colReturn')}</th>
              <th className="text-right">{t('review.colAlpha')}</th>
              <th className="text-right">{t('review.colMaxDD')}</th>
              <th className="text-right">{t('review.colFillsFees')}</th>
            </tr>
          </thead>
          <tbody>
            {compareRuns.map((row) => {
              const rowLabel = row.labelKey
                ? (t(row.labelKey, (row.labelParams ?? {}) as Record<string, unknown>) as string)
                : row.label
              const rowVar = row.variableChangedKey
                ? (t(row.variableChangedKey, (row.variableChangedParams ?? {}) as Record<string, unknown>) as string)
                : row.variableChanged
              return (
                <tr key={row.id} className={row.isCurrent ? 'is-current' : ''}>
                  <td>
                    <div className="font-mono text-micro tabular-nums text-[var(--fg-2)]">{row.no}</div>
                    <div className="font-semibold text-[var(--fg-0)]">{rowLabel}</div>
                  </td>
                  <td className="text-[var(--fg-1)]">{rowVar}</td>
                  <td className={'num ' + tone(row.returnPct)}>{signedPct(row.returnPct)}</td>
                  <td className={'num ' + tone(row.alphaPct)}>{signedPct(row.alphaPct)}</td>
                  <td className="num text-[var(--warn)]">{row.maxDrawdownPct.toFixed(2)}%</td>
                  <td className="num text-[var(--fg-1)]">
                    {row.trades} / {money(row.fees)}
                  </td>
                </tr>
              )
            })}
            <tr>
              <td>
                <div className="font-mono text-micro text-[var(--fg-2)]">BENCH</div>
                <div className="font-semibold text-[var(--fg-1)]">{t('review.benchLabel')}</div>
              </td>
              <td className="text-[var(--fg-2)]">{t('review.benchDesc')}</td>
              <td className="num text-[var(--down)]">-0.76%</td>
              <td className="num text-[var(--fg-2)]">0.00%</td>
              <td className="num text-[var(--fg-2)]">-1.06%</td>
              <td className="num text-[var(--fg-2)]">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 图表三件套 + 运行事实 */}
      <div className="charts frame mt-10">
        <div className="chart-card">
          <div className="chart-hd">
            <b>Equity vs Benchmark</b>
            <span>{t('review.chartEquitySub')}</span>
          </div>
          <div className="chart-bd">
            <EquityChart nav={NAV_SERIES} bench={BENCH_SERIES} />
          </div>
          <div className="legend">
            <span>
              <i className="chart-swatch-agent" />
              {t('review.legendAgent')}
            </span>
            <span>
              <i className="chart-swatch-bench" />
              {t('review.legendBench')}
            </span>
            <span>
              <i className="chart-swatch-zero" />
              {t('review.legendBaseline')}
            </span>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-hd">
            <b>Underwater</b>
            <span>{t('review.chartDrawdownSub')}</span>
          </div>
          <div className="chart-bd">
            <DrawdownChart nav={NAV_SERIES} />
          </div>
          <div className="legend">
            <span>
              <i className="chart-swatch-drawdown" />
              {t('review.legendDrawdown')}
            </span>
          </div>
        </div>
      </div>

      <div className="charts wide-left">
        <div className="chart-card">
          <div className="chart-hd">
            <b>Tool Usage</b>
            <span>{t('review.chartToolSub')}</span>
          </div>
          <div className="chart-bd">
            <ToolUsageChart data={toolUsageData} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-hd">
            <b>Run Facts</b>
            <span>{t('review.chartFactsSub')}</span>
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

      <div className="section-hd mt-10">
        <h2>{t('review.tradesTitle')}</h2>
        <span className="text-micro text-[var(--fg-2)]">{t('review.tradesHint')}</span>
      </div>

      <Card className="px-5">
        {state.trades.map((tr) => {
          const tv = formatTrade(tr, t)
          return (
            <button className="rowlink" type="button" key={tr.id} onClick={() => open({ kind: 'detail', id: tr.id })}>
              <span>
                <b>
                  {tv.side} {tv.name} · {tr.quantity} {t('proposal.sharesUnit')}
                </b>
                <small>
                  {tv.time} · {money(tr.price)} · {t('review.feePrefix')} {money(tr.fee)} · {tr.evidence}
                </small>
              </span>
              <span className={'font-mono text-data tabular-nums ' + (tr.pnl === null ? 'dim' : tone(tr.pnl))}>
                {tr.pnl === null ? t('review.entryLabel') : signed(tr.pnl)}
              </span>
            </button>
          )
        })}
      </Card>

      <div className="foot">
        <span>{t('review.footSummary')}</span>
      </div>
    </>
  )
}
