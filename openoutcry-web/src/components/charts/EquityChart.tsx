import { areaPath, bounds, gridLevels, linePath, project } from '../../lib/chart'

interface Props {
  nav: number[]
  bench: number[]
  height?: number
}

const W = 720

export function EquityChart({ nav, bench, height = 250 }: Props) {
  const H = height
  const P = { l: 68, r: 16, t: 16, b: 26 }
  const sc = bounds([nav, bench])
  const aPts = project(nav, W, H, P, sc)
  const bPts = project(bench, W, H, P, sc)
  const baseY = H - P.b
  const zeroY = P.t + (H - P.t - P.b) * (1 - (100000 - sc.min) / sc.span)
  const last = aPts[aPts.length - 1]

  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label="账户净值与沪深 300 对比曲线">
      <defs>
        <linearGradient id="equity-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0917D" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#F0917D" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLevels(4).map((g, i) => {
        const y = P.t + (H - P.t - P.b) * g
        const value = sc.max - sc.span * g
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
              x={P.l - 9}
              y={y + 3.5}
              textAnchor="end"
              fontFamily="Consolas,monospace"
              fontSize="13"
              fill="#93A790"
            >
              {(value / 1000).toFixed(1)}k
            </text>
          </g>
        )
      })}

      <line
        x1={P.l}
        y1={zeroY}
        x2={W - P.r}
        y2={zeroY}
        stroke="rgba(226,220,196,.26)"
        strokeWidth="1"
        strokeDasharray="2 4"
      />
      <path d={areaPath(aPts, baseY)} fill="url(#equity-area)" />
      <path
        d={linePath(bPts)}
        fill="none"
        stroke="#B3C0B3"
        strokeWidth="1.4"
        strokeDasharray="4 3"
        strokeOpacity="0.8"
      />
      <path d={linePath(aPts)} fill="none" stroke="#F0917D" strokeWidth="2.2" strokeLinejoin="round" />
      {last ? <circle cx={last.x} cy={last.y} r="3.6" fill="#F0917D" /> : null}
      <text x={P.l} y={H - 8} fontFamily="Consolas,monospace" fontSize="13" fill="#93A790">
        04-01
      </text>
      <text
        x={W - P.r}
        y={H - 8}
        textAnchor="end"
        fontFamily="Consolas,monospace"
        fontSize="13"
        fill="#93A790"
      >
        04-23
      </text>
    </svg>
  )
}
