/**
 * Keyboard map for the dungeon screen (Milestone 5 — Phase F).
 *
 * Pure key → action mapping, so the shortcuts are unit-testable without a
 * DOM. The component owns the guards (ignore typing targets, ignore while a
 * dialog or the undo confirm is open) and the effects.
 */

export type MapKeyAction =
  | 'zoom-in'
  | 'zoom-out'
  | 'fit'
  | 'recenter'
  | 'engage'
  | 'undo'
  | 'shortcuts'
  | 'pan-up'
  | 'pan-down'
  | 'pan-left'
  | 'pan-right'

export interface MapKeyContext {
  /** An encounter is showing on the current tile and combat has not begun. */
  canEngage: boolean
  /** An undoable action exists (the undo button is showing). */
  canUndo: boolean
  /** The map viewport itself has keyboard focus (arrows pan only then). */
  mapFocused: boolean
}

/** Map a key press to an action, or null when the key is not a shortcut. */
export function mapKeyAction(key: string, ctx: MapKeyContext): MapKeyAction | null {
  switch (key) {
    case '+':
    case '=':
      return 'zoom-in'
    case '-':
    case '_':
      return 'zoom-out'
    case '0':
      return 'fit'
    case 'r':
    case 'R':
      return 'recenter'
    case 'e':
    case 'E':
      return ctx.canEngage ? 'engage' : null
    case 'u':
    case 'U':
      return ctx.canUndo ? 'undo' : null
    case '?':
      return 'shortcuts'
    case 'ArrowUp':
      return ctx.mapFocused ? 'pan-up' : null
    case 'ArrowDown':
      return ctx.mapFocused ? 'pan-down' : null
    case 'ArrowLeft':
      return ctx.mapFocused ? 'pan-left' : null
    case 'ArrowRight':
      return ctx.mapFocused ? 'pan-right' : null
    default:
      return null
  }
}

/**
 * True when the key event's target is a typing control — shortcuts stay out.
 * Reads `tagName` directly (no `instanceof`), so it works in node tests
 * with plain fake targets as well as with real DOM elements.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target) return false
  const el = target as unknown as { tagName?: unknown; isContentEditable?: unknown }
  if (typeof el.tagName !== 'string') return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true
}
