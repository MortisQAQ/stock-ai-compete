import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * 页签 —— 源自 shadcn/ui 的 tabs（Radix）。键盘方向键、roving tabindex、
 * aria-selected / aria-controls 都由 Radix 负责，这里只管纸面样式。
 * line：下划线页签（默认，配票据卡头）；segmented：实体分段控件。
 */
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-3', className)} {...props} />
}

const tabsListVariants = cva('group/tabs-list inline-flex items-center', {
  variants: {
    variant: {
      line: 'w-full justify-start gap-0.5 border-b border-border',
      segmented: 'w-fit rounded-sm border border-ink/12 bg-bone-lo/70 p-0.5',
    },
  },
  defaultVariants: {
    variant: 'line',
  },
})

function TabsList({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant ?? 'line'}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap font-mono text-micro font-semibold uppercase tracking-[0.14em] transition-[color,background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out-quart)] disabled:pointer-events-none disabled:opacity-40',
        // line
        'relative h-9 px-3 text-muted-foreground hover:text-foreground',
        'after:absolute after:inset-x-0 after:bottom-[-1px] after:h-[2px] after:bg-transparent after:transition-colors',
        'data-[state=active]:text-foreground data-[state=active]:after:bg-ver',
        'group-data-[variant=segmented]/tabs-list:h-[26px] group-data-[variant=segmented]/tabs-list:rounded-xs group-data-[variant=segmented]/tabs-list:px-2.5 group-data-[variant=segmented]/tabs-list:after:hidden',
        'group-data-[variant=segmented]/tabs-list:data-[state=active]:bg-card group-data-[variant=segmented]/tabs-list:data-[state=active]:shadow-press',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('outline-none', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
