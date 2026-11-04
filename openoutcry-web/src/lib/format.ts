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

/**
 * 十进制取整。
 *
 * 直接 `Math.round(v * 100) / 100` 会把 1.005 变成 1 —— 因为 1.005 * 100 在二进制里
 * 是 100.49999999999999。这里改用十进制字符串移位（"1.005e2" 解析出来正好是 100.5），
 * 金额不会在第三位上悄悄少一分钱。
 */
export const round = (v: number, digits = 2): number => {
  if (!Number.isFinite(v)) return v
  const shifted = Number(`${v}e${digits}`)
  if (!Number.isFinite(shifted)) {
    // 极小/极大数会以指数形式出现（1e-7），字符串移位失效，退回乘法口径
    const factor = 10 ** digits
    return Math.round(v * factor) / factor
  }
  return Number(`${Math.round(shifted)}e${-digits}`)
}

/** 数字正负 → A 股配色类名（红涨绿跌） */
export const tone = (v: number) => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'flat')

/** 事件序号：0001 */
export const seq = (n: number) => String(n).padStart(4, '0')
