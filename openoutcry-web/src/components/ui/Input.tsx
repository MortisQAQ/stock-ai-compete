import * as React from 'react'

import { cn } from '@/lib/utils'

/** 输入框 —— 源自 shadcn/ui 的 input，白色纸张面 + 朱砂聚焦描边 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-[var(--control-h-md)] w-full min-w-0 rounded-sm border border-input bg-white px-2.5 text-body text-foreground md:text-note',
        'shadow-[inset_0_1px_2px_rgba(18,26,21,0.06)] transition-colors duration-150',
        'hover:border-ink/40 placeholder:text-muted-foreground/80',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
