import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs'
import { Stamp } from '../components/ui/Stamp'
import { PROTOCOL_SAMPLES } from '../data/protocol'
import type { ProtocolKey } from '../data/protocol'
import type { TranslationKey } from '../types'

const TABS: ReadonlyArray<{ id: ProtocolKey; labelKey: TranslationKey }> = [
  { id: 'message', labelKey: 'common.protocol.tabMessage' },
  { id: 'event', labelKey: 'common.protocol.tabEvent' },
  { id: 'action', labelKey: 'common.protocol.tabAction' },
]

export function ProtocolPage() {
  const [tab, setTab] = useState<ProtocolKey>('message')
  const { t } = useTranslation()
  const sample = PROTOCOL_SAMPLES[tab]

  return (
    <>
      <div className="vlabel page-vlabel" aria-hidden="true">
        OPENOUTCRY / PROTOCOL SPEC / 2026
      </div>

      <div className="pagehead">
        <div>
          <div className="label">{t('common.protocol.kicker')}</div>
          <h1>{t('common.protocol.title')}</h1>
          <p className="deck">{t('common.protocol.deck')}</p>
        </div>
        <Stamp tone="slate">{t('common.protocol.stamp')}</Stamp>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line-soft)] pl-1 pr-4">
          <Tabs value={tab} onValueChange={(value) => setTab(value as ProtocolKey)}>
            <TabsList className="w-auto border-b-0">
              {TABS.map((item) => (
                <TabsTrigger key={item.id} value={item.id}>
                  {t(item.labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {sample.type}
          </Badge>
        </div>
        <pre className="code code-block">{JSON.stringify(sample.payload, null, 2)}</pre>
      </Card>

      <div className="steps mt-4">
        <Card className="step" key="obs">
          <div className="label">01 — Observation</div>
          <h3>{t('common.protocol.card1Title')}</h3>
          <p>{t('common.protocol.card1Body')}</p>
        </Card>
        <Card className="step" key="act">
          <div className="label">02 — Action</div>
          <h3>{t('common.protocol.card2Title')}</h3>
          <p>{t('common.protocol.card2Body')}</p>
        </Card>
        <Card className="step" key="evt">
          <div className="label">03 — Event</div>
          <h3>{t('common.protocol.card3Title')}</h3>
          <p>{t('common.protocol.card3Body')}</p>
        </Card>
      </div>

      <div className="foot">
        <span>
          <b>Protocol</b> — observation / action / event
        </span>
        <span>{t('common.protocol.footVersion')}</span>
      </div>
    </>
  )
}
