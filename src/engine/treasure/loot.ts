import type { Rng } from '../core/rng'
import { RANDOM_SPELL_TABLE, TREASURE_TABLE, MAGIC_TREASURE, MAGIC_WEAPON_TYPES, type LootEntry } from '../../rulesets/expanded/treasure'
import { RARE_MUSHROOMS, CAVERN_SPECIAL_ITEMS, FUNGAL_RARE_ITEMS } from '../../rulesets/expanded/environments'
import type { EnvironmentId } from '../../rulesets/expanded/environments'
import type { SpellId } from '../../rulesets/schema/character'

/**
 * Loot resolution (FADEE pp.99, 157-161): roll once per cleared encounter,
 * on the environment's Treasure Table row, applying the Foe's treasure
 * modifier. Gold is pooled to the party; scrolls/magic items are carried
 * by one PC. Release 0.5: cavern/fungal rows (R150), special-item tables
 * (R152-R154), and the Magic Weapon type roll (R151).
 */

export interface LootResult {
  text: string
  gold: number
  scroll?: { spell: SpellId; list?: string }
  magic?: { roll: number; name: string; effect: string; source: string }
  /** Equipment string to grant (magic/special item, mushroom, …). */
  item?: string
  /** Rations granted (fungal row 2). */
  rations?: number
}

/** Treasure modifier from a profile ('+', '++', '-', 'none', number). */
function modToShift(mod: string): number {
  if (mod === '++') return 1
  if (mod === '+') return 1
  if (mod === '-') return -1
  return 0
}

/** Roll a special-item table (d6) and return its equipment string + text. */
export function rollSpecialItem(
  rng: Rng,
  table: 'mushroom' | 'cavern' | 'fungal',
): { item: string; text: string; gold: number } {
  const roll = rng.d(6)
  if (table === 'mushroom') {
    const m = RARE_MUSHROOMS.find((x) => x.roll === roll)!
    if (m.roll === 5) {
      // Purple Truffle: 3-in-6 fake (d6gp); real: 6d6gp (R152).
      const fake = rng.d(6) <= 3
      const gold = fake ? rng.roll(1, 6, 0, 'fake truffle d6gp') : rng.roll(6, 6, 0, 'real truffle 6d6gp')
      return { item: '', text: fake ? `A Purple Truffle — fake! Only ${gold}gp.` : `A real Purple Truffle, worth ${gold}gp!`, gold }
    }
    return { item: m.name, text: `Rare mushroom: ${m.name} — ${m.effect}`, gold: 0 }
  }
  if (table === 'cavern') {
    const m = CAVERN_SPECIAL_ITEMS.find((x) => x.roll === roll)!
    if (m.roll === 1) {
      const gold = rng.roll(3, 6, 3, 'cavern gem 3d6+3gp')
      return { item: '', text: `A cavern gem worth ${gold}gp.`, gold }
    }
    if (m.roll === 4) {
      const gold = rng.roll(1, 6, 0, "adventurer's body gems d6") * 10
      return { item: 'lantern', text: `An adventurer's body: ${gold}gp in gems, plus a lantern (the choice item is taken as a lantern — pick another from the body in the inventory).`, gold }
    }
    return { item: m.name, text: `Caverns special item: ${m.name} — ${m.effect}`, gold: 0 }
  }
  const m = FUNGAL_RARE_ITEMS.find((x) => x.roll === roll)!
  if (m.roll === 1) {
    const gold = rng.roll(2, 6, 2, 'fungal gem 2d6+2gp')
    return { item: '', text: `A fungal gem worth ${gold}gp (or leafsteel armor — take the gem).`, gold }
  }
  if (m.roll === 4) {
    const gold = rng.roll(2, 6, 0, "adventurer's body 2d6gp")
    return { item: 'rope', text: `An adventurer's body: a rope, 2d6 rations and ${gold}gp.`, gold }
  }
  if (m.roll === 5) {
    const angels = rng.d(6)
    return { item: `white angel x${angels}`, text: `A Mushroom Gatherer's Basket with ${angels} white angels — each a ration that heals 2 Life.`, gold: 0 }
  }
  return { item: m.name, text: `Fungal rare item: ${m.name} — ${m.effect}`, gold: 0 }
}

export function rollLoot(rng: Rng, treasureMod: string, env: EnvironmentId = 'dungeon'): LootResult {
  const shift = modToShift(treasureMod)
  const rawRoll = rng.roll(1, 6, shift, `treasure roll (FADEE p.157)`)
  const rowRoll = Math.max(0, Math.min(6, rawRoll))
  const row = TREASURE_TABLE.find((r) => r.roll === rowRoll) ?? TREASURE_TABLE[0]
  const entry: LootEntry =
    env === 'caverns' ? (row.caverns ?? row.dungeon)
    : env === 'fungal' ? (row.fungal ?? row.dungeon)
    : row.dungeon
  const result: LootResult = { text: '', gold: 0 }

  switch (entry.kind) {
    case 'nothing':
      result.text = 'No treasure found. (FADEE p.157)'
      break
    case 'gold': {
      const [count, rest] = splitFormula(entry.gpFormula!)
      const gp = rng.roll(count, 6, 0, `treasure gold (${entry.gpFormula})`) * multiplier(rest)
      result.gold = gp
      result.text = `Treasure: ${gp} gp. (FADEE p.157)`
      break
    }
    case 'rations': {
      const gp = rng.roll(2, 6, 0, 'fungal rations 2d6')
      result.rations = gp
      result.text = `Treasure: ${gp} rations (fungal row 2 — or a Rare Mushroom roll instead).`
      break
    }
    case 'scroll': {
      const list = entry.scrollList ?? 'wizard'
      const spell = RANDOM_SPELL_TABLE[rng.d(6) - 1]
      result.scroll = { spell, list }
      result.text = `Treasure: a ${list === 'wizard' ? 'scroll' : list === 'druid' ? 'bark scroll' : 'prism'} with a random spell — ${spell}! (FADEE p.157)`
      break
    }
    case 'jewel':
    case 'chest': {
      const [count, rest] = splitFormula(entry.gpFormula!)
      const gp = rng.roll(count, 6, 0, `treasure ${entry.kind} (${entry.gpFormula})`) * multiplier(rest)
      result.gold = gp
      result.text = entry.kind === 'chest'
        ? `Treasure: a chest with ${gp} gp. (FADEE p.157)`
        : `Treasure: a jewel worth ${gp} gp. (FADEE p.157)`
      break
    }
    case 'cavernItem': {
      const sp = rollSpecialItem(rng, 'cavern')
      result.item = sp.item || undefined
      result.gold = sp.gold
      result.text = `Treasure: ${sp.text}`
      break
    }
    case 'magic': {
      const roll = rng.d(6)
      // Fungal row 6: Dungeon Magic Treasure OR a Rare Item roll (R150).
      if (env === 'fungal' && roll >= 5) {
        const sp = rollSpecialItem(rng, 'fungal')
        result.item = sp.item || undefined
        result.gold = sp.gold
        result.text = `Treasure: ${sp.text}`
        break
      }
      const item = MAGIC_TREASURE.find((m) => m.roll === roll)!
      if (item.roll === 4) {
        // Magic Weapon: type is a d6 roll (R151).
        const type = MAGIC_WEAPON_TYPES[rng.d(6) - 1]
        const name = `Magic Weapon (+1, ${type})`
        result.magic = { roll: item.roll, name, effect: item.effect, source: item.source }
        result.item = name
        result.text = `Treasure: ${name}! ${item.effect} (${item.source})`
      } else if (item.roll === 5) {
        // Potion of Healing is the same item the outfitter sells; grant it
        // under the inventory name so the combat potion button finds it.
        result.magic = { roll: item.roll, name: item.name, effect: item.effect, source: item.source }
        result.item = 'healing potion'
        result.text = `Treasure: ${item.name}! ${item.effect} (${item.source})`
      } else if (item.roll === 1) {
        result.magic = { roll: item.roll, name: item.name, effect: item.effect, source: item.source }
        result.item = 'Wand of Sleep (3 charges)'
        result.text = `Treasure: ${item.name}! ${item.effect} (${item.source})`
      } else if (item.roll === 6) {
        result.magic = { roll: item.roll, name: item.name, effect: item.effect, source: item.source }
        result.item = 'Fireball Staff (2 charges)'
        result.text = `Treasure: ${item.name}! ${item.effect} (${item.source})`
      } else {
        result.magic = { roll: item.roll, name: item.name, effect: item.effect, source: item.source }
        result.item = item.name
        result.text = `Treasure: ${item.name}! ${item.effect} (${item.source})`
      }
      break
    }
  }
  return result
}

/** '2d6x5' → [2, 5]; 'd6' → [1, 1]. */
function splitFormula(f: string): [number, string] {
  const [dice, mult] = f.split('x')
  const m = /^(\d*)d(\d+)$/.exec(dice)
  const count = m ? (m[1] ? parseInt(m[1], 10) : 1) : parseInt(dice, 10) || 1
  return [count, mult ?? '1']
}
function multiplier(m: string): number {
  const n = parseInt(m, 10)
  return Number.isNaN(n) ? 1 : n
}
