import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * 原生 select —— shadcn 没有原生选择器，但表单里只需要一个下拉时，
 * 原生控件比 Radix Select 更轻、更稳（移动端直接唤起系统选择器）。
 * 视觉与 Input 保持一致。
 */
function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'h-[var(--control-h-md)] w-full min-w-0 appearance-none rounded-sm border border-input bg-[var(--well)] pl-2.5 pr-7 text-body text-foreground md:text-note',
        'bg-[url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\'><path d=\'M0 0l5 6 5-6z\' fill=\'%237a838c\'/></svg>")] bg-[length:10px_6px] bg-[position:right_10px_center] bg-no-repeat',
        'transition-[border-color,box-shadow] duration-150',
        'focus-visible:border-[var(--accent)] focus-visible:shadow-[0_0_0_3px_var(--accent-soft)] hover:border-ink/55 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export { Select }
