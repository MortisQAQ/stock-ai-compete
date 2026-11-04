import { useRun } from '../../store/RunProvider'
import { holdingRowsOf } from '../../store/selectors'
import { signed } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Card, CardContent, CardHeader } from '../ui/Card'

export function HoldingsList() {
  const { state, totals } = useRun()
  const rows = holdingRowsOf(state, totals)

  return (
    <Card>
      <CardHeader>
        <span>Holdings</span>
        <Badge variant="outline">{rows.length} 标的</Badge>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-note text-muted-foreground">当前无持仓。</p>
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
                <Badge variant="ver">T+1</Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
