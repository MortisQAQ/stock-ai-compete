import { createHashRouter, Navigate } from 'react-router-dom'

import { AppShell } from '../components/chrome/AppShell'
import { RouteError } from './RouteError'
import { BootFallback, NotFoundPage } from './RouteFallback'
import { APP_ROUTES, HOME_PATH } from './routes'

/**
 * 路由器装配 —— 这里只负责「怎么拼」，路由有哪几条看 routes.ts。
 *
 * 用 createHashRouter（数据路由）：base 是 './'，dist 可以直接丢到 GitHub Pages
 * 子路径，不需要 404 重写规则；同时拿到路由级 errorElement 与 lazy。
 *
 * 布局路由（无 path）挂 AppShell + errorElement：
 * 页面级异常只替换 <Outlet />，走带、报头、侧栏都还在。
 */
export const router = createHashRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    HydrateFallback: BootFallback,
    children: [
      { index: true, element: <Navigate to={HOME_PATH} replace /> },
      ...APP_ROUTES.map(({ path, lazy }) => ({ path, lazy })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
