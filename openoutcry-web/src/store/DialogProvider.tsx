import { create } from 'zustand'

import type { AgentId, WorkspaceKind } from '../types'

export type DialogState =
  | { kind: 'none' }
  | { kind: 'snapshot'; scope?: WorkspaceKind }
  | { kind: 'replay'; scope?: WorkspaceKind }
  | { kind: 'detail'; id: string; scope?: WorkspaceKind }
  | { kind: 'abort'; scope?: WorkspaceKind }
  | { kind: 'goal'; scope?: WorkspaceKind }
  | { kind: 'modify'; scope?: WorkspaceKind }
  | { kind: 'editHolding'; name?: string; scope?: WorkspaceKind }
  | { kind: 'agent'; agentId: AgentId; scope?: WorkspaceKind }
  | { kind: 'switchAgent'; agentId: AgentId; scope?: WorkspaceKind }
  | { kind: 'onboard'; scope?: WorkspaceKind }

export interface DialogContextValue {
  dialog: DialogState
  open: (d: DialogState) => void
  close: () => void
}

let restoreTarget: HTMLElement | null = null

/**
 * 全站弹窗路由 + 焦点归还。
 *
 * 弹窗不是由某个按钮通过 DialogTrigger 打开的（任何组件都能 open()），
 * Radix 不知道"从哪儿来"，所以焦点归还由这里负责：
 * 在 open() 这个**事件回调**里记录触发元素（不在 render 期读 DOM），
 * close() 后等 Radix 卸载完再 focus 回去。
 */
export const useDialogStore = create<DialogContextValue>((set) => ({
  dialog: { kind: 'none' },

  open: (next: DialogState) => {
    const active = typeof document === 'undefined' ? null : document.activeElement
    restoreTarget =
      typeof HTMLElement !== 'undefined' && active instanceof HTMLElement ? active : null
    set({ dialog: next })
  },

  close: () => {
    set({ dialog: { kind: 'none' } })
    const target = restoreTarget
    restoreTarget = null
    if (!target || !target.isConnected) return
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => target.focus())
    } else {
      target.focus()
    }
  },
}))

export function useDialog(): DialogContextValue {
  return useDialogStore()
}
