import type { ComponentType } from 'react'

/**
 * 把「动态 import + 具名导出」适配成 React Router 的 route.lazy。
 *
 * 显式传导出名，而不是约定 default：
 * - 页面继续用具名导出，重命名时编辑器能直接重构；
 * - 导出名写错会在路由加载时立刻报错，而不是渲染出一个 undefined 组件。
 */
export function lazyPage(
  load: () => Promise<Record<string, unknown>>,
  exportName: string,
): () => Promise<{ Component: ComponentType }> {
  return async () => {
    const mod = await load()
    const Component = mod[exportName]
    if (typeof Component !== 'function') {
      throw new Error(`路由模块缺少组件导出：${exportName}`)
    }
    return { Component: Component as ComponentType }
  }
}
