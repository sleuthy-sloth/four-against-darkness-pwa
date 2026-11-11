import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import {
  CreationError,
  createCharacter,
  createParty,
  lifeAt,
} from '../../src/engine/characters/create'

const rng = () => new Rng(2026)

describe('character creation (FADEE pp.7-8, 19-66)', () => {
  it('creates a L1 warrior with book stats and rolled wealth', () => {
    const c = createCharacter({ name: 'Bruggo', classId: 'warrior' }, rng(), 'camp-1')
    expect(c.level).toBe(1)
    expect(c.maxLife).toBe(7) // L+6, FADEE p.63
    expect(c.currentLife).toBe(7)
    expect(c.gold).toBeGreaterThanOrEqual(2) // 2d6
    expect(c.gold).toBeLessThanOrEqual(12)
    expect(c.equipment).toContain('light armor')
    expect(c.traits).toHaveLength(1)
    expect(c.status).toBe('active')
  })

  it('creates a wizard with 3 spell slots filled from the basic list', () => {
    const c = createCharacter({ name: 'Flauros', classId: 'wizard' }, rng(), 'camp-1')
    expect(c.maxLife).toBe(3) // L+2, FADEE p.64
    expect(c.spells).toHaveLength(3)
    expect(c.equipment).toContain('spellbook')
  })

  it('rejects a spell assignment the class cannot learn (R044: elves lack Blessing)', () => {
    expect(() =>
      createCharacter(
        { name: 'Sylthas', classId: 'elf', spells: ['blessing'] },
        rng(),
        'camp-1',
      ),
    ).toThrow(CreationError)
  })

  it('accepts a valid elf spell assignment', () => {
    const c = createCharacter(
      { name: 'Sylthas', classId: 'elf', spells: ['sleep'] },
      rng(),
      'camp-1',
    )
    // L1 elf has exactly 1 slot (FADEE p.34); the book's 4-slot example is L4
    expect(c.spells).toHaveLength(1)
    expect(c.spells).toContain('sleep')
  })

  it('halflings roll 2 distinct traits and d6+3 rations (FADEE p.40)', () => {
    const c = createCharacter({ name: 'Pip', classId: 'halfling' }, rng(), 'camp-1')
    expect(c.traits).toHaveLength(2)
    expect(c.traits[0].roll).not.toBe(c.traits[1].roll)
    const rations = c.equipment.find((e) => /food rations/.test(e))
    expect(rations).toBeDefined()
    const n = parseInt(rations!.split(' ')[0], 10)
    expect(n).toBeGreaterThanOrEqual(4) // d6+3
    expect(n).toBeLessThanOrEqual(9)
    expect(c.maxLife).toBe(4) // L+3, FADEE p.40
  })

  it('explicit trait rolls are honored and validated', () => {
    const c = createCharacter(
      { name: 'Tough', classId: 'barbarian', traitRolls: [4] },
      rng(),
      'camp-1',
    )
    expect(c.traits[0].name).toBe('Survival Instinct')
    expect(() =>
      createCharacter({ name: 'X', classId: 'barbarian', traitRolls: [1, 2] }, rng(), 'c'),
    ).toThrow(CreationError)
  })

  it('cleric gets prayer uses (FADEE p.28) — no spell slots', () => {
    const c = createCharacter({ name: 'Gravus', classId: 'cleric' }, rng(), 'camp-1')
    expect(c.spells).toHaveLength(0)
    expect(c.maxLife).toBe(5) // L+4
  })

  it('a party is exactly four different classes (FADEE p.7)', () => {
    const reqs = ['warrior', 'cleric', 'rogue', 'wizard'].map((classId) => ({
      name: `Hero-${classId}`,
      classId,
    }))
    const party = createParty(reqs, rng(), 'camp-1')
    expect(party).toHaveLength(4)
    expect(new Set(party.map((p) => p.classId)).size).toBe(4)
  })

  it('rejects wrong party sizes and duplicate classes', () => {
    const one = [{ name: 'Lonely', classId: 'warrior' }]
    expect(() => createParty(one, rng(), 'camp-1')).toThrow(CreationError)
    const dupes = ['warrior', 'warrior', 'rogue', 'wizard'].map((classId) => ({
      name: `H-${classId}`,
      classId,
    }))
    expect(() => createParty(dupes, rng(), 'camp-1')).toThrow(CreationError)
  })

  it('Life formula helper handles all book shapes', () => {
    expect(lifeAt(1, 'L+6')).toBe(7)
    expect(lifeAt(3, 'L+2')).toBe(5)
    expect(lifeAt(4, 'L')).toBe(4)
    expect(lifeAt(1, '5+L')).toBe(6) // paladin-style written form still parses
  })
})
