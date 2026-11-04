import { useRun } from '../../store/RunProvider'
import { signed, tone } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Card, CardContent, CardHeader } from '../ui/Card'

export function HoldingsList() {
  const { state, totals } = useRun()
  return (
    <Card>
      <CardHeader>
        <span>Holdings</span>
        <Badge variant="outline">{state.holdings.length} 标的</Badge>
      </CardHeader>
      <CardContent>
        {state.holdings.length === 0 ? (
          <p className="text-note text-muted-foreground">当前无持仓。</p>
        ) : (
          state.holdings.map((h) => {
            const pnl = h.quantity * (h.price - h.cost)
            const share = ((h.quantity * h.price) / totals.equity) * 100
            return (
              <div className="holding" key={h.name}>
                <div className="holding-top">
                  <b>{h.name}</b>
                  <em className={tone(pnl)}>{signed(pnl)}</em>
                </div>
                <div className="holding-sub">
                  <span>
                    {h.quantity} 股 · 成本 {h.cost}
                  </span>
                  <span>{share.toFixed(1)}%</span>
                </div>
                <div className="holding-sub">
                  <span>可卖 {h.sellable} 股</span>
                  <Badge variant="ver">T+1</Badge>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
