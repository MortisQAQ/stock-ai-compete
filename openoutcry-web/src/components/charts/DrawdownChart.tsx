import { areaPath, drawdownSeries, linePath, project } from '../../lib/chart'

interface Props {
  nav: number[]
  height?: number
}

const W = 420

export function DrawdownChart({ nav, height = 250 }: Props) {
  const H = height
  const P = { l: 56, r: 16, t: 16, b: 26 }
  const dd = drawdownSeries(nav)
  const worst = Math.min(...dd, -0.1)
  const min = worst * 1.18
  const sc = { min, max: 0, span: -min }
  const pts = project(dd, W, H, P, sc)
  const baseY = P.t
  const deepest = dd.indexOf(worst)

  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label="水下回撤曲线">
      {[0, 1, 2, 3].map((i) => {
        const y = P.t + (H - P.t - P.b) * (i / 3)
        const value = sc.max - (sc.span * i) / 3
        return (
          <g key={i}>
            <line className="chart-grid-line" x1={P.l} y1={y} x2={W - P.r} y2={y} />
            <text className="chart-axis-label" x={P.l - 7} y={y + 3.5} textAnchor="end">
              {value.toFixed(1)}%
            </text>
          </g>
        )
      })}

      <path className="chart-drawdown-area" d={areaPath(pts, baseY)} />
      <path className="chart-drawdown-line" d={linePath(pts)} />
      <line className="chart-zero-line" x1={P.l} y1={baseY} x2={W - P.r} y2={baseY} />
      {deepest >= 0 && pts[deepest] ? (
        <g>
          <circle className="chart-drawdown-dot" cx={pts[deepest].x} cy={pts[deepest].y} r="2.6" />
          <text
            className="chart-drawdown-label"
            x={pts[deepest].x > W - 90 ? pts[deepest].x - 6 : pts[deepest].x + 6}
            y={pts[deepest].y - 5}
            textAnchor={pts[deepest].x > W - 90 ? 'end' : 'start'}
          >
            {worst.toFixed(2)}%
          </text>
        </g>
      ) : null}
      <text className="chart-axis-label" x={W - P.r} y={H - 8} textAnchor="end">
        {nav.length} 交易日
      </text>
    </svg>
  )
}
