import { describe, expect, it } from 'vitest'
import { stripCitations } from '../../src/features/common/stripCitations'
import { TUTORIAL_STEPS } from '../../src/features/tutorial/tutorialSteps'
import { SCENARIOS } from '../../src/rulesets/expanded/scenarios'
import { QUEST_TABLE } from '../../src/rulesets/expanded/quests'
import { XP_SYSTEMS } from '../../src/engine/xp'
import { CORE_CLASSES } from '../../src/rulesets/expanded/coreClasses'

/**
 * Citation strip (Release 0.5, Part B): no player-facing rendered string
 * may contain a rulebook page citation. Data `source:` fields and code
 * comments keep theirs — this test covers the strings that reach the DOM:
 * tutorial bodies, scenario goals, quest text, XP-system blurbs, and the
 * strip helper itself.
 */
const CITATION = /FADEE pp?\./

describe('stripCitations helper', () => {
  it('removes parenthesised citations', () => {
    expect(stripCitations('Rest here (FADEE p.114)')).toBe('Rest here')
    expect(stripCitations('Foes may flee (FADEE pp.90, 101–102).')).toBe('Foes may flee.')
    expect(stripCitations('Assign each XP roll (FADEE p.117):')).toBe('Assign each XP roll:')
  })

  it('removes em-dash and bare citation fragments', () => {
    expect(stripCitations('Flee! (each Foe strikes once — FADEE p.97)')).toBe(
      'Flee! (each Foe strikes once)',
    )
    expect(stripCitations('Outfitter (between adventures — FADEE pp.82-85)')).toBe(
      'Outfitter (between adventures)',
    )
  })

  it('leaves citation-free rules text untouched', () => {
    expect(stripCitations('The party enters the dungeon.')).toBe('The party enters the dungeon.')
    expect(stripCitations('Sleep +L: wizards, illusionists and elves only.')).toBe(
      'Sleep +L: wizards, illusionists and elves only.',
    )
  })
})

describe('player-facing string sources contain no citations', () => {
  it('all 12 tutorial steps are citation-free', () => {
    expect(TUTORIAL_STEPS).toHaveLength(12)
    for (const step of TUTORIAL_STEPS) {
      expect(step.title).not.toMatch(CITATION)
      expect(step.body).not.toMatch(CITATION)
      if (step.hint) expect(step.hint).not.toMatch(CITATION)
      if (step.goThereHint) expect(step.goThereHint).not.toMatch(CITATION)
      if (step.cta) expect(step.cta).not.toMatch(CITATION)
    }
  })

  it('scenario goals and backstories (dashboard copy) are citation-free', () => {
    for (const s of SCENARIOS) {
      expect(s.goal).not.toMatch(CITATION)
      expect(s.name).not.toMatch(CITATION)
      expect(s.backstory).not.toMatch(CITATION)
    }
  })

  it('quest table text is citation-free', () => {
    for (const q of QUEST_TABLE) expect(q).not.toMatch(CITATION)
  })

  it('XP-system names and blurbs are citation-free', () => {
    for (const s of XP_SYSTEMS) {
      expect(s.name).not.toMatch(CITATION)
      expect(s.blurb).not.toMatch(CITATION)
    }
  })

  it('class abilities are citation-free once stripped (the strip is load-bearing)', () => {
    // CharacterSheet renders def.abilities through stripCitations. The raw
    // data still carries citations (the internal trail), so this test proves
    // the strip does real work: at least one raw ability cites the book,
    // and none survives stripping. Trait effects are clean at source
    // (citations live in their separate `source` field) and stay clean.
    let rawCited = 0
    for (const cls of CORE_CLASSES) {
      for (const a of cls.abilities) {
        if (CITATION.test(a)) rawCited += 1
        expect(stripCitations(a)).not.toMatch(CITATION)
      }
      for (const t of cls.traitTable) {
        expect(t.effect).not.toMatch(CITATION)
        expect(stripCitations(t.effect)).not.toMatch(CITATION)
      }
    }
    expect(rawCited).toBeGreaterThan(0)
  })
})
