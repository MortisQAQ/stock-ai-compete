import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { PIT_PRICE_HISTORY, PIT_REVEALED_OPEN } from '../../data/run'
import { formatAsset } from '../../i18n/helpers'
import type { TrainingPhase } from '../../types'

interface PitPriceStripProps {
  asset: string
  costBasis: number
  limitPrice: number
  phase: TrainingPhase
  filled: boolean
}

export function PitPriceStrip({ asset, costBasis, limitPrice, phase, filled }: PitPriceStripProps) {
  const hatchId = 'pit-mask-hatch-' + useId().replace(/:/g, '')
  const { t } = useTranslation()
  const revealed = phase !== 'pre_market' || filled
  const settled = phase === 'close_settle'
  const assetLabel = formatAsset(asset, t)

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

  const closePart = settled
    ? t('pitChart.revealedClosePart', { close: PIT_REVEALED_OPEN.close.toFixed(2) })
    : ''

  return (
    <div className="mb-3 rounded-lg border border-[var(--line)] bg-[var(--well)] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-micro font-semibold text-[var(--fg-0)]">
          {assetLabel} · {t('pitChart.titleSuffix')}
        </span>
        <span className="font-mono text-micro text-[var(--fg-2)]">
          {revealed
            ? t('pitChart.revealedStatus', { open: PIT_REVEALED_OPEN.open.toFixed(2), closePart })
            : t('pitChart.maskedStatus')}
        </span>
      </div>

      <div className="relative overflow-hidden rounded border border-[var(--line-soft)] bg-[var(--bg-1)]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-[96px] w-full"
          role="img"
          aria-label={t('pitChart.chartAria')}
        >
          <defs>
            <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--warn)" strokeOpacity="0.22" strokeWidth="2" />
            </pattern>
          </defs>

          <line
            x1={padL}
            y1={costY}
            x2={W - padR}
            y2={costY}
            stroke="var(--chart-bench)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          <path d={histPath} fill="none" stroke="var(--chart-agent)" strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx={lastHist.x} cy={lastHist.y} r="3.5" fill="var(--chart-agent)" />

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
              {t('pitChart.maskedBadge')}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-micro text-[var(--fg-2)]">
        <span>
          {t('pitChart.costAndLimit', { cost: costBasis.toFixed(2), limit: limitPrice.toFixed(2) })}
        </span>
        <span className={revealed ? 'text-[var(--lime)]' : 'text-[var(--warn)]'}>
          {revealed ? t('pitChart.filledNote') : t('pitChart.hiddenNote')}
        </span>
      </div>
    </div>
  )
}
