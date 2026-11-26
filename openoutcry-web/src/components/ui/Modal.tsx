import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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

export function Modal({ open, kicker, title, onClose, children, footer, width }: Props) {
  const { t } = useTranslation()
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
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line-soft)] bg-[var(--bg-1)] px-5 py-4">
          <div className="min-w-0">
            <div className="font-sans text-micro font-medium leading-snug text-[var(--fg-2)]">
              {kicker}
            </div>
            <DialogTitle className="mt-1 text-[var(--fg-0)]">{title}</DialogTitle>
          </div>
          <DialogClose
            aria-label={t('dialogs.close')}
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-md border border-[var(--control-line)] bg-[var(--bg-2)]',
              'text-[var(--fg-1)] transition-colors hover:border-[var(--accent)] hover:text-[var(--fg-0)]',
            )}
          >
            <XIcon className="size-4" />
          </DialogClose>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--line-soft)] bg-[var(--bg-1)] px-5 py-3.5">
            {footer}
          </div>
        ) : (
          <div />
        )}
      </DialogContent>
    </Dialog>
  )
}
