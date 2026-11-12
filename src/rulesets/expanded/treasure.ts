/**
 * Treasure tables (FADEE pp.157-158, dungeon rows; caverns/fungal in 0.5).
 * Data transcribed from docs/RULES_VERIFICATION.md Part 11; original wording.
 */
import type { SpellId } from '../schema/character'

export type LootKind = 'nothing' | 'gold' | 'scroll' | 'jewel' | 'chest' | 'magic' | 'rations' | 'cavernItem' | 'fungalItem' | 'mushroom'

export interface LootEntry {
  kind: LootKind
  /** Gold/gem/chest gp formula (evaluated with the campaign RNG). */
  gpFormula?: string
  /** Random spell scroll (basic list) — wizard table, FADEE p.69. */
  randomSpell?: boolean
  /** Which spell list a random scroll comes from (env rows, R150). */
  scrollList?: 'wizard' | 'druid' | 'illusionist'
  /** Named magic item id from MAGIC_TREASURE. */
  magicRoll?: number
  /** Fungal alternatives noted but unused until Release 0.5. */
  note?: string
}

/** Magic weapon types (R151): d6 — 1 crushing light, 2 slashing light, 3 crushing hand, 4 slashing hand, 5 slashing two-handed, 6 bow. */
export const MAGIC_WEAPON_TYPES = [
  'crushing light weapon',
  'slashing light weapon',
  'crushing hand weapon',
  'slashing hand weapon',
  'slashing two-handed weapon',
  'bow',
] as const

export interface TreasureRow {
  roll: number // 0 = "0 or less" row
  dungeon: LootEntry
  /** Cavern row (R150, p.157); absent = same as dungeon. */
  caverns?: LootEntry
  /** Fungal row (R150, p.157). */
  fungal?: LootEntry
}

/** Treasure Table rows (R150, p.157) — all three environments. */
export const TREASURE_TABLE: TreasureRow[] = [
  { roll: 0, dungeon: { kind: 'nothing' } },
  { roll: 1, dungeon: { kind: 'gold', gpFormula: 'd6' } },
  { roll: 2, dungeon: { kind: 'gold', gpFormula: '2d6' }, fungal: { kind: 'rations', note: '2d6 rations, or 1 Rare Mushroom roll' } },
  { roll: 3, dungeon: { kind: 'scroll', randomSpell: true }, caverns: { kind: 'scroll', scrollList: 'illusionist' }, fungal: { kind: 'scroll', scrollList: 'druid', note: 'bark (random druid spell) or Rare Mushroom roll' } },
  { roll: 4, dungeon: { kind: 'jewel', gpFormula: '2d6x5' }, caverns: { kind: 'jewel', gpFormula: '3d6x5' }, fungal: { kind: 'jewel', gpFormula: '2d6x5', note: 'or 2 Rare Mushroom rolls' } },
  { roll: 5, dungeon: { kind: 'chest', gpFormula: '3d6x10' }, caverns: { kind: 'jewel', gpFormula: '3d6x10', note: 'or a prism (random illusionist spell)' }, fungal: { kind: 'jewel', gpFormula: '2d6x10', note: 'or 3 Rare Mushroom rolls' } },
  { roll: 6, dungeon: { kind: 'magic', magicRoll: 0 }, caverns: { kind: 'cavernItem', magicRoll: 0 }, fungal: { kind: 'magic', magicRoll: 0, note: 'or a Fungal Rare Item roll' } }, // 0 = roll d6 on the table
]

export interface MagicItem {
  roll: number
  name: string
  /** Original paraphrase of the effect; hooks in the inventory engine. */
  effect: string
  resale: string
  source: string
}

/** Dungeon Magic Treasure Table (FADEE p.158). */
export const MAGIC_TREASURE: MagicItem[] = [
  {
    roll: 1,
    name: 'Wand of Sleep',
    effect: '3 charges; spend 1 to cast Sleep (+L to the roll). Wizards, illusionists and elves only.',
    resale: '30gp per charge',
    source: 'FADEE p.158',
  },
  {
    roll: 2,
    name: 'Ring of Teleportation',
    effect: 'Once: automatically pass a Defense roll by teleporting out of the room; the ring then loses its powers.',
    resale: '50gp unused / d6+1gp used',
    source: 'FADEE p.158',
  },
  {
    roll: 3,
    name: "Fools' Gold",
    effect: 'One-use pouch: automatically satisfies the next Bribe demand.',
    resale: '20gp unused',
    source: 'FADEE p.158',
  },
  {
    roll: 4,
    name: 'Magic Weapon',
    effect: '+1 to Attack rolls. Type: d6 (1 crushing light, 2 slashing light, 3 crushing hand, 4 slashing hand, 5 slashing two-handed, 6 bow).',
    resale: '100gp + 2× cost',
    source: 'FADEE p.158',
  },
  {
    roll: 5,
    name: 'Potion of Healing',
    effect: 'Free action, heals ALL lost Life of one PC. Max 1 per PC per adventure.',
    resale: '100gp',
    source: 'FADEE p.158',
  },
  {
    roll: 6,
    name: 'Fireball Staff',
    effect: '2 charges; spend 1 to cast Fireball (+L, as the caster\u2019s own). Wizards only.',
    resale: '60gp per charge',
    source: 'FADEE p.158',
  },
]

/** Basic spell table for random scrolls (FADEE p.69). */
export const RANDOM_SPELL_TABLE: SpellId[] = [
  'blessing',
  'escape',
  'lightning',
  'fireball',
  'protection',
  'sleep',
]
