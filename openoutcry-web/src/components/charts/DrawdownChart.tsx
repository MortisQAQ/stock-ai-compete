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
  const sc = { min: worst * 1.18, max: 0, span: 0 }
  sc.span = sc.max - sc.min || 1
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
            <line
              x1={P.l}
              y1={y}
              x2={W - P.r}
              y2={y}
              stroke="rgba(226,220,196,.11)"
              strokeWidth="1"
            />
            <text
              x={P.l - 7}
              y={y + 3.5}
              textAnchor="end"
              fontFamily="Consolas,monospace"
              fontSize="13"
              fill="#93A790"
            >
              {value.toFixed(1)}%
            </text>
          </g>
        )
      })}

      <path d={areaPath(pts, baseY)} fill="rgba(211,180,120,.16)" />
      <path d={linePath(pts)} fill="none" stroke="#D3B478" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1={P.l} y1={baseY} x2={W - P.r} y2={baseY} stroke="rgba(226,220,196,.2)" strokeWidth="1" />
      {deepest >= 0 && pts[deepest] ? (
        <g>
          <circle cx={pts[deepest].x} cy={pts[deepest].y} r="2.6" fill="#D3B478" />
          <text
            x={pts[deepest].x > W - 90 ? pts[deepest].x - 6 : pts[deepest].x + 6}
            y={pts[deepest].y - 5}
            textAnchor={pts[deepest].x > W - 90 ? 'end' : 'start'}
            fontFamily="Consolas,monospace"
            fontSize="13"
            fill="#D3B478"
          >
            {worst.toFixed(2)}%
          </text>
        </g>
      ) : null}
      <text
        x={W - P.r}
        y={H - 8}
        textAnchor="end"
        fontFamily="Consolas,monospace"
        fontSize="13"
        fill="#93A790"
      >
        {nav.length} 交易日
      </text>
    </svg>
  )
}
