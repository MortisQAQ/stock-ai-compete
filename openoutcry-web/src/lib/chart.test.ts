import { describe, expect, it } from 'vitest'

import { bounds, drawdownSeries, linePath, project } from './chart'

const PAD = { l: 0, r: 0, t: 0, b: 0 }

describe('chart bounds', () => {
  it('合并多条序列并留出上下呼吸位', () => {
    const sc = bounds([[100, 200], [150]])
    expect(sc.min).toBeLessThan(100)
    expect(sc.max).toBeGreaterThan(200)
    expect(sc.span).toBeCloseTo(sc.max - sc.min)
  })

  it('全空序列时退化到 0..1，不返回 Infinity', () => {
    expect(bounds([[], []])).toEqual({ min: 0, max: 1, span: 1 })
  })

  it('常数序列不会产生零跨度', () => {
    const sc = bounds([[42, 42, 42]])
    expect(sc.span).toBeGreaterThan(0)
    expect(Number.isFinite(sc.span)).toBe(true)
  })
})

describe('project', () => {
  it('按值域把点映射进画布，最大值落在顶部', () => {
    const sc = { min: 0, max: 10, span: 10 }
    const pts = project([0, 5, 10], 100, 50, PAD, sc)
    expect(pts.map((p) => p.x)).toEqual([0, 50, 100])
    expect(pts[2].y).toBeCloseTo(0)
    expect(pts[0].y).toBeCloseTo(50)
  })

  it('单点序列不会除以零', () => {
    const sc = { min: 0, max: 1, span: 1 }
    expect(project([0.5], 100, 50, PAD, sc)).toHaveLength(1)
  })

  it('linePath 输出合法 SVG 路径', () => {
    const d = linePath(project([1, 2], 10, 10, PAD, { min: 1, max: 2, span: 1 }))
    expect(d.startsWith('M')).toBe(true)
    expect(d).toContain('L')
  })
})

describe('drawdownSeries', () => {
  it('回撤是相对历史峰值的负百分比', () => {
    const dd = drawdownSeries([100, 120, 90, 120])
    expect(dd[0]).toBe(-0)
    expect(dd[1]).toBe(-0)
    expect(dd[2]).toBeCloseTo(-25)
    expect(dd[3]).toBe(-0)
  })
})
