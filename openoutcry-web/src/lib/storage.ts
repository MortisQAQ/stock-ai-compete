/** 本地持久化 schema 版本号，结构不兼容变更时递增 */
export const STORAGE_VERSION = 'v1'

/**
 * 防御式读取 localStorage：
 * 在 SSR、严格隐私模式、沙箱 iframe 或浏览器禁用存储抛出 SecurityError 时返回 null。
 */
export function safeGetStorage(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * 防御式写入 localStorage：
 * 当存储不可用、配额溢出或抛出 SecurityError 时安全返回 false。
 */
export function safeSetStorage(key: string, value: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
