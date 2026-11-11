import { useEffect } from 'react'
import { Outlet, useLocation, useNavigation } from 'react-router-dom'

import { Sidebar } from './Sidebar'
import { Toasts } from '../ui/Toasts'
import { Dialogs } from '../dialogs/Dialogs'
import { TrainingProvider } from '../../store/TrainingProvider'
import { cn } from '../../lib/utils'

/**
 * 应用外框 = 左栏（页面索引 + 训练任务树）+ 内容区。
 *
 * 布局参考 DSH：导航竖排进左栏，正文独占剩余宽度。
 * 原来的两条顶部横栏（品牌行 / 站点索引行）已整体删除 ——
 * 它们常驻吃掉 113px 视口高度，却只放六个两字入口。
 */
export function AppShell() {
  const { pathname } = useLocation()
  const navigation = useNavigation()
  const bench = pathname === '/training'
  const busy = navigation.state !== 'idle'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <TrainingProvider>
      {/* 路由级懒加载：切页时等 chunk 才有内容，给一条细进度条，避免"点了没反应" */}
      {busy ? (
        <div
          aria-hidden
          className="fixed inset-x-0 top-0 z-[100] h-[2px] animate-pulse bg-ver"
          data-slot="route-progress"
        />
      ) : null}
      <a className="skip-link" href="#main">
        跳到主内容
      </a>

      <div className="app-frame">
        <Sidebar />
        <main
          className={cn('page app-main', bench && 'app-main--bench')}
          id="main"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>

      <Toasts />
      <Dialogs />
    </TrainingProvider>
  )
}
