import type { ComponentType } from 'react'

import { lazyPage } from './lazyPage'

/**
 * 应用路由表 —— 全站唯一的路由声明。
 *
 * 这里只有数据，没有 JSX：一行一个路由，读起来就是一张目录。
 * 侧边导航、面包屑标题、移动端短标签都从这里派生（见 src/nav.ts），
 * 新加页面时只需要在下面追加一项，导航和标题会自动跟上。
 *
 * 页面用 `lazyPage` 做路由级代码分割：首屏只加载当前路由的 chunk，
 * 其余页面等用户真正导航过去再拉取。
 */
export interface AppRoute {
  /** 路由路径，同时作为导航的 to */
  path: string
  /** 导航与标题文案 */
  nav: {
    /** 侧边栏序号 */
    n: string
    /** 页面标题 / 导航主文案 */
    label: string
    /** 英文副标题 */
    sub: string
    /** 移动端底栏用的短标签 */
    short: string
  }
  lazy: () => Promise<{ Component: ComponentType }>
}

export const APP_ROUTES: AppRoute[] = [
  {
    path: '/studio',
    nav: { n: '01', label: '委托台', sub: 'Training Desk', short: '委托台' },
    lazy: lazyPage(() => import('../routes/StudioPage'), 'StudioPage'),
  },
  {
    path: '/training',
    nav: { n: '02', label: '训练场', sub: 'Training Ground', short: '训练场' },
    lazy: lazyPage(() => import('../routes/TrainingPage'), 'TrainingPage'),
  },
  {
    path: '/review',
    nav: { n: '03', label: '结果与复盘', sub: 'Review', short: '复盘' },
    lazy: lazyPage(() => import('../routes/ReviewPage'), 'ReviewPage'),
  },
  {
    path: '/connect',
    nav: { n: '04', label: '连接 Agent', sub: 'Connect', short: '接入' },
    lazy: lazyPage(() => import('../routes/ConnectPage'), 'ConnectPage'),
  },
  {
    path: '/protocol',
    nav: { n: '05', label: '协议与 Skill', sub: 'Protocol', short: '协议' },
    lazy: lazyPage(() => import('../routes/ProtocolPage'), 'ProtocolPage'),
  },
  {
    path: '/guide',
    nav: { n: '06', label: '产品说明', sub: 'Brief', short: '说明' },
    lazy: lazyPage(() => import('../routes/GuidePage'), 'GuidePage'),
  },
]

/** 默认落点：第一个路由 */
export const HOME_PATH = APP_ROUTES[0].path
