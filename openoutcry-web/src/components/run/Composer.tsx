import { useState } from 'react'

import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Textarea } from '../ui/Textarea'

export function Composer() {
  const { state, actions } = useRun()
  const { open } = useDialog()
  const [text, setText] = useState('')
  const aborted = state.status === 'aborted'

  const send = () => {
    const value = text.trim()
    if (!value || aborted) return
    if (value === '/goal') {
      setText('')
      open({ kind: 'goal' })
      return
    }
    actions.sendGuidance(value)
    setText('')
  }

  return (
    <Card className="composer mt-3.5">
      <CardHeader>
        <span>Human-in-the-loop</span>
        <span className="normal-case tracking-[0.02em]">
          {state.mode === 'goal' ? '自主推进中 · 只能追加指导' : '追加指导将标记为人机协作'}
        </span>
      </CardHeader>
      <CardContent className="py-3">
        <div className="flex items-end gap-2.5">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={aborted ? '本次运行已中止，无法追加指导。' : '追加指导，例如：把减仓幅度降到 50 股，并说明依据。'}
            disabled={aborted}
            aria-label="追加人类指导"
            rows={2}
            className="min-h-[56px] flex-1 resize-none text-body"
          />
          <Button variant="solid" size="sm" onClick={send} disabled={aborted || !text.trim()}>
            发送
          </Button>
        </div>
        <div className="composer-hint">
          <span>
            <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>↵</kbd> 发送
          </span>
          <span>输入 /goal 进入自主推进</span>
          <span>{text.length} 字</span>
        </div>
      </CardContent>
    </Card>
  )
}
