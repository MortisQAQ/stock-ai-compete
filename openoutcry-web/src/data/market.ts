import type { TranslationKey } from '../types'

/** 全部为虚构演示数据，不代表真实行情。 */

/** 20 个交易日的账户净值 */
export const NAV_SERIES = [
  100000, 99860, 100240, 99920, 100680, 101120, 100840, 101460, 102080, 101720,
  101380, 102260, 102940, 102580, 102240, 103180, 103760, 103420, 103010, 103762.6,
]

/** 同期沪深 300，归一到 100,000 */
export const BENCH_SERIES = [
  100000, 99880, 99720, 99640, 99820, 99960, 99680, 99420, 99260, 99080,
  98860, 99040, 99320, 99180, 98940, 99260, 99540, 99320, 99060, 99240,
]

export interface ToolUsageItem {
  id: string
  labelKey: TranslationKey
  count: number
  isRisk?: boolean
}

export const TOOL_USAGE_ITEMS: ToolUsageItem[] = [
  { id: 'quote', labelKey: 'review.charts.toolUsage.quote', count: 22 },
  { id: 'search', labelKey: 'review.charts.toolUsage.search', count: 14 },
  { id: 'filings', labelKey: 'review.charts.toolUsage.filings', count: 9 },
  { id: 'plan', labelKey: 'review.charts.toolUsage.plan', count: 6 },
  { id: 'risk', labelKey: 'review.charts.toolUsage.risk', count: 3, isRisk: true },
]
