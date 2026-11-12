/**
 * Dungeon monster tables (FADEE pp.167-170) — data transcribed from
 * docs/RULES_VERIFICATION.md Part 12. Caverns/fungal tables ship in
 * Release 0.5. Descriptions are original paraphrases; numbers are data.
 */
import type { Edge } from './tiles'
import { CAVERN_TABLES, FUNGAL_TABLES } from './environments'

/** Display family for the map icon (plan item C2). Display only — never a rule. */
export type MonsterFamily = 'vermin' | 'goblinoid' | 'undead' | 'demon' | 'beast' | 'construct' | 'boss'

export interface MonsterProfile {
  /** d66-style table roll (1-6). */
  roll: number
  name: string
  /** Map-icon family (plan item C2). */
  family: MonsterFamily
  /** Category tag from the book (Animal/Undead/Chaos/…). */
  category: string
  /** HCL offset for the Foe's Level (FADEE p.3). */
  levelOffset: number
  /** Optional max/min Level caps (FADEE p.3). */
  levelCap?: number
  levelFloor?: number
  /** How many appear — dice formula ('3d6', 'd6+3', '1', 'd6|d6+2' alternates). */
  countFormula: string
  /** Life formula (Tier+y) for Major Foes; undefined = Minor (1 Life). */
  lifeFormula?: string
  /** Flat Life (Fiendish-style entries). */
  flatLife?: number
  attacks: number
  /** Treasure-table roll modifier ('+', '++', '-', number, or 'none'). */
  treasure: string
  /** Never tests Morale (FADEE p.94). */
  neverMorale?: boolean
  /** Major Foe = Weird Monster or Boss (FADEE p.94). */
  major?: boolean
  /** Special mechanics, original paraphrase, page-cited. */
  special: string[]
  /** d6 Reactions table, original paraphrase (FADEE pp.101-102, 167-170). */
  reactions: string[]
  source: string
}

export const DUNGEON_TABLES: Record<'vermin' | 'minions' | 'weird' | 'boss', MonsterProfile[]> = {
  vermin: [
    {
      roll: 1, name: 'Rats', family: 'vermin', category: 'Animal', levelOffset: 0, levelCap: 4,
      countFormula: '3d6', attacks: 1, treasure: 'none',
      special: ['A PC wounded by a rat rolls 1-in-6 to lose 1 Life to infection after the encounter.'],
      reactions: ['1-3 Flee', '4-6 Fight'], source: 'FADEE p.167',
    },
    {
      roll: 2, name: 'Vampire Bats', family: 'vermin', category: 'Animal', levelOffset: 0, levelCap: 3,
      countFormula: '3d6', attacks: 1, treasure: 'none',
      special: ['Their shrieking gives -1 to all spellcasting rolls. Animals, not undead.'],
      reactions: ['1-3 Flee', '4-6 Fight'], source: 'FADEE p.167',
    },
    {
      roll: 3, name: 'Goblin Swarmlings', family: 'goblinoid', category: '', levelOffset: 1, levelCap: 4,
      countFormula: '2d6', attacks: 1, treasure: '-',
      special: ['Morale -1. Dwarves attack them at +1.'],
      reactions: ['1 Flee', '2-3 Flee if outnumbered', '4 Bribe (5gp each)', '5-6 Fight'],
      source: 'FADEE p.167',
    },
    {
      roll: 4, name: 'Giant Centipedes', family: 'vermin', category: 'Animal', levelOffset: 1, levelCap: 3,
      countFormula: 'd6', attacks: 1, treasure: 'none',
      special: ['A living PC hit must Save vs L2 poison or lose 1 additional Life.'],
      reactions: ['1 Flee', '2-3 Flee if outnumbered', '4-6 Fight'], source: 'FADEE p.167',
    },
    {
      roll: 5, name: 'Vampire Frogs', family: 'vermin', category: 'Animal', levelOffset: 3, levelCap: 5,
      countFormula: 'd6', attacks: 1, treasure: '-',
      special: ['Blood-drinking amphibians; animals, not undead.'],
      reactions: ['1 Flee', '2-3 Blood Offering', '4 Fight', '5-6 Fight to the death'],
      source: 'FADEE p.167',
    },
    {
      roll: 6, name: 'Skeletal Rats', family: 'undead', category: 'Undead', levelOffset: 2, levelCap: 5,
      countFormula: '2d6', attacks: 1, treasure: 'none',
      special: [
        'Immune to Sleep, disease, poison. Unaffected by ranged weapons except firearms.',
        'Crushing weapons attack at +1. A vial of holy water automatically destroys 2.',
      ],
      reactions: ['1-2 Flee', '3-6 Fight'], source: 'FADEE p.167',
    },
  ],
  minions: [
    {
      roll: 1, name: 'Skeletons or Zombies', family: 'undead', category: 'Undead', levelOffset: 2,
      levelCap: 6, countFormula: 'alt:d6+2|d6', attacks: 1, treasure: 'none', neverMorale: true,
      special: [
        '1-3 on the table roll: d6+2 Skeletons; 4-6: d6 Zombies. Zombies capped L6.',
        'Holy water automatically destroys 1. Crushing weapons attack skeletons at +1; arrows/bolts at -1 vs both.',
      ],
      reactions: ['Always Fight to the death'], source: 'FADEE p.168',
    },
    {
      roll: 2, name: 'Goblins', family: 'goblinoid', category: '', levelOffset: 2, levelCap: 6,
      countFormula: 'd6+3', attacks: 1, treasure: '-',
      special: ['Dwarves attack at +1. 1-in-6 chance of surprising the party.'],
      reactions: ['1 Flee if outnumbered', '2-3 Bribe (5gp each)', '4-6 Fight'],
      source: 'FADEE p.168',
    },
    {
      roll: 3, name: 'Hobgoblins', family: 'goblinoid', category: '', levelOffset: 3,
      countFormula: 'd6', attacks: 1, treasure: '+',
      special: [],
      reactions: ['1 Flee if outnumbered', '2-3 Bribe (10gp each)', '4-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.168',
    },
    {
      roll: 4, name: 'Orcs', family: 'goblinoid', category: '', levelOffset: 3, levelCap: 10,
      countFormula: 'd6+1', attacks: 1, treasure: 'no-magic',
      special: [
        'Elves attack at +1. They fear magic: Morale roll every turn a spell slays one; at -1 if their number drops below half. Magic loot is replaced by d6×d6 gp.',
      ],
      reactions: ['1-2 Bribe (10gp each)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.168',
    },
    {
      roll: 5, name: 'Trolls', family: 'goblinoid', category: '', levelOffset: 4, levelCap: 7,
      countFormula: 'd3', attacks: 1, treasure: '0', major: false,
      special: [
        'Halflings add +L to Defense vs trolls. Trolls regenerate unless slain by magic/fire/acid or the corpse is hacked apart with a slashing weapon (2-in-6 return otherwise). Dwarves in the party: always fight to the death.',
      ],
      reactions: ['1-2 Fight', '3-6 Fight to the death'], source: 'FADEE p.168',
    },
    {
      roll: 6, name: 'Mushroom Men', family: 'beast', category: 'Mushroom', levelOffset: 2, levelCap: 10,
      countFormula: '2d6', attacks: 1, treasure: '0',
      special: ['A living PC hit must Save vs L3 poison or lose 1 additional Life; halflings +L; mushroom PCs immune.'],
      reactions: ['1-2 Bribe (6gp each)', '3-6 Fight'], source: 'FADEE p.168',
    },
  ],
  weird: [
    {
      roll: 1, name: 'Minotaur', family: 'beast', category: '', levelOffset: 4,
      countFormula: '1', lifeFormula: 'T+3', attacks: 2, treasure: '0', major: true,
      special: ['Charge: the first Defense roll against its attack is at -1. Halfling Luck cannot be used in this encounter.'],
      reactions: ['1-2 Bribe (60gp)', '3-5 Fight', '6 Fight to the death'], source: 'FADEE p.169',
    },
    {
      roll: 2, name: 'Iron Eater', family: 'construct', category: 'Artificial', levelOffset: 2,
      countFormula: '1', lifeFormula: 'T+3', attacks: 3, treasure: 'none', major: true,
      special: [
        'Attacks destroy metal items instead of damage: armor, then shield, then main weapon, then 3d6 gp. Light armor and shield keep their Defense bonus; heavy (metallic) armor does not.',
      ],
      reactions: ['1 Flee', '2-3 Bribe (d6gp; Fools\u2019 Gold fails)', '4-6 Fight'],
      source: 'FADEE p.169',
    },
    {
      roll: 3, name: 'Chimera', family: 'beast', category: 'Chaos', levelOffset: 4,
      countFormula: '1', lifeFormula: 'T+5', attacks: 3, treasure: '0', major: true,
      special: ['2-in-6 each turn of a fire breath instead of attacks: all PCs Save vs L4 fire or lose 1 Life.'],
      reactions: ['1 Bribe (50gp)', '2-6 Fight'], source: 'FADEE p.169',
    },
    {
      roll: 4, name: 'Catoblepas', family: 'beast', category: '', levelOffset: 3,
      countFormula: '1', lifeFormula: 'T+3', attacks: 1, treasure: '+', major: true,
      special: ['At encounter start, all PCs Save vs L4 gaze or lose 1 Life.'],
      reactions: ['1 Flee', '2-6 Fight'], source: 'FADEE p.169',
    },
    {
      roll: 5, name: 'Giant Spider', family: 'vermin', category: 'Animal', levelOffset: 4,
      countFormula: '1', lifeFormula: 'T+2', attacks: 2, treasure: '++', major: true,
      special: [
        'A living PC hit must Save vs L3 poison or lose 1 Life. Webbed area: no fleeing until a Fireball or torch burns the web.',
      ],
      reactions: ['Always Fight'], source: 'FADEE p.169',
    },
    {
      roll: 6, name: 'Invisible Gremlins', family: 'demon', category: 'Event',
      levelOffset: 0, countFormula: '1', attacks: 0, treasure: 'none',
      special: [
        'An event, not a Foe: they steal d6+3 items in the order magic → scrolls → potions → weapons → gems → gold (10 gp at a time). Gremlin-repellant protects an item. If they take everything, they leave a message worth 1 Clue.',
      ],
      reactions: ['(event — no Reactions)'], source: 'FADEE p.169',
    },
  ],
  boss: [
    {
      roll: 1, name: 'Mummy', family: 'undead', category: 'Undead', levelOffset: 4,
      countFormula: '1', lifeFormula: 'T+3', attacks: 2, treasure: '++', major: true, neverMorale: true,
      special: [
        'Immune to Sleep and poison. A PC slain by a mummy rises as a mummy one turn later. Flammable: fire/torch attacks at +2, a flask of oil adds another +2.',
      ],
      reactions: ['Always Fight to the death'], source: 'FADEE p.170',
    },
    {
      roll: 2, name: 'Orc Brute', family: 'goblinoid', category: '', levelOffset: 4,
      countFormula: '1', lifeFormula: 'T+4', attacks: 2, treasure: '+', major: true,
      special: ['Elves attack at +1. No magic items in loot — count them as d6×d6 gp.'],
      reactions: ['1 Bribe (50gp)', '2-5 Fight', '6 Fight to the death'], source: 'FADEE p.170',
    },
    {
      roll: 3, name: 'Ogre', family: 'goblinoid', category: '', levelOffset: 4,
      countFormula: '1', lifeFormula: 'T+4', attacks: 1, treasure: '0', major: true,
      special: ['Its attacks inflict Tier+1 damage.'],
      reactions: ['1 Bribe (30gp)', '2-3 Fight', '4-6 Fight to the death'], source: 'FADEE p.170',
    },
    {
      roll: 4, name: 'Medusa', family: 'demon', category: '', levelOffset: 3,
      countFormula: '1', lifeFormula: 'T+3', attacks: 1, treasure: '+', major: true,
      special: [
        'Encounter start, before ranged attacks: all PCs Save vs L4 gaze or be turned to stone. Rogues +½L. A Blessing restores one petrified PC.',
      ],
      reactions: ['1 Bribe (6d6gp)', '2 Quest', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.170',
    },
    {
      roll: 5, name: 'Chaos Lord', family: 'demon', category: 'Chaos', levelOffset: 5,
      countFormula: '1', lifeFormula: 'T+3', attacks: 3, treasure: '++', major: true,
      special: [
        '2 treasure rolls at +1 and a 2-in-6 chance of 1 Clue. Powers (d6): 1-3 none; 4 evil eye (all Save vs L4 magic or -1 Defense until slain); 5 energy drain (hit PCs Save vs L4 magic or lose 1 Level; Blessing restores); 6 hellfire blast (Save vs L6 magic or 2 Life; clerics +½L).',
      ],
      reactions: ['1 Flee if outnumbered', '2 Fight', '3-6 Fight to the death'],
      source: 'FADEE p.170',
    },
    {
      roll: 6, name: 'Young Dragon', family: 'boss', category: 'Dragon', levelOffset: 5,
      countFormula: '1', lifeFormula: 'T+4', attacks: 2, treasure: '++', major: true,
      special: [
        'Immune to Sleep. Each turn d6: 1-2 fire breath (all Save vs L6 breath, +½L each, or 2 Life); 3-6 two random-target attacks. Never met as Wandering Monsters. Reactions include Sleep (party +2 first attack), Bribe (all party gp, min 100, or a magic item), Quest.',
      ],
      reactions: [
        '1 Sleep', '2-3 Bribe (all gp min 100 or 1 magic item)', '4 Quest', '5-6 Fight',
      ],
      source: 'FADEE p.170',
    },
  ],
}

export type TableKind = 'vermin' | 'minions' | 'weird' | 'boss'

export function profileFor(kind: TableKind, roll: number): MonsterProfile {
  const table = DUNGEON_TABLES[kind]
  const profile = table.find((m) => m.roll === roll)
  if (!profile) throw new Error(`no ${kind} profile for roll ${roll}`)
  return profile
}

/** Cavern/fungal profiles live in environments.ts (Release 0.5). */
export function profileForEnv(
  env: 'caverns' | 'fungal',
  kind: TableKind,
  roll: number,
): MonsterProfile {
  // environments.ts only imports MonsterProfile/TableKind as types from
  // this module, so this static import is not a runtime cycle.
  const table = (env === 'caverns' ? CAVERN_TABLES : FUNGAL_TABLES)[kind]
  const profile = table.find((m) => m.roll === roll)
  if (!profile) throw new Error(`no ${env} ${kind} profile for roll ${roll}`)
  return profile
}

/** Which table kind a profile belongs to, across all environments. */
export function tableKindFor(profile: MonsterProfile): TableKind {
  for (const k of ['vermin', 'minions', 'weird', 'boss'] as TableKind[]) {
    if (DUNGEON_TABLES[k].includes(profile)) return k
  }
  for (const k of ['vermin', 'minions', 'weird', 'boss'] as TableKind[]) {
    if (CAVERN_TABLES[k].includes(profile) || FUNGAL_TABLES[k].includes(profile)) return k
  }
  return 'vermin'
}

/** Edge of a placed exit, after a tile transform is applied. */
export function oppositeEdge(e: Edge): Edge {
  switch (e) {
    case 'N': return 'S'
    case 'S': return 'N'
    case 'E': return 'W'
    case 'W': return 'E'
  }
}
