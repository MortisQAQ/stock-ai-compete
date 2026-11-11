import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * 输入框 —— 凹槽面 + 控件轮廓。
 * 底比页面更深一档（读成"可以往里打字的地方"），
 * 聚焦时换成 accent 描边 + 3px 柔光环，这是唯一允许出现在控件上的光。
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-[var(--control-h-md)] w-full min-w-0 rounded-sm border border-input bg-[var(--well)] px-2.5 text-body text-foreground md:text-note',
        'transition-[border-color,box-shadow] duration-150',
        'hover:border-ink/45 placeholder:text-muted-foreground/80',
        'focus-visible:border-[var(--accent)] focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
