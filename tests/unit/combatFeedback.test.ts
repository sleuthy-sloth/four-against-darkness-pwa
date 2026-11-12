import { describe, it, expect } from 'vitest'
import { feedbackForLogLine, feedbackTargetName } from '../../src/features/dungeon/combatFeedback'

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
