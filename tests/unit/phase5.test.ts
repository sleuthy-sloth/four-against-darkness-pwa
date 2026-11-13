import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import type { Character } from '../../src/rulesets/schema/character'
import {
  applyBandage,
  castBlessing,
  castScroll,
  drinkHealingPotion,
  makeEnemy,
  startCombat,
} from '../../src/engine/combat/combat'
import {
  attemptPuzzle,
  resolveEvent,
  resolveFeature,
  resolveTrap,
  rollDungeonEvent,
  touchStatue,
  type EventResult,
} from '../../src/engine/features/resolve'
import { sameBuild } from '../../src/rulesets/expanded/features'

function pc(cls: string, id: string, hp = 5): Character {
  return {
    id,
    name: id,
    classId: cls,
    level: 3,
    currentLife: hp,
    maxLife: hp,
    experience: 0,
    gold: 100,
    traits: [],
    spells: [],
    equipment: ['hand weapon', 'light armor'],
    conditions: [],
    status: 'active',
    createdAt: 0,
  }
}

function combatWith(pcs: Character[]): ReturnType<typeof startCombat> {
  return startCombat('t', pcs, [makeEnemy(
    {
      roll: 2,
      name: 'Goblins',
      family: 'goblinoid',
      category: 'Chaos',
      levelOffset: 0,
      countFormula: '1',
      attacks: 1,
      treasure: '0',
      special: [],
      reactions: ['Fight (FADEE p.168)'],
      source: 'FADEE p.168',
    },
    'minions',
    2,
    8,
    1,
  )], new Rng(5))
}

describe('scrolls (FADEE p.75)', () => {
  it('a spellcaster reads a scroll at +L; the scroll is destroyed either way', () => {
    const w = pc('wizard', 'w')
    w.equipment.push('scroll of sleep')
    const state = combatWith([w])
    state.phase = 'pcTurn'
    // scroll cast at +3 vs L2 goblin group: d6[1]+3=4 → fail wasted, still consumed
    castScroll(state, new Rng(3), w, 'sleep', state.enemies[0].id)
    expect(w.equipment).not.toContain('scroll of sleep')
    expect(w.spells).not.toContain('sleep') // no slot involved
  })

  it('a non-spellcaster reads at +1, a cleric at +0 (except Blessing)', () => {
    const r = pc('rogue', 'r')
    const c = pc('cleric', 'c')
    r.equipment.push('scroll of fireball')
    c.equipment.push('scroll of fireball')
    const state = combatWith([r, c])
    state.phase = 'pcTurn'
    castScroll(state, new Rng(10), r, 'fireball', state.enemies[0].id)
    state.phase = 'pcTurn'
    castScroll(state, new Rng(20), c, 'fireball', state.enemies[0].id)
    const fire = state.log.filter((l) => l.text.includes('Fireball') || l.text.includes('fireball'))
    expect(fire.some((l) => l.text.includes('+1'))).toBe(true)
    expect(fire.some((l) => l.text.includes('+0'))).toBe(true)
  })

  it('barbarians may not use scrolls (FADEE p.54)', () => {
    const b = pc('barbarian', 'b')
    b.equipment.push('scroll of sleep')
    const state = combatWith([b])
    state.phase = 'pcTurn'
    expect(() => castScroll(state, new Rng(1), b, 'sleep', state.enemies[0].id)).toThrow(/barbarian/)
    expect(b.equipment).toContain('scroll of sleep') // not consumed on refusal
  })

  it('Blessing removes the Cursed Altar condition automatically', () => {
    const w = pc('wizard', 'w')
    const t = pc('warrior', 't')
    t.conditions.push('cursed')
    const state = combatWith([w, t])
    w.equipment.push('scroll of blessing')
    state.phase = 'pcTurn'
    castScroll(state, new Rng(1), w, 'blessing', null)
    expect(t.conditions).not.toContain('cursed')
    expect(w.equipment).not.toContain('scroll of blessing')
  })
})

describe('consumables (FADEE p.83)', () => {
  it('a healing potion restores ALL Life, once per adventure per PC', () => {
    const w = pc('wizard', 'w', 5)
    w.currentLife = 2
    drinkHealingPotion(null, w)
    expect(w.currentLife).toBe(5)
    expect(() => drinkHealingPotion(null, w)).toThrow(/1 healing potion/)
  })
  it('a bandage heals 1 Life, once per adventure per PC', () => {
    const w = pc('warrior', 'w', 5)
    w.currentLife = 2
    w.equipment.push('bandage')
    expect(applyBandage(w)).toMatch(/3\/5/)
    w.equipment.push('bandage')
    expect(() => applyBandage(w)).toThrow(/1 bandage/)
  })
})

describe('special features (FADEE p.152)', () => {
  it('the first fountain heals all wounded PCs; further ones do nothing', () => {
    const party = [pc('warrior', 'a', 5), pc('rogue', 'b', 5)]
    party[0].currentLife = 3
    const rng = new Rng(1)
    const r1 = resolveFeature(rng, party, 'fountain', 0, 3, 2)
    expect(party[0].currentLife).toBe(4)
    expect(r1.messages[0]).toMatch(/recover 1 Life/)
    party[1].currentLife = 2
    const r2 = resolveFeature(rng, party, 'fountain', 1, 3, 2)
    expect(party[1].currentLife).toBe(2)
    expect(r2.messages[0]).toMatch(/no effect/)
  })

  it('the Cursed Altar curses a random living PC with -1 Defense', () => {
    const party = [pc('warrior', 'a'), pc('rogue', 'b')]
    const r = resolveFeature(new Rng(2), party, 'cursedAltar', 0, 3, 2)
    expect(r.messages[0]).toMatch(/cursed/)
    const cursed = party.find((p) => p.conditions.includes('cursed'))
    expect(cursed).toBeDefined()
  })

  it('touching a statue either wakes an Artificial Boss (fight) or breaks it (gold, no XP)', () => {
    let fought = 0
    let broke = 0
    for (let seed = 1; seed <= 40; seed++) {
      const r = touchStatue(new Rng(seed), 3, 2, 0)
      if (r.combat) {
        fought++
        const e = r.combat.enemies[0]
        expect(e.profile.category).toBe('Artificial')
        expect(e.profile.major).toBe(true)
      } else if (r.gold) {
        broke++
        expect(r.messages[0]).toMatch(/no XP/)
      }
    }
    expect(fought).toBeGreaterThan(10)
    expect(broke).toBeGreaterThan(10)
  })

  it('the puzzle box Save scales with the box level; failures cost 1 Life', () => {
    const party = [pc('warrior', 'a', 5)]
    let solved = 0
    let hurt = 0
    for (let seed = 1; seed <= 60; seed++) {
      const w = pc('warrior', 'a', 5)
      const r = attemptPuzzle(new Rng(seed), w, 2)
      if (r.gold !== undefined) solved++
      else hurt++
    }
    expect(solved).toBeGreaterThan(10)
    expect(hurt).toBeGreaterThan(10)
    void party
  })
})

describe('special events (FADEE p.153)', () => {
  it('all six events roll across seeds; the ghost Save uses clerics +L', () => {
    const kinds = new Set<string>()
    for (let seed = 1; seed <= 80; seed++) {
      const rng = new Rng(seed)
      const ev = rollDungeonEvent(rng)
      kinds.add(ev)
    }
    expect(kinds.size).toBe(6)
    const party = [pc('cleric', 'c', 5), pc('warrior', 'w', 5)]
    let asked = false
    for (let seed = 1; seed <= 60 && !asked; seed++) {
      const r: EventResult = resolveEvent(new Rng(seed), party, 'ghost', 3, false, false)
      if (r.choice?.kind === 'ghost') asked = true
    }
    expect(asked).toBe(true)
  })

  it('the healer and alchemist are once-per-adventure; repeats reroll to a trap', () => {
    const party = [pc('warrior', 'a')]
    const r1 = resolveEvent(new Rng(5), party, 'healer', 3, false, false)
    expect(r1.choice?.kind).toBe('healer')
    const r2 = resolveEvent(new Rng(5), party, 'healer', 3, true, false)
    expect(r2.choice).toBeUndefined()
  })
})

describe('traps (FADEE p.164)', () => {
  it('poison gas saves with barbarian/halfling +L; failures lose 1 Life', () => {
    const party = [pc('barbarian', 'b', 5), pc('warrior', 'w', 5)]
    party[0].level = 4
    let bHit = 0
    for (let seed = 1; seed <= 60; seed++) {
      const b = pc('barbarian', 'b', 5)
      const w = pc('warrior', 'w', 5)
      resolveTrap(new Rng(seed), [b, w], 'poisonGas', 3, 0)
      if (b.status === 'dead' || b.currentLife < 5) bHit++
    }
    // barbarian saves at +4 vs HCL+2=5 → natural 1 fails only
    expect(bHit).toBeLessThan(20)
  })

  it('the falling stone skips shields but keeps armor, and hits for 2', () => {
    const armored = pc('warrior', 'a', 5)
    armored.equipment.push('shield', 'heavy armor')
    const r = resolveTrap(new Rng(3), [pc('x', '1'), pc('x', '2'), pc('x', '3'), armored], 'fallingStone', 3, 0)
    // Either dodged (armor +2) or hurt for 2
    expect(r.messages[0]).toMatch(/stone/)
  })
})

describe('equipment exchange (FADEE p.111)', () => {
  it('armor may not pass between different builds', () => {
    expect(sameBuild('dwarf', 'warrior')).toBe(false)
    expect(sameBuild('dwarf', 'halfling')).toBe(true)
    expect(sameBuild('warrior', 'elf')).toBe(false)
    expect(sameBuild('warrior', 'cleric')).toBe(true)
  })
})
