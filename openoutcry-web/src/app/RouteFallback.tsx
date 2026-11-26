import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { HOME_PATH } from './routes'

export function BootFallback() {
  const { t } = useTranslation()
  return (
    <div className="page" aria-busy="true">
      <p className="label">Loading</p>
      <p className="deck">{t('common.errors.loading')}</p>
    </div>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="page">
      <header className="hero hero-slim">
        <div>
          <span className="label">404</span>
          <h1>{t('common.errors.notFoundTitle')}</h1>
          <p className="deck">{t('common.errors.notFoundDeck')}</p>
        </div>
      </header>
      <Button variant="solid" size="sm" asChild>
        <Link to={HOME_PATH}>{t('common.errors.backToStudio')}</Link>
      </Button>
    </div>
  )
}
