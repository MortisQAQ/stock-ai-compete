import { describe, expect, it } from 'vitest'

import { money, round, seq, signed, signedPct, tone } from './format'

describe('format', () => {
  it('金额固定两位小数并带货币符号', () => {
    expect(money(1234.5)).toBe('¥1,234.50')
    expect(money(-0.004)).toBe('¥-0.00')
  })

  it('带符号金额用排版减号，不用连字符', () => {
    expect(signed(120.5)).toBe('+¥120.50')
    expect(signed(-120.5)).toBe('−¥120.50')
  })

  it('百分比取绝对值后加符号', () => {
    expect(signedPct(2.104)).toBe('+2.10%')
    expect(signedPct(-2.104)).toBe('−2.10%')
  })

  it('tone 按 A 股口径给类名：正数为涨', () => {
    expect(tone(0.01)).toBe('pos')
    expect(tone(-0.01)).toBe('neg')
    expect(tone(0)).toBe('flat')
  })

  it('round 按十进制位取整，不产生浮点尾巴', () => {
    expect(round(1.005, 2)).toBe(1.01)
    expect(round(2168.6000000000004)).toBe(2168.6)
    expect(round(20.365, 2)).toBe(20.37)
  })

  it('事件序号固定四位', () => {
    expect(seq(7)).toBe('0007')
    expect(seq(1234)).toBe('1234')
  })
})
