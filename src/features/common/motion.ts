/**
 * Motion & haptics helpers (Milestone 5 — Phase E).
 *
 * The decided motion intensity is SUBTLE: every animation is also gated by
 * `prefers-reduced-motion` in CSS, and this module gives components a
 * JS-side check for the cases CSS cannot cover (haptics, and the party
 * pulse / tile reveal when they are driven from JS).
 */

const HAPTICS_KEY = 'tome-haptics'

/** True when the player asked for reduced motion (safe to call in tests). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Haptics toggle (Settings, default off). Stored in localStorage. */
export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem(HAPTICS_KEY) === '1'
  } catch {
    return false
  }
}

export function setHapticsEnabled(on: boolean): void {
  try {
    localStorage.setItem(HAPTICS_KEY, on ? '1' : '0')
  } catch {
    // Storage unavailable (private mode, tests) — haptics simply stay off.
  }
}

/**
 * A short vibration on engage / victory / defeat only, behind the Settings
 * toggle (default off). No-ops when haptics are off, unsupported, or the
 * player asked for reduced motion.
 */
export function hapticBuzz(pattern: number | number[] = 10): void {
  if (!hapticsEnabled() || prefersReducedMotion()) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Vibration unsupported — silently ignore.
  }
}
