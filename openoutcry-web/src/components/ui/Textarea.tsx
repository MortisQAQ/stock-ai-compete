import * as React from 'react'

import { cn } from '@/lib/utils'

/** 多行输入 —— 源自 shadcn/ui 的 textarea */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-20 w-full rounded-sm border border-input bg-white px-2.5 py-2 text-body leading-relaxed text-foreground md:text-note',
        'shadow-[inset_0_1px_2px_rgba(18,26,21,0.06)] transition-colors duration-150',
        'resize-y hover:border-ink/40 placeholder:text-muted-foreground/80',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
