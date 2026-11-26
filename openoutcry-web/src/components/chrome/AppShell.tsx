import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation, useNavigation } from 'react-router-dom'

import { Sidebar } from './Sidebar'
import { Toasts } from '../ui/Toasts'
import { Dialogs } from '../dialogs/Dialogs'
import { WorkbenchScopeProvider } from '../../store/RunProvider'
import { cn } from '../../lib/utils'

/**
 * 应用外框 = 左栏（页面索引 + 实战/训练任务树）+ 内容区。
 */
export function AppShell() {
  const { pathname } = useLocation()
  const navigation = useNavigation()
  const { t } = useTranslation()
  const isLive = pathname === '/live'
  const bench = pathname === '/training' || isLive
  const busy = navigation.state !== 'idle'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <WorkbenchScopeProvider kind={isLive ? 'live' : 'training'}>
      {busy ? (
        <div
          aria-hidden
          className="fixed inset-x-0 top-0 z-[100] h-[2px] animate-pulse bg-ver"
          data-slot="route-progress"
        />
      ) : null}
      <a className="skip-link" href="#main">
        {t('nav.skipToMain')}
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
