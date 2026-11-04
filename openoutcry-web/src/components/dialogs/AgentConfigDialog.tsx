import { useEffect, useState } from 'react'
import { useDialog } from '../../store/DialogProvider'
import { useToast } from '../../store/ToastProvider'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { Textarea } from '../ui/Textarea'
import { agentOf } from '../../data/agents'
import type { AgentId } from '../../types'

const DEFAULT_PROMPT = '仅使用平台受控资料，优先检查现金流风险。提出标准动作并引用证据，不承诺收益。'

export function AgentConfigDialog({ open, agentId }: { open: boolean; agentId: AgentId }) {
  const { close } = useDialog()
  const { notify } = useToast()
  const agent = agentOf(agentId)
  const [name, setName] = useState(agent.name)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [saved, setSaved] = useState('')

  // Radix 在关闭动画期间仍保留内容，只有 open 变 true 才能重置表单；
  // 这是"打开即重置"的既定语义，不是派生状态（所以不用 key 重挂载，避免破坏退出动画）。
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react/set-state-in-effect
    setName(agent.name)
    // eslint-disable-next-line react/set-state-in-effect
    setPrompt(DEFAULT_PROMPT)
    // eslint-disable-next-line react/set-state-in-effect
    setSaved('')
  }, [open, agent.name])

  return (
    <Modal
      open={open}
      kicker="Agent Config"
      title="Agent 配置"
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
              setSaved('草稿已保存在本次浏览器内存中：' + name + ' · ' + agent.version + '-draft。当前运行不变。')
              notify('草稿已保存', 'success')
            }}
          >
            保存为草稿
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="agent-name">名称</Label>
          <Input id="agent-name" type="text" value={name} data-autofocus onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="agent-prompt">系统提示词</Label>
          <Textarea
            id="agent-prompt"
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="text-note"
          />
        </div>
        <p className="min-h-4 font-mono text-micro text-pine">{saved}</p>
        <div className="note">
          配置只保存在本次浏览器内存中。已完成实验引用的版本不可变，修改需要走「复制为新版本」。
        </div>
      </div>
    </Modal>
  )
}
