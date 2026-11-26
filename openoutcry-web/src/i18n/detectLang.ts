import { safeGetStorage } from '../lib/storage'

export type Lang = 'zh' | 'en'

export function readQueryParam(key: string): string | null {
  if (typeof window === 'undefined') return null
  const fromSearch = new URLSearchParams(window.location.search).get(key)
  if (fromSearch) return fromSearch
  const hash = window.location.hash
  const qIndex = hash.indexOf('?')
  if (qIndex >= 0) {
    return new URLSearchParams(hash.slice(qIndex + 1)).get(key)
  }
  return null
}

export function detectInitialLang(): Lang {
  const q = readQueryParam('lang')
  if (q === 'en' || q === 'zh') return q
  const saved = safeGetStorage('openoutcry.lang')
  if (saved === 'en' || saved === 'zh') return saved
  return 'zh'
}
