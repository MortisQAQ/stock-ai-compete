import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AgentId } from '../types'

export type DialogState =
  | { kind: 'none' }
  | { kind: 'snapshot' }
  | { kind: 'replay' }
  | { kind: 'detail'; id: string }
  | { kind: 'abort' }
  | { kind: 'goal' }
  | { kind: 'modify' }
  | { kind: 'agent'; agentId: AgentId }
  | { kind: 'switchAgent'; agentId: AgentId }

interface DialogContextValue {
  dialog: DialogState
  open: (d: DialogState) => void
  close: () => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })
  const open = useCallback((d: DialogState) => setDialog(d), [])
  const close = useCallback(() => setDialog({ kind: 'none' }), [])
  const value = useMemo(() => ({ dialog, open, close }), [dialog, open, close])
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog 必须在 DialogProvider 内部使用')
  return ctx
}
