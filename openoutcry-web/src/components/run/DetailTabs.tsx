import { useState } from 'react'

import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Badge } from '../ui/Badge'
import { Card, CardHeader } from '../ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs'
import { money, signed, tone } from '../../lib/format'
import { PROPOSAL_TEXT } from '../../store/derive'
import type { Trade } from '../../types'

type TabId = 'holdings' | 'trades' | 'pnl'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'holdings', label: '持仓' },
  { id: 'trades', label: '成交' },
  { id: 'pnl', label: '盈亏' },
]

export function DetailTabs() {
  const { state, totals } = useRun()
  const { open } = useDialog()
  const [tab, setTab] = useState<TabId>('holdings')
  const openFees = state.holdings.reduce((s, h) => s + h.entryFee, 0)
  const openTrade = (t: Trade) => open({ kind: 'detail', id: t.id })

  return (
    <Card>
      <CardHeader>
        <span>Detail</span>
        <Badge variant="outline">本次运行</Badge>
      </CardHeader>

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)} className="gap-0">
        <TabsList className="px-1">
          {TABS.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="holdings" className="tabpane">
          {state.holdings.map((h) => {
            const pnl = h.quantity * (h.price - h.cost)
            return (
              <div className="report-row" key={h.name}>
                <span>
                  {h.name}
                  <br />
                  <small className="dim font-mono text-[length:var(--fs-micro)]">
                    {h.quantity} 股 · 可卖 {h.sellable}
                  </small>
                </span>
                <span className="dots" />
                <b className={tone(pnl)}>{signed(pnl)}</b>
              </div>
            )
          })}
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
          {[...state.trades].reverse().map((t) => (
            <button className="rowlink" type="button" key={t.id} onClick={() => openTrade(t)}>
              <span>
                <b>
                  {t.side} {t.name}
                </b>
                <small>
                  {t.quantity} 股 · {t.time}
                </small>
              </span>
              <b className={t.pnl === null ? 'dim' : tone(t.pnl)}>{t.pnl === null ? '—' : signed(t.pnl)}</b>
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
