import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { areaPath, bounds, gridLevels, linePath, project } from '../../lib/chart'
import { WidgetErrorBoundary } from '../ui/WidgetErrorBoundary'

interface Props {
  nav: number[]
  bench: number[]
  height?: number
  startLabel?: string
  endLabel?: string
}

const W = 600

function EquityChartInner({
  nav,
  bench,
  height = 250,
  startLabel = '04-01',
  endLabel = '04-26',
}: Props) {
  const { t } = useTranslation()
  const gradId = 'equity-area-' + useId().replace(/:/g, '')
  const H = height
  const P = { l: 74, r: 16, t: 16, b: 30 }
  const sc = bounds([nav, bench])
  const aPts = project(nav, W, H, P, sc)
  const bPts = project(bench, W, H, P, sc)
  const baseY = H - P.b
  const initialCapital = nav[0] ?? 100000
  const zeroY = P.t + (H - P.t - P.b) * (1 - (initialCapital - sc.min) / sc.span)
  const last = aPts[aPts.length - 1]

  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={t('review.charts.equityAria')}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="chart-area-top" />
          <stop offset="100%" className="chart-area-bottom" />
        </linearGradient>
      </defs>

      {gridLevels(4).map((g, i) => {
        const y = P.t + (H - P.t - P.b) * g
        const value = sc.max - sc.span * g
        return (
          <g key={i}>
            <line className="chart-grid-line" x1={P.l} y1={y} x2={W - P.r} y2={y} />
            <text className="chart-axis-label" x={P.l - 9} y={y + 3.5} textAnchor="end">
              {(value / 1000).toFixed(1)}k
            </text>
          </g>
        )
      })}

      <line className="chart-zero-line" x1={P.l} y1={zeroY} x2={W - P.r} y2={zeroY} />
      <path d={areaPath(aPts, baseY)} fill={`url(#${gradId})`} />
      <path className="chart-bench-line" d={linePath(bPts)} />
      <path className="chart-agent-line" d={linePath(aPts)} />
      {last ? <circle className="chart-agent-dot" cx={last.x} cy={last.y} r="3.6" /> : null}
      <text className="chart-axis-label" x={P.l} y={H - 8}>
        {startLabel}
      </text>
      <text className="chart-axis-label" x={W - P.r} y={H - 8} textAnchor="end">
        {endLabel}
      </text>
    </svg>
  )
}

/**
 * 净值 vs 基准。配色在 review.css 的 .chart-* 里，色值来自 tokens.css。
 */
export function EquityChart(props: Props) {
  return (
    <WidgetErrorBoundary title="净值曲线渲染异常">
      <EquityChartInner {...props} />
    </WidgetErrorBoundary>
  )
}
