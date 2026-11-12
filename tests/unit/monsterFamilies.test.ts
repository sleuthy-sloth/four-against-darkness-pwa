import { describe, expect, it } from 'vitest'
import { DUNGEON_TABLES, type MonsterFamily } from '../../src/rulesets/expanded/monsters'

const FAMILIES: MonsterFamily[] = ['vermin', 'goblinoid', 'undead', 'demon', 'beast', 'construct', 'boss']

describe('monster families (art direction C2)', () => {
  it('every profile in every table carries a valid family', () => {
    const profiles = Object.values(DUNGEON_TABLES).flat()
    expect(profiles).toHaveLength(24)
    for (const p of profiles) {
      expect(FAMILIES).toContain(p.family)
    }
  })

  it('each family is used by at least one profile', () => {
    const used = new Set(Object.values(DUNGEON_TABLES).flat().map((p) => p.family))
    for (const f of FAMILIES) {
      expect(used.has(f)).toBe(true)
    }
  })

  it('vermin-table rats are vermin, not undead — family is display only, not a rule', () => {
    const rats = DUNGEON_TABLES.vermin.find((p) => p.name === 'Rats')
    expect(rats?.family).toBe('vermin')
    const skeletalRats = DUNGEON_TABLES.vermin.find((p) => p.name === 'Skeletal Rats')
    expect(skeletalRats?.family).toBe('undead')
  })
})
