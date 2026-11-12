import { z } from 'zod'

/**
 * Dungeon special features, special events, and traps — data only.
 * Sources: FADEE Expanded Edition, Dungeon Special Feature Table (p.152),
 * Dungeon Special Events Table (p.153), Dungeon Traps Table (p.163).
 * Original paraphrase; page references verify against the book.
 */

export const DUNGEON_FEATURES = [
  'fountain',
  'temple',
  'armory',
  'cursedAltar',
  'statue',
  'puzzleBox',
] as const
export type DungeonFeature = (typeof DUNGEON_FEATURES)[number]

export const DUNGEON_EVENTS = [
  'ghost',
  'wanderingMonsters',
  'ladyInWhite',
  'trap',
  'healer',
  'alchemist',
] as const
export type DungeonEvent = (typeof DUNGEON_EVENTS)[number]

export const DUNGEON_TRAPS = [
  'dart',
  'poisonGas',
  'trapdoor',
  'bearTrap',
  'spears',
  'fallingStone',
] as const
export type DungeonTrap = (typeof DUNGEON_TRAPS)[number]

export const TRAP_INFO: Record<DungeonTrap, { text: string; source: string }> = {
  dart: {
    text: 'Dart! A random PC defends vs. HCL+1 or loses 1 Life. Halflings may reroll a failed Defense roll.',
    source: 'FADEE p.163',
  },
  poisonGas: {
    text: 'Poison gas! All PCs Save vs. HCL+2 poison or lose 1 Life. Barbarians and halflings add +L.',
    source: 'FADEE p.163',
  },
  trapdoor: {
    text: 'Trapdoor (HCL+3) under the Marching Order leader: Save at -1 light armor / -2 heavy armor, +1 halfling/elf, rogues +L. Fail = 1 Life lost and a hand needed to climb out.',
    source: 'FADEE p.163',
  },
  bearTrap: {
    text: 'Bear trap under the Marching Order leader: Save vs. HCL+3 (+1 halfling/elf, rogues +L). Fail = 1 Life lost, -1 Attack and Defense until that Life is recovered.',
    source: 'FADEE p.163',
  },
  spears: {
    text: 'Spears strike 2 random PCs: Defense vs. HCL+4 or lose 1 Life.',
    source: 'FADEE p.163',
  },
  fallingStone: {
    text: 'A giant stone falls on the Marching Order position 4 PC: Defense vs. HCL+4 (armor applies, shield does not) or lose 2 Life.',
    source: 'FADEE p.163',
  },
}

export const EVENT_INFO: Record<DungeonEvent, { text: string; source: string }> = {
  ghost: {
    text: 'A ghost passes through the party. All PCs Save vs. L4 fear or lose 1 Life or gain 1 Madness (player\u2019s choice). Clerics add +L.',
    source: 'FADEE p.153',
  },
  wanderingMonsters: {
    text: 'Wandering Monsters attack!',
    source: 'FADEE p.153',
  },
  ladyInWhite: {
    text: 'A Lady in White appears and asks you to complete a Quest.',
    source: 'FADEE p.153',
  },
  trap: { text: 'Roll on the Traps Table.', source: 'FADEE p.153' },
  healer: {
    text: 'A wandering healer heals PCs at 10gp per Life healed (once per adventure).',
    source: 'FADEE p.153',
  },
  alchemist: {
    text: 'A wandering alchemist sells 1 healing potion per PC (50gp) and blade poison (30gp) — once per adventure.',
    source: 'FADEE p.153',
  },
}

export const FEATURE_INFO: Record<DungeonFeature, { text: string; source: string }> = {
  fountain: {
    text: 'Fountain/Pool: all living PCs drink and recover 1 Life the first time they encounter a fountain this adventure.',
    source: 'FADEE p.152',
  },
  temple: {
    text: 'Blessed Temple/Shrine: one PC gains +1 Attack vs. undead and demons until they kill one.',
    source: 'FADEE p.152',
  },
  armory: {
    text: 'Armory: all PCs may change weapons within class limits; PCs who lost weapons pick up new ones.',
    source: 'FADEE p.152',
  },
  cursedAltar: {
    text: 'Cursed Altar: a random PC is cursed (-1 Defense) until they slay a Major Foe alone, enter a Blessed Temple, or receive a Blessing.',
    source: 'FADEE p.152',
  },
  statue: {
    text: 'Statue: touch it (d6: 1-3 a living statue awakens and fights; 4-6 it breaks open with 3d6x10 gp) or leave it alone.',
    source: 'FADEE p.152',
  },
  puzzleBox: {
    text: 'Puzzle Box: Save vs. its L (L is d6). Each failed attempt blasts the PC for 1 damage. Wizards and rogues add +L. Solved: roll on the Treasure Table.',
    source: 'FADEE p.152',
  },
}

/** Consumables usable from the inventory (FADEE pp.83-85). */
export const ITEM_INFO: Record<string, { text: string; price: number; source: string }> = {
  'healing potion': {
    text: 'Heals all damage. No PC may drink more than 1 per adventure. Free action, usable in combat.',
    price: 100,
    source: 'FADEE p.83',
  },
  bandage: {
    text: 'Heals 1 Life. 1 per PC per adventure. May not be applied in combat.',
    price: 5,
    source: 'FADEE p.83',
  },
  'bag of nails': {
    text: 'One use. Secures a door while Resting.',
    price: 4,
    source: 'FADEE p.85',
  },
  rope: {
    text: '+1 to Climbing Saves; may bind subdued Foes.',
    price: 4,
    source: 'FADEE p.83',
  },
  lantern: {
    text: 'Light source. Without light: -2 Attack/Defense/Saves, no Search or ranged attacks.',
    price: 4,
    source: 'FADEE p.82',
  },
  torch: {
    text: 'Light source: burns for 6 rooms (1 hour). Melee-usable as a light crushing weapon; extinguishes on a roll of 1; +2 vs flammable.',
    price: 1,
    source: 'FADEE p.110',
  },
  rations: {
    text: 'Food for 1 person for 1 day. Max 10 per PC. Bribes ravenous creatures.',
    price: 1,
    source: 'FADEE p.83',
  },
  'scroll of blessing': {
    text: 'Reading takes 1 turn; casts 1 Blessing (removes a curse). Casting destroys it.',
    price: 100,
    source: 'FADEE p.84',
  },
}

/**
 * Between-adventures outfitter stock (FADEE pp.82-85): light/heavy armor,
 * weapons and magic services are excluded (armor/weapons come from class
 * kits; magic-item purchases land with the supplements milestone).
 */
export const SHOP_STOCK = ['rations', 'rope', 'lantern', 'torch', 'bandage', 'bag of nails', 'healing potion', 'scroll of blessing'] as const

/** Barbarians may not use magic items, scrolls, or potions (FADEE p.54). */
export const NO_MAGIC_CLASSES = new Set(['barbarian'])

/** Classes that cast memorized spells (FADEE pp.24-65). */
export const SPELLCASTER_CLASSES = new Set(['wizard', 'elf', 'illusionist', 'druid'])

/** Non-humanoid builds: armor may only be exchanged within the same build (FADEE p.111). */
export const NON_HUMANOID_CLASSES = new Set(['dwarf', 'elf', 'halfling', 'kukla', 'fairy', 'lutin'])

export function sameBuild(aClassId: string, bClassId: string): boolean {
  return NON_HUMANOID_CLASSES.has(aClassId) === NON_HUMANOID_CLASSES.has(bClassId)
}

export const TrapRoll = z.number().int().min(1).max(6)
