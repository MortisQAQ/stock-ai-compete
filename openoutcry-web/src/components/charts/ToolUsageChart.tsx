import { useTranslation } from 'react-i18next'

import { WidgetErrorBoundary } from '../ui/WidgetErrorBoundary'

interface Props {
  data: Array<{ label: string; count: number; isRisk?: boolean }>
}

const W = 380
const ROW = 42
const P = { l: 124, r: 40, t: 14 }

function ToolUsageChartInner({ data }: Props) {
  const { t } = useTranslation()
  const H = P.t + data.length * ROW + 12
  const max = Math.max(...data.map((d) => d.count), 1)
  const trackWidth = W - P.l - P.r

  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label={t('review.charts.toolAria')}>
      {data.map((d, i) => {
        const y = P.t + i * ROW
        const w = trackWidth * (d.count / max)
        const isRisk = d.isRisk ?? d.label.includes('拒单')
        return (
          <g key={d.label}>
            <text className="chart-tool-label" x={P.l - 10} y={y + 11} textAnchor="end">
              {d.label}
            </text>
            <g>
              <rect className="chart-tool-track" x={P.l} y={y} width={trackWidth} height="13" />
              <rect
                className={'chart-tool-bar' + (isRisk ? ' is-risk' : '')}
                x={P.l}
                y={y}
                width={w}
                height="13"
              />
            </g>
            <text className="chart-value-label" x={W - P.r + 8} y={y + 11}>
              {d.count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function ToolUsageChart(props: Props) {
  const { t } = useTranslation()
  return (
    <WidgetErrorBoundary title={t('common.widgetError.toolUsageTitle')}>
      <ToolUsageChartInner {...props} />
    </WidgetErrorBoundary>
  )
}
