import { useId } from 'react'

import { PIT_PRICE_HISTORY, PIT_REVEALED_OPEN } from '../../data/run'
import { useLocale } from '../../store/LocaleProvider'
import type { TrainingPhase } from '../../types'

interface PitPriceStripProps {
  asset: string
  costBasis: number
  limitPrice: number
  phase: TrainingPhase
  filled: boolean
}

/**
 * 标的 PIT 截断走势条（借鉴 TradingView Bar Replay）：
 * - 盘前研究态：垂直虚线右侧覆半透明未来遮罩，标明「04-23 开盘尚未揭示」；
 * - 推进至 09:30 开盘撮合后：遮罩解开，实时渲染 ¥20.36 开盘成交点与标记；
 * - 推进至 15:00 尾盘结算后：同步显示收盘价 ¥20.18。
 * 所有文字标签均使用 HTML 令牌（>=14px），严格满足 check-type-floor 约束。
 */
export function PitPriceStrip({ asset, costBasis, limitPrice, phase, filled }: PitPriceStripProps) {
  const hatchId = 'pit-mask-hatch-' + useId().replace(/:/g, '')
  const { bi } = useLocale()
  const revealed = phase !== 'pre_market' || filled
  const settled = phase === 'close_settle'

  const allValues = [
    ...PIT_PRICE_HISTORY.map((p) => p.close),
    costBasis,
    limitPrice,
    PIT_REVEALED_OPEN.open,
    PIT_REVEALED_OPEN.close,
  ]
  const minVal = Math.min(...allValues) - 0.35
  const maxVal = Math.max(...allValues) + 0.35
  const span = Math.max(0.1, maxVal - minVal)

  const W = 420
  const H = 96
  const padL = 8
  const padR = 14
  const padT = 10
  const padB = 10
  const cutoffX = W * 0.74
  const openX = W * 0.87
  const closeX = W - padR

  const yOf = (price: number) => padT + ((maxVal - price) / span) * (H - padT - padB)
  const stepX = (cutoffX - padL) / (PIT_PRICE_HISTORY.length - 1)

  const histPoints = PIT_PRICE_HISTORY.map((p, idx) => ({
    x: padL + idx * stepX,
    y: yOf(p.close),
    ...p,
  }))

  const histPath = histPoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ')

  const costY = yOf(costBasis)
  const openY = yOf(PIT_REVEALED_OPEN.open)
  const closeY = yOf(PIT_REVEALED_OPEN.close)
  const lastHist = histPoints[histPoints.length - 1]

  return (
    <div className="mb-3 rounded-lg border border-[var(--line)] bg-[var(--well)] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-micro font-semibold text-[var(--fg-0)]">
          {asset} · {bi('PIT 历史可见走势', 'PIT Visible Price Tape')}
        </span>
        <span className="font-mono text-micro text-[var(--fg-2)]">
          {revealed
            ? bi(
                `04-23 开盘已揭示 ¥${PIT_REVEALED_OPEN.open.toFixed(2)}${settled ? ` · 收 ¥${PIT_REVEALED_OPEN.close.toFixed(2)}` : ''}`,
                `04-23 Open Revealed ¥${PIT_REVEALED_OPEN.open.toFixed(2)}${settled ? ` · Close ¥${PIT_REVEALED_OPEN.close.toFixed(2)}` : ''}`,
              )
            : bi('截至 04-22 收盘 ¥20.30 · 今日未揭示', 'As-of 04-22 Close ¥20.30 · Today Masked')}
        </span>
      </div>

      <div className="relative overflow-hidden rounded border border-[var(--line-soft)] bg-[var(--bg-1)]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-[96px] w-full"
          role="img"
          aria-label={bi('标的 PIT 截断走势图', 'PIT truncated price chart')}
        >
          <defs>
            <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--warn)" strokeOpacity="0.22" strokeWidth="2" />
            </pattern>
          </defs>

          {/* 成本参考虚线 */}
          <line
            x1={padL}
            y1={costY}
            x2={W - padR}
            y2={costY}
            stroke="var(--chart-bench)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* 截至 04-22 可见历史走势 */}
          <path d={histPath} fill="none" stroke="var(--chart-agent)" strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx={lastHist.x} cy={lastHist.y} r="3.5" fill="var(--chart-agent)" />

          {/* PIT 截断红/琥珀垂直虚线 */}
          <line
            x1={cutoffX}
            y1={0}
            x2={cutoffX}
            y2={H}
            stroke="var(--warn)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {!revealed ? (
            <rect
              x={cutoffX}
              y={0}
              width={W - cutoffX}
              height={H}
              fill={`url(#${hatchId})`}
            />
          ) : (
            <>
              <line
                x1={lastHist.x}
                y1={lastHist.y}
                x2={openX}
                y2={openY}
                stroke="var(--accent)"
                strokeWidth="2.2"
              />
              <circle cx={openX} cy={openY} r="4.5" fill="var(--up)" stroke="var(--bg-0)" strokeWidth="1.5" />
              {settled ? (
                <>
                  <line
                    x1={openX}
                    y1={openY}
                    x2={closeX}
                    y2={closeY}
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                  <circle cx={closeX} cy={closeY} r="3.5" fill="var(--accent)" />
                </>
              ) : null}
            </>
          )}
        </svg>

        {!revealed ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-[26%] items-center justify-center px-1.5 text-center">
            <span className="rounded bg-[var(--bg-0)]/85 px-1.5 py-0.5 font-mono text-micro font-semibold text-[var(--warn)]">
              {bi('未揭示', 'Masked')}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-micro text-[var(--fg-2)]">
        <span>
          {bi(`成本线 ¥${costBasis.toFixed(2)} · 限价 ¥${limitPrice.toFixed(2)}`, `Cost ¥${costBasis.toFixed(2)} · Limit ¥${limitPrice.toFixed(2)}`)}
        </span>
        <span className={revealed ? 'text-[var(--lime)]' : 'text-[var(--warn)]'}>
          {revealed
            ? bi('✓ 已按 09:30 开盘价 ¥20.36 撮合', '✓ Filled at 09:30 Open ¥20.36')
            : bi('┆ 虚线右侧 04-23 行情对 Agent 不可见', '┆ Future bars right of line hidden')}
        </span>
      </div>
    </div>
  )
}
