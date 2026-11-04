export interface Point {
  x: number
  y: number
}

export interface Padding {
  l: number
  r: number
  t: number
  b: number
}

export interface Scale {
  min: number
  max: number
  span: number
}

/** 合并多条序列的取值范围，上下各留 14% 呼吸位 */
export function bounds(series: number[][]): Scale {
  let min = Infinity
  let max = -Infinity
  for (const s of series) {
    for (const v of s) {
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, span: 1 }
  const pad = (max - min) * 0.14 || Math.abs(max || 1) * 0.01
  min -= pad
  max += pad
  return { min, max, span: max - min || 1 }
}

export function project(values: number[], w: number, h: number, p: Padding, sc: Scale): Point[] {
  const step = values.length > 1 ? (w - p.l - p.r) / (values.length - 1) : 0
  return values.map((v, i) => ({
    x: p.l + i * step,
    y: p.t + (h - p.t - p.b) * (1 - (v - sc.min) / sc.span),
  }))
}

export function linePath(points: Point[]): string {
  return points
    .map((pt, i) => (i === 0 ? 'M' : 'L') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1))
    .join(' ')
}

export function areaPath(points: Point[], baseY: number): string {
  if (!points.length) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return (
    linePath(points) +
    ' L' + last.x.toFixed(1) + ' ' + baseY.toFixed(1) +
    ' L' + first.x.toFixed(1) + ' ' + baseY.toFixed(1) + ' Z'
  )
}

/** 回撤序列（负值百分比） */
export function drawdownSeries(values: number[]): number[] {
  let peak = -Infinity
  return values.map((v) => {
    if (v > peak) peak = v
    return -((peak - v) / peak) * 100
  })
}

export const gridLevels = (count: number) =>
  Array.from({ length: count + 1 }, (_, i) => i / count)
