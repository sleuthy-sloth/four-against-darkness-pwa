/**
 * Install-prompt state (Phase H): a custom, manuscript-styled prompt shown
 * once after the first delve — never on first paint, never nagging.
 *
 * Pure helpers (no DOM) so the gate is unit-tested; the React component in
 * InstallPrompt.tsx wires them to the stores and the beforeinstallprompt
 * event. Storage keys follow the existing `tome-` prefix (see motion.ts).
 */

/** Custom event a Settings row dispatches to open the sheet on demand. */
export const INSTALL_PROMPT_EVENT = 'tome-delve:show-install'

const DELVED_KEY = 'tome-install-delved'
const SHOWN_KEY = 'tome-install-shown'
const DISMISSED_KEY = 'tome-install-dismissed'
const INSTALLED_KEY = 'tome-install-installed'

export interface PromptStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function safeGet(storage: PromptStorage, key: string): boolean {
  try {
    return storage.getItem(key) === '1'
  } catch {
    return false
  }
}

function safeSet(storage: PromptStorage, key: string): void {
  try {
    storage.setItem(key, '1')
  } catch {
    // Storage unavailable (private mode, tests) — the prompt simply
    // never persists its state, and the gate stays conservative.
  }
}

/** The player has delved: the dungeon grew past the entrance tile, or a
    combat was won. Durable across sessions — the prompt must survive a
    cold start, when the dungeon store is empty until the dungeon tab loads. */
export function hasDelved(storage: PromptStorage): boolean {
  return safeGet(storage, DELVED_KEY)
}

export function markDelved(storage: PromptStorage): void {
  safeSet(storage, DELVED_KEY)
}

/** The auto-prompt has been displayed once. */
export function wasShown(storage: PromptStorage): boolean {
  return safeGet(storage, SHOWN_KEY)
}

export function markShown(storage: PromptStorage): void {
  safeSet(storage, SHOWN_KEY)
}

/** The player said "not now" (or dismissed the native prompt). */
export function isDismissed(storage: PromptStorage): boolean {
  return safeGet(storage, DISMISSED_KEY)
}

/** Dismissing consumes the one auto-showing: shown AND dismissed. */
export function dismissPrompt(storage: PromptStorage): void {
  safeSet(storage, SHOWN_KEY)
  safeSet(storage, DISMISSED_KEY)
}

/** The app was installed (native `appinstalled` event, or an accepted
    beforeinstallprompt choice). */
export function isInstalled(storage: PromptStorage): boolean {
  return safeGet(storage, INSTALLED_KEY)
}

export function markInstalled(storage: PromptStorage): void {
  safeSet(storage, INSTALLED_KEY)
}

/**
 * iOS Safari has no beforeinstallprompt: iPhone / iPad / iPod, including
 * iPadOS 13+, which reports as Macintosh with touch.
 */
export function isIOSDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true
  return platform === 'Macintosh' && maxTouchPoints > 1
}

/**
 * Already running as an installed app: standalone display mode, or iOS
 * navigator.standalone.
 */
export function isStandaloneMode(
  matchMedia: (query: string) => { matches: boolean },
  standalone: unknown,
): boolean {
  if (standalone === true) return true
  try {
    return matchMedia('(display-mode: standalone)').matches
  } catch {
    return false
  }
}

export interface PromptGate {
  delved: boolean
  dismissed: boolean
  shown: boolean
  installed: boolean
  standalone: boolean
  /** A combat is up (fighting, or a victory panel awaiting the player). */
  hasActiveCombat: boolean
  /** A feature/event choice dialog is open. */
  hasPendingChoice: boolean
  /** The tutorial coach is running — the prompt must not fight it. */
  tutorialActive: boolean
}

/**
 * The auto-prompt shows exactly once, after the first delve, and only
 * when nothing else is demanding the player's attention.
 */
export function shouldShowPrompt(g: PromptGate): boolean {
  return (
    g.delved &&
    !g.dismissed &&
    !g.shown &&
    !g.installed &&
    !g.standalone &&
    !g.hasActiveCombat &&
    !g.hasPendingChoice &&
    !g.tutorialActive
  )
}
