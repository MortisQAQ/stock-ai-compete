import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { formatAgent } from '../../i18n/helpers'
import { useRun } from '../../store/RunProvider'
import { ConversationPane } from './ConversationPane'

interface FabProps {
  expanded: boolean
  onOpen: () => void
  fabRef: RefObject<HTMLButtonElement | null>
}

export function AssistantFab({ expanded, onOpen, fabRef }: FabProps) {
  const { t } = useTranslation()
  return (
    <button
      ref={fabRef}
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={t('training.mobile.fabAria')}
      className="fixed bottom-5 right-4 z-[70] flex size-16 flex-col items-center justify-center gap-0.5 rounded-full border border-[var(--accent)] bg-[var(--bg-2)] text-[var(--accent)] transition-transform duration-150 ease-[var(--ease-out-quart)] active:translate-y-px"
    >
      <Sparkles aria-hidden size={20} />
      <span className="font-sans text-micro font-medium">{t('training.mobile.fabLabel')}</span>
    </button>
  )
}

interface SheetProps {
  open: boolean
  onClose: () => void
  returnFocusRef?: RefObject<HTMLButtonElement | null>
}

export function AssistantSheet({ open, onClose, returnFocusRef }: SheetProps) {
  const { state } = useRun()
  const { t } = useTranslation()
  const agent = formatAgent(state.agent, t)
  const isLive = state.kind === 'live'

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocusRef?.current?.focus()
          }}
          className={
            'fixed inset-0 z-[80] flex h-[100dvh] w-full flex-col bg-[var(--bg-0)] ' +
            "[&_[data-slot='button']]:min-h-11 " +
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300 ' +
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:duration-200 ' +
            'data-[state=open]:ease-[var(--ease-out-quart)]'
          }
        >
          <DialogPrimitive.Title className="sr-only">{t('training.mobile.sheetTitle')}</DialogPrimitive.Title>

          <header className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--bg-1)] px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="label">{isLive ? t('training.mobile.liveSession') : t('training.mobile.simSession')}</span>
                <span className="font-sans text-micro font-medium text-[var(--fg-2)]">
                  {isLive ? t('training.mobile.liveConnected') : t('training.mobile.simConnected')}
                </span>
              </div>
              <p className="mt-1 truncate font-sans text-body font-semibold leading-snug text-[var(--ink)]">
                {agent.name}
              </p>
            </div>
            <DialogPrimitive.Close
              aria-label={t('training.mobile.closeSheetAria')}
              className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--bg-2)] text-[var(--ink-2)] transition-colors hover:bg-[var(--bg-3)]"
            >
              <X aria-hidden size={18} />
            </DialogPrimitive.Close>
          </header>

          <ConversationPane hideHeader className="min-h-0 flex-1" />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
