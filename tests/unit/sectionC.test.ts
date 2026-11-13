import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import type { Character } from '../../src/rulesets/schema/character'
import { rollLoot, scrollEquipmentName } from '../../src/engine/treasure/loot'
import { DRUID_SPELLS, ILLUSIONIST_SPELLS } from '../../src/rulesets/expanded/extraSpells'
import { MAGIC_TREASURE, RANDOM_SPELL_TABLE } from '../../src/rulesets/expanded/treasure'
import { CORE_CLASSES } from '../../src/rulesets/expanded/coreClasses'
import { EXPANDED_CLASSES } from '../../src/rulesets/expanded/expandedClasses'
import { DUNGEON_TABLES, profileFor } from '../../src/rulesets/expanded/monsters'
import { CAVERN_TABLES } from '../../src/rulesets/expanded/environments'
import {
  canCast,
  castSpell,
  lifeFromFormula,
  makeEnemy,
  pcAttack,
  startCombat,
} from '../../src/engine/combat/combat'
import { beginRest, hasSpentAbility } from '../../src/engine/camp/rest'
import { createCharacter } from '../../src/engine/characters/create'

function basePc(patch: Partial<Character> & { id: string; name: string; classId: string }): Character {
  return {
    level: 1,
    currentLife: 7,
    maxLife: 7,
    experience: 0,
    gold: 0,
    traits: [],
    spells: [],
    equipment: [],
    conditions: [],
    status: 'active',
    createdAt: 0,
    ...patch,
  }
}

function wizard(level = 4, spells: Character['spells'] = ['sleep', 'fireball', 'lightning', 'protection', 'escape', 'sleep'], equipment: string[] = ['light weapon', 'spellbook']): Character {
  return basePc({ id: 'wiz', name: 'Flauros', classId: 'wizard', level, currentLife: 6, maxLife: 6, spells, equipment })
}

function cleric(level = 3, conditions: string[] = [], currentLife = 7): Character {
  return basePc({ id: 'cl', name: 'Gravus', classId: 'cleric', level, currentLife, maxLife: 7, conditions, equipment: ['light armor', 'shield', 'hand weapon'] })
}

function warrior(id: string, level = 4): Character {
  return basePc({ id, name: `Warrior ${id}`, classId: 'warrior', level, currentLife: level + 6, maxLife: level + 6, equipment: ['hand weapon', 'light armor', 'shield'] })
}

function goblins(count: number, level: number) {
  return startCombat(
    't',
    [wizard(), cleric()],
    [makeEnemy(profileFor('minions', 2), 'minions', level, count, 1)],
    new Rng(1),
  )
}

describe('loot treasure modifiers (R150, FADEE p.99)', () => {
  it("'++' never yields the empty row or the d6-gold row", () => {
    // '++' shifts the d6 row roll by +2, so rows 0-2 are unreachable.
    for (let i = 0; i < 500; i++) {
      const r = rollLoot(new Rng(i + 1), '++', 'dungeon')
      expect(r.text).not.toBe('No treasure found. (FADEE p.157)')
      // Row 1 is the only source of exactly 1 gp with the plain-gold text.
      expect(!(r.gold === 1 && /^Treasure: 1 gp\./.test(r.text))).toBe(true)
    }
  })

  it("'++' never yields rations in the fungal grottoes (row 2 unreachable)", () => {
    for (let i = 0; i < 300; i++) {
      const r = rollLoot(new Rng(i + 1), '++', 'fungal')
      expect(r.rations).toBeUndefined()
    }
  })

  it("'none' means no treasure at all, in any environment", () => {
    for (const env of ['dungeon', 'caverns', 'fungal'] as const) {
      const r = rollLoot(new Rng(7), 'none', env)
      expect(r.gold).toBe(0)
      expect(r.text).toBe('No treasure — these Foes carry none.')
      expect(r.scroll).toBeUndefined()
      expect(r.item).toBeUndefined()
      expect(r.magic).toBeUndefined()
      expect(r.rations).toBeUndefined()
    }
  })

  it("'no-magic' replaces a magic result with d6×d6 gp (FADEE pp.168, 170)", () => {
    // Only the row-6 magic result is replaced; row-3 scrolls still occur.
    let replaced = 0
    for (let i = 0; i < 300; i++) {
      const r = rollLoot(new Rng(i + 1), 'no-magic', 'dungeon')
      expect(r.item).toBeUndefined()
      expect(r.magic).toBeUndefined()
      if (r.text.includes('instead of a magic item')) {
        replaced++
        expect(r.gold).toBeGreaterThanOrEqual(1)
        expect(r.gold).toBeLessThanOrEqual(36)
      }
    }
    expect(replaced).toBeGreaterThan(0) // row 6 is reachable, so the path is exercised
  })

  it('druid bark scrolls roll the d12 druid list (R046/R049)', () => {
    const names = DRUID_SPELLS.map((s) => s.name)
    let found = 0
    for (let i = 0; i < 500; i++) {
      const r = rollLoot(new Rng(i + 1), '0', 'fungal')
      if (r.scroll?.list === 'druid') {
        found++
        expect(r.scroll.spell).toBeUndefined()
        expect(r.scroll.name?.startsWith('bark scroll of ')).toBe(true)
        expect(names).toContain(r.scroll.name!.replace('bark scroll of ', ''))
        expect(scrollEquipmentName(r.scroll)).toBe(r.scroll.name)
      }
    }
    expect(found).toBeGreaterThan(0)
  })

  it('illusionist prisms roll the d12 illusionist list (R047/R049)', () => {
    const names = ILLUSIONIST_SPELLS.map((s) => s.name)
    let found = 0
    for (let i = 0; i < 500; i++) {
      const r = rollLoot(new Rng(i + 1), '0', 'caverns')
      if (r.scroll?.list === 'illusionist') {
        found++
        expect(r.scroll.spell).toBeUndefined()
        expect(r.scroll.name?.startsWith('prism of ')).toBe(true)
        expect(names).toContain(r.scroll.name!.replace('prism of ', ''))
        expect(scrollEquipmentName(r.scroll)).toBe(r.scroll.name)
      }
    }
    expect(found).toBeGreaterThan(0)
  })

  it('wizard scrolls still roll the 6 basic spells', () => {
    let found = 0
    for (let i = 0; i < 200; i++) {
      const r = rollLoot(new Rng(i + 1), '0', 'dungeon')
      if (r.scroll) {
        found++
        expect(RANDOM_SPELL_TABLE).toContain(r.scroll.spell)
        expect(r.scroll.list).toBe('wizard')
        expect(scrollEquipmentName(r.scroll)).toBe(`scroll of ${r.scroll.spell}`)
      }
    }
    expect(found).toBeGreaterThan(0)
  })

  it('fungal magic never yields a Fireball Staff, but Potion of Healing is reachable (R151)', () => {
    let healing = 0
    for (let i = 0; i < 600; i++) {
      const r = rollLoot(new Rng(i + 1), '0', 'fungal')
      expect(r.item).not.toBe('Fireball Staff (2 charges)')
      if (r.item === 'healing potion') healing++
    }
    expect(healing).toBeGreaterThan(0)
    // Sanity: the Staff does exist on the dungeon table.
    let staff = 0
    for (let i = 0; i < 600; i++) {
      if (rollLoot(new Rng(i + 1), '0', 'dungeon').item === 'Fireball Staff (2 charges)') staff++
    }
    expect(staff).toBeGreaterThan(0)
  })
})

describe('extra spell lists (R046/R047)', () => {
  it('druid list has 12 spells, rolls 1-12', () => {
    expect(DRUID_SPELLS).toHaveLength(12)
    expect([...DRUID_SPELLS.map((s) => s.roll)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    for (const s of DRUID_SPELLS) {
      expect(s.name.length).toBeGreaterThan(0)
      expect(s.effect.length).toBeGreaterThan(0)
      expect(s.source).toContain('FADEE')
    }
  })

  it('illusionist list has 12 spells, rolls 1-12', () => {
    expect(ILLUSIONIST_SPELLS).toHaveLength(12)
    expect([...ILLUSIONIST_SPELLS.map((s) => s.roll)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    for (const s of ILLUSIONIST_SPELLS) {
      expect(s.name.length).toBeGreaterThan(0)
      expect(s.effect.length).toBeGreaterThan(0)
      expect(s.source).toContain('FADEE')
    }
  })
})

describe('Sleep immunity (R044, FADEE p.68)', () => {
  it('Sleep fails on dragons', () => {
    const profile = profileFor('boss', 6)
    expect(profile.name).toBe('Young Dragon')
    expect(profile.category).toBe('Dragon')
    const state = startCombat(
      't',
      [wizard()],
      [makeEnemy(profile, 'boss', 3, 1, 5)],
      new Rng(1),
    )
    state.phase = 'pcTurn'
    castSpell(state, new Rng(4), state.participants[0], 'sleep', state.enemies[0].id)
    expect(state.enemies[0].asleepCount ?? 0).toBe(0)
    expect(state.enemies[0].asleep ?? false).toBe(false)
    expect(state.log.some((l) => l.text.includes('is immune to Sleep'))).toBe(true)
  })

  it('Sleep fails on L11+ Foes even when the casting roll succeeds', () => {
    const state = startCombat(
      't',
      [wizard(10, ['sleep'])],
      [makeEnemy(profileFor('minions', 2), 'minions', 11, 5, 1)],
      new Rng(1),
    )
    state.phase = 'pcTurn'
    castSpell(state, new Rng(4), state.participants[0], 'sleep', state.enemies[0].id)
    expect(state.enemies[0].asleepCount ?? 0).toBe(0)
    expect(state.log.some((l) => l.text.includes('is immune to Sleep'))).toBe(true)
  })
})

describe('Fireball minimum (R044, FADEE p.68)', () => {
  it('a failed Fireball still slays 1 Minor', () => {
    let fizzled = false
    for (let i = 0; i < 40 && !fizzled; i++) {
      const state = goblins(3, 10) // L10 vs a L4 caster: most rolls fail
      state.phase = 'pcTurn'
      castSpell(state, new Rng(100 + i), state.participants[0], 'fireball', state.enemies[0].id)
      if (state.log.some((l) => l.text.includes('fizzles'))) {
        fizzled = true
        expect(state.enemies[0].count).toBe(2)
      }
    }
    expect(fizzled).toBe(true)
  })
})

describe('memorized Blessing (R044/R050, FADEE p.68)', () => {
  it('a memorized Blessing lifts a curse and consumes the slot', () => {
    const state = startCombat(
      't',
      [wizard(4, ['blessing', 'sleep']), cleric(3, ['cursed'], 7)],
      [makeEnemy(profileFor('minions', 2), 'minions', 2, 2, 1)],
      new Rng(1),
    )
    state.phase = 'pcTurn'
    const w = state.participants.find((p) => p.id === 'wiz')!
    const cl = state.participants.find((p) => p.id === 'cl')!
    castSpell(state, new Rng(4), w, 'blessing', null)
    expect(cl.conditions).not.toContain('cursed')
    expect(w.spells).not.toContain('blessing')
    expect(state.log.some((l) => l.text.includes('the curse is lifted'))).toBe(true)
  })
})

describe('free hand to cast (R041, FADEE p.67)', () => {
  it('a lantern occupies the hand: canCast is false and castSpell throws', () => {
    const busy = wizard(4, ['sleep'], ['light weapon', 'spellbook', 'lantern'])
    expect(canCast(busy, 'sleep')).toBe(false)
    const state = startCombat(
      't',
      [busy, cleric()],
      [makeEnemy(profileFor('minions', 2), 'minions', 2, 2, 1)],
      new Rng(1),
    )
    state.phase = 'pcTurn'
    expect(() => castSpell(state, new Rng(4), state.participants[0], 'sleep', state.enemies[0].id)).toThrow('no free hand')
  })

  it('a free hand casts normally', () => {
    expect(canCast(wizard(), 'sleep')).toBe(true)
  })
})

describe('Minotaur Charge (FADEE p.169)', () => {
  it('the first Defense roll against a Minotaur attack is at -1 on round 1', () => {
    const state = startCombat(
      't',
      [warrior('a'), warrior('b'), warrior('c'), warrior('d')],
      [makeEnemy(profileFor('weird', 1), 'weird', 4, 1, 4)],
      new Rng(3),
      { forceSurprise: true, marchingOrder: ['a', 'b', 'c', 'd'] },
    )
    expect(state.enemies[0].profile.name).toBe('Minotaur')
    expect(state.log.some((l) => l.text.includes('Minotaur charge -1'))).toBe(true)
  })
})

describe('Weakness secret lasts one combat (R051, FADEE p.122)', () => {
  it('is consumed after a won combat vs the named Major, and stays active mid-combat', () => {
    const state = startCombat(
      't',
      [warrior('a', 10), warrior('b', 10), warrior('c', 10), warrior('d', 10)],
      [makeEnemy(profileFor('boss', 3), 'boss', 3, 1, 1)],
      new Rng(1),
      { marchingOrder: ['a', 'b', 'c', 'd'], secrets: ['weakness:Ogre'] },
    )
    expect(state.enemies[0].profile.name).toBe('Ogre')
    expect(state.weaknessActive).toBe(true)
    expect(state.secrets).toContain('weakness:Ogre')
    let guard = 0
    while (state.phase !== 'won' && state.phase !== 'lost' && guard < 40) {
      guard++
      if (state.phase === 'opening') state.phase = 'pcTurn'
      if (state.phase !== 'pcTurn') break
      const attacker = state.participants.find((p) => p.status !== 'dead')
      if (!attacker) break
      pcAttack(state, new Rng(100 + guard), attacker, state.enemies[0].id)
    }
    expect(state.phase).toBe('won')
    expect(state.secrets ?? []).not.toContain('weakness:Ogre')
  })
})

describe('multi-roll treasure (R150)', () => {
  it('Chaos Lord rolls 2 treasure rolls at +1', () => {
    const p = profileFor('boss', 5)
    expect(p.name).toBe('Chaos Lord')
    expect(p.treasure).toBe('+')
    expect(p.treasureRolls).toBe(2)
  })

  it('Young Dragon rolls 3 treasure rolls at +1', () => {
    const p = profileFor('boss', 6)
    expect(p.name).toBe('Young Dragon')
    expect(p.treasure).toBe('+')
    expect(p.treasureRolls).toBe(3)
  })

  it('Giant Spider rolls 2 treasure rolls at +0', () => {
    const p = Object.values(DUNGEON_TABLES).flat().find((m) => m.name === 'Giant Spider')!
    expect(p.treasure).toBe('0')
    expect(p.treasureRolls).toBe(2)
  })

  it('Mummy keeps a single roll at +2', () => {
    const p = profileFor('boss', 1)
    expect(p.name).toBe('Mummy')
    expect(p.treasure).toBe('++')
    expect(p.treasureRolls).toBeUndefined()
  })
})

describe('life floors (R150)', () => {
  it('Cavern Wraith Life is HCL+2 with a minimum of 4', () => {
    const p = Object.values(CAVERN_TABLES).flat().find((m) => m.name === 'Cavern Wraith')!
    expect(p.lifeFormula).toBe('HCL+2')
    expect(p.lifeFloor).toBe(4)
    expect(lifeFromFormula(1, 'HCL+2', undefined, 4)).toBe(4)
    expect(lifeFromFormula(5, 'HCL+2', undefined, 4)).toBe(7)
  })

  it('Land Siren Life is HCL with a minimum of 3', () => {
    const p = Object.values(CAVERN_TABLES).flat().find((m) => m.name === 'Land Siren')!
    expect(p.lifeFormula).toBe('HCL+0')
    expect(p.lifeFloor).toBe(3)
    expect(lifeFromFormula(1, 'HCL+0', undefined, 3)).toBe(3)
    expect(lifeFromFormula(10, 'HCL+0', undefined, 3)).toBe(10)
  })
})

describe('20-class table (Part 3, FADEE pp.19-66)', () => {
  const expected: Record<string, { atk: string; def: string; life: string; saves: string; stealth: string; wealth: string; slots: number }> = {
    warrior: { atk: 'L', def: '0', life: 'L+6', saves: 'warrior', stealth: '0', wealth: '2d6', slots: 0 },
    barbarian: { atk: 'L', def: '0', life: 'L+7', saves: 'barbarian', stealth: 'halfL', wealth: 'd6', slots: 0 },
    elf: { atk: 'L', def: '0', life: 'L+4', saves: 'elf', stealth: 'flat:1', wealth: '2d6', slots: 1 },
    dwarf: { atk: 'L', def: '0', life: 'L+5', saves: 'dwarf', stealth: 'halfL', wealth: '3d6', slots: 0 },
    cleric: { atk: 'halfL', def: '0', life: 'L+4', saves: 'cleric', stealth: 'halfL', wealth: 'd6', slots: 0 },
    rogue: { atk: '0', def: 'L', life: 'L+3', saves: 'rogue', stealth: 'L', wealth: '3d6', slots: 0 },
    halfling: { atk: '0', def: '0', life: 'L+3', saves: 'halfling', stealth: 'L', wealth: '2d6', slots: 0 },
    wizard: { atk: '0', def: '0', life: 'L+2', saves: 'wizard', stealth: '0', wealth: '4d6', slots: 3 },
    acrobat: { atk: 'halfL', def: 'L', life: 'L+3', saves: 'rogue', stealth: 'L', wealth: 'd6', slots: 0 },
    assassin: { atk: 'L', def: '0', life: 'L+3', saves: 'rogue', stealth: 'L', wealth: '5d6', slots: 0 },
    bulwark: { atk: 'halfL', def: 'halfL', life: 'L+7', saves: 'warrior', stealth: '0', wealth: 'd6', slots: 0 },
    druid: { atk: 'halfL', def: '0', life: 'L+3', saves: 'cleric', stealth: 'halfL', wealth: '2d6', slots: 3 },
    gnome: { atk: '0', def: 'halfL', life: 'L+4', saves: 'rogue', stealth: 'halfL', wealth: '4d6', slots: 1 },
    illusionist: { atk: '0', def: '0', life: 'L+2', saves: 'wizard', stealth: 'halfL', wealth: '3d6', slots: 4 },
    kukla: { atk: '0', def: 'halfL', life: 'L+5', saves: 'rogue', stealth: 'halfL', wealth: '3d6', slots: 0 },
    lightGladiator: { atk: 'halfL', def: 'halfL', life: 'L+5', saves: 'warrior', stealth: '0', wealth: 'd6', slots: 0 },
    mushroomMonk: { atk: 'L', def: 'halfL', life: 'L+4', saves: 'monk', stealth: 'halfL', wealth: 'd6', slots: 0 },
    paladin: { atk: 'L', def: '0', life: 'L+6', saves: 'warrior', stealth: '0', wealth: 'd6', slots: 0 },
    ranger: { atk: 'L', def: '0', life: 'L+6', saves: 'warrior', stealth: 'L', wealth: '2d6', slots: 0 },
    swashbuckler: { atk: 'halfL', def: 'halfL', life: 'L+4', saves: 'rogue', stealth: 'halfL', wealth: '2d6', slots: 0 },
  }

  it('all 20 classes are present with ledger table values', () => {
    const core = new Map(CORE_CLASSES.map((c) => [c.id, c]))
    const expanded = new Map(EXPANDED_CLASSES.map((c) => [c.id, c]))
    expect(EXPANDED_CLASSES).toHaveLength(12)
    const ids = [...core.keys(), ...expanded.keys()]
    expect(new Set(ids).size).toBe(20)
    expect(Object.keys(expected).sort()).toEqual([...ids].sort())
    for (const [id, e] of Object.entries(expected)) {
      const row = core.get(id) ?? expanded.get(id)!
      expect(row.attackBonus, `${id} attack`).toBe(e.atk)
      expect(row.defenseBonus, `${id} defense`).toBe(e.def)
      expect(row.lifeFormula, `${id} life`).toBe(e.life)
      expect(row.savesAs, `${id} saves`).toBe(e.saves)
      expect(row.stealthBonus, `${id} stealth`).toBe(e.stealth)
      expect(row.startingWealth, `${id} wealth`).toBe(e.wealth)
      expect(row.spellSlots, `${id} slots`).toBe(e.slots)
      expect(row.abilities.length, `${id} abilities`).toBeGreaterThan(0)
      expect(row.source).toContain('FADEE')
    }
  })

  it('expanded rows are data-only: no trait tables (book text unavailable)', () => {
    for (const row of EXPANDED_CLASSES) {
      expect('traitTable' in row).toBe(false)
      expect(row.traitsToPick).toBe(1)
    }
    // Party caps the book states.
    expect(EXPANDED_CLASSES.find((c) => c.id === 'bulwark')?.maxPerParty).toBe(1)
    expect(EXPANDED_CLASSES.find((c) => c.id === 'mushroomMonk')?.maxPerParty).toBe(1)
  })

  it('magic treasure table still has 6 items incl. Potion of Healing', () => {
    expect(MAGIC_TREASURE).toHaveLength(6)
    expect(MAGIC_TREASURE.find((m) => m.roll === 5)?.name).toBe('Potion of Healing')
  })
})

describe('cleric rest (R114, FADEE p.114)', () => {
  it('a full-Life, full-prayer cleric has no spent ability', () => {
    expect(hasSpentAbility(cleric(3, [], 7))).toBe(false)
  })

  it('a cleric with a spent prayer has a spent ability', () => {
    expect(hasSpentAbility(cleric(3, ['prayer:healing:2'], 7))).toBe(true)
    expect(hasSpentAbility(cleric(3, ['prayer:blessing:1'], 7))).toBe(true)
  })

  it('a full cleric is not pending rest; a prayer-spent one is', () => {
    const full = beginRest([cleric(3, [], 7)], 0)
    expect(full.pendingPcIds).not.toContain('cl')
    const spent = beginRest([cleric(3, ['prayer:healing:2'], 7)], 0)
    expect(spent.pendingPcIds).toContain('cl')
  })
})

describe('halfling traits (R023, FADEE p.40)', () => {
  it('halfling duplicate trait rolls are rerolled until distinct, over many seeds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const c = createCharacter({ name: 'Pip', classId: 'halfling' }, new Rng(seed), 'camp-1')
      expect(c.traits).toHaveLength(2)
      expect(c.traits[0].roll).not.toBe(c.traits[1].roll)
    }
  })
})
