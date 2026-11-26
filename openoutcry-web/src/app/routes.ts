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
export type RouteGroup = 'primary' | 'reference'

export interface AppRoute {
  /** 路由路径，同时作为导航的 to */
  path: string
  /** 分组：primary 为五步核心闭环，reference 为侧栏底部参考页 */
  group: RouteGroup
  /** 导航与标题文案 */
  nav: {
    /** 侧边栏序号（参考页为空） */
    n: string
    /** 中文导航主文案 */
    label: string
    /** 英文导航主文案 / 副标题 */
    sub: string
    /** 移动端底栏短标签 */
    short: string
    /** 英文短标签 */
    shortEn: string
  }
  lazy: () => Promise<{ Component: ComponentType }>
}

export const APP_ROUTES: AppRoute[] = [
  {
    path: '/connect',
    group: 'primary',
    nav: { n: '01', label: 'Agent 库', sub: 'Agent Roster', short: 'Agent 库', shortEn: 'Agents' },
    lazy: lazyPage(() => import('../routes/ConnectPage'), 'ConnectPage'),
  },
  {
    path: '/studio',
    group: 'primary',
    nav: { n: '02', label: '训练委托', sub: 'Training Desk', short: '委托', shortEn: 'Desk' },
    lazy: lazyPage(() => import('../routes/StudioPage'), 'StudioPage'),
  },
  {
    path: '/training',
    group: 'primary',
    nav: { n: '03', label: '历史训练场', sub: 'Training Ground', short: '训练场', shortEn: 'Arena' },
    lazy: lazyPage(() => import('../routes/TrainingPage'), 'TrainingPage'),
  },
  {
    path: '/review',
    group: 'primary',
    nav: { n: '04', label: '复盘与对照', sub: 'Review & Compare', short: '复盘', shortEn: 'Review' },
    lazy: lazyPage(() => import('../routes/ReviewPage'), 'ReviewPage'),
  },
  {
    path: '/live',
    group: 'primary',
    nav: { n: '05', label: '实战工作台', sub: 'Live Workbench', short: '实战', shortEn: 'Live' },
    lazy: lazyPage(() => import('../routes/LiveWorkbenchPage'), 'LiveWorkbenchPage'),
  },
  {
    path: '/protocol',
    group: 'reference',
    nav: { n: '', label: '协议与 Skill', sub: 'Protocol & Skills', short: '协议', shortEn: 'Protocol' },
    lazy: lazyPage(() => import('../routes/ProtocolPage'), 'ProtocolPage'),
  },
  {
    path: '/guide',
    group: 'reference',
    nav: { n: '', label: '产品说明', sub: 'Product Brief', short: '说明', shortEn: 'Brief' },
    lazy: lazyPage(() => import('../routes/GuidePage'), 'GuidePage'),
  },
]

/** 默认落点：五步闭环第 1 步（Agent 库） */
export const HOME_PATH = APP_ROUTES[0].path
