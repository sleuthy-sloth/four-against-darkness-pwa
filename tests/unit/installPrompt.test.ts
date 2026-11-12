import { describe, expect, it } from 'vitest'
import {
  dismissPrompt,
  hasDelved,
  isDismissed,
  isInstalled,
  isIOSDevice,
  isStandaloneMode,
  markDelved,
  markInstalled,
  markShown,
  shouldShowPrompt,
  wasShown,
  type PromptGate,
  type PromptStorage,
} from '../../src/features/common/installPrompt'

function memStorage(): PromptStorage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v)
    },
    dump: () => Object.fromEntries(map),
  }
}

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const IPADOS_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

describe('install-prompt platform detection (Phase H)', () => {
  it('recognises iPhone and iPad user agents', () => {
    expect(isIOSDevice(IPHONE_UA, 'iPhone', 5)).toBe(true)
    expect(isIOSDevice(IPAD_UA, 'iPad', 5)).toBe(true)
  })

  it('recognises iPadOS 13+ masquerading as Macintosh with touch', () => {
    expect(isIOSDevice(IPADOS_UA, 'Macintosh', 5)).toBe(true)
    // A real Mac has no touch points.
    expect(isIOSDevice(IPADOS_UA, 'Macintosh', 0)).toBe(false)
  })

  it('does not mistake Android or desktop Chrome for iOS', () => {
    expect(isIOSDevice(ANDROID_UA, 'Linux armv8l', 5)).toBe(false)
    expect(isIOSDevice(DESKTOP_UA, 'Macintosh', 0)).toBe(false)
  })

  it('detects standalone display mode and iOS navigator.standalone', () => {
    const standalone = () => ({ matches: true })
    const browser = () => ({ matches: false })
    expect(isStandaloneMode(standalone, undefined)).toBe(true)
    expect(isStandaloneMode(browser, true)).toBe(true)
    expect(isStandaloneMode(browser, undefined)).toBe(false)
    expect(isStandaloneMode(browser, false)).toBe(false)
  })
})

describe('install-prompt persistence (never nag)', () => {
  it('starts un-delved, un-shown, un-dismissed', () => {
    const s = memStorage()
    expect(hasDelved(s)).toBe(false)
    expect(wasShown(s)).toBe(false)
    expect(isDismissed(s)).toBe(false)
    expect(isInstalled(s)).toBe(false)
  })

  it('dismissing consumes the one auto-showing', () => {
    const s = memStorage()
    markDelved(s)
    dismissPrompt(s)
    expect(isDismissed(s)).toBe(true)
    expect(wasShown(s)).toBe(true)
  })

  it('marking shown without dismissing still blocks a second auto-show', () => {
    const s = memStorage()
    markShown(s)
    expect(wasShown(s)).toBe(true)
    expect(isDismissed(s)).toBe(false)
  })

  it('installing sticks', () => {
    const s = memStorage()
    markInstalled(s)
    expect(isInstalled(s)).toBe(true)
  })
})

describe('install-prompt gate (shown once, after the first delve)', () => {
  const base: PromptGate = {
    delved: true,
    dismissed: false,
    shown: false,
    installed: false,
    standalone: false,
    hasActiveCombat: false,
    hasPendingChoice: false,
    tutorialActive: false,
  }

  it('shows after the first delve when nothing else needs the player', () => {
    expect(shouldShowPrompt(base)).toBe(true)
  })

  it('never shows before the first delve', () => {
    expect(shouldShowPrompt({ ...base, delved: false })).toBe(false)
  })

  it('never shows twice, after a dismiss, after install, or when installed', () => {
    expect(shouldShowPrompt({ ...base, shown: true })).toBe(false)
    expect(shouldShowPrompt({ ...base, dismissed: true })).toBe(false)
    expect(shouldShowPrompt({ ...base, installed: true })).toBe(false)
    expect(shouldShowPrompt({ ...base, standalone: true })).toBe(false)
  })

  it('waits while a combat, a choice, or the tutorial holds the screen', () => {
    expect(shouldShowPrompt({ ...base, hasActiveCombat: true })).toBe(false)
    expect(shouldShowPrompt({ ...base, hasPendingChoice: true })).toBe(false)
    expect(shouldShowPrompt({ ...base, tutorialActive: true })).toBe(false)
  })
})
