const moneyFmt = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const money = (v: number) => '¥' + moneyFmt.format(v)

/** 带符号金额，负数用排版减号 */
export const signed = (v: number) => (v >= 0 ? '+' : '−') + money(Math.abs(v))

export const signedPct = (v: number, digits = 2) =>
  (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(digits) + '%'

export const pct = (v: number, digits = 1) => v.toFixed(digits) + '%'

export const round = (v: number, digits = 2) => {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

/** 数字正负 → A 股配色类名（红涨绿跌） */
export const tone = (v: number) => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'flat')

export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')

/** 事件序号：0001 */
export const seq = (n: number) => String(n).padStart(4, '0')
