import { Link } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { HOME_PATH } from './routes'

/** 首次加载路由 chunk 时的占位（只盖住内容区，纸面外壳由 AppShell 提供） */
export function BootFallback() {
  return (
    <div className="page" aria-busy="true">
      <p className="label">Loading</p>
      <p className="deck">正在装载页面…</p>
    </div>
  )
}

/** 未匹配路径：给回得去的出口，而不是空白 */
export function NotFoundPage() {
  return (
    <div className="page">
      <header className="hero hero-slim">
        <div>
          <span className="label">404</span>
          <h1>这里没有页面。</h1>
          <p className="deck">链接可能已经过期，或者这个入口还没做。</p>
        </div>
      </header>
      <Button variant="solid" size="sm" asChild>
        <Link to={HOME_PATH}>回到新建训练</Link>
      </Button>
    </div>
  )
}
