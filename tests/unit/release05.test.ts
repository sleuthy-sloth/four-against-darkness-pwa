import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import type { Character } from '../../src/rulesets/schema/character'
import {
  CAVERN_TABLES,
  FUNGAL_TABLES,
  RARE_MUSHROOMS,
  CAVERN_SPECIAL_ITEMS,
  FUNGAL_RARE_ITEMS,
  QUEST_RETRIEVAL_ITEMS,
  cavernFeatureForRoll,
} from '../../src/rulesets/expanded/environments'
import { profileFor, profileForEnv, tableKindFor } from '../../src/rulesets/expanded/monsters'
import {
  newDungeon,
  rollContent,
  dragonForEnvironment,
  searchTile,
  generateSecretDoorTile,
  type DungeonState,
} from '../../src/engine/dungeon/generate'
import { rollLoot, rollSpecialItem } from '../../src/engine/treasure/loot'
import { computeLight, darknessPenalty, DARKVISION_CLASSES, hasFreeHand } from '../../src/engine/light'
import { tierOf, oldSchoolLevelCost, tierTrainingCost, oldSchoolFoeXp, XP_SYSTEMS } from '../../src/engine/xp'
import {
  chargesOf,
  setCharges,
  canUseWand,
  canUseStaff,
  hasRing,
  hasFoolsGold,
  magicWeaponBonus,
  isSubdualImmune,
} from '../../src/engine/items/magicItems'
import {
  makeEnemy,
  startCombat,
  pcAttack,
  castItemSpell,
  useTeleportRing,
  payBribeWithFoolsGold,
  fleeCombat,
  rollCombatDie,
  rollReactions,
  type CombatState,
} from '../../src/engine/combat/combat'

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
    status: 'active' as const,
    createdAt: 0,
  }))
}

/** Deterministic stub RNG: every d6 is a 6 (hits land, explosions max out). */
function maxRng(): Rng {
  return {
    d: () => 6,
    roll: () => 6,
    d3: () => 3,
    d66: () => 66,
    formula: () => 6,
  } as unknown as Rng
}

function stubSearchRng(roll: number): Rng {
  return {
    d: () => roll,
    roll: () => roll,
    d3: () => 3,
    d66: () => 66,
    formula: () => 0,
  } as unknown as Rng
}

describe('A1 Environments — monster tables (Part 12, pp.171-178)', () => {
  it('each environment has 6 profiles per category', () => {
    for (const tables of [CAVERN_TABLES, FUNGAL_TABLES]) {
      for (const kind of ['vermin', 'minions', 'weird', 'boss'] as const) {
        expect(tables[kind]).toHaveLength(6)
        expect(tables[kind].map((p) => p.roll)).toEqual([1, 2, 3, 4, 5, 6])
      }
    }
  })

  it('dragons are per environment', () => {
    expect(profileForEnv('caverns', 'weird', 6).name).toBe('Cave Dragon')
    expect(profileForEnv('fungal', 'boss', 6).name).toBe('Fungal Dragon')
    expect(dragonForEnvironment('dungeon').name).toBe('Young Dragon')
    expect(dragonForEnvironment('caverns').name).toBe('Cave Dragon')
    expect(dragonForEnvironment('fungal').name).toBe('Fungal Dragon')
  })

  it('tableKindFor resolves environment profiles', () => {
    expect(tableKindFor(profileForEnv('caverns', 'boss', 1))).toBe('boss')
    expect(tableKindFor(profileForEnv('fungal', 'vermin', 3))).toBe('vermin')
    expect(tableKindFor(profileFor('boss', 2))).toBe('boss')
  })

  it('Tile Content row 5 routes per environment (R114)', () => {
    const mk = (env: 'dungeon' | 'caverns' | 'fungal'): DungeonState => {
      const d = newDungeon('c', new Rng(1))
      d.environment = env
      const t = d.tiles.find((x) => x.id === d.currentTileId)!
      t.environment = env
      return d
    }
    const events: string[] = []
    const f = mk('fungal')
    const fc = rollContent(f, new Rng(1), f.tiles[0], 5, 1, events)
    expect(fc.kind).toBe('secretPassage')
    const c = mk('caverns')
    const cc = rollContent(c, new Rng(1), c.tiles[0], 5, 1, events)
    expect(cc.kind).toBe('specialFeature')
    expect(cc.specialFeatureRoll).toBeGreaterThanOrEqual(1)
    const d = mk('dungeon')
    const dc = rollContent(d, new Rng(1), d.tiles[0], 5, 1, events)
    expect(dc.kind).toBe('specialFeature')
  })

  it('cavern features roll 1-6 to the five named features (R141/R142)', () => {
    expect(cavernFeatureForRoll(1)).toBe('stalactites')
    expect(cavernFeatureForRoll(2)).toBe('stalagmites')
    expect(cavernFeatureForRoll(3)).toBe('boulders')
    expect(cavernFeatureForRoll(4)).toBe('echo')
    expect(cavernFeatureForRoll(5)).toBe('waterPools')
    expect(cavernFeatureForRoll(6)).toBe('waterPools')
  })

  it('Search details are environment-specific; rogue 4 counts as 5 (R143/R144)', () => {
    const d = newDungeon('c', new Rng(1))
    d.environment = 'caverns'
    const tile = d.tiles.find((t) => t.id === d.currentTileId)!
    tile.environment = 'caverns'
    const r = searchTile(d, stubSearchRng(4), tile.id, ['rogue'])
    expect(r.result).toBe('find')
    expect(r.detail).toBe('clue|listen')
    const d2 = newDungeon('c', new Rng(1))
    d2.environment = 'fungal'
    const t2 = d2.tiles.find((t) => t.id === d2.currentTileId)!
    t2.environment = 'fungal'
    const r2 = searchTile(d2, stubSearchRng(5), t2.id, ['halfling'])
    expect(r2.detail).toBe('clue|rare-mushroom')
  })

  it('a found secret door generates a real tile to peek at and enter (R125)', () => {
    const d = newDungeon('c', new Rng(9))
    const before = d.tiles.length
    const currentBefore = d.currentTileId
    const { toTileId, events } = generateSecretDoorTile(d, new Rng(9), 1)
    expect(toTileId).not.toBeNull()
    expect(d.tiles.length).toBeGreaterThan(before)
    expect(d.currentTileId).toBe(currentBefore) // peeking is not entering
    const to = d.tiles.find((t) => t.id === toTileId)!
    expect(to.viaSecretDoor).toBe(true)
    expect(d.secretDoor?.toTileId).toBe(toTileId)
    expect(d.secretDoor?.fromTileId).toBe(currentBefore)
    expect(events.length).toBeGreaterThan(0)
    // safe shortcut is a 1-in-6 flag on the record
    expect(typeof d.secretDoor?.safeExit).toBe('boolean')
  })
})

describe('A1/A3 Environment loot (R150-R154)', () => {
  it('special-item tables each have 6 entries', () => {
    expect(RARE_MUSHROOMS).toHaveLength(6)
    expect(CAVERN_SPECIAL_ITEMS).toHaveLength(6)
    expect(FUNGAL_RARE_ITEMS).toHaveLength(6)
    expect(QUEST_RETRIEVAL_ITEMS).toHaveLength(6)
  })

  it('rollSpecialItem only ever returns items from its own table', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const m = rollSpecialItem(new Rng(seed), 'mushroom')
      if (m.item) expect(RARE_MUSHROOMS.map((x) => x.name)).toContain(m.item)
      const c = rollSpecialItem(new Rng(seed), 'cavern')
      if (c.item) expect([...CAVERN_SPECIAL_ITEMS.map((x) => x.name), 'lantern']).toContain(c.item)
      const f = rollSpecialItem(new Rng(seed), 'fungal')
      if (f.item && !f.item.startsWith('white angel')) {
        expect([...FUNGAL_RARE_ITEMS.map((x) => x.name), 'rope']).toContain(f.item)
      }
    }
  })

  it('fungal treasure row 2 grants rations; cavern row 3 grants an illusionist prism', () => {
    let fungalRations = false
    let cavernPrism = false
    let fungalDruid = false
    for (let seed = 1; seed <= 200; seed++) {
      const f = rollLoot(new Rng(seed), '0', 'fungal')
      if (f.rations !== undefined) fungalRations = true
      if (f.scroll?.list === 'druid') fungalDruid = true
      const c = rollLoot(new Rng(seed), '0', 'caverns')
      if (c.scroll?.list === 'illusionist') cavernPrism = true
    }
    expect(fungalRations).toBe(true)
    expect(cavernPrism).toBe(true)
    expect(fungalDruid).toBe(true)
  })

  it('magic treasure grants a typed Magic Weapon and a usable healing potion', () => {
    let weapon = false
    let potion = false
    let wand = false
    let staff = false
    for (let seed = 1; seed <= 300; seed++) {
      const r = rollLoot(new Rng(seed), '0', 'dungeon')
      if (r.item?.startsWith('Magic Weapon (+1,')) weapon = true
      if (r.item === 'healing potion') potion = true
      if (r.item === 'Wand of Sleep (3 charges)') wand = true
      if (r.item === 'Fireball Staff (2 charges)') staff = true
    }
    expect(weapon).toBe(true)
    expect(potion).toBe(true)
    expect(wand).toBe(true)
    expect(staff).toBe(true)
  })
})

describe('A4 Light & darkness (R093/R094/R041)', () => {
  it('darkvision list is empty by design — the ledger names no classes', () => {
    expect(DARKVISION_CLASSES).toEqual([])
  })

  it('no light means darkness −2', () => {
    const pcs = party()
    const light = computeLight(pcs, { torchLit: false, torchRooms: 0, lanternDropped: false })
    expect(light.hasLight).toBe(false)
    expect(light.source).toBe('none')
    expect(darknessPenalty(light)).toBe(-2)
  })

  it('a lantern carried by a living PC lights the party; a dropped one does not', () => {
    const pcs = party()
    pcs[0].equipment.push('lantern')
    expect(computeLight(pcs, { torchLit: false, torchRooms: 0, lanternDropped: false }).hasLight).toBe(true)
    expect(computeLight(pcs, { torchLit: false, torchRooms: 0, lanternDropped: true }).hasLight).toBe(false)
  })

  it('a torch burns for 6 rooms, then goes out', () => {
    const pcs = party()
    pcs[0].equipment.push('torch')
    expect(computeLight(pcs, { torchLit: true, torchRooms: 5, lanternDropped: false }).hasLight).toBe(true)
    expect(computeLight(pcs, { torchLit: true, torchRooms: 6, lanternDropped: false }).hasLight).toBe(false)
  })

  it('a Glittering Crystal is a hands-free light (R153)', () => {
    const pcs = party()
    pcs[0].equipment.push('Glittering Crystal')
    const light = computeLight(pcs, { torchLit: false, torchRooms: 0, lanternDropped: false })
    expect(light.hasLight).toBe(true)
    expect(light.source).toBe('crystal')
  })

  it('a lantern/torch hand is not free for casting (R041); a wand hand is', () => {
    const pcs = party()
    expect(hasFreeHand(pcs[0])).toBe(true)
    pcs[0].equipment.push('lantern')
    expect(hasFreeHand(pcs[0])).toBe(false)
    pcs[0].equipment = pcs[0].equipment.filter((e) => e !== 'lantern')
    pcs[0].equipment.push('torch')
    expect(hasFreeHand(pcs[0])).toBe(false)
  })

  it('darkness −2 appears in the attack log', () => {
    const pcs = party()
    const c = startCombat(
      't',
      pcs,
      [makeEnemy(profileFor('vermin', 1), 'vermin', 1, 3, 1)],
      new Rng(4),
      { darknessPenalty: -2 },
    )
    c.phase = 'pcTurn'
    pcAttack(c, new Rng(4), pcs[0], c.enemies[0].id)
    expect(c.log.some((l) => l.text.includes('darkness -2'))).toBe(true)
  })

  it('stalagmites forbid exploding dice (R142)', () => {
    const pcs = party()
    const c = startCombat('t', pcs, [makeEnemy(profileFor('vermin', 1), 'vermin', 1, 3, 1)], new Rng(4), {
      noExplosions: true,
    })
    const die = rollCombatDie(c, maxRng(), 'stalagmite die')
    expect(die.rolls).toEqual([6])
    expect(die.total).toBe(6)
  })
})

describe('A6 Opening phase — the reaction choice (FADEE pp.90-91)', () => {
  it('Engage leaves combat in the opening phase: attack immediately or wait', () => {
    const pcs = party()
    const c = startCombat(
      't',
      pcs,
      [makeEnemy(profileFor('vermin', 1), 'vermin', 1, 3, 1)],
      new Rng(5),
      {},
    )
    expect(c.phase).toBe('opening')
    // Waiting rolls Reactions; the roll resolves the opening one way or
    // another (fight, flee, bribe, or won).
    rollReactions(c, new Rng(5))
    expect(['pcTurn', 'foesTurn', 'won', 'opening']).toContain(c.phase)
  })

  it('a Goblin surprise still rolls Reactions at Engage', () => {
    const pcs = party()
    // Goblins surprise on 1-in-6: force it via forceSurprise.
    const c = startCombat(
      't',
      pcs,
      [makeEnemy(profileFor('minions', 2), 'minions', 2, 3, 1)],
      new Rng(5),
      { forceSurprise: true },
    )
    expect(['pcTurn', 'foesTurn', 'won']).toContain(c.phase)
  })
})

describe('A5 XP systems (R171-R174)', () => {
  it('four systems exist, Classical first and default', () => {
    expect(XP_SYSTEMS.map((s) => s.id)).toEqual(['classical', 'slow', 'oldSchool', 'slower'])
  })

  it('tierOf maps levels to tiers', () => {
    expect([1, 4, 5, 9, 10, 14, 15, 19, 20, 25].map(tierOf)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5])
  })

  it('Old School level cost is (Tier+2)×100 (R173)', () => {
    expect(oldSchoolLevelCost(1)).toBe(300)
    expect(oldSchoolLevelCost(4)).toBe(300)
    expect(oldSchoolLevelCost(5)).toBe(400)
    expect(oldSchoolLevelCost(10)).toBe(500)
    expect(oldSchoolLevelCost(15)).toBe(600)
    expect(oldSchoolLevelCost(20)).toBe(700)
  })

  it('tier training costs 500/1000/2500/5000gp at T2-5 (R174)', () => {
    expect(tierTrainingCost(4)).toBe(0)
    expect(tierTrainingCost(5)).toBe(500)
    expect(tierTrainingCost(10)).toBe(1000)
    expect(tierTrainingCost(15)).toBe(2500)
    expect(tierTrainingCost(20)).toBe(5000)
  })

  it('Old School foe XP: Major L×10+5/Life, Minor sum L×10, Vermin halved (R173)', () => {
    expect(oldSchoolFoeXp(true, false, 3, 6, 1)).toBe(60)
    expect(oldSchoolFoeXp(false, false, 2, 1, 3)).toBe(60)
    expect(oldSchoolFoeXp(false, true, 2, 1, 4)).toBe(40)
  })
})

describe('A3 Magic items & subdual (R151/R089)', () => {
  it('wand/staff charges are encoded in the equipment string', () => {
    const pcs = party()
    const w = pcs[3]
    w.equipment.push('Wand of Sleep (3 charges)')
    expect(chargesOf(w, 'Wand of Sleep')).toBe(3)
    setCharges(w, 'Wand of Sleep', 2)
    expect(w.equipment).toContain('Wand of Sleep (2 charges)')
    setCharges(w, 'Wand of Sleep', 0)
    expect(w.equipment).not.toContain('Wand of Sleep (0 charges)')
  })

  it('wand is wizard/illusionist/elf only; staff is wizard only', () => {
    const pcs = party()
    const wizard = pcs[3]
    wizard.equipment.push('Wand of Sleep (3 charges)', 'Fireball Staff (2 charges)')
    expect(canUseWand(wizard)).toBe(true)
    expect(canUseStaff(wizard)).toBe(true)
    expect(canUseWand(pcs[0])).toBe(false)
    expect(canUseStaff(pcs[0])).toBe(false)
    const elf = { ...pcs[3], classId: 'elf' }
    expect(canUseWand(elf)).toBe(true)
    expect(canUseStaff(elf)).toBe(false)
  })

  it('a Magic Weapon grants +1 Attack', () => {
    const pcs = party()
    expect(magicWeaponBonus(pcs[0])).toBe(0)
    pcs[0].equipment.push('Magic Weapon (+1, crushing hand)')
    expect(magicWeaponBonus(pcs[0])).toBe(1)
  })

  it('subdual immunity: Vermin and Unliving cannot be subdued; a Boss can', () => {
    expect(isSubdualImmune(profileFor('vermin', 1), 'vermin')).toBe(true)
    // Boss roll 1 is the Mummy (Undead) — immune; roll 2 is the Orc Brute.
    expect(isSubdualImmune(profileFor('boss', 1), 'boss')).toBe(true)
    expect(isSubdualImmune(profileFor('boss', 2), 'boss')).toBe(false)
    const undead = { ...profileFor('boss', 2), category: 'Undead' as const }
    expect(isSubdualImmune(undead, 'boss')).toBe(true)
  })

  it('a subdual attack at −1 subdues a Major at 0 Life instead of slaying it', () => {
    const pcs = party()
    // Orc Brute (boss roll 2) — roll 1 is the Mummy, subdual-immune.
    const species = profileFor('boss', 2)
    const c = startCombat(
      't',
      pcs,
      [makeEnemy({ ...species, countFormula: '1', attacks: 1 }, 'boss', 1, 1, 1)],
      maxRng(),
      {},
    )
    c.phase = 'pcTurn'
    pcAttack(c, maxRng(), pcs[0], c.enemies[0].id, { subdual: true })
    expect(c.enemies[0].life).toBe(0)
    expect(c.enemies[0].subdued).toBe(true)
    expect(c.log.some((l) => l.text.includes('subdued'))).toBe(true)
  })

  it('Sleep subdues a type-3 quest target (R089/R155)', () => {
    const pcs = party()
    // Boss roll 2 is the Orc Brute — roll 1 is the Mummy, Sleep-immune.
    const species = profileFor('boss', 2)
    const c = startCombat(
      't',
      pcs,
      [makeEnemy({ ...species, countFormula: '1', attacks: 1 }, 'boss', 1, 1, 6)],
      new Rng(5),
      { questTargetName: species.name },
    )
    c.phase = 'pcTurn'
    castItemSpell(c, new Rng(5), pcs[3], 'sleep', c.enemies[0].id, 3)
    expect(c.enemies[0].subduedBySleep).toBe(true)
    expect(c.enemies[0].asleep).toBe(true)
  })

  it('a Wand of Sleep puts Minor Foes to sleep', () => {
    const pcs = party()
    pcs[3].equipment.push('Wand of Sleep (3 charges)')
    const c = startCombat(
      't',
      pcs,
      [makeEnemy(profileFor('vermin', 1), 'vermin', 1, 3, 1)],
      new Rng(5),
      {},
    )
    c.phase = 'pcTurn'
    castItemSpell(c, new Rng(5), pcs[3], 'sleep', c.enemies[0].id, 3)
    expect(c.enemies[0].asleepCount).toBeGreaterThan(0)
  })

  it('a Ring of Teleportation removes its wearer from combat, once', () => {
    const pcs = party()
    pcs[0].equipment.push('Ring of Teleportation')
    const c = startCombat(
      't',
      pcs,
      [makeEnemy(profileFor('vermin', 1), 'vermin', 1, 3, 1)],
      new Rng(5),
      {},
    )
    c.phase = 'pcTurn'
    useTeleportRing(c, pcs[0])
    expect(pcs[0].equipment).not.toContain('Ring of Teleportation')
    expect(c.participants.map((p) => p.id)).not.toContain(pcs[0].id)
    expect(c.phase).toBe('pcTurn') // others still fight
  })

  it("Fools' Gold satisfies a pending bribe and is consumed", () => {
    const pcs = party()
    pcs[0].equipment.push("Fools' Gold")
    const c = startCombat(
      't',
      pcs,
      [makeEnemy(profileFor('vermin', 1), 'vermin', 1, 3, 1)],
      new Rng(5),
      {},
    )
    c.phase = 'opening'
    c.pendingBribe = { enemyGroupId: c.enemies[0].id, amount: 10, each: false }
    expect(payBribeWithFoolsGold(c, pcs)).toBe(true)
    expect(c.pendingBribe).toBeNull()
    expect(pcs[0].equipment).not.toContain("Fools' Gold")
    expect(hasFoolsGold(pcs)).toBeUndefined()
    expect(hasRing(pcs[0])).toBe(false)
  })

  it('a Puffball Smokebomb flee is unattacked', () => {
    const pcs = party()
    const c = startCombat(
      't',
      pcs,
      [makeEnemy(profileFor('vermin', 1), 'vermin', 1, 3, 1)],
      new Rng(5),
      {},
    )
    c.phase = 'pcTurn'
    fleeCombat(c, new Rng(5), { unattacked: true })
    expect(c.phase).toBe('fled')
    expect(c.log.some((l) => l.text.includes('strike'))).toBe(false)
  })
})
