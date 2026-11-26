import { useState } from 'react'
import { PanelRightOpen, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { useRun, useWorkspaceKind } from '../../store/RunProvider'
import { useDialog } from '../../store/DialogProvider'
import { useLocale } from '../../store/LocaleProvider'
import { useToast } from '../../store/ToastProvider'
import { agentOf } from '../../data/agents'
import { exportRun } from '../../lib/exportRun'

export function RunDrawer() {
  const kind = useWorkspaceKind()
  const { state, totals, actions } = useRun()
  const { open: openDialog } = useDialog()
  const { bi } = useLocale()
  const { notify } = useToast()
  const [open, setOpen] = useState(false)
  const agent = agentOf(state.agent)
  const aborted = state.status === 'aborted'
  const isLive = state.kind === 'live'

  const act = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  return (
    <>
      <button type="button" className="bench-act" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <PanelRightOpen size={15} aria-hidden />
        <span>{isLive ? bi('工作台', 'Desk') : bi('运行', 'Run')}</span>
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
            <DialogPrimitive.Title className="sr-only">
              {isLive ? '实战工作台口径与操作' : '运行口径与操作'}
            </DialogPrimitive.Title>

            <header className="side-drawer-hd">
              <div>
                <span className="label">{isLive ? 'Live Workbench' : 'Run'}</span>
                <p className="side-drawer-title">{agent.name}</p>
              </div>
              <DialogPrimitive.Close aria-label="关闭抽屉" className="side-drawer-x">
                <X size={18} aria-hidden />
              </DialogPrimitive.Close>
            </header>

            <div className="side-drawer-body">
              <section className="side-sec">
                <h3 className="side-sec-hd">口径</h3>
                {isLive ? (
                  <>
                    <div className="kv">
                      <span>市场阶段</span>
                      <span className="dots" />
                      <b>{state.marketSession ?? '实时快照'}</b>
                    </div>
                    <div className="kv">
                      <span>研究出口</span>
                      <span className="dots" />
                      <b>实时开放</b>
                    </div>
                    <div className="kv">
                      <span>账本来源</span>
                      <span className="dots" />
                      <b>用户镜像 · 手动维护</b>
                    </div>
                    <div className="kv">
                      <span>执行权限</span>
                      <span className="dots" />
                      <b>仅建议 · 不代下单</b>
                    </div>
                    <div className="kv">
                      <span>维护时间</span>
                      <span className="dots" />
                      <b>{state.syncLabel ?? state.clock}</b>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </section>

              <section className="side-sec">
                <h3 className="side-sec-hd">操作</h3>
                {isLive ? (
                  <button
                    type="button"
                    className="side-act"
                    onClick={() => act(() => openDialog({ kind: 'editHolding', scope: kind }))}
                  >
                    新增 / 调整持仓与现金
                  </button>
                ) : null}
                <button
                  type="button"
                  className="side-act"
                  onClick={() => act(() => openDialog({ kind: 'replay', scope: kind }))}
                >
                  {isLive ? '回看决策与建议记录' : '回放轨迹'}
                </button>
                <button
                  type="button"
                  className="side-act"
                  onClick={() => act(() => openDialog({ kind: 'snapshot', scope: kind }))}
                >
                  {isLive ? '工作台配置快照' : '运行快照'}
                </button>
                {!isLive ? (
                  <button
                    type="button"
                    className="side-act"
                    disabled={aborted}
                    onClick={() => act(() => actions.togglePause())}
                  >
                    {state.status === 'paused' ? '继续运行' : '暂停运行'}
                  </button>
                ) : null}
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
                {!isLive ? (
                  <button
                    type="button"
                    className="side-act danger"
                    disabled={aborted}
                    onClick={() => act(() => openDialog({ kind: 'abort', scope: kind }))}
                  >
                    中止运行
                  </button>
                ) : null}
              </section>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
