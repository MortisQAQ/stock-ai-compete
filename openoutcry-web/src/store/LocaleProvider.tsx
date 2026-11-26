import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'zh' | 'en'
export type ThemeMode = 'dark' | 'light'
export type MarketColors = 'cn' | 'intl'

interface LocaleContextValue {
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

const LocaleCtx = createContext<LocaleContextValue | null>(null)

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

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme)
  const [marketColors, setMarketColorsState] = useState<MarketColors>(() =>
    initialLang() === 'en' ? 'intl' : 'cn',
  )

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    setMarketColorsState(next === 'en' ? 'intl' : 'cn')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('openoutcry.lang', next)
    }
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'zh' ? 'en' : 'zh')
  }, [lang, setLang])

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('openoutcry.theme', next)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const setMarketColors = useCallback((next: MarketColors) => {
    setMarketColorsState(next)
  }, [])

  const toggleMarketColors = useCallback(() => {
    setMarketColorsState((prev) => (prev === 'cn' ? 'intl' : 'cn'))
  }, [])

  const bi = useCallback((zh: string, en: string) => (lang === 'en' ? en : zh), [lang])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.marketColors = marketColors
  }, [lang, theme, marketColors])

  const value = useMemo<LocaleContextValue>(
    () => ({
      lang,
      isEn: lang === 'en',
      theme,
      marketColors,
      setLang,
      toggleLang,
      setTheme,
      toggleTheme,
      setMarketColors,
      toggleMarketColors,
      bi,
    }),
    [lang, theme, marketColors, setLang, toggleLang, setTheme, toggleTheme, setMarketColors, toggleMarketColors, bi],
  )

  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleCtx)
  if (!ctx) {
    return {
      lang: 'zh',
      isEn: false,
      theme: 'dark',
      marketColors: 'cn',
      setLang: () => {},
      toggleLang: () => {},
      setTheme: () => {},
      toggleTheme: () => {},
      setMarketColors: () => {},
      toggleMarketColors: () => {},
      bi: (zh) => zh,
    }
  }
  return ctx
}
