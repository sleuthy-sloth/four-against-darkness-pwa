import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  prefersReducedMotion,
  hapticsEnabled,
  setHapticsEnabled,
  hapticBuzz,
} from '../../src/features/common/motion'

// Unit tests run in plain node (vitest.config.ts) — no DOM, no localStorage,
// no navigator. Stub the browser bits on globalThis for these tests only.
// (Node exposes `navigator` as a getter-only property, so it needs
// defineProperty rather than plain assignment.)
function installBrowserStubs(matchReduced: boolean) {
  const store = new Map<string, string>()
  const calls: Array<number | number[]> = []
  const g = globalThis as unknown as Record<string, unknown>
  g.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
  }
  g.window = {
    matchMedia: () => ({ matches: matchReduced }),
  }
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      vibrate: (p: number | number[]) => {
        calls.push(p)
        return true
      },
    },
    configurable: true,
  })
  return { store, calls }
}

describe('motion helpers (E)', () => {
  const g = globalThis as unknown as Record<string, unknown>
  let savedLocalStorage: unknown
  let savedWindow: unknown
  let savedNavigatorDesc: PropertyDescriptor | undefined

  beforeEach(() => {
    savedLocalStorage = g.localStorage
    savedWindow = g.window
    savedNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  })

  afterEach(() => {
    g.localStorage = savedLocalStorage
    g.window = savedWindow
    if (savedNavigatorDesc) {
      Object.defineProperty(globalThis, 'navigator', savedNavigatorDesc)
    } else {
      delete (globalThis as unknown as Record<string, unknown>).navigator
    }
  })

  it('haptics default off and toggle round-trips through localStorage', () => {
    const { store } = installBrowserStubs(false)
    expect(hapticsEnabled()).toBe(false)
    setHapticsEnabled(true)
    expect(hapticsEnabled()).toBe(true)
    expect(store.get('tome-haptics')).toBe('1')
    setHapticsEnabled(false)
    expect(hapticsEnabled()).toBe(false)
  })

  it('hapticsEnabled is false without any storage (node, private mode)', () => {
    delete g.localStorage
    expect(hapticsEnabled()).toBe(false)
    expect(() => setHapticsEnabled(true)).not.toThrow()
  })

  it('prefersReducedMotion reads matchMedia, false without a window', () => {
    installBrowserStubs(true)
    expect(prefersReducedMotion()).toBe(true)
    installBrowserStubs(false)
    expect(prefersReducedMotion()).toBe(false)
    delete g.window
    expect(prefersReducedMotion()).toBe(false)
  })

  it('hapticBuzz is a no-op when haptics are off (never throws)', () => {
    const { calls } = installBrowserStubs(false)
    expect(() => hapticBuzz()).not.toThrow()
    expect(() => hapticBuzz([10, 50, 10])).not.toThrow()
    expect(calls).toHaveLength(0)
  })

  it('hapticBuzz calls navigator.vibrate only when enabled', () => {
    const { calls } = installBrowserStubs(false)
    hapticBuzz()
    expect(calls).toHaveLength(0)
    setHapticsEnabled(true)
    hapticBuzz(10)
    expect(calls).toEqual([10])
  })

  it('hapticBuzz stays silent under reduced motion even when enabled', () => {
    const { calls } = installBrowserStubs(true)
    setHapticsEnabled(true)
    hapticBuzz(10)
    expect(calls).toHaveLength(0)
  })
})
