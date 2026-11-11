import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * 小标签 —— 源自 shadcn/ui 的 badge。
 * 默认是描边标签（中性信息不上色）；语义变体用 12% 同色底 + 同色字，
 * 靠色相而不是靠填充面积表达状态。
 */
const badgeVariants = cva(
  [
    'inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap',
    'rounded-xs border px-2 py-1 font-mono text-micro font-semibold uppercase leading-none tracking-[0.12em]',
    'transition-colors [&>svg]:pointer-events-none [&>svg]:size-3',
  ],
  {
    variants: {
      variant: {
        default: 'border-border bg-transparent text-[var(--fg-2)]',
        secondary: 'border-transparent bg-secondary text-[var(--fg-1)]',
        outline: 'border-border bg-transparent text-[var(--fg-2)]',
        muted: 'border-transparent bg-muted text-muted-foreground',
        ver: 'border-transparent bg-[var(--up-soft)] text-[var(--up)]',
        pine: 'border-transparent bg-[var(--down-soft)] text-[var(--down)]',
        brass: 'border-transparent bg-[var(--warn-soft)] text-[var(--warn)]',
        instrument: 'border-instrument-border bg-transparent text-[var(--fg-1)]',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)

interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span'
  return (
    <Comp data-slot="badge" data-variant={variant ?? 'secondary'} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
