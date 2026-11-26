import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { EquityChart } from '../charts/EquityChart'
import { WidgetErrorBoundary } from './WidgetErrorBoundary'

describe('WidgetErrorBoundary', () => {
  it('renders children normally when no error occurs', () => {
    const html = renderToStaticMarkup(
      <WidgetErrorBoundary title="净值曲线">
        <div data-testid="healthy">Chart OK</div>
      </WidgetErrorBoundary>,
    )

    expect(html).toContain('Chart OK')
    expect(html).not.toContain('role="alert"')
  })

  it('captures render errors via getDerivedStateFromError and renders fallback card', () => {
    const nextState = WidgetErrorBoundary.getDerivedStateFromError(new Error('Invalid NAV series'))
    expect(nextState).toEqual({
      hasError: true,
      errorMessage: 'Invalid NAV series',
    })

    const boundary = new WidgetErrorBoundary({
      title: '净值曲线渲染异常',
      fallbackMessage: '序列数据损坏',
      children: <div>Healthy Child</div>,
    })
    boundary.state = nextState

    const fallbackHtml = renderToStaticMarkup(boundary.render() as ReactElement)
    expect(fallbackHtml).toContain('role="alert"')
    expect(fallbackHtml).toContain('净值曲线渲染异常')
    expect(fallbackHtml).toContain('序列数据损坏')
    expect(fallbackHtml).toContain('Invalid NAV series')
    expect(fallbackHtml).toContain('重试 / Retry')
    expect(fallbackHtml).not.toContain('Healthy Child')
  })

  it('resets error state and recovers children when handleReset is triggered', () => {
    const onReset = vi.fn()
    const boundary = new WidgetErrorBoundary({
      title: '回撤曲线异常',
      onReset,
      children: <span>Recovered Chart</span>,
    })
    boundary.state = WidgetErrorBoundary.getDerivedStateFromError(new Error('Boom'))
    boundary.setState = ((partial: Partial<typeof boundary.state>) => {
      boundary.state = { ...boundary.state, ...partial }
    }) as typeof boundary.setState

    boundary.handleReset()

    expect(onReset).toHaveBeenCalledTimes(1)
    expect(boundary.state).toEqual({ hasError: false, errorMessage: '' })
    const recoveredHtml = renderToStaticMarkup(boundary.render() as ReactElement)
    expect(recoveredHtml).toContain('Recovered Chart')
    expect(recoveredHtml).not.toContain('role="alert"')
  })

  it('wraps EquityChart with dynamic SVG gradient id, initial capital baseline, and configurable dates', () => {
    const html = renderToStaticMarkup(
      <EquityChart
        nav={[250000, 255000, 260000]}
        bench={[250000, 248000, 251000]}
      />,
    )

    expect(html).not.toContain('id="equity-area"')
    expect(html).toMatch(/id="equity-area-[^"]+"/)
    expect(html).toMatch(/url\(#equity-area-[^)]+\)/)
    expect(html).toContain('04-01')
    expect(html).toContain('04-26')

    const customHtml = renderToStaticMarkup(
      <EquityChart
        nav={[100000, 102000]}
        bench={[100000, 100500]}
        startLabel="05-01"
        endLabel="05-31"
      />,
    )
    expect(customHtml).toContain('05-01')
    expect(customHtml).toContain('05-31')
  })
})
