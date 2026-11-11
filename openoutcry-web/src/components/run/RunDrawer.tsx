import { useState } from 'react'
import { PanelRightOpen, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { useRun } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { useToast } from '../../store/ToastProvider'
import { agentOf } from '../../data/agents'
import { exportRun } from '../../lib/exportRun'

/**
 * 运行抽屉 —— 右侧滑出的一层，装「口径」与「操作」。
 *
 * 这两组东西以前是页面上两条常驻的按钮行 + 一行四段的仪器脊：
 * 回放 / 快照 / 暂停 / 中止 + 资料时点 / 研究出口 / 轨迹完整性 / 评测资格。
 * 它们都是「偶尔要看一次」的信息，常驻只会把工作台挤满 ——
 * 收进抽屉后，工作台头部只剩一个按钮。
 */
export function RunDrawer() {
  const { state, totals, actions } = useRun()
  const { open: openDialog } = useDialog()
  const { notify } = useToast()
  const [open, setOpen] = useState(false)
  const agent = agentOf(state.agent)
  const aborted = state.status === 'aborted'

  /** 抽屉里点动作：先收起抽屉，再开对应弹窗，避免两层焦点陷阱打架 */
  const act = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  return (
    <>
      <button type="button" className="bench-act" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <PanelRightOpen size={15} aria-hidden />
        <span>运行</span>
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="drawer-scrim" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={
              'side-drawer ' +
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200 ' +
              'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-150'
            }
          >
            <DialogPrimitive.Title className="sr-only">运行口径与操作</DialogPrimitive.Title>

            <header className="side-drawer-hd">
              <div>
                <span className="label">Run</span>
                <p className="side-drawer-title">{agent.name}</p>
              </div>
              <DialogPrimitive.Close aria-label="关闭运行抽屉" className="side-drawer-x">
                <X size={18} aria-hidden />
              </DialogPrimitive.Close>
            </header>

            <div className="side-drawer-body">
              <section className="side-sec">
                <h3 className="side-sec-hd">口径</h3>
                <div className="kv">
                  <span>资料时点</span>
                  <span className="dots" />
                  <b>2024-04-22 23:59:58</b>
                </div>
                <div className="kv">
                  <span>研究出口</span>
                  <span className="dots" />
                  <b>受控</b>
                </div>
                <div className="kv">
                  <span>轨迹完整性</span>
                  <span className="dots" />
                  <b>100%</b>
                </div>
                <div className="kv">
                  <span>评测资格</span>
                  <span className="dots" />
                  <b>{agent.qualification}</b>
                </div>
                <div className="kv">
                  <span>模拟时钟</span>
                  <span className="dots" />
                  <b>{state.clock}</b>
                </div>
              </section>

              <section className="side-sec">
                <h3 className="side-sec-hd">操作</h3>
                <button type="button" className="side-act" onClick={() => act(() => openDialog({ kind: 'replay' }))}>
                  回放轨迹
                </button>
                <button type="button" className="side-act" onClick={() => act(() => openDialog({ kind: 'snapshot' }))}>
                  运行快照
                </button>
                <button
                  type="button"
                  className="side-act"
                  disabled={aborted}
                  onClick={() => act(() => actions.togglePause())}
                >
                  {state.status === 'paused' ? '继续运行' : '暂停运行'}
                </button>
                <button
                  type="button"
                  className="side-act"
                  onClick={() =>
                    act(() => {
                      exportRun(state, totals)
                      notify('已导出 JSON', 'success')
                    })
                  }
                >
                  导出 JSON
                </button>
                <button
                  type="button"
                  className="side-act danger"
                  disabled={aborted}
                  onClick={() => act(() => openDialog({ kind: 'abort' }))}
                >
                  中止运行
                </button>
              </section>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
