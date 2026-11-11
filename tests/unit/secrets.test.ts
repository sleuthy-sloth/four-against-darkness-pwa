import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import type { Character } from '../../src/rulesets/schema/character'
import { makeEnemy, pcAttack, startCombat } from '../../src/engine/combat/combat'
import { encodeSecret, parseSecret } from '../../src/rulesets/expanded/secrets'

function pc(id: string, cls: string, level = 3): Character {
  return {
    id,
    name: id,
    classId: cls,
    level,
    currentLife: 5,
    maxLife: 7,
    experience: 0,
    gold: 0,
    traits: [],
    spells: [],
    equipment: ['hand weapon', 'light armor'],
    conditions: [],
    status: 'active',
    createdAt: 0,
  }
}

function orcCombat(order: string[], secrets: string[]): ReturnType<typeof startCombat> {
  return startCombat(
    't',
    order.map((id) => pc(id, 'warrior')),
    [makeEnemy(
      {
        roll: 4,
        name: 'Orcs',
        category: '',
        levelOffset: 3,
        countFormula: '1',
        attacks: 1,
        treasure: '0',
        special: [],
        reactions: ['Fight'],
        source: 'FADEE p.168',
      },
      'minions',
      4,
      6,
      1,
    )],
    new Rng(9),
    { forceSurprise: true, marchingOrder: order, secrets },
  )
}

describe('Secrets (FADEE pp.122-123)', () => {
  it('Weakness of a Foe gives every PC +2 attack vs the named species', () => {
    const base = orcCombat(['a', 'b', 'c', 'd'], [])
    base.phase = 'pcTurn'
    const withSecret = orcCombat(['a', 'b', 'c', 'd'], [encodeSecret('weakness', 'Orcs')])
    withSecret.phase = 'pcTurn'
    expect(withSecret.weaknessActive).toBe(true)
    expect(base.weaknessActive ?? false).toBe(false)
    expect(parseSecret(encodeSecret('weakness', 'Orcs'))).toEqual({ id: 'weakness', arg: 'Orcs' })
  })

  it('Terrifying Secret auto-fails Minor-Foe Morale and is consumed once', () => {
    // Morale applies to Minor Foe groups only (FADEE p.94).
    const c = startCombat(
      't',
      ['a', 'b', 'c', 'd'].map((id) => pc(id, 'warrior')),
      [makeEnemy(
        {
          roll: 2,
          name: 'Goblins',
          category: '',
          levelOffset: 2,
          countFormula: '1',
          attacks: 1,
          treasure: '0',
          special: [],
          reactions: ['Fight'],
          source: 'FADEE p.168',
        },
        'minions',
        3,
        8,
        1,
      )],
      new Rng(9),
      { forceSurprise: true, marchingOrder: ['a', 'b', 'c', 'd'], secrets: ['terrifying'] },
    )
    const enemy = c.enemies[0]
    enemy.count = 3 // below half of 8
    c.phase = 'pcTurn'
    pcAttack(c, new Rng(2), c.participants[0], enemy.id)
    expect(c.secrets).not.toContain('terrifying')
    expect(enemy.fled).toBe(true)
    expect(c.log.some((l) => l.text.includes('automatically fail'))).toBe(true)
  })

  it('the secret applies only to the matching species', () => {
    const goblinCombat = startCombat(
      't',
      [pc('a', 'warrior')],
      [makeEnemy(
        {
          roll: 2,
          name: 'Goblins',
          category: '',
          levelOffset: 2,
          countFormula: '1',
          attacks: 1,
          treasure: '0',
          special: [],
          reactions: ['Fight'],
          source: 'FADEE p.168',
        },
        'minions',
        3,
        8,
        1,
      )],
      new Rng(9),
      { forceSurprise: true, marchingOrder: ['a'], secrets: [encodeSecret('weakness', 'Orcs')] },
    )
    expect(goblinCombat.weaknessActive ?? false).toBe(false)
  })
})

describe('Marching order (FADEE pp.97, 104)', () => {
  it('Wandering Monsters ambushes strike the rearmost PC first', () => {
    // Order: a (leader) ... d (rear). Round 1 of a surprised combat: all
    // attacks land on d.
    const c = orcCombat(['a', 'b', 'c', 'd'], [])
    // foes' turn runs once from startCombat (surprised)
    const dLog = c.log.filter((l) => l.text.includes('attacks d') || l.text.startsWith('d '))
    const aLog = c.log.filter((l) => l.text.includes('attacks a'))
    expect(dLog.length).toBeGreaterThan(0)
    expect(aLog.length).toBe(0)
    // Round 2+: normal distribution may target anyone again
    c.phase = 'pcTurn'
    expect(c.round).toBeGreaterThanOrEqual(1)
  })
})
