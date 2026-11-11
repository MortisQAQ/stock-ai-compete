import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * 按钮 —— 源自 shadcn/ui 的 button，按「深色仪器」重绘：
 * · 直角 + 1px 发丝线，没有任何投影（暗底上投影不可见，只会多一行看不懂的数字）
 * · 等宽大写微字，字距 0.08em，保证中英文混排都有票据感
 * · 全屏只允许一个 accent 实底按钮（报头的「进入训练场」）：
 *   其余主动作一律用 ver = accent 描边，靠轮廓而不是靠色块抢注意力
 * · 焦点一律交给全局 :focus-visible（accent 2px outline），组件内不再叠 ring
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap',
    'rounded-sm border font-mono text-note font-semibold uppercase leading-none tracking-[0.08em]',
    'transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out-quart)]',
    'disabled:pointer-events-none disabled:opacity-40',
    'aria-invalid:border-destructive',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  ],
  {
    variants: {
      variant: {
        // 默认 = 次级：透明底 + 控件轮廓，悬停才抬一档表面
        default:
          'border-[var(--control-line)] bg-transparent text-foreground hover:border-ink/45 hover:bg-[var(--bg-2)] active:translate-y-px',
        // 主操作：全站唯一的实底 accent
        solid:
          'border-[var(--accent)] bg-[var(--accent)] text-[#04070d] hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)] active:translate-y-px',
        // 主动作的次级形态：accent 描边，不填实底
        ver: 'border-[var(--accent)] bg-transparent text-[var(--accent)] hover:bg-[var(--accent-soft)] active:translate-y-px',
        // 危险 = 红描边 + 红字，不填实底（填实底会和涨跌色抢注意力）
        destructive:
          'border-[var(--up)] bg-transparent text-[var(--up)] hover:bg-[var(--up-soft)] active:translate-y-px',
        // 幽灵按钮 = 「可点的文字」，所以走交互青而不是灰。
        // 一屏里青色只出现在真正能点的地方，灰色只出现在只读信息上 ——
        // 这两条一旦混，用户就没法靠颜色判断哪里能点。
        ghost:
          'border-transparent bg-transparent text-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-hover)] active:translate-y-px',
        outline:
          'border-[var(--control-line)] bg-transparent text-foreground hover:border-ink/45 hover:bg-[var(--bg-2)] active:translate-y-px',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-[var(--bg-3)] active:translate-y-px',
        link: 'border-transparent text-[var(--accent)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[var(--control-h-md)] px-3.5',
        md: 'h-[var(--control-h-md)] px-3.5',
        xs: 'h-[var(--control-h-xs)] gap-1 px-2 text-micro',
        sm: 'h-[var(--control-h-sm)] px-2.5',
        lg: 'h-[var(--control-h-lg)] px-5 text-note',
        icon: 'size-[var(--control-h-md)] px-0',
        'icon-sm': 'size-[var(--control-h-sm)] px-0',
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
