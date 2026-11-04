import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { XIcon } from 'lucide-react'

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/Dialog'

interface Props {
  open: boolean
  kicker: string
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}

/**
 * 站内通用弹窗：在 shadcn Dialog 之上固定「墨线卡头 + 纸面正文 + 底部操作条」的版式，
 * 保留旧的 open / kicker / title / footer / width 调用方式。
 * ESC、点遮罩、焦点陷阱、滚动锁定由 Radix 提供；焦点归还由这里显式处理，
 * 因为弹窗是由外部状态（DialogProvider）唤起的，Radix 不知道「从哪个按钮打开」。
 */
export function Modal({ open, kicker, title, onClose, children, footer, width }: Props) {
  const restoreRef = useRef<HTMLElement | null>(null)

  // 渲染期捕获：此刻焦点还在触发按钮上，Radix 尚未把焦点搬进弹窗
  if (open && restoreRef.current === null && typeof document !== 'undefined') {
    restoreRef.current = document.activeElement as HTMLElement | null
  }

  useEffect(() => {
    if (open) return
    const target = restoreRef.current
    if (!target) return
    restoreRef.current = null
    // 等 Radix 完成卸载与 aria-hidden 收尾后再归还焦点
    const timer = window.setTimeout(() => target.focus?.(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="max-h-[calc(100dvh-2.5rem)] max-w-[calc(100%-2rem)] sm:max-w-[calc(100%-2rem)]"
        style={{ width: 'min(' + (width ?? 600) + 'px, 100%)' }}
        onOpenAutoFocus={(event) => {
          const container = event.target as HTMLElement | null
          const target = container?.querySelector<HTMLElement>('[data-autofocus]')
          if (target) {
            event.preventDefault()
            target.focus()
          }
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-black bg-ink px-4 py-3 text-primary-foreground">
          <div className="min-w-0">
            <div className="font-mono text-micro font-semibold uppercase leading-none tracking-[0.2em] text-primary-foreground/50">
              {kicker}
            </div>
            <DialogTitle className="mt-1.5 text-primary-foreground">{title}</DialogTitle>
          </div>
          <DialogClose
            aria-label="关闭"
            className="grid size-7 shrink-0 place-items-center rounded-xs border border-primary-foreground/35 text-primary-foreground/80 transition-colors hover:border-ver hover:bg-ver hover:text-white"
          >
            <XIcon className="size-3.5" />
          </DialogClose>
        </div>

        <div className="min-h-0 overflow-y-auto px-4 py-4">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-bone/50 px-4 py-3">
            {footer}
          </div>
        ) : (
          <div />
        )}
      </DialogContent>
    </Dialog>
  )
}
