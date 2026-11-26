import { APP_ROUTES, type RouteGroup } from './app/routes'

export interface NavItem {
  to: string
  group: RouteGroup
  n: string
  label: string
  sub: string
  short: string
  shortEn: string
}

/**
 * 导航与路由同源：APP_ROUTES 是唯一声明，这里只做形状转换。
 */
export const NAV: NavItem[] = APP_ROUTES.map(({ path, group, nav }) => ({
  to: path,
  group,
  n: nav.n,
  label: nav.label,
  sub: nav.sub,
  short: nav.short,
  shortEn: nav.shortEn,
}))

export const PRIMARY_NAV: NavItem[] = NAV.filter((item) => item.group === 'primary')
export const REFERENCE_NAV: NavItem[] = NAV.filter((item) => item.group === 'reference')

export const titleOf = (pathname: string, lang: 'zh' | 'en' = 'zh'): string => {
  const hit = APP_ROUTES.find((route) => route.path === pathname) ?? APP_ROUTES[0]
  return lang === 'en' ? hit.nav.sub : hit.nav.label
}
