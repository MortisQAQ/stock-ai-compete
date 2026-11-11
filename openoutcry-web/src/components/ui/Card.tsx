import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * 卡片 —— 源自 shadcn/ui 的 card，按「深色仪器」重绘。
 * 四种面：default（1px 线卡片）/ flat（同面，无悬停）/ instrument（仪器面）/ dashed（空缺位）
 * 暗底上投影不可见，层次一律交给 1px 发丝线，所以这里没有任何 shadow。
 * interactive 打开悬停抬升，配合 asChild 可直接渲染成 button / a。
 */
/* 卡片语言（参考 opencode 控制台）：
   没有描边，靠「抬一档的实心底 + 8px 圆角」把卡片从页面上分出来。
   暗底上 1px 白线会把每张卡读成一个白边盒子，密集页里尤其脏——
   描边属于「控件」（按钮/输入框，需要 3:1 边界），不属于容器。 */
const cardVariants = cva('group/card flex flex-col rounded-lg text-card-foreground', {
  variants: {
    variant: {
      default: 'bg-[var(--bg-2)]',
      flat: 'bg-[var(--bg-2)]',
      instrument: 'bg-[var(--bg-2)] text-instrument-foreground',
      dashed: 'border border-dashed border-[var(--line-lime)] bg-[var(--bg-1)]/70',
      ghost: 'bg-transparent',
    },
    interactive: {
      true: 'cursor-pointer text-left transition-[background-color,transform] duration-150 ease-[var(--ease-out-quart)] hover:-translate-y-px hover:bg-[var(--bg-3)]',
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

/** 卡头：等宽大写微标签条，与卡身用 1px 发丝线隔开 */
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        /* 卡头留白统一到 --sp-* 令牌：横向 22、纵向 16。
           写死 px-4 / py-2.5（16/10）是上一版「密」的一半来源。 */
        'flex items-center justify-between gap-3 border-b border-[var(--line-soft)] px-[var(--sp-5)] py-[var(--sp-4)]',
        /* 英文铭牌走 Oswald 窄体：同字号下宽度约为常规无衬线一半，
           正好装下金融界面里那些长英文标签。 */
        'cond text-micro font-semibold leading-none text-muted-foreground',
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
      className={cn('font-sans text-body font-semibold leading-snug tracking-[-0.02em]', className)}
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
  return (
    <div
      data-slot="card-content"
      className={cn('px-[var(--sp-5)] py-[var(--sp-5)]', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center gap-2 border-t border-[var(--line-soft)] px-[var(--sp-5)] py-[var(--sp-4)]',
        'group-data-[variant=instrument]/card:border-instrument-border',
        className,
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter, cardVariants }
