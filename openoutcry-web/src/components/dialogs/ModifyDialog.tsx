import { useEffect, useState } from 'react'
import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'

export function ModifyDialog({ open }: { open: boolean }) {
  const { state, actions } = useRun()
  const { close } = useDialog()
  const [qty, setQty] = useState(state.proposal.quantity)
  const [error, setError] = useState('')

  // 同上：打开时把草稿数量对齐到当前提案
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react/set-state-in-effect
      setQty(state.proposal.quantity)
      // eslint-disable-next-line react/set-state-in-effect
      setError('')
    }
  }, [open, state.proposal.quantity])

  const submit = () => {
    if (!(qty >= 100 && qty <= 600 && qty % 100 === 0)) {
      setError('请输入 100–600 之间、100 的整数倍。')
      return
    }
    actions.approve(qty, '人工修改后批准')
    close()
  }

  return (
    <Modal
      open={open}
      kicker="Modify"
      title="修改卖出数量"
      onClose={close}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close}>
            取消
          </Button>
          <Button size="sm" variant="ver" onClick={submit}>
            提交修改后批准
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="modify-qty">最终数量（股）</Label>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setQty((q) => Math.max(100, q - 100))}>
            −100
          </Button>
          <Input
            id="modify-qty"
            className="text-center font-mono tabular-nums"
            type="number"
            min={100}
            max={600}
            step={100}
            value={qty}
            data-autofocus
            onChange={(e) => setQty(Number(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
          />
          <Button size="sm" variant="ghost" onClick={() => setQty((q) => Math.min(600, q + 100))}>
            +100
          </Button>
        </div>
      </div>
      <p className="error-text">{error}</p>
      <div className="note">
        原始提案 {state.proposal.original} 股会被完整保留。平台分别记录 Agent 原始意图与人类最终动作，「人机混合」协作方式随之生效。
      </div>
    </Modal>
  )
}
