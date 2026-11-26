import { useEffect } from 'react'
import { Outlet, useLocation, useNavigation } from 'react-router-dom'

import { Sidebar } from './Sidebar'
import { Toasts } from '../ui/Toasts'
import { Dialogs } from '../dialogs/Dialogs'
import { WorkbenchScopeProvider } from '../../store/RunProvider'
import { cn } from '../../lib/utils'

/**
 * 应用外框 = 左栏（页面索引 + 实战/训练任务树）+ 内容区。
 *
 * 布局参考 DSH：导航竖排进左栏，正文独占剩余宽度。
 * 历史训练场与实战工作台通过 WorkbenchScopeProvider 共享同一套工作台组件。
 */
export function AppShell() {
  const { pathname } = useLocation()
  const navigation = useNavigation()
  const isLive = pathname === '/live'
  const bench = pathname === '/training' || isLive
  const busy = navigation.state !== 'idle'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <WorkbenchScopeProvider kind={isLive ? 'live' : 'training'}>
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
    </WorkbenchScopeProvider>
  )
}
