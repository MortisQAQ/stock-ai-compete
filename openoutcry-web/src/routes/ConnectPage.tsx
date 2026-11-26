import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Code2, Plus, Shield, SlidersHorizontal } from 'lucide-react'

import { AGENT_ORDER, cardPathOf } from '../data/agents'
import { formatAgent, formatAgentCardJson } from '../i18n/helpers'
import { useDialog } from '../store/DialogProvider'
import { useRun } from '../store/RunProvider'
import { useTraining } from '../store/TrainingProvider'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Stamp } from '../components/ui/Stamp'
import { money } from '../lib/format'
import { cn } from '../lib/utils'
import type { AgentId } from '../types'

function KV({ k, v, last = false }: { k: string; v: string; last?: boolean }) {
  return (
    <div
      className={
        'flex items-baseline justify-between gap-4 py-2' +
        (last ? '' : ' border-b border-[var(--line-soft)]')
      }
    >
      <span className="text-note text-muted-foreground">{k}</span>
      <b className="text-right font-mono text-note font-semibold text-foreground">{v}</b>
    </div>
  )
}

/**
 * Step 01 · Agent 库（主从一屏布局）：
 */
export function ConnectPage() {
  const { state } = useRun('training')
  const { records, setDraftAgent } = useTraining()
  const { open } = useDialog()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [selected, setSelected] = useState<AgentId>(state.agent)
  const [inspectTab, setInspectTab] = useState<'card' | 'json'>('card')

  const card = formatAgent(selected, t)
  const cardJson = formatAgentCardJson(selected, t)
  const quotes = records.filter((r) => r.team.includes(selected)).map((r) => r.no)

  const goToMandate = () => {
    setDraftAgent(selected)
    navigate('/studio')
  }

  return (
    <>
      <div className="vlabel page-vlabel" aria-hidden="true">
        OPENOUTCRY / 01 AGENT ROSTER / 2026
      </div>

      <div className="pagehead">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="label">{t('connect.kicker')}</span>
            <Stamp tone="slate" size="sm">
              {t('connect.stamp')}
            </Stamp>
          </div>
          <h1>{t('connect.title')}</h1>
          <p className="deck">{t('connect.deck')}</p>
        </div>
        <div className="pagehead-actions">
          <Button variant="outline" size="sm" onClick={() => open({ kind: 'onboard' })}>
            <Plus size={15} aria-hidden />
            {t('connect.btnConnectNew')}
          </Button>
          <Button variant="solid" size="sm" onClick={goToMandate}>
            {t('connect.btnCreateMandate')}
            <ArrowRight size={15} aria-hidden />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section aria-label={t('connect.listAria')} className="flex min-w-0 flex-col gap-2.5">
          <div className="flex items-baseline justify-between px-1">
            <span className="label">
              {t('connect.registeredCount', { count: AGENT_ORDER.length })}
            </span>
            <span className="font-mono text-micro text-[var(--fg-2)]">
              {t('connect.countBreakdown')}
            </span>
          </div>

          {AGENT_ORDER.map((id) => {
            const meta = formatAgent(id, t)
            const active = selected === id
            const inUse = state.agent === id
            return (
              <Card
                key={id}
                interactive
                onClick={() => setSelected(id)}
                aria-pressed={active}
                className={cn(
                  'transition-colors',
                  active && 'shadow-[inset_3px_0_0_var(--lime),inset_0_0_0_1px_var(--line-lime)]',
                )}
              >
                <CardContent className="py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-sans text-body font-semibold text-[var(--fg-0)]">
                      {meta.name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {inUse ? <Badge variant="pine">{t('connect.activeBadge')}</Badge> : null}
                      <Badge variant={meta.cardOrigin === 'builtin' ? 'pine' : 'outline'}>
                        {meta.cardOrigin === 'builtin'
                          ? t('connect.builtinBadge')
                          : t('connect.localAcpBadge')}
                      </Badge>
                    </span>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-note leading-relaxed text-[var(--fg-2)]">
                    {meta.description}
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--line-soft)] pt-2 font-mono text-micro text-[var(--fg-1)]">
                    <span>{t('connect.metaModel')}: {meta.model}</span>
                    <span>{t('connect.metaRisk')}: {meta.riskProfile}</span>
                    <span>{t('connect.metaCap')}: {meta.maxPositionPct}%</span>
                    <span>{t('connect.metaTools')}: {meta.tools}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <button
            type="button"
            onClick={() => open({ kind: 'onboard' })}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--bg-1)] px-4 py-3 text-note font-medium text-[var(--fg-1)] transition-colors hover:border-[var(--lime)] hover:text-[var(--fg-0)]"
          >
            <Plus size={16} aria-hidden className="text-[var(--lime)]" />
            {t('connect.btnConnectLocal')}
          </button>
        </section>

        <section aria-label={t('connect.inspectorAria')} className="min-w-0">
          <Card className="h-full">
            <CardHeader className="flex-wrap gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span>{card.name}</span>
                <span className="font-mono text-micro text-[var(--fg-2)]">{cardPathOf(selected)}</span>
              </div>
              <div className="flex items-center gap-1 rounded-md bg-[var(--bg-2)] p-0.5">
                <button
                  type="button"
                  onClick={() => setInspectTab('card')}
                  className={cn(
                    'flex items-center gap-1 rounded px-2.5 py-1 font-mono text-micro',
                    inspectTab === 'card'
                      ? 'bg-[var(--lime-soft)] font-semibold text-[var(--fg-0)]'
                      : 'text-[var(--fg-2)]',
                  )}
                >
                  <SlidersHorizontal size={13} aria-hidden />
                  {t('connect.tabSpec')}
                </button>
                <button
                  type="button"
                  onClick={() => setInspectTab('json')}
                  className={cn(
                    'flex items-center gap-1 rounded px-2.5 py-1 font-mono text-micro',
                    inspectTab === 'json'
                      ? 'bg-[var(--lime-soft)] font-semibold text-[var(--fg-0)]'
                      : 'text-[var(--fg-2)]',
                  )}
                >
                  <Code2 size={13} aria-hidden />
                  {t('connect.tabJson')}
                </button>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Stamp tone={card.builtin ? 'pine' : 'slate'} size="sm">
                  {card.qualification}
                </Stamp>
                <Badge variant="outline">
                  {card.cardOrigin === 'builtin'
                    ? t('connect.originBuiltin')
                    : t('connect.originLocal')}
                </Badge>
                {card.strategyTags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>

              {inspectTab === 'card' ? (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
                  <div className="min-w-0">
                    <div className="mb-3 rounded-lg bg-[var(--bg-2)] p-3.5">
                      <div className="font-mono text-micro text-[var(--fg-2)]">
                        {t('connect.personaTitle')}
                      </div>
                      <p className="mt-1.5 text-note leading-relaxed text-[var(--fg-0)]">
                        {card.persona || t('connect.personaEmpty')}
                      </p>
                    </div>
                    <KV k={t('connect.kvSourceVersion')} v={`${card.source} · ${card.version}`} />
                    <KV k={t('connect.kvModel')} v={card.model} />
                    <KV k={t('connect.kvRiskHolding')} v={`${card.riskProfile} · ${card.holdingPeriod}`} />
                    <KV
                      k={t('connect.kvDefaultCapital')}
                      v={money(card.initialCash) + t('connect.mandateOverrides')}
                    />
                    <KV
                      k={t('connect.kvPositionLimits')}
                      v={t('connect.positionLimitsVal', {
                        maxPositions: card.maxPositions,
                        maxPositionPct: card.maxPositionPct,
                      })}
                    />
                    <KV
                      k={t('connect.kvToolWhitelist')}
                      v={
                        card.tools === 0
                          ? t('connect.toolsUndeclared')
                          : t('connect.toolsCount', { count: card.tools })
                      }
                    />
                    <KV
                      k={t('connect.kvReferencedRuns')}
                      v={quotes.length === 0 ? t('connect.runsNone') : quotes.join(' · ')}
                      last
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="mb-1.5 font-mono text-micro text-[var(--fg-2)]">
                      {t('connect.rawJsonTitle')}
                    </div>
                    <pre className="code max-w-full overflow-x-auto">{cardJson}</pre>
                  </div>
                </div>
              ) : (
                <pre className="code max-w-full overflow-x-auto">{cardJson}</pre>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-3.5">
                <span className="flex items-center gap-2 text-note text-[var(--fg-2)]">
                  <Shield size={15} aria-hidden className="text-[var(--lime)]" />
                  {t('connect.securityNote')}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => open({ kind: 'agent', agentId: selected })}>
                    {t('connect.btnEditDraft')}
                  </Button>
                  <Button variant="solid" size="sm" onClick={goToMandate}>
                    {t('connect.btnCreateWith', { name: card.shortName })}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  )
}
