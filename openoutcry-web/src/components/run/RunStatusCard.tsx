import { useRun } from '../../store/RunProvider'
import { Badge } from '../ui/Badge'
import { Card, CardContent, CardHeader } from '../ui/Card'

/** 运行状态：预算 + 轨迹审计 + 协作方式，压成一张卡（原来占两张） */
export function RunStatusCard() {
  const { state } = useRun()
  const used = 12
  const pctUsed = Math.round((used / 20) * 100)
  const sealed = state.status === 'aborted'

  return (
    <Card>
      <CardHeader>
        <span>运行状态</span>
        <Badge variant="outline">{state.mode === 'goal' ? '自主推进' : '逐单确认'}</Badge>
      </CardHeader>
      <CardContent>
        <div className="meter">
          <i style={{ width: pctUsed + '%' }} />
        </div>
        <div className="meter-note">
          <span>
            工具调用 {used} / 20
          </span>
          <span>32k / 100k token</span>
        </div>

        <div className="trust" style={{ marginTop: 8 }}>
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
      </CardContent>
    </Card>
  )
}
