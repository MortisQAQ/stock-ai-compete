import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { HOME_PATH } from './routes'

export function RouteError() {
  const error = useRouteError()
  const { t } = useTranslation()
  const detail = describe(error, t('common.errors.unknownError'))

  return (
    <div className="page">
      <header className="hero hero-slim">
        <div>
          <span className="label">Unexpected Error</span>
          <h1>{t('common.errors.routeTitle')}</h1>
          <p className="deck">{t('common.errors.routeDeck')}</p>
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
              <Link to={HOME_PATH}>{t('common.errors.backToHome')}</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              {t('common.errors.reload')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function describe(error: unknown, unknownTitle: string): { title: string; message: string } {
  if (isRouteErrorResponse(error)) {
    return { title: `HTTP ${error.status}`, message: error.statusText || String(error.data ?? '') }
  }
  if (error instanceof Error) {
    return { title: error.name, message: error.stack || error.message }
  }
  return { title: unknownTitle, message: String(error) }
}
