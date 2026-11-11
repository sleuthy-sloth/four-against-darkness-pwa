import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import type { Character } from '../../src/rulesets/schema/character'
import { makeEnemy, startCombat, pcAttack, castHealing } from '../../src/engine/combat/combat'
import { profileFor } from '../../src/rulesets/expanded/monsters'
import { QUEST_TABLE, EPIC_REWARDS } from '../../src/rulesets/expanded/quests'

function party(): Character[] {
  return ['warrior', 'cleric', 'rogue', 'wizard'].map((c, i) => ({
    id: `p${i}`,
    name: c,
    classId: c,
    level: 3,
    currentLife: 7,
    maxLife: 7,
    experience: 0,
    gold: 100,
    traits: [],
    spells: [],
    equipment: ['hand weapon', 'light armor', 'shield'],
    conditions: [],
    status: 'active',
    createdAt: 0,
  }))
}

function bossCombat(target: string, secrets = ['terrifying']) {
  const species = profileFor('boss', 1)
  const name = target || species.name
  return startCombat(
    't',
    party(),
    [makeEnemy(
      { ...species, name, countFormula: '1', attacks: 1 },
      'boss',
      4,
      1,
      6,
    )],
    new Rng(7),
    { secrets },
  )
}

describe('Quest system (FADEE pp.153, 161-163)', () => {
  it('type 1 progress fires when the named Boss is slain', () => {
    const species = profileFor('boss', 1)
    const c = bossCombat(species.name)
    c.phase = 'pcTurn'
    const e = c.enemies[0]
    e.life = 1 // one solid hit finishes it
    pcAttack(c, new Rng(3), c.participants[0], e.id)
    expect(e.life === 0).toBe(true)
    expect(QUEST_TABLE[0]).toMatch(/head/)
  })

  it('the Enchanted weapon rolls best-of-2 (FADEE p.162)', () => {
    const pcs = party()
    pcs[0].conditions.push('enchanted-weapon')
    const c = startCombat(
      't',
      pcs,
      [makeEnemy(
        { ...profileFor('boss', 2), countFormula: '1', attacks: 1 },
        'boss',
        5,
        1,
        8,
      )],
      new Rng(11),
    )
    c.phase = 'pcTurn'
    const before = c.log.length
    pcAttack(c, new Rng(21), pcs[0], c.enemies[0].id)
    expect(c.log.slice(before).some((l) => l.text.includes('best of 2 dice'))).toBe(true)
  })

  it('the Holy symbol adds +2 to Healing prayers (FADEE p.163)', () => {
    const pcs = party()
    const cleric = pcs[1]
    cleric.conditions.push('holy-symbol')
    const wounded = pcs[0]
    wounded.currentLife = 2
    const c = startCombat('t', pcs, [
      makeEnemy({ ...profileFor('minions', 2), countFormula: '1', attacks: 1 }, 'minions', 2, 4, 1),
    ], new Rng(2))
    c.phase = 'pcTurn'
    expect(() => castHealing(c, new Rng(5), cleric, wounded)).not.toThrow()
    expect(wounded.currentLife).toBeGreaterThan(2)
    void EPIC_REWARDS
  })
})
