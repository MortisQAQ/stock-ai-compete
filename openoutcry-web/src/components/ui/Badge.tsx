import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

/** 小标签 —— 源自 shadcn/ui 的 badge，收成票据边角上的方章 */
const badgeVariants = cva(
  [
    'inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap',
    'rounded-xs border px-2 py-1 font-mono text-micro font-semibold uppercase leading-none tracking-[0.12em]',
    'transition-colors [&>svg]:pointer-events-none [&>svg]:size-3',
  ],
  {
    variants: {
      variant: {
        default: 'border-transparent bg-ink text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border-strong bg-transparent text-ink-2',
        muted: 'border-transparent bg-muted text-muted-foreground',
        ver: 'border-ver/30 bg-ver/8 text-ver-deep',
        pine: 'border-pine/25 bg-pine/8 text-pine',
        brass: 'border-brass/30 bg-brass/8 text-[#6f552b]',
        instrument: 'border-instrument-border bg-transparent text-instrument-muted',
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
