import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * 按钮 —— 源自 shadcn/ui 的 button，按「纸质大厅」重绘：
 * · 直角 + 1px 墨线 + 1px 硬投影，按下时投影收掉、整体下沉 1px（印刷机的压感）
 * · 等宽大写微字，字距 0.08em，保证中英文混排都有票据感
 * · 焦点一律交给全局 :focus-visible（朱砂 2px outline），组件内不再叠 ring
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap',
    'rounded-sm border font-mono text-note font-semibold uppercase leading-none tracking-[0.08em]',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out-quart)]',
    'disabled:pointer-events-none disabled:opacity-40',
    'aria-invalid:border-destructive',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  ],
  {
    variants: {
      variant: {
        default:
          'border-ink/25 bg-card text-foreground shadow-press hover:border-ink/55 hover:bg-[#fbf8f1] hover:shadow-raise active:translate-y-px active:shadow-none',
        solid:
          'border-pine bg-pine text-primary-foreground shadow-press hover:border-plate-2 hover:bg-plate-2 hover:shadow-raise active:translate-y-px active:shadow-none',
        ver:
          'border-ver bg-ver text-white shadow-press hover:border-ver-deep hover:bg-ver-deep hover:shadow-raise active:translate-y-px active:shadow-none',
        destructive:
          'border-ver bg-ver text-white shadow-press hover:border-ver-deep hover:bg-ver-deep hover:shadow-raise active:translate-y-px active:shadow-none',
        ghost:
          'border-transparent bg-transparent text-ink-2 hover:bg-ink/6 hover:text-foreground active:translate-y-px',
        outline:
          'border-border-strong bg-transparent text-foreground hover:border-ink/55 hover:bg-ink/5 active:translate-y-px',
        secondary:
          'border-ink/15 bg-secondary text-secondary-foreground hover:border-ink/30 hover:bg-bone-lo active:translate-y-px',
        link: 'border-transparent text-ver underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-3.5',
        md: 'h-9 px-3.5',
        xs: 'h-6 gap-1 px-2 text-micro',
        sm: 'h-[30px] px-2.5',
        lg: 'h-11 px-5 text-note',
        icon: 'size-9 px-0',
        'icon-sm': 'size-[30px] px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** 撑满父容器宽度（旧版 API，保留以兼容既有调用） */
  wide?: boolean
}

function Button({ className, variant, size, asChild = false, wide = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? 'default'}
      data-size={size ?? 'default'}
      className={cn(buttonVariants({ variant, size }), wide && 'w-full', className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
