import { describe, expect, it } from 'vitest'
import { parseRollFromText, pipsFor } from '../../src/features/common/dice'
import { PARCHMENT_NOISE_URI, TORN_EDGE_URI } from '../../src/features/common/Ornament'

describe('parseRollFromText (C6: drawn dice read the visible log text)', () => {
  it.each([
    ['Reaction: d6=2.', { kind: 'd6', value: 2, exploding: false }],
    ['d6=3', { kind: 'd6', value: 3, exploding: false }],
    ['XP roll: d6=6.', { kind: 'd6', value: 6, exploding: false }],
    ['d6=6 — exploding!', { kind: 'd6', value: 6, exploding: true }],
    ['Rolled d66 = 43', { kind: 'd66', tens: 4, units: 3, exploding: false }],
    ['Rolled d66 = 11', { kind: 'd66', tens: 1, units: 1, exploding: false }],
    ['d66=25', { kind: 'd66', tens: 2, units: 5, exploding: false }],
    ['d66=66', { kind: 'd66', tens: 6, units: 6, exploding: false }],
  ])('parses %s', (text, expected) => {
    expect(parseRollFromText(text)).toEqual(expected)
  })

  it('returns null when no fixed d6=/d66= spelling is present', () => {
    expect(parseRollFromText('The party enters the corridor.')).toBeNull()
    expect(parseRollFromText('')).toBeNull()
    // Attack/defense rolls log only totals ("You rolled 5.") — no face
    // value exists to draw, so the parser stays silent by design.
    expect(parseRollFromText('You rolled 5.')).toBeNull()
  })

  it('prefers an explicit d66 over a bare d6 in the same line', () => {
    expect(parseRollFromText('Rolled d66 = 43 (d6=4)')).toEqual({
      kind: 'd66',
      tens: 4,
      units: 3,
      exploding: false,
    })
  })

  it('takes the first d6 in a line with two', () => {
    expect(parseRollFromText('Boss reaction d6=2 vs d6=5.')).toEqual({
      kind: 'd6',
      value: 2,
      exploding: false,
    })
  })
})

describe('pipsFor (C6: drawn die pips, standard layout in a 100×100 box)', () => {
  it.each([
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
    [6, 6],
  ])('value %d renders %d pips', (value, count) => {
    const pips = pipsFor(value)
    expect(pips).toHaveLength(count)
    // every pip centre lies inside the face
    pips.forEach(({ x, y }) => {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(100)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(100)
    })
  })

  it('returns no pips outside 1–6', () => {
    expect(pipsFor(0)).toHaveLength(0)
    expect(pipsFor(7)).toHaveLength(0)
  })
})

describe('texture data-URIs (C7: ≤4KB each, no binary assets)', () => {
  it('parchment noise is a small inline SVG data-URI wrapped for CSS use', () => {
    expect(PARCHMENT_NOISE_URI).toContain('data:image/svg+xml,')
    expect(PARCHMENT_NOISE_URI.length).toBeLessThanOrEqual(4096)
  })

  it('torn edge is a small inline SVG data-URI wrapped for CSS use', () => {
    expect(TORN_EDGE_URI).toContain('data:image/svg+xml,')
    expect(TORN_EDGE_URI.length).toBeLessThanOrEqual(4096)
  })
})
