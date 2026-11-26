import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Code2, Plus, SlidersHorizontal } from 'lucide-react'

import { AGENT_ORDER, cardPathOf } from '../data/agents'
import { formatAgent, formatAgentCardJson } from '../i18n/helpers'
import { money } from '../lib/format'
import { cn } from '../lib/utils'
import { useDialog } from '../store/DialogProvider'
import { useRun } from '../store/RunProvider'
import { useTraining } from '../store/TrainingProvider'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Stamp } from '../components/ui/Stamp'
import type { AgentId } from '../types'

function KV({ k, v, last = false }: { k: string; v: string; last?: boolean }) {
  return (
    <div
      className={
        'flex items-baseline justify-between gap-4 py-3' +
        (last ? '' : ' border-b border-[var(--line-soft)]')
      }
    >
      <span className="text-note text-muted-foreground">{k}</span>
      <b className="text-right font-mono text-note font-medium tabular-nums text-foreground">{v}</b>
    </div>
  )
}

/**
 * Step 01 · Agent 库（主从一屏布局）：
 * 左侧列表聚焦核心元数据，右侧审查 Agent 卡配置与 JSON，
 * 选定后直接带着该 Agent 进入 Step 02 训练委托台；接入新 Agent 收进弹窗。
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
      <div className="pagehead">
        <div>
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <section aria-label={t('connect.listAria')} className="flex min-w-0 flex-col gap-3">
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
                  active && 'shadow-[inset_3px_0_0_var(--lime),inset_0_0_0_1px_var(--line-lime-soft)]',
                )}
              >
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-sans text-body font-semibold text-[var(--fg-0)]">
                      {meta.name}
                    </span>
                    <Badge variant={inUse ? 'pine' : meta.cardOrigin === 'builtin' ? 'pine' : 'outline'}>
                      {inUse
                        ? t('connect.activeBadge')
                        : meta.cardOrigin === 'builtin'
                          ? t('connect.builtinBadge')
                          : t('connect.localAcpBadge')}
                    </Badge>
                  </div>

                  <p className="mt-2 line-clamp-2 text-note leading-relaxed text-[var(--fg-2)]">
                    {meta.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-micro text-[var(--fg-2)]">
                    <span className="font-mono">{meta.model}</span>
                    <span>{meta.riskProfile}</span>
                    <span className="font-mono tabular-nums">
                      {t('connect.capShort', { pct: meta.maxPositionPct })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <button
            type="button"
            onClick={() => open({ kind: 'onboard' })}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] bg-[var(--bg-1)] px-4 py-3.5 text-note font-medium text-[var(--fg-1)] transition-colors hover:border-[var(--lime)] hover:text-[var(--fg-0)]"
          >
            <Plus size={16} aria-hidden className="text-[var(--lime)]" />
            {t('connect.btnConnectLocal')}
          </button>
        </section>

        <section aria-label={t('connect.inspectorAria')} className="min-w-0">
          <Card className="h-full">
            <CardHeader className="flex-wrap gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <span className="font-semibold text-[var(--fg-0)]">{card.name}</span>
                <Stamp tone={card.builtin ? 'pine' : 'slate'} size="sm">
                  {card.qualification}
                </Stamp>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-[var(--bg-1)] p-1">
                <button
                  type="button"
                  onClick={() => setInspectTab('card')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1 text-micro font-medium transition-colors',
                    inspectTab === 'card'
                      ? 'bg-[var(--lime-soft)] text-[var(--fg-0)]'
                      : 'text-[var(--fg-2)] hover:text-[var(--fg-0)]',
                  )}
                >
                  <SlidersHorizontal size={13} aria-hidden />
                  {t('connect.tabSpec')}
                </button>
                <button
                  type="button"
                  onClick={() => setInspectTab('json')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1 text-micro font-medium transition-colors',
                    inspectTab === 'json'
                      ? 'bg-[var(--lime-soft)] text-[var(--fg-0)]'
                      : 'text-[var(--fg-2)] hover:text-[var(--fg-0)]',
                  )}
                >
                  <Code2 size={13} aria-hidden />
                  {t('connect.tabJson')}
                </button>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              {inspectTab === 'card' ? (
                <div className="space-y-5">
                  <div className="rounded-xl bg-[var(--bg-1)] p-4">
                    <div className="text-micro font-medium text-[var(--fg-2)]">
                      {t('connect.personaTitle')}
                    </div>
                    <p className="mt-2 text-note leading-relaxed text-[var(--fg-0)]">
                      {card.persona || t('connect.personaEmpty')}
                    </p>
                  </div>

                  <div>
                    <KV k={t('connect.kvSourceVersion')} v={`${card.source} · ${card.version}`} />
                    <KV k={t('connect.kvModel')} v={card.model} />
                    <KV k={t('connect.kvRiskHolding')} v={`${card.riskProfile} · ${card.holdingPeriod}`} />
                    <KV k={t('connect.kvDefaultCapital')} v={money(card.initialCash)} />
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
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="font-mono text-micro text-[var(--fg-2)]">{cardPathOf(selected)}</div>
                  <pre className="code max-w-full overflow-x-auto">{cardJson}</pre>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--line-soft)] pt-5">
                <Button variant="ghost" size="sm" onClick={() => open({ kind: 'agent', agentId: selected })}>
                  {t('connect.btnEditDraft')}
                </Button>
                <Button variant="solid" size="sm" onClick={goToMandate}>
                  {t('connect.btnCreateWith', { name: card.shortName })}
                  <ArrowRight size={15} aria-hidden />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  )
}
