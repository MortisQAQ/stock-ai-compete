import { useMemo } from 'react'
import { create } from 'zustand'

import { detectInitialLang, readQueryParam, type Lang } from '../i18n/detectLang'
import { syncI18nLanguage } from '../i18n'
import { safeGetStorage, safeSetStorage } from '../lib/storage'

export type { Lang }
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

function initialTheme(): ThemeMode {
  const q = readQueryParam('theme')
  if (q === 'light' || q === 'dark') return q
  const saved = safeGetStorage('openoutcry.theme')
  if (saved === 'light' || saved === 'dark') return saved
  return 'dark'
}

const bootLang = detectInitialLang()

export const useLocaleStore = create<LocaleStoreState>((set, get) => ({
  lang: bootLang,
  theme: initialTheme(),
  marketColors: bootLang === 'en' ? 'intl' : 'cn',

  setLang: (next: Lang) => {
    syncI18nLanguage(next)
    set({
      lang: next,
      marketColors: next === 'en' ? 'intl' : 'cn',
    })
    safeSetStorage('openoutcry.lang', next)
  },

  toggleLang: () => {
    get().setLang(get().lang === 'zh' ? 'en' : 'zh')
  },

  setTheme: (next: ThemeMode) => {
    set({ theme: next })
    safeSetStorage('openoutcry.theme', next)
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
  const { lang, theme, marketColors } = useLocaleStore.getState()
  syncI18nLanguage(lang)
  if (typeof document === 'undefined') return
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
    }),
    [store],
  )
}
