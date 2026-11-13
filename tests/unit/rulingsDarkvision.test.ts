import { describe, expect, it } from 'vitest'
import { computeLight, DARKVISION_CLASSES, darknessPenalty } from '../../src/engine/light'
import type { Character } from '../../src/rulesets/schema/character'

function pc(classId: string, id: string): Character {
  return {
    id,
    name: id,
    classId,
    level: 3,
    currentLife: 7,
    maxLife: 7,
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

/** No lantern, no torch, no crystal — darkness unless darkvision applies. */
const DARK = { torchLit: false, torchRooms: 0, lanternDropped: false }

describe('Ruling 3 — darkvision classes (FADEE p.93)', () => {
  it("DARKVISION_CLASSES is exactly dwarf and elf (owner's best judgement, 2026-11-13)", () => {
    expect(DARKVISION_CLASSES).toEqual(['dwarf', 'elf'])
  })

  it('a party of only dwarf/elf PCs has light in darkness, with no lantern or torch', () => {
    const party = [pc('dwarf', 'd'), pc('elf', 'e')]
    const light = computeLight(party, DARK)
    expect(light.hasLight).toBe(true)
    expect(light.darkvision).toBe(true)
    expect(darknessPenalty(light)).toBe(0)
  })

  it('a single dwarf alone has light in darkness', () => {
    const light = computeLight([pc('dwarf', 'd')], DARK)
    expect(light.hasLight).toBe(true)
    expect(light.darkvision).toBe(true)
  })

  it('a party containing a halfling does NOT have light from darkvision', () => {
    const party = [pc('dwarf', 'd'), pc('halfling', 'h')]
    const light = computeLight(party, DARK)
    expect(light.hasLight).toBe(false)
    expect(light.darkvision).toBe(false)
    expect(darknessPenalty(light)).toBe(-2)
  })

  it('a halfling alone does NOT have light from darkvision', () => {
    const light = computeLight([pc('halfling', 'h')], DARK)
    expect(light.hasLight).toBe(false)
    expect(light.darkvision).toBe(false)
  })

  it('a party with a non-darkvision class (warrior) does NOT have light from darkvision', () => {
    const party = [pc('elf', 'e'), pc('warrior', 'w')]
    const light = computeLight(party, DARK)
    expect(light.hasLight).toBe(false)
    expect(light.darkvision).toBe(false)
  })

  it('a dead darkvision PC does not count — a lone dead dwarf leaves the party dark', () => {
    const dwarf = pc('dwarf', 'd')
    dwarf.status = 'dead'
    dwarf.currentLife = 0
    const light = computeLight([dwarf, pc('warrior', 'w')], DARK)
    expect(light.hasLight).toBe(false)
  })
})
