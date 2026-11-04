import { useRun } from '../../store/RunProvider'
import { money, signed, tone } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Card, CardContent, CardHeader } from '../ui/Card'

export function AccountLedger() {
  const { state, totals } = useRun()
  return (
    <Card>
      <CardHeader>
        <span>Account</span>
        <Badge variant="outline">平台记账</Badge>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
