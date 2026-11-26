import i18n, { type TFunction } from 'i18next'
import { initReactI18next } from 'react-i18next'

import type { I18nParams, TranslationKey } from '../types'
import { detectInitialLang, type Lang } from './detectLang'
import en from './locales/en.json'
import zh from './locales/zh.json'

export const resources = {
  zh: { translation: zh },
  en: { translation: en },
} as const

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: detectInitialLang(),
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })
}

export function syncI18nLanguage(lang: Lang): void {
  if (i18n.language !== lang) {
    void i18n.changeLanguage(lang)
  }
}

export type AppTFunction = TFunction<'translation', undefined>

/**
 * Typed fixed-language translator helper for pure selectors/stores.
 */
export function fixedT(lang: Lang): AppTFunction {
  return i18n.getFixedT(lang, 'translation') as unknown as AppTFunction
}

/**
 * Compile-time checked dynamic key lookup that avoids TS2589 union-distribution
 * overhead on i18next's overloaded TFunction when passing a TranslationKey variable.
 */
export function translateKey(t: AppTFunction, key: TranslationKey, params?: I18nParams): string {
  const fn = t as unknown as (k: string, opts?: Record<string, unknown>) => string
  return params ? fn(key, params) : fn(key)
}

export { i18n }
export default i18n
