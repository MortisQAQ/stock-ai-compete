import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  formatAsset,
  formatCollab,
  formatMarketSession,
  formatProposal,
  formatSyncLabel,
  formatTrade,
} from '../../i18n/helpers'
import { money, signed, tone } from '../../lib/format'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useRun, useWorkspaceKind } from '../../store/RunProvider'
import { proposalTextOf } from '../../store/derive'
import { holdingRowsOf, openFeesOf } from '../../store/selectors'
import type { Trade, TranslationKey } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs'

const TABS: ReadonlyArray<{ id: 'account' | 'holdings' | 'trades' | 'state'; labelKey: TranslationKey }> = [
  { id: 'account', labelKey: 'tabs.account' },
  { id: 'holdings', labelKey: 'tabs.holdings' },
  { id: 'trades', labelKey: 'tabs.trades' },
  { id: 'state', labelKey: 'tabs.state' },
]

type TabId = (typeof TABS)[number]['id']

const isTabId = (value: string): value is TabId => TABS.some((tab) => tab.id === value)

export function WorkbenchTabs() {
  const kind = useWorkspaceKind()
  const { state, totals } = useRun()
  const { open } = useDialog()
  const { lang } = useLocale()
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabId>('account')
  const rows = holdingRowsOf(state, totals)
  const openFees = openFeesOf(state)
  const used = 12
  const pctUsed = Math.round((used / 20) * 100)
  const sealed = state.status === 'aborted'
  const isLive = state.kind === 'live'
  const proposalView = formatProposal(state.proposal, t)

  const openTrade = (trade: Trade) => open({ kind: 'detail', id: trade.id, scope: kind })

  return (
    <Card>
      <CardHeader>
        <span>{isLive ? t('tabs.liveLedgerTitle') : t('tabs.simLedgerTitle')}</span>
        <Badge variant="outline">
          {isLive
            ? t('tabs.badgeLive')
            : state.mode === 'goal'
              ? t('tabs.badgeGoal')
              : t('tabs.badgeHitl')}
        </Badge>
      </CardHeader>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (isTabId(value)) setTab(value)
        }}
        className="gap-0"
      >
        <TabsList className="px-1">
          {TABS.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {t(item.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="account" className="tabpane">
          <div className="kv">
            <span>{isLive ? t('tabs.mirrorEquity') : t('tabs.totalEquity')}</span>
            <span className="dots" />
            <b>{money(totals.equity)}</b>
          </div>
          <div className="kv">
            <span>{t('tabs.netPnl')}</span>
            <span className="dots" />
            <b className={tone(totals.net)}>{signed(totals.net)}</b>
          </div>
          <div className="kv">
            <span>{t('tabs.realized')}</span>
            <span className="dots" />
            <b className={tone(state.realized)}>{signed(state.realized)}</b>
          </div>
          <div className="kv">
            <span>{t('tabs.unrealized')}</span>
            <span className="dots" />
            <b className={tone(totals.floating)}>{signed(totals.floating)}</b>
          </div>
          <div className="kv">
            <span>{t('tabs.totalFees')}</span>
            <span className="dots" />
            <b>−{money(state.fees)}</b>
          </div>
        </TabsContent>

        <TabsContent value="holdings" className="tabpane">
          {isLive ? (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-soft)] pb-2.5">
              <span className="font-mono text-micro text-[var(--fg-2)]">
                {formatSyncLabel(state.syncKey, state.syncLabel, t)}
              </span>
              <Button variant="outline" size="sm" onClick={() => open({ kind: 'editHolding', scope: kind })}>
                {t('tabs.addEditHolding')}
              </Button>
            </div>
          ) : null}

          {rows.length === 0 ? (
            <p className="note">{t('tabs.noPositions')}</p>
          ) : (
            rows.map((row) => (
              <div className="holding" key={row.name}>
                <div className="holding-top">
                  <b>{formatAsset(row.name, t)}</b>
                  <em className={row.tone}>{signed(row.pnl)}</em>
                </div>
                <div className="holding-sub">
                  <span>
                    {t('tabs.holdingMeta', { qty: row.quantity, cost: row.cost, price: row.price })}
                  </span>
                  <span>{row.sharePct.toFixed(1)}%</span>
                </div>
                <div className="holding-sub items-center">
                  <span>{t('tabs.sellable', { count: row.sellable })}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">T+1</Badge>
                    {isLive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => open({ kind: 'editHolding', name: row.name, scope: kind })}
                      >
                        {t('tabs.btnEdit')}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="trades" className="tabpane">
          <button
            className="rowlink"
            type="button"
            onClick={() => open({ kind: 'detail', id: 'proposal', scope: kind })}
          >
            <span>
              <b>
                {isLive ? t('tabs.advisoryLabel') : t('tabs.proposalLabel')} · {proposalView.side} {proposalView.asset} ·{' '}
                {state.proposal.quantity} {t('proposal.sharesUnit')}
              </b>
              <small>
                {proposalTextOf(state, lang)} · {isLive ? t('tabs.aiShort') : t('tabs.proposedShort')}{' '}
                {state.proposal.original} {t('proposal.sharesUnit')}
              </small>
            </span>
            <Badge variant="outline">{t('tabs.btnInspect')}</Badge>
          </button>
          {[...state.trades].reverse().map((trade) => {
            const tv = formatTrade(trade, t)
            return (
              <button className="rowlink" type="button" key={trade.id} onClick={() => openTrade(trade)}>
                <span>
                  <b>
                    {tv.side} {tv.name}
                  </b>
                  <small>
                    {trade.quantity} {t('proposal.sharesUnit')} · {tv.time}
                  </small>
                </span>
                <b className={trade.pnl === null ? 'dim' : tone(trade.pnl)}>
                  {trade.pnl === null ? '—' : signed(trade.pnl)}
                </b>
              </button>
            )
          })}
        </TabsContent>

        <TabsContent value="state" className="tabpane">
          {!isLive ? (
            <>
              <div className="meter">
                <i style={{ width: pctUsed + '%' }} />
              </div>
              <div className="meter-note">
                <span>{t('tabs.toolCalls', { used })}</span>
                <span>32k / 100k token</span>
              </div>
            </>
          ) : (
            <div className="report-row">
              <span>{t('tabs.marketFeed')}</span>
              <span className="dots" />
              <b>{formatMarketSession(state.marketSessionKey, state.marketSession, t)}</b>
            </div>
          )}

          <div className="report-row">
            <span>{t('tabs.realizedPnl')}</span>
            <span className="dots" />
            <b className={tone(state.realized)}>{signed(state.realized)}</b>
          </div>
          <div className="report-row">
            <span>{t('tabs.unrealizedPnl')}</span>
            <span className="dots" />
            <b className={tone(totals.floating)}>{signed(totals.floating)}</b>
          </div>
          <div className="report-row">
            <span>{t('tabs.openEntryFees')}</span>
            <span className="dots" />
            <b>−{money(openFees)}</b>
          </div>
          <div className="report-row">
            <span>{t('tabs.cumulativeNetPnl')}</span>
            <span className="dots" />
            <b className={tone(totals.net)}>{signed(totals.net)}</b>
          </div>

          <div className="trust">
            {isLive ? (
              <>
                <div className="trust-row">
                  <span className="trust-dot" />
                  <div>
                    <b>
                      {t('tabs.mirrorPrefix')}
                      {formatSyncLabel(state.syncKey, state.syncLabel, t)}
                    </b>
                    <small>{t('tabs.mirrorDesc')}</small>
                  </div>
                </div>
                <div className="trust-row">
                  <span className="trust-dot" />
                  <div>
                    <b>{t('tabs.boundaryTitle')}</b>
                    <small>{t('tabs.boundaryDesc')}</small>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="trust-row">
                  <span className={'trust-dot' + (sealed ? '' : ' warn')} />
                  <div>
                    <b>{sealed ? t('tabs.traceSealed') : t('tabs.traceActive')}</b>
                    <small>{sealed ? t('tabs.traceSealedDesc') : t('tabs.traceActiveDesc')}</small>
                  </div>
                </div>
                <div className="trust-row">
                  <span className="trust-dot" />
                  <div>
                    <b>
                      {t('tabs.collabPrefix')}
                      {formatCollab(state.collaboration, t)}
                    </b>
                    <small>{t('tabs.collabDesc')}</small>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
