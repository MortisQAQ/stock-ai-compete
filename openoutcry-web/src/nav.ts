import { APP_ROUTES, type RouteGroup } from './app/routes'
import { fixedT, translateKey } from './i18n'
import type { Lang } from './i18n/detectLang'
import type { TranslationKey } from './types'

export interface NavItem {
  to: string
  group: RouteGroup
  n: string
  labelKey: TranslationKey
  shortKey: TranslationKey
}

const ROUTE_NAV_KEYS: Record<string, { labelKey: TranslationKey; shortKey: TranslationKey }> = {
  '/connect': { labelKey: 'nav.connect.label', shortKey: 'nav.connect.short' },
  '/studio': { labelKey: 'nav.studio.label', shortKey: 'nav.studio.short' },
  '/training': { labelKey: 'nav.training.label', shortKey: 'nav.training.short' },
  '/review': { labelKey: 'nav.review.label', shortKey: 'nav.review.short' },
  '/live': { labelKey: 'nav.live.label', shortKey: 'nav.live.short' },
  '/protocol': { labelKey: 'nav.protocol.label', shortKey: 'nav.protocol.short' },
  '/guide': { labelKey: 'nav.guide.label', shortKey: 'nav.guide.short' },
}

/**
 * 导航与路由同源：APP_ROUTES 是唯一声明，这里只做形状转换。
 */
export const NAV: NavItem[] = APP_ROUTES.map(({ path, group, nav }) => {
  const keys = ROUTE_NAV_KEYS[path] ?? { labelKey: 'nav.connect.label', shortKey: 'nav.connect.short' }
  return {
    to: path,
    group,
    n: nav.n,
    labelKey: keys.labelKey,
    shortKey: keys.shortKey,
  }
})

export const PRIMARY_NAV: NavItem[] = NAV.filter((item) => item.group === 'primary')
export const REFERENCE_NAV: NavItem[] = NAV.filter((item) => item.group === 'reference')

export const titleOf = (pathname: string, lang: Lang = 'zh'): string => {
  const hit = NAV.find((item) => item.to === pathname) ?? NAV[0]
  return translateKey(fixedT(lang), hit.labelKey)
}
