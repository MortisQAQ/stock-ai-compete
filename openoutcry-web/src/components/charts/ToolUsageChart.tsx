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
            <text
              x={P.l - 10}
              y={y + 11}
              textAnchor="end"
              fontFamily="-apple-system,Segoe UI,Microsoft YaHei"
              fontSize="13"
              fill="#A6B7A9"
            >
              {d.label}
            </text>
            <rect x={P.l} y={y} width={trackWidth} height="13" fill="rgba(226,220,196,.07)" />
            <rect
              x={P.l}
              y={y}
              width={w}
              height="13"
              fill={isRisk ? '#F0917D' : '#CBD5C4'}
              opacity={isRisk ? 0.9 : 0.72}
            />
            <text
              x={W - P.r + 8}
              y={y + 11}
              fontFamily="Consolas,monospace"
              fontSize="13"
              fill="#EAE6D3"
            >
              {d.count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
