import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/**
 * 弹窗与说明区里的正文段落。
 *
 * 之前同一组内联样式（fontSize / lineHeight / color）在 6 个弹窗里各写了一遍，
 * 改字号要改 6 处。收成一个组件后，口径由 Tailwind 语义类统一表达。
 */
export function Prose({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="prose" className={cn('text-body leading-[1.7] text-ink-2', className)} {...props} />
}
