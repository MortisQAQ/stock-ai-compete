import { useSyncExternalStore } from 'react'

/**
 * 订阅一条媒体查询。
 *
 * 用它来「二选一渲染」而不是用 CSS 藏起来：
 * 训练场的桌面两栏和移动单栏挂的是同一套工作台组件，
 * 两边都渲染会得到两份 DOM（两份 Tabs、两份审批卡），
 * 状态各算一遍，页签点了也只动自己那一份。
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }

  const getSnapshot = () => window.matchMedia(query).matches

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
