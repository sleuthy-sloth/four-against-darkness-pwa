import { describe, it, expect } from 'vitest'
import { mapKeyAction, isTypingTarget, type MapKeyContext } from '../../src/features/dungeon/mapKeys'

const ctx: MapKeyContext = { canEngage: true, canUndo: true, mapFocused: true }

describe('mapKeyAction (F)', () => {
  it('maps zoom / fit / recenter keys', () => {
    expect(mapKeyAction('+', ctx)).toBe('zoom-in')
    expect(mapKeyAction('=', ctx)).toBe('zoom-in')
    expect(mapKeyAction('-', ctx)).toBe('zoom-out')
    expect(mapKeyAction('0', ctx)).toBe('fit')
    expect(mapKeyAction('r', ctx)).toBe('recenter')
  })
  it('maps engage / undo / shortcuts', () => {
    expect(mapKeyAction('e', ctx)).toBe('engage')
    expect(mapKeyAction('u', ctx)).toBe('undo')
    expect(mapKeyAction('?', ctx)).toBe('shortcuts')
  })
  it('engage and undo are null when they cannot apply', () => {
    expect(mapKeyAction('e', { ...ctx, canEngage: false })).toBeNull()
    expect(mapKeyAction('u', { ...ctx, canUndo: false })).toBeNull()
  })
  it('arrows pan only when the map is focused', () => {
    expect(mapKeyAction('ArrowUp', ctx)).toBe('pan-up')
    expect(mapKeyAction('ArrowDown', ctx)).toBe('pan-down')
    expect(mapKeyAction('ArrowLeft', ctx)).toBe('pan-left')
    expect(mapKeyAction('ArrowRight', ctx)).toBe('pan-right')
    expect(mapKeyAction('ArrowUp', { ...ctx, mapFocused: false })).toBeNull()
  })
  it('ignores other keys', () => {
    expect(mapKeyAction('x', ctx)).toBeNull()
    expect(mapKeyAction('Enter', ctx)).toBeNull()
    expect(mapKeyAction('Tab', ctx)).toBeNull()
  })
})

describe('isTypingTarget (F)', () => {
  // Node test env has no DOM: fake targets with just a tagName.
  const fake = (tagName: string, extra: Record<string, unknown> = {}) =>
    ({ tagName, ...extra }) as unknown as EventTarget

  it('detects inputs, textareas, selects, and content-editables', () => {
    expect(isTypingTarget(fake('INPUT'))).toBe(true)
    expect(isTypingTarget(fake('TEXTAREA'))).toBe(true)
    expect(isTypingTarget(fake('SELECT'))).toBe(true)
    expect(isTypingTarget(fake('DIV', { isContentEditable: true }))).toBe(true)
  })

  it('lets ordinary elements and null through', () => {
    expect(isTypingTarget(fake('DIV'))).toBe(false)
    expect(isTypingTarget(fake('BUTTON'))).toBe(false)
    expect(isTypingTarget(fake('svg'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
    expect(isTypingTarget({} as EventTarget)).toBe(false)
  })
})
