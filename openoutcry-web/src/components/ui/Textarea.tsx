import * as React from 'react'

import { cn } from '@/lib/utils'

/** 多行输入 —— 与 Input 同一套凹槽面 + 控件轮廓 */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-20 w-full rounded-sm border border-input bg-[var(--well)] px-2.5 py-2 text-body leading-relaxed text-foreground md:text-note',
        'transition-[border-color,box-shadow] duration-150',
        'focus-visible:border-[var(--accent)] focus-visible:shadow-[0_0_0_3px_var(--accent-soft)] resize-y hover:border-ink/55 placeholder:text-muted-foreground/80',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
