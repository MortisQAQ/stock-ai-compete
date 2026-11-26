import { useState } from 'react'

import { money, signed, tone } from '../../lib/format'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useRun, useWorkspaceKind } from '../../store/RunProvider'
import { proposalTextOf } from '../../store/derive'
import { holdingRowsOf, openFeesOf } from '../../store/selectors'
import type { Trade } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs'

const TABS = [
  { id: 'account', zh: '账户', en: 'Account' },
  { id: 'holdings', zh: '持仓', en: 'Holdings' },
  { id: 'trades', zh: '成交', en: 'Fills' },
  { id: 'state', zh: '状态', en: 'State' },
] as const

type TabId = (typeof TABS)[number]['id']

const isTabId = (value: string): value is TabId => TABS.some((tab) => tab.id === value)

export function WorkbenchTabs() {
  const kind = useWorkspaceKind()
  const { state, totals } = useRun()
  const { open } = useDialog()
  const { lang, isEn, bi } = useLocale()
  const [tab, setTab] = useState<TabId>('account')
  const rows = holdingRowsOf(state, totals)
  const openFees = openFeesOf(state)
  const used = 12
  const pctUsed = Math.round((used / 20) * 100)
  const sealed = state.status === 'aborted'
  const isLive = state.kind === 'live'
  const asset = state.proposal.asset ?? '公司-017'
  const side = state.proposal.side ?? '卖出'

  const openTrade = (trade: Trade) => open({ kind: 'detail', id: trade.id, scope: kind })

  return (
    <Card>
      <CardHeader>
        <span>{isLive ? bi('实盘镜像台账', 'Live Mirror Ledger') : bi('运行台账', 'Run Ledger')}</span>
        <Badge variant="outline">
          {isLive
            ? bi('仅建议 · 手动维护', 'Advisory · Manual')
            : state.mode === 'goal'
              ? bi('/goal 自主推进', '/goal Auto')
              : bi('逐单确认', 'Per-Order HITL')}
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
              {isEn ? item.en : item.zh}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="account" className="tabpane">
          <div className="kv">
            <span>{isLive ? bi('镜像总资产（估算）', 'Mirror Equity (Est.)') : bi('账户总资产', 'Total Equity')}</span>
            <span className="dots" />
            <b>{money(totals.equity)}</b>
          </div>
          <div className="kv">
            <span>{bi('净收益', 'Net PnL')}</span>
            <span className="dots" />
            <b className={tone(totals.net)}>{signed(totals.net)}</b>
          </div>
          <div className="kv">
            <span>{bi('已实现', 'Realized')}</span>
            <span className="dots" />
            <b className={tone(state.realized)}>{signed(state.realized)}</b>
          </div>
          <div className="kv">
            <span>{bi('浮动盈亏', 'Unrealized')}</span>
            <span className="dots" />
            <b className={tone(totals.floating)}>{signed(totals.floating)}</b>
          </div>
          <div className="kv">
            <span>{bi('累计费用', 'Total Fees')}</span>
            <span className="dots" />
            <b>−{money(state.fees)}</b>
          </div>
        </TabsContent>

        <TabsContent value="holdings" className="tabpane">
          {isLive ? (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-soft)] pb-2.5">
              <span className="font-mono text-micro text-[var(--fg-2)]">
                {state.syncLabel ?? bi('手动维护', 'Manual Mirror')}
              </span>
              <Button variant="outline" size="sm" onClick={() => open({ kind: 'editHolding', scope: kind })}>
                {bi('+ 新增 / 调整持仓', '+ Add / Edit Holding')}
              </Button>
            </div>
          ) : null}

          {rows.length === 0 ? (
            <p className="note">{bi('当前无持仓。', 'No open positions.')}</p>
          ) : (
            rows.map((row) => (
              <div className="holding" key={row.name}>
                <div className="holding-top">
                  <b>{row.name}</b>
                  <em className={row.tone}>{signed(row.pnl)}</em>
                </div>
                <div className="holding-sub">
                  <span>
                    {row.quantity} {bi('股 · 成本', 'shs · Cost')} {row.cost} · {bi('现价', 'Last')} {row.price}
                  </span>
                  <span>{row.sharePct.toFixed(1)}%</span>
                </div>
                <div className="holding-sub items-center">
                  <span>
                    {bi('可卖', 'Sellable')} {row.sellable} {bi('股', 'shs')}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">T+1</Badge>
                    {isLive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => open({ kind: 'editHolding', name: row.name, scope: kind })}
                      >
                        {bi('调整', 'Edit')}
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
                {isLive ? bi('调仓建议', 'Advisory') : bi('卖出提案', 'Proposal')} · {side} {asset} ·{' '}
                {state.proposal.quantity} {bi('股', 'shs')}
              </b>
              <small>
                {proposalTextOf(state, lang)} · {isLive ? bi('AI 建议', 'AI') : bi('原始', 'Proposed')}{' '}
                {state.proposal.original} {bi('股', 'shs')}
              </small>
            </span>
            <Badge variant="outline">{bi('查看', 'Inspect')}</Badge>
          </button>
          {[...state.trades].reverse().map((trade) => (
            <button className="rowlink" type="button" key={trade.id} onClick={() => openTrade(trade)}>
              <span>
                <b>
                  {trade.side} {trade.name}
                </b>
                <small>
                  {trade.quantity} {bi('股', 'shs')} · {trade.time}
                </small>
              </span>
              <b className={trade.pnl === null ? 'dim' : tone(trade.pnl)}>
                {trade.pnl === null ? '—' : signed(trade.pnl)}
              </b>
            </button>
          ))}
        </TabsContent>

        <TabsContent value="state" className="tabpane">
          {!isLive ? (
            <>
              <div className="meter">
                <i style={{ width: pctUsed + '%' }} />
              </div>
              <div className="meter-note">
                <span>
                  {bi('工具调用', 'Tool Calls')} {used} / 20
                </span>
                <span>32k / 100k token</span>
              </div>
            </>
          ) : (
            <div className="report-row">
              <span>{bi('当前行情', 'Market Feed')}</span>
              <span className="dots" />
              <b>{state.marketSession ?? bi('实时快照', 'Live Snapshot')}</b>
            </div>
          )}

          <div className="report-row">
            <span>{bi('已实现净盈亏', 'Realized PnL')}</span>
            <span className="dots" />
            <b className={tone(state.realized)}>{signed(state.realized)}</b>
          </div>
          <div className="report-row">
            <span>{bi('持仓浮动盈亏', 'Unrealized PnL')}</span>
            <span className="dots" />
            <b className={tone(totals.floating)}>{signed(totals.floating)}</b>
          </div>
          <div className="report-row">
            <span>{bi('未平仓买入费用', 'Open Entry Fees')}</span>
            <span className="dots" />
            <b>−{money(openFees)}</b>
          </div>
          <div className="report-row">
            <span>{bi('累计净收益', 'Net PnL')}</span>
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
                      {bi('镜像基线 · ', 'Mirror · ')}
                      {state.syncLabel ?? bi('手动维护', 'Manual')}
                    </b>
                    <small>{bi('MVP 采用轻量手动维护持仓与实盘成交回填', 'Lightweight manual mirror & fill logging')}</small>
                  </div>
                </div>
                <div className="trust-row">
                  <span className="trust-dot" />
                  <div>
                    <b>{bi('执行边界 · 仅给建议不代下单', 'Boundary · Advisory Only')}</b>
                    <small>{bi('AI 原始建议与人类实际执行分别留档对照', 'AI advisory & human fills archived separately')}</small>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="trust-row">
                  <span className={'trust-dot' + (sealed ? '' : ' warn')} />
                  <div>
                    <b>{sealed ? bi('轨迹已封存', 'Trace Sealed') : bi('轨迹审计中', 'Trace Active')}</b>
                    <small>{sealed ? bi('可离线指纹回放', 'Offline replayable') : bi('原型态未接入真实沙盒审计', 'Prototype demo state')}</small>
                  </div>
                </div>
                <div className="trust-row">
                  <span className="trust-dot" />
                  <div>
                    <b>
                      {bi('协作方式 · ', 'Collaboration · ')}
                      {state.collaboration}
                    </b>
                    <small>{bi('原始意图与最终动作分别留档', 'Original intent & final action archived')}</small>
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
