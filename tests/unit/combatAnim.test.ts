import { describe, expect, it } from 'vitest'
import {
  parseDamageFromText,
  parseHealFromText,
  parseAttackerForStrike,
} from '../../src/features/common/dice'

/** Stream 2: damage numerals + healing glow read the engine's own log
 *  spellings (combat.ts). Display-only parsers — they never roll or
 *  change a result. */

describe('parseDamageFromText', () => {
  it.each([
    ['Giant Rat takes 2 damage → 3/5 Life.', { target: 'Giant Rat', amount: 2 }],
    ['Torsten fails the defense: 1 damage → 4/6 Life.', { target: 'Torsten', amount: 1 }],
    ['Mira takes 1 damage → 5/6.', { target: 'Mira', amount: 1 }],
    ["Torsten takes 1 damage from the cap's bite → 4/6.", { target: 'Torsten', amount: 1 }],
  ])('parses %s', (text, expected) => {
    expect(parseDamageFromText(text)).toEqual(expected)
  })

  it('returns null when no target is named (natural 1) or no damage is dealt', () => {
    expect(parseDamageFromText('A natural 1 always fails: 1 damage.')).toBeNull()
    expect(parseDamageFromText('Hit! 2 Giant Rats slain.')).toBeNull()
    expect(parseDamageFromText('The party enters the corridor.')).toBeNull()
    expect(parseDamageFromText('')).toBeNull()
  })
})

describe('parseAttackerForStrike', () => {
  const lines = [
    'Combat begins: 1× Orc Brute (L5)',
    'Torsten attacks Orc Brute: d6[6] +5 (+5 class; hand weapon (+0)) = 14 vs L5',
    'Orc Brute takes 2 damage → 3/6 Life.',
    'Orc Brute is below half Life: its L drops to 4!',
  ]

  it('names the attacker from the attack line just before a major-foe damage line', () => {
    expect(parseAttackerForStrike(lines, 2)).toBe('Torsten')
  })

  it('names the attacker before a minor-foe Hit! line, past a sleeping-dispatch line', () => {
    const minor = [
      'Joss attacks Rats: d6[5] +4 (+4 class; hand weapon (+0)) = 9 vs L1',
      '1 sleeping Rats dispatched where they lie.',
      'Hit! 3 Rats slain (9 ÷ L1).',
    ]
    expect(parseAttackerForStrike(minor, 2)).toBe('Joss')
  })

  it('returns null for spell damage (no attack line) and out of range', () => {
    expect(parseAttackerForStrike(['Fen casts fireball: the Orc Brute takes 2 damage.'], 0)).toBeNull()
    expect(parseAttackerForStrike(lines, 0)).toBeNull()
  })
})

describe('parseHealFromText', () => {
  it('parses a cleric prayer to its target', () => {
    expect(
      parseHealFromText('Aldric prays for Healing: Torsten recovers 4 Life → 6/6.'),
    ).toEqual({ target: 'Torsten', amount: 4 })
  })

  it('parses a healing potion to its drinker', () => {
    expect(
      parseHealFromText('Mira drinks a healing potion and recovers ALL 5 lost Life → 6/6.'),
    ).toEqual({ target: 'Mira', amount: 5 })
  })

  it('returns null for a wasted potion and for non-healing lines', () => {
    expect(
      parseHealFromText('Mira drinks a healing potion at full Life — it is wasted.'),
    ).toBeNull()
    expect(parseHealFromText('Torsten fails the defense: 1 damage → 4/6 Life.')).toBeNull()
    expect(parseHealFromText('')).toBeNull()
  })
})
