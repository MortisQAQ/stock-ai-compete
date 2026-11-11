import type { ReactNode } from 'react'
import { XIcon } from 'lucide-react'

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'

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
 * 站内通用弹窗：在 shadcn Dialog 之上固定「墨线卡头 + 纸面正文 + 底部操作条」的版式。
 *
 * ESC、点遮罩、焦点陷阱、滚动锁定由 Radix 提供；
 * 焦点归还由 DialogProvider 统一处理（它在 open() 的事件回调里记录了触发元素），
 * 组件本身不再碰 DOM —— 之前在这里于渲染期读写 ref，属于 React 反模式。
 */
export function Modal({ open, kicker, title, onClose, children, footer, width }: Props) {
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
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-xs border border-primary-foreground/35',
              'text-primary-foreground/80 transition-colors hover:border-[var(--up)] hover:bg-[var(--up)] hover:text-[#04070d]',
            )}
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
