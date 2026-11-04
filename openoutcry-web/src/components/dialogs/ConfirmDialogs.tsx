import { useNavigate } from 'react-router-dom'
import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Modal } from '../ui/Modal'
import { Prose } from '../ui/Prose'
import { Button } from '../ui/Button'
import { agentOf } from '../../data/agents'
import type { AgentId } from '../../types'

export function AbortDialog({ open }: { open: boolean }) {
  const { actions } = useRun()
  const { close } = useDialog()
  return (
    <Modal
      open={open}
      kicker="Abort"
      title="中止本次运行？"
      onClose={close}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close}>
            继续运行
          </Button>
          <Button
            size="sm"
            variant="ver"
            onClick={() => {
              actions.abort()
              close()
            }}
          >
            确认中止
          </Button>
        </>
      }
    >
      <Prose>
        中止后，未完成的提案会被标记为已终止，账户与轨迹保留，可继续复盘但不能续跑。
      </Prose>
      <div className="note">已发生的成交与费用不会回滚。</div>
    </Modal>
  )
}

export function GoalDialog({ open }: { open: boolean }) {
  const { actions } = useRun()
  const { close } = useDialog()
  return (
    <Modal
      open={open}
      kicker="Autonomy"
      title="继续自主运行"
      onClose={close}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close}>
            取消
          </Button>
          <Button
            size="sm"
            variant="solid"
            onClick={() => {
              actions.enterGoalMode()
              close()
            }}
          >
            确认进入自主推进
          </Button>
        </>
      }
    >
      <Prose>
        进入自主推进后，Agent 会连续处理后续交易日，订单不再逐单等待人工确认。你仍然可以随时追加带时间戳的指导，但不能再改写已经提交的动作。
      </Prose>
      <div className="note">自主运行会被标记为「自主运行」协作方式，报告中与人工确认运行分开统计。</div>
    </Modal>
  )
}

export function SwitchAgentDialog({ open, agentId }: { open: boolean; agentId: AgentId }) {
  const { state, actions } = useRun()
  const { close } = useDialog()
  const navigate = useNavigate()
  const agent = agentOf(agentId)
  return (
    <Modal
      open={open}
      kicker="Switch Agent"
      title={'切换到「' + agent.name + '」？'}
      onClose={close}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close}>
            取消
          </Button>
          <Button
            size="sm"
            variant="solid"
            onClick={() => {
              actions.switchAgent(agentId)
              close()
              navigate('/training')
            }}
          >
            开始新会话
          </Button>
        </>
      }
    >
      <Prose>
        当前会话（{state.clock} · {state.collaboration}）会被重置为新的演示运行。已归档的历史运行不受影响。
      </Prose>
      <div className="note">切换只影响本浏览器内的演示状态，不会写入任何服务端记录。</div>
    </Modal>
  )
}
