import { APP_ROUTES } from './app/routes'

export interface NavItem {
  to: string
  n: string
  label: string
  sub: string
  short: string
}

/**
 * 导航与路由同源：APP_ROUTES 是唯一声明，这里只做形状转换。
 * 之前 NAV、路由表、移动端短标签各自维护一份，加一个页面要改三处。
 */
export const NAV: NavItem[] = APP_ROUTES.map(({ path, nav }) => ({
  to: path,
  n: nav.n,
  label: nav.label,
  sub: nav.sub,
  short: nav.short,
}))

export const titleOf = (pathname: string): string =>
  APP_ROUTES.find((route) => route.path === pathname)?.nav.label ?? APP_ROUTES[0].nav.label
