import { Component, type ReactNode } from 'react'

import i18n from '../../i18n'

export interface WidgetErrorBoundaryProps {
  title?: string
  fallbackMessage?: string
  onReset?: () => void
  children: ReactNode
}

interface WidgetErrorBoundaryState {
  hasError: boolean
  errorMessage: string
}

/**
 * 仪表盘单组件级错误边界：
 * 当单个图表或子组件因异常数据崩溃时，仅在当前卡片内降级展示并提供重试，
 * 避免整页白屏。字号全部走流体令牌（text-note / text-micro）。
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected render error',
    }
  }

  state: WidgetErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const {
      title = i18n.t('common.widgetError.defaultTitle'),
      fallbackMessage = i18n.t('common.widgetError.defaultMessage'),
    } = this.props

    return (
      <div
        role="alert"
        className="flex min-h-[140px] flex-col items-start justify-center gap-2 rounded-md border border-[var(--line)] bg-[var(--bg-1)] p-4 text-[var(--fg-1)]"
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full bg-[var(--up)]"
          />
          <span className="font-mono text-note font-semibold text-[var(--fg-0)]">
            {title}
          </span>
        </div>
        <p className="m-0 text-note text-[var(--fg-2)]">{fallbackMessage}</p>
        {this.state.errorMessage ? (
          <code className="max-w-full truncate rounded border border-[var(--line)] bg-[var(--well)] px-2 py-0.5 font-mono text-micro text-[var(--fg-2)]">
            {this.state.errorMessage}
          </code>
        ) : null}
        <button
          type="button"
          onClick={this.handleReset}
          className="mt-1 inline-flex items-center rounded border border-[var(--line-strong)] bg-[var(--bg-2)] px-3 py-1.5 font-mono text-micro font-semibold text-[var(--fg-0)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {i18n.t('common.widgetError.retry')}
        </button>
      </div>
    )
  }
}
