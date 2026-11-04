import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Tape } from './Tape'
import { Masthead } from './Masthead'
import { SideNav } from './SideNav'
import { MobileNav } from './MobileNav'
import { Toasts } from '../ui/Toasts'
import { Dialogs } from '../dialogs/Dialogs'
import { cn } from '../../lib/utils'

export function AppShell() {
  const { pathname } = useLocation()
  const training = pathname === '/training'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
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
