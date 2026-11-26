import { afterEach, describe, expect, it } from 'vitest'

import { STORAGE_VERSION, safeGetStorage, safeSetStorage } from './storage'

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')

function restoreWindow() {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, 'window', originalWindowDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'window')
  }
}

describe('storage', () => {
  afterEach(() => {
    restoreWindow()
  })

  it('exports STORAGE_VERSION as v1', () => {
    expect(STORAGE_VERSION).toBe('v1')
  })

  it('reads and writes values when localStorage is available', () => {
    const backing = new Map<string, string>()
    const mockStorage = {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => {
        backing.set(key, value)
      },
    }
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: mockStorage },
    })

    expect(safeGetStorage('theme')).toBeNull()
    expect(safeSetStorage('theme', 'light')).toBe(true)
    expect(safeGetStorage('theme')).toBe('light')
  })

  it('degrades gracefully in SSR when window is undefined', () => {
    Reflect.deleteProperty(globalThis, 'window')

    expect(safeGetStorage('theme')).toBeNull()
    expect(safeSetStorage('theme', 'dark')).toBe(false)
  })

  it('degrades gracefully when accessing window.localStorage throws SecurityError', () => {
    const mockWindow = {}
    Object.defineProperty(mockWindow, 'localStorage', {
      configurable: true,
      get() {
        const err = new Error('The operation is insecure.')
        err.name = 'SecurityError'
        throw err
      },
    })
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: mockWindow,
    })

    expect(safeGetStorage('lang')).toBeNull()
    expect(safeSetStorage('lang', 'en')).toBe(false)
  })

  it('degrades gracefully when getItem or setItem throws', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: () => {
            throw new Error('SecurityError')
          },
          setItem: () => {
            throw new Error('QuotaExceededError')
          },
        },
      },
    })

    expect(safeGetStorage('k')).toBeNull()
    expect(safeSetStorage('k', 'v')).toBe(false)
  })
})
