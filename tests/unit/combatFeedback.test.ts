import { describe, it, expect } from 'vitest'
import { feedbackForLogLine, feedbackTargetName, latestKindIndex } from '../../src/features/dungeon/combatFeedback'

describe('feedbackForLogLine (D3/E)', () => {
  it('classifies hits, misses are silent', () => {
    expect(feedbackForLogLine('Hit! 2 Giant Centipedes slain (5 ÷ L2).')).toBe('hit')
    expect(feedbackForLogLine('Miss (3 < L4).')).toBeNull()
  })
  it('classifies failed defenses (including natural 1)', () => {
    expect(
      feedbackForLogLine('Torsten fails the defense: 1 damage → 4/5 Life.'),
    ).toBe('defense-fail')
    expect(feedbackForLogLine('A natural 1 always fails: 1 damage.')).toBe('defense-fail')
    expect(feedbackForLogLine('Anya avoids the attack.')).toBeNull()
  })
  it('classifies morale breaks, not the party fleeing', () => {
    expect(
      feedbackForLogLine('The remaining Giant Centipedes flee! (Their treasure: Phase 5.)'),
    ).toBe('morale')
    expect(feedbackForLogLine('The Orcs are outnumbered and flee!')).toBe('morale')
    expect(feedbackForLogLine('The party flees!')).toBeNull()
    expect(feedbackForLogLine('The party escapes to a visited tile.')).toBeNull()
  })
  it('classifies victory and fallen', () => {
    expect(
      feedbackForLogLine('Victory! All Foes defeated or fled. Loot roll comes with the treasure engine.'),
    ).toBe('victory')
    expect(feedbackForLogLine('Torsten has fallen!')).toBe('fallen')
    expect(feedbackForLogLine('The whole party has fallen.')).toBe('fallen')
    expect(feedbackForLogLine('The party has been wiped out. Adventure over.')).toBe('fallen')
  })
  it('returns null for ordinary lines', () => {
    expect(feedbackForLogLine('— Foes\' turn (round 2) —')).toBeNull()
    expect(feedbackForLogLine('The party enters the dungeon.')).toBeNull()
    expect(feedbackForLogLine('Rolled d66 = 14: corridor tile.')).toBeNull()
  })
})

describe('feedbackTargetName (D3)', () => {
  it('finds the foe named in the line', () => {
    expect(
      feedbackTargetName('Hit! 2 Giant Centipedes slain (5 ÷ L2).', ['Giant Centipedes', 'Orcs']),
    ).toBe('Giant Centipedes')
  })
  it('returns null when no foe is named', () => {
    expect(feedbackTargetName('Victory! All Foes defeated or fled.', ['Orcs'])).toBeNull()
  })
})

describe('latestKindIndex (polish pass — P1-9)', () => {
  it('finds a hit buried under the foes-turn block', () => {
    const lines = [
      'Warrior attacks Orcs: d6[5] +1 (+1 class; hand weapon) = 6 vs L4',
      'Hit! 2 Orcs slain (6 ÷ L4).',
      "— Foes' turn (round 2) —",
      'Orcs #1 attacks Cleric: defense d6[4] +0 (+1 light armor, +1 shield) = 4; needs > L4',
      'Cleric avoids the attack.',
    ]
    expect(latestKindIndex(lines, 'hit')).toBe(1)
    // The defense lines carry no defense-fail, so that channel is empty.
    expect(latestKindIndex(lines, 'defense-fail')).toBeNull()
  })
  it('keeps channels separate: a failed defense does not swallow the hit', () => {
    const lines = [
      'Hit! 1 Orcs slain (5 ÷ L4).',
      "— Foes' turn (round 2) —",
      'Orcs #1 attacks Cleric: defense d6[1] +0 (+1 light armor, +1 shield) = 1; needs > L4',
      'A natural 1 always fails: 1 damage.',
    ]
    expect(latestKindIndex(lines, 'hit')).toBe(0)
    expect(latestKindIndex(lines, 'defense-fail')).toBe(3)
  })
  it('finds a killing blow under the victory line', () => {
    const lines = [
      'Warrior attacks Orcs: d6[6] +1 = 7 vs L4',
      'Hit! 2 Orcs slain (7 ÷ L4).',
      'Victory! All Foes defeated or fled. Loot roll comes with the treasure engine.',
    ]
    expect(latestKindIndex(lines, 'hit')).toBe(1)
    expect(latestKindIndex(lines, 'victory')).toBe(2)
  })
  it('returns null when the kind never appears (or is stale)', () => {
    const lines = [
      'Hit! 2 Orcs slain (6 ÷ L4).',
      "— Foes' turn (round 2) —",
      'Orcs #1 attacks Cleric: defense d6[4] +0 = 4; needs > L4',
      'Cleric avoids the attack.',
      'Warrior attacks Orcs: d6[2] +1 = 3 vs L4',
      'Miss (3 < L4).',
      "— Foes' turn (round 3) —",
      'Orcs #1 attacks Cleric: defense d6[5] +0 = 5; needs > L4',
      'Cleric avoids the attack.',
    ]
    // The hit is 8 lines back — outside the default window of 8.
    expect(latestKindIndex(lines, 'hit')).toBeNull()
    expect(latestKindIndex(lines, 'hit', 9)).toBe(0)
    expect(latestKindIndex([], 'hit')).toBeNull()
  })
})
