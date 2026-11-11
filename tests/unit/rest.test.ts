import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import type { Character } from '../../src/rulesets/schema/character'
import { applyRestChoice, beginRest, canRest, hasSpentAbility } from '../../src/engine/camp/rest'

function pc(cls: string, id: string): Character {
  return {
    id,
    name: id,
    classId: cls,
    level: 3,
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

describe('Resting eligibility (FADEE p.114)', () => {
  it('requires a cleared room, cleared neighbors, doors, and nails', () => {
    expect(canRest({ doorCount: 2, neighborsCleared: true, tileCleared: true, nailsHeld: 2, alreadyRested: false }).ok).toBe(true)
    expect(canRest({ doorCount: 2, neighborsCleared: true, tileCleared: true, nailsHeld: 2, alreadyRested: true }).ok).toBe(false)
    expect(canRest({ doorCount: 2, neighborsCleared: true, tileCleared: false, nailsHeld: 2, alreadyRested: false }).ok).toBe(false)
    expect(canRest({ doorCount: 2, neighborsCleared: false, tileCleared: true, nailsHeld: 2, alreadyRested: false }).ok).toBe(false)
    expect(canRest({ doorCount: 3, neighborsCleared: true, tileCleared: true, nailsHeld: 2, alreadyRested: false }).ok).toBe(false)
  })
})

describe('Resting effects (FADEE p.114)', () => {
  it('consumes one bag of nails per door', () => {
    const party = [pc('warrior', 'a'), pc('cleric', 'b')]
    party[0].equipment.push('bag of nails', 'bag of nails')
    const out = beginRest(party, 2)
    expect(party[0].equipment.filter((e) => e === 'bag of nails').length).toBe(0)
    expect(out.messages[0]).toMatch(/2 doors/)
  })

  it('recovering Life and re-memorizing spells work; prayers refill', () => {
    const w = pc('wizard', 'w')
    w.spells = ['sleep', 'fireball'] // L3 wizard → L+2 = 5 slots (FADEE p.64), 3 free
    expect(hasSpentAbility(w)).toBe(true)
    applyRestChoice(w, 'spell', new Rng(1))
    expect(w.spells).toContain('blessing') // first missing from the basic list
    applyRestChoice(w, 'spell', new Rng(1))
    applyRestChoice(w, 'spell', new Rng(1))
    expect(w.spells.length).toBe(5) // slots full
    expect(applyRestChoice(w, 'spell', new Rng(1))).toMatch(/no free spell slot/)

    const c = pc('cleric', 'c')
    c.conditions.push('prayer:healing:1', 'prayer:blessing:3')
    expect(applyRestChoice(c, 'prayer-healing', new Rng(1))).toMatch(/2 left/)
    expect(c.conditions).toContain('prayer:healing:2')
    expect(applyRestChoice(c, 'prayer-blessing', new Rng(1))).toMatch(/no spent/)

    const r = pc('rogue', 'r')
    r.currentLife = 4
    expect(applyRestChoice(r, 'life', new Rng(1))).toMatch(/5\/7/)
    expect(hasSpentAbility(r)).toBe(false) // rogues recover nothing but Life
  })
})
