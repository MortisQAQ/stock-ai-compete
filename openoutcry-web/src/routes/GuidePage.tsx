import { useTranslation } from 'react-i18next'

import MvpDoc from '../docs/openOutcry-产品设计与功能-MVP.mdx'
import { Card } from '../components/ui/Card'
import { Stamp } from '../components/ui/Stamp'

export function GuidePage() {
  const { t } = useTranslation()

  return (
    <>
      <div className="vlabel page-vlabel" aria-hidden="true">
        OPENOUTCRY / PRODUCT SPEC / 2026
      </div>

      <div className="pagehead">
        <div>
          <div className="label">{t('common.guide.kicker')}</div>
          <h1>{t('common.guide.title')}</h1>
          <p className="deck">{t('common.guide.deck')}</p>
        </div>
        <Stamp tone="lime">{t('common.guide.stamp')}</Stamp>
      </div>

      <div className="steps frame mt-0">
        <Card className="step">
          <div className="step-no" aria-hidden="true">01</div>
          <h3>{t('common.guide.step1Title')}</h3>
          <p>{t('common.guide.step1Body')}</p>
        </Card>
        <Card className="step">
          <div className="step-no" aria-hidden="true">02</div>
          <h3>{t('common.guide.step2Title')}</h3>
          <p>{t('common.guide.step2Body')}</p>
        </Card>
        <Card className="step">
          <div className="step-no" aria-hidden="true">03</div>
          <h3>{t('common.guide.step3Title')}</h3>
          <p>{t('common.guide.step3Body')}</p>
        </Card>
      </div>

      <article className="mdx-doc mt-10 border-t border-[var(--line-lime-soft)] pt-8">
        <MvpDoc />
      </article>

      <div className="foot">
        <span>
          <b>openOutcry</b> — {t('common.guide.footDesc')}
        </span>
        <span>{t('common.guide.footSpec')}</span>
      </div>
    </>
  )
}
