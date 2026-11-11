import type { Rng } from '../core/rng'
import { RANDOM_SPELL_TABLE, TREASURE_TABLE, MAGIC_TREASURE, type LootEntry } from '../../rulesets/expanded/treasure'
import type { SpellId } from '../../rulesets/schema/character'

/**
 * Loot resolution (FADEE pp.99, 157-158): roll once per cleared encounter,
 * on the Treasure Table, applying the Foe's treasure modifier. Gold is
 * pooled to the party; scrolls/magic items are carried by one PC.
 */

export interface LootResult {
  text: string
  gold: number
  scroll?: { spell: SpellId }
  magic?: { roll: number; name: string; effect: string; source: string }
}

/** Treasure modifier from a profile ('+', '++', '-', 'none', number). */
function modToShift(mod: string): number {
  if (mod === '++') return 1
  if (mod === '+') return 1
  if (mod === '-') return -1
  return 0
}

export function rollLoot(rng: Rng, treasureMod: string): LootResult {
  const shift = modToShift(treasureMod)
  const rawRoll = rng.roll(1, 6, shift, `treasure roll (FADEE p.157)`)
  const rowRoll = Math.max(0, Math.min(6, rawRoll))
  const row = TREASURE_TABLE.find((r) => r.roll === rowRoll) ?? TREASURE_TABLE[0]
  const entry: LootEntry = row.dungeon
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
    case 'scroll': {
      const spell = RANDOM_SPELL_TABLE[rng.d(6) - 1]
      result.scroll = { spell }
      result.text = `Treasure: a scroll with a random spell — ${spell}! (FADEE p.157)`
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
    case 'magic': {
      const roll = rng.d(6)
      const item = MAGIC_TREASURE.find((m) => m.roll === roll)!
      result.magic = { roll: item.roll, name: item.name, effect: item.effect, source: item.source }
      result.text = `Treasure: ${item.name}! ${item.effect} (${item.source})`
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
