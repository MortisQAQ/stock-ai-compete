import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { HOME_PATH } from './routes'

/**
 * 路由级错误边界。
 *
 * 之前的版本没有兜底：任何一处渲染异常都会让整页白屏。
 * 这里挂在布局路由上，页面级错误只会替换 <Outlet /> 的内容，纸面外壳还在，
 * 用户能直接回到训练场，而不是面对一片空白。
 */
export function RouteError() {
  const error = useRouteError()
  const detail = describe(error)

  return (
    <div className="page">
      <header className="hero hero-slim">
        <div>
          <span className="label">Unexpected Error</span>
          <h1>这一页没能渲染。</h1>
          <p className="deck">
            出错的是当前页面的代码，不是你的数据。运行状态仍保留在浏览器内存里，回到训练场可以继续。
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <span>Error</span>
          <span className="normal-case tracking-[0.06em]">{detail.title}</span>
        </CardHeader>
        <CardContent>
          <pre className="code whitespace-pre-wrap">
            {detail.message}
          </pre>
          <div className="proposal-actions">
            <Button variant="solid" size="sm" asChild>
              <Link to={HOME_PATH}>回到训练场</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function describe(error: unknown): { title: string; message: string } {
  if (isRouteErrorResponse(error)) {
    return { title: `HTTP ${error.status}`, message: error.statusText || String(error.data ?? '') }
  }
  if (error instanceof Error) {
    return { title: error.name, message: error.stack || error.message }
  }
  return { title: '未知错误', message: String(error) }
}
