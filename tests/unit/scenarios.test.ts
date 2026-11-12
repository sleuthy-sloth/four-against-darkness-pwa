import { describe, expect, it } from 'vitest'
import {
  SCENARIOS,
  TUTORIAL_SCENARIO_ID,
  getScenario,
  getTales,
  validateScenarios,
} from '../../src/rulesets/expanded/scenarios'

/**
 * Prepared-campaign data gates (Milestone 4): every scenario has 4 distinct
 * classes, a seed, a backstory, and a goal; the tutorial scenario exists and
 * is the only one flagged tutorial; no seed is reused.
 */
describe('scenarios', () => {
  it('validates the whole table', () => {
    expect(() => validateScenarios()).not.toThrow()
  })

  it('has three tales plus the tutorial scenario', () => {
    expect(SCENARIOS).toHaveLength(4)
    expect(getTales()).toHaveLength(3)
    expect(getTales().map((s) => s.id)).toEqual([
      'sunken-chapel',
      'missing-scout',
      'cursed-vault',
    ])
    const tutorial = getScenario(TUTORIAL_SCENARIO_ID)
    expect(tutorial).toBeDefined()
    expect(tutorial?.tutorial).toBe(true)
    expect(SCENARIOS.filter((s) => s.tutorial)).toHaveLength(1)
  })

  it('gives every scenario 4 distinct classes, a seed, and a backstory', () => {
    for (const s of SCENARIOS) {
      expect(s.party).toHaveLength(4)
      expect(new Set(s.party.map((m) => m.classId)).size).toBe(4)
      expect(s.seed).toBeGreaterThan(0)
      expect(s.backstory.length).toBeGreaterThan(40)
      expect(s.goal.length).toBeGreaterThan(20)
      for (const m of s.party) expect(m.name.length).toBeGreaterThan(0)
    }
  })

  it('uses distinct seeds', () => {
    const seeds = SCENARIOS.map((s) => s.seed)
    expect(new Set(seeds).size).toBe(seeds.length)
  })

  it('gives the tutorial party the nails it needs to rest', () => {
    const tutorial = getScenario(TUTORIAL_SCENARIO_ID)!
    const nails = tutorial.party.flatMap((m) => m.extraEquipment ?? [])
    // Resting needs one bag per door (FADEE p.114) and a tile has at most 4
    // doors, so 4 bags rest the party in any room it reaches.
    expect(nails).toEqual(['bag of nails', 'bag of nails', 'bag of nails', 'bag of nails'])
  })

  it('rejects a broken scenario table', () => {
    const broken = SCENARIOS.map((s) =>
      s.id === 'sunken-chapel' ? { ...s, party: [s.party[0], s.party[0], s.party[2], s.party[3]] } : s,
    )
    expect(() => validateScenarios(broken)).toThrow(/distinct classes/)
    const badSeed = SCENARIOS.map((s) =>
      s.id === 'cursed-vault' ? { ...s, seed: 1004 } : s,
    )
    expect(() => validateScenarios(badSeed)).toThrow(/reused/)
    const badClass = SCENARIOS.map((s) =>
      s.id === 'missing-scout'
        ? { ...s, party: s.party.map((m, i) => (i === 0 ? { ...m, classId: 'paladin' } : m)) }
        : s,
    )
    expect(() => validateScenarios(badClass)).toThrow(/unknown class/)
  })

  it('returns undefined for an unknown scenario', () => {
    expect(getScenario('no-such-tale')).toBeUndefined()
  })
})
