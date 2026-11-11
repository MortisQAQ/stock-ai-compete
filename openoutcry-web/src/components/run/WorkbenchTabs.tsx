import { useState } from 'react'

import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { holdingRowsOf, openFeesOf } from '../../store/selectors'
import { Badge } from '../ui/Badge'
import { Card, CardHeader } from '../ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs'
import { money, signed, tone } from '../../lib/format'
import { PROPOSAL_TEXT } from '../../store/derive'
import type { Trade } from '../../types'

const TABS = [
  { id: 'account', label: '账户' },
  { id: 'holdings', label: '持仓' },
  { id: 'trades', label: '成交' },
  { id: 'state', label: '状态' },
] as const

type TabId = (typeof TABS)[number]['id']

const isTabId = (value: string): value is TabId => TABS.some((tab) => tab.id === value)

/**
 * 工作台的下半区 = **一张卡 + 四个页签**。
 *
 * 之前这里是四张独立卡片（Account / Holdings / Detail / 运行状态）竖着摞，
 * 一屏里出现四个卡片头、四条分割线、四个角标 —— 这是「元素太多」的主因。
 * 合并成一张卡后，同类信息用页签切换，页面只剩「审批卡 + 这张卡」两块。
 */
export function WorkbenchTabs() {
  const { state, totals } = useRun()
  const { open } = useDialog()
  const [tab, setTab] = useState<TabId>('account')
  const rows = holdingRowsOf(state, totals)
  const openFees = openFeesOf(state)
  const used = 12
  const pctUsed = Math.round((used / 20) * 100)
  const sealed = state.status === 'aborted'

  const openTrade = (trade: Trade) => open({ kind: 'detail', id: trade.id })

  return (
    <Card>
      <CardHeader>
        <span>运行台账</span>
        <Badge variant="outline">{state.mode === 'goal' ? '自主推进' : '逐单确认'}</Badge>
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

        <TabsContent value="account" className="tabpane">
          <div className="kv">
            <span>账户总资产</span>
            <span className="dots" />
            <b>{money(totals.equity)}</b>
          </div>
          <div className="kv">
            <span>净收益</span>
            <span className="dots" />
            <b className={tone(totals.net)}>{signed(totals.net)}</b>
          </div>
          <div className="kv">
            <span>已实现</span>
            <span className="dots" />
            <b className={tone(state.realized)}>{signed(state.realized)}</b>
          </div>
          <div className="kv">
            <span>浮动盈亏</span>
            <span className="dots" />
            <b className={tone(totals.floating)}>{signed(totals.floating)}</b>
          </div>
          <div className="kv">
            <span>累计费用</span>
            <span className="dots" />
            <b>−{money(state.fees)}</b>
          </div>
        </TabsContent>

        <TabsContent value="holdings" className="tabpane">
          {rows.length === 0 ? (
            <p className="note">当前无持仓。</p>
          ) : (
            rows.map((row) => (
              <div className="holding" key={row.name}>
                <div className="holding-top">
                  <b>{row.name}</b>
                  <em className={row.tone}>{signed(row.pnl)}</em>
                </div>
                <div className="holding-sub">
                  <span>
                    {row.quantity} 股 · 成本 {row.cost}
                  </span>
                  <span>{row.sharePct.toFixed(1)}%</span>
                </div>
                <div className="holding-sub">
                  <span>可卖 {row.sellable} 股</span>
                  <Badge variant="outline">T+1</Badge>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="trades" className="tabpane">
          <button className="rowlink" type="button" onClick={() => open({ kind: 'detail', id: 'proposal' })}>
            <span>
              <b>卖出提案 · {state.proposal.quantity} 股</b>
              <small>
                {PROPOSAL_TEXT[state.proposal.status]} · 原始 {state.proposal.original} 股
              </small>
            </span>
            <Badge variant="outline">查看</Badge>
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

        <TabsContent value="state" className="tabpane">
          <div className="meter">
            <i style={{ width: pctUsed + '%' }} />
          </div>
          <div className="meter-note">
            <span>工具调用 {used} / 20</span>
            <span>32k / 100k token</span>
          </div>

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

          <div className="trust">
            <div className="trust-row">
              <span className={'trust-dot' + (sealed ? '' : ' warn')} />
              <div>
                <b>{sealed ? '轨迹已封存' : '轨迹待审计'}</b>
                <small>{sealed ? '可离线回放' : '未执行真实隔离验证'}</small>
              </div>
            </div>
            <div className="trust-row">
              <span className="trust-dot" />
              <div>
                <b>协作方式 · {state.collaboration}</b>
                <small>原始意图与最终动作分别留档</small>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
