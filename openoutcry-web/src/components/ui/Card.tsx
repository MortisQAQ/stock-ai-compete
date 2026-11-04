import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * 卡片 —— 源自 shadcn/ui 的 card，按「纸质大厅」重绘。
 * 四种纸面：default（压边纸）/ flat（平铺）/ instrument（深色仪器面）/ dashed（空缺位）
 * interactive 打开悬停抬升，配合 asChild 可直接渲染成 button / a。
 */
const cardVariants = cva('group/card flex flex-col rounded-md text-card-foreground', {
  variants: {
    variant: {
      default: 'border border-border bg-card shadow-press',
      flat: 'border border-border bg-card',
      instrument: 'border border-plate-0 bg-instrument text-instrument-foreground shadow-plate-lg',
      dashed: 'border border-dashed border-border-strong bg-transparent',
      ghost: 'bg-transparent',
    },
    interactive: {
      true: 'cursor-pointer text-left transition-[border-color,box-shadow,transform,background-color] duration-150 ease-[var(--ease-out-quart)] hover:-translate-y-px hover:border-ink/35 hover:shadow-raise',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    interactive: false,
  },
})

interface CardProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
}

function Card({ className, variant, interactive, asChild = false, ...props }: CardProps) {
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      data-slot="card"
      data-variant={variant ?? 'default'}
      className={cn(cardVariants({ variant, interactive }), className)}
      {...props}
    />
  )
}

/** 卡头：等宽大写微标签条，与卡身用 1px 墨线隔开 */
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex items-center justify-between gap-3 border-b border-border px-4 py-2.5',
        'font-mono text-micro font-semibold uppercase leading-none tracking-[0.16em] text-muted-foreground',
        'group-data-[variant=instrument]/card:border-instrument-border group-data-[variant=instrument]/card:text-instrument-muted',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('font-serif text-body font-bold leading-snug tracking-[-0.01em]', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        'text-note leading-relaxed text-muted-foreground',
        'group-data-[variant=instrument]/card:text-instrument-muted',
        className,
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('ml-auto flex shrink-0 items-center gap-2', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-4 py-3.5', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center gap-2 border-t border-border px-4 py-2.5',
        'group-data-[variant=instrument]/card:border-instrument-border',
        className,
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter, cardVariants }
