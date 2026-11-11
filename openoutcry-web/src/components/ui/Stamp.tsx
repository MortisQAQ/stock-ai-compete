import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  tone?: 'ver' | 'pine' | 'brass' | 'slate' | 'lime'
  size?: 'md' | 'sm'
  children: ReactNode
  className?: string
}

export function Stamp({ tone = 'ver', size = 'md', children, className }: Props) {
  return (
    <span className={cn('stamp', tone !== 'ver' && tone, size === 'sm' && 'sm', className)}>{children}</span>
  )
}
