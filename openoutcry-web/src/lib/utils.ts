import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn 标准 cn()：条件合并 + Tailwind 冲突消解 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
