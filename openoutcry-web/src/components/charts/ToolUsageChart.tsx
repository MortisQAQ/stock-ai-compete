interface Props {
  data: Array<{ label: string; count: number }>
}

const W = 420
const ROW = 38
const P = { l: 108, r: 34, t: 14 }

export function ToolUsageChart({ data }: Props) {
  const H = P.t + data.length * ROW + 12
  const max = Math.max(...data.map((d) => d.count), 1)
  const trackWidth = W - P.l - P.r

  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label="工具调用分布">
      {data.map((d, i) => {
        const y = P.t + i * ROW
        const w = trackWidth * (d.count / max)
        const isRisk = d.label.includes('拒单')
        return (
          <g key={d.label}>
            <text className="chart-tool-label" x={P.l - 10} y={y + 11} textAnchor="end">
              {d.label}
            </text>
            <rect className="chart-tool-track" x={P.l} y={y} width={trackWidth} height="13" />
            <rect
              className={'chart-tool-bar' + (isRisk ? ' is-risk' : '')}
              x={P.l}
              y={y}
              width={w}
              height="13"
            />
            <text className="chart-value-label" x={W - P.r + 8} y={y + 11}>
              {d.count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
