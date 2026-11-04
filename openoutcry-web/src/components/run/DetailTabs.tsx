import { useState } from 'react'

import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { openFeesOf, holdingRowsOf } from '../../store/selectors'
import { Badge } from '../ui/Badge'
import { Card, CardHeader } from '../ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs'
import { money, signed, tone } from '../../lib/format'
import { PROPOSAL_TEXT } from '../../store/derive'
import type { Trade } from '../../types'

const TABS = [
  { id: 'holdings', label: '持仓' },
  { id: 'trades', label: '成交' },
  { id: 'pnl', label: '盈亏' },
] as const

type TabId = (typeof TABS)[number]['id']

const isTabId = (value: string): value is TabId => TABS.some((tab) => tab.id === value)

export function DetailTabs() {
  const { state, totals } = useRun()
  const { open } = useDialog()
  const [tab, setTab] = useState<TabId>('holdings')
  const rows = holdingRowsOf(state, totals)
  const openFees = openFeesOf(state)
  const openTrade = (trade: Trade) => open({ kind: 'detail', id: trade.id })

  return (
    <Card>
      <CardHeader>
        <span>Detail</span>
        <Badge variant="outline">本次运行</Badge>
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
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="holdings" className="tabpane">
          {rows.map((row) => (
            <div className="report-row" key={row.name}>
              <span>
                {row.name}
                <br />
                <small className="dim font-mono text-[length:var(--fs-micro)]">
                  {row.quantity} 股 · 可卖 {row.sellable}
                </small>
              </span>
              <span className="dots" />
              <b className={row.tone}>{signed(row.pnl)}</b>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="trades" className="tabpane">
          <button className="rowlink" type="button" onClick={() => open({ kind: 'detail', id: 'proposal' })}>
            <span>
              <b>卖出提案 · {state.proposal.quantity} 股</b>
              <small>
                {PROPOSAL_TEXT[state.proposal.status]} · 原始 {state.proposal.original} 股
              </small>
            </span>
            <Badge variant="brass">查看</Badge>
          </button>
          {[...state.trades].reverse().map((trade) => (
            <button className="rowlink" type="button" key={trade.id} onClick={() => openTrade(trade)}>
              <span>
                <b>
                  {trade.side} {trade.name}
                </b>
                <small>
                  {trade.quantity} 股 · {trade.time}
                </small>
              </span>
              <b className={trade.pnl === null ? 'dim' : tone(trade.pnl)}>
                {trade.pnl === null ? '—' : signed(trade.pnl)}
              </b>
            </button>
          ))}
        </TabsContent>

        <TabsContent value="pnl" className="tabpane">
          <div className="report-row">
            <span>已实现净盈亏</span>
            <span className="dots" />
            <b className={tone(state.realized)}>{signed(state.realized)}</b>
          </div>
          <div className="report-row">
            <span>持仓浮动盈亏</span>
            <span className="dots" />
            <b className={tone(totals.floating)}>{signed(totals.floating)}</b>
          </div>
          <div className="report-row">
            <span>未平仓买入费用</span>
            <span className="dots" />
            <b>−{money(openFees)}</b>
          </div>
          <div className="report-row">
            <span>累计净收益</span>
            <span className="dots" />
            <b className={tone(totals.net)}>{signed(totals.net)}</b>
          </div>
          <div className="note">浮盈不是已实现收益。账户总资产 = 现金 + 持仓市值。</div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
