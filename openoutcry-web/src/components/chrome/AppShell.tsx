import { useEffect } from 'react'
import { Outlet, useLocation, useNavigation } from 'react-router-dom'
import { Tape } from './Tape'
import { Masthead } from './Masthead'
import { SideNav } from './SideNav'
import { MobileNav } from './MobileNav'
import { Toasts } from '../ui/Toasts'
import { Dialogs } from '../dialogs/Dialogs'
import { cn } from '../../lib/utils'

export function AppShell() {
  const { pathname } = useLocation()
  const navigation = useNavigation()
  const training = pathname === '/training'
  const busy = navigation.state !== 'idle'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
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
      <Tape />
      <Masthead />
      <MobileNav />
      <div className={cn('shell', training && 'min-[1100px]:grid-cols-[64px_minmax(0,1fr)]')}>
        <SideNav />
        <main className={cn('page', training && 'max-w-none')} id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <Toasts />
      <Dialogs />
    </>
  )
}
