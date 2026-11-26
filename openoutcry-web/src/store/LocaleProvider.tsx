import { useCallback, useMemo } from 'react'
import { create } from 'zustand'

export type Lang = 'zh' | 'en'
export type ThemeMode = 'dark' | 'light'
export type MarketColors = 'cn' | 'intl'

export interface LocaleContextValue {
  lang: Lang
  isEn: boolean
  theme: ThemeMode
  marketColors: MarketColors
  setLang: (next: Lang) => void
  toggleLang: () => void
  setTheme: (next: ThemeMode) => void
  toggleTheme: () => void
  setMarketColors: (next: MarketColors) => void
  toggleMarketColors: () => void
  /** Concise inline bilingual helper */
  bi: (zh: string, en: string) => string
}

interface LocaleStoreState {
  lang: Lang
  theme: ThemeMode
  marketColors: MarketColors
  setLang: (next: Lang) => void
  toggleLang: () => void
  setTheme: (next: ThemeMode) => void
  toggleTheme: () => void
  setMarketColors: (next: MarketColors) => void
  toggleMarketColors: () => void
}

function readQueryParam(key: string): string | null {
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

function initialLang(): Lang {
  const q = readQueryParam('lang')
  if (q === 'en' || q === 'zh') return q
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('openoutcry.lang')
    if (saved === 'en' || saved === 'zh') return saved
  }
  return 'zh'
}

function initialTheme(): ThemeMode {
  const q = readQueryParam('theme')
  if (q === 'light' || q === 'dark') return q
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('openoutcry.theme')
    if (saved === 'light' || saved === 'dark') return saved
  }
  return 'dark'
}

const bootLang = initialLang()

export const useLocaleStore = create<LocaleStoreState>((set, get) => ({
  lang: bootLang,
  theme: initialTheme(),
  marketColors: bootLang === 'en' ? 'intl' : 'cn',

  setLang: (next: Lang) => {
    set({
      lang: next,
      marketColors: next === 'en' ? 'intl' : 'cn',
    })
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('openoutcry.lang', next)
    }
  },

  toggleLang: () => {
    get().setLang(get().lang === 'zh' ? 'en' : 'zh')
  },

  setTheme: (next: ThemeMode) => {
    set({ theme: next })
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('openoutcry.theme', next)
    }
  },

  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },

  setMarketColors: (next: MarketColors) => {
    set({ marketColors: next })
  },

  toggleMarketColors: () => {
    set((state) => ({ marketColors: state.marketColors === 'cn' ? 'intl' : 'cn' }))
  },
}))

export function syncLocaleDom(): void {
  if (typeof document === 'undefined') return
  const { lang, theme, marketColors } = useLocaleStore.getState()
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.marketColors = marketColors
}

useLocaleStore.subscribe(() => {
  syncLocaleDom()
})

syncLocaleDom()

export function useLocale(): LocaleContextValue {
  const store = useLocaleStore()
  const bi = useCallback((zh: string, en: string) => (store.lang === 'en' ? en : zh), [store.lang])

  return useMemo<LocaleContextValue>(
    () => ({
      lang: store.lang,
      isEn: store.lang === 'en',
      theme: store.theme,
      marketColors: store.marketColors,
      setLang: store.setLang,
      toggleLang: store.toggleLang,
      setTheme: store.setTheme,
      toggleTheme: store.toggleTheme,
      setMarketColors: store.setMarketColors,
      toggleMarketColors: store.toggleMarketColors,
      bi,
    }),
    [store, bi],
  )
}
