import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { agentOf } from '../../data/agents'

export function SnapshotDialog({ open }: { open: boolean }) {
  const { state } = useRun()
  const { close } = useDialog()
  const agent = agentOf(state.agent)

  const rows: Array<[string, string]> = [
    ['Agent', agent.name + ' / ' + agent.version],
    ['会话 / 运行', 'sess_demo_001 / run_demo_001'],
    ['窗口', '2024-04-01 至 04-30'],
    ['初始资金', '¥100,000.00'],
    ['股票池', '固定 3 标的 + 历史已平仓样例'],
    ['数据 / 资料库', 'market-demo-v1 / evidence-demo-v2'],
    ['规则', '日频 A 股 · D-1 资料 · T+1'],
    ['预算', '12 / 20 次，额度固定'],
    ['费用模型', '单次卖出 ¥7；历史记录逐笔列明'],
    ['当前类型', state.collaboration + ' · ' + agent.qualification],
  ]

  return (
    <Modal
      open={open}
      kicker="Run Snapshot"
      title="运行配置 · 已锁定"
      onClose={close}
      footer={<Button size="sm" variant="ghost" onClick={close}>关闭</Button>}
    >
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-3)', marginBottom: 10 }}>
        以下参数在运行时不能修改；需要改参数请复制配置后重跑。
      </p>
      <dl className="snapshot-list">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}
