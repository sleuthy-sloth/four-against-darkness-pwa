import { describe, expect, it } from 'vitest'
import { CORE_CLASSES, parseClassDef } from '../../src/rulesets/expanded/coreClasses'
import { ClassDef } from '../../src/rulesets/schema/character'
import { lifeAt } from '../../src/engine/characters/create'

/**
 * Class data integrity — every entry must validate against the Zod schema
 * and match the page-cited book values in docs/RULES_VERIFICATION.md Part 3.
 */
describe('core class data pack (FADEE pp.24-65)', () => {
  it('contains exactly the 8 core classes (FADEE p.8)', () => {
    expect(CORE_CLASSES.map((c) => c.id).sort()).toEqual(
      [
        'barbarian',
        'cleric',
        'dwarf',
        'elf',
        'halfling',
        'rogue',
        'warrior',
        'wizard',
      ].sort(),
    )
  })

  it('every class validates against the Zod schema', () => {
    for (const input of CORE_CLASSES) {
      const parsed = ClassDef.parse(input)
      expect(parsed.id).toBe(input.id)
    }
  })

  it('every class has a 6-entry trait table with unique rolls', () => {
    for (const input of CORE_CLASSES) {
      const def = parseClassDef(input)
      expect(def.traitTable).toHaveLength(6)
      const rolls = def.traitTable.map((t) => t.roll).sort()
      expect(rolls).toEqual([1, 2, 3, 4, 5, 6])
      for (const t of def.traitTable) {
        expect(t.source).toMatch(/^FADEE p\.\d+$/)
      }
    }
  })

  it('L1 Life values match the book (FADEE class pages)', () => {
    const expected: Record<string, number> = {
      warrior: 7, // L+6, p.63
      barbarian: 8, // L+7, p.24
      elf: 5, // L+4, p.34
      dwarf: 6, // L+5, p.30
      cleric: 5, // L+4, p.28
      rogue: 4, // L+3, p.60
      halfling: 4, // L+3, p.40
      wizard: 3, // L+2, p.64
    }
    for (const input of CORE_CLASSES) {
      const def = parseClassDef(input)
      expect(lifeAt(1, def.lifeFormula)).toBe(expected[def.id])
    }
  })

  it('spellcaster slot counts match the book', () => {
    const byId = Object.fromEntries(CORE_CLASSES.map((c) => [c.id, c]))
    expect(byId.wizard?.spellSlots).toBe(3) // L+2 at L1, p.64
    expect(byId.elf?.spellSlots).toBe(1) // L at L1, p.34
    expect(byId.cleric?.prayers).toEqual({ healing: 3, blessing: 3 }) // p.28
  })

  it('halfling picks 2 traits, everyone else 1 (FADEE p.40)', () => {
    for (const input of CORE_CLASSES) {
      const def = parseClassDef(input)
      expect(def.traitsToPick).toBe(def.id === 'halfling' ? 2 : 1)
    }
  })
})
