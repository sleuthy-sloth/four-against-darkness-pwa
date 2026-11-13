import type { Character } from '../../rulesets/schema/character'
import type { Rng } from '../core/rng'
import { clericPrayersLeft } from '../combat/combat'
import { CORE_CLASSES } from '../../rulesets/expanded/coreClasses'

/**
 * Resting (FADEE pp.113-114): once per adventure, in a cleared room whose
 * adjacent tiles are explored and cleared, with one bag of nails spent per
 * door. Each PC recovers 1 Life or 1 spent ability (spell/prayer). A 1-in-6
 * Wandering Monsters roll happens AFTER recovery; nailed doors mean the
 * party attacks first even if the Foes would surprise them.
 */

export interface RestOptions {
  /** Doors on this tile (each needs a bag of nails). */
  doorCount: number
  /** Whether every adjacent tile is explored and cleared. */
  neighborsCleared: boolean
  /** Current tile is a cleared room (not corridor, not entrance). */
  tileCleared: boolean
  /** Bags of nails held by the party. */
  nailsHeld: number
  alreadyRested: boolean
}

export function canRest(opts: RestOptions): { ok: boolean; reason?: string } {
  if (opts.alreadyRested) return { ok: false, reason: 'The party already rested this adventure (FADEE p.114).' }
  if (!opts.tileCleared) return { ok: false, reason: 'Resting requires a room cleared of Foes (FADEE p.114).' }
  if (!opts.neighborsCleared) return { ok: false, reason: 'All adjacent rooms or corridors must be explored and cleared (FADEE p.114).' }
  if (opts.doorCount === 0) return { ok: false, reason: 'The room must have doors to nail shut (FADEE p.114).' }
  if (opts.nailsHeld < opts.doorCount) {
    return { ok: false, reason: `Nailing ${opts.doorCount} doors needs ${opts.doorCount} bags of nails (4gp each, FADEE pp.85, 114) — the party holds ${opts.nailsHeld}.` }
  }
  return { ok: true }
}

export interface RestOutcome {
  messages: string[]
  /** PC ids that must each choose: Life or a spent ability. */
  pendingPcIds: string[]
}

/** Consume nails and roll recovery eligibility (per-PC choice is UI-driven). */
export function beginRest(
  party: Character[],
  doorCount: number,
): RestOutcome {
  const messages: string[] = []
  // Remove one bag of nails per door from the party pool.
  let nails = doorCount
  for (const pc of party) {
    while (nails > 0) {
      const idx = pc.equipment.indexOf('bag of nails')
      if (idx < 0) break
      pc.equipment.splice(idx, 1)
      nails -= 1
    }
    if (nails === 0) break
  }
  messages.push(
    `The party rests: ${doorCount} door${doorCount === 1 ? '' : 's'} nailed shut. (FADEE p.114)`,
  )
  // PCs with something to recover choose Life or ability.
  const pendingPcIds = party
    .filter((p) => p.status !== 'dead' && (p.currentLife < p.maxLife || hasSpentAbility(p)))
    .map((p) => p.id)
  return { messages, pendingPcIds }
}

/** A PC has a spent ability if a memorized spell slot is empty vs. their L. */
export function hasSpentAbility(pc: Character): boolean {
  // Spell slots = class base + (L - 1) — level-ups grant +1 slot (FADEE p.117).
  if (pc.classId === 'wizard' || pc.classId === 'elf' || pc.classId === 'cleric') {
    const def = CORE_CLASSES.find((d) => d.id === pc.classId)
    const slots = (def?.spellSlots ?? 1) + (pc.level - 1)
    if (pc.classId === 'cleric') {
      // Clerics recover prayers, not wizard spell slots: their spells array
      // is always empty, so the slot check below would wrongly flag every
      // L2+ cleric as having a spent ability even at full prayers.
      const { healing, blessing } = clericPrayersLeft(pc)
      return healing < 3 || blessing < 3
    }
    return pc.spells.length < slots
  }
  return false
}

/** Apply one PC's recovery choice. */
export function applyRestChoice(
  pc: Character,
  choice: 'life' | 'spell' | 'prayer-healing' | 'prayer-blessing',
  rng: Rng,
): string {
  if (choice === 'life') {
    if (pc.currentLife < pc.maxLife) {
      pc.currentLife += 1
      return `${pc.name} recovers 1 Life (${pc.currentLife}/${pc.maxLife}). (FADEE p.114)`
    }
    return `${pc.name} is already at full Life — the rest is wasted for them. (FADEE p.114)`
  }
  if (choice === 'spell') {
    // Re-memorize only if a slot is actually free (FADEE p.114).
    if (!hasSpentAbility(pc)) {
      return `${pc.name} has no free spell slot to re-memorize into. (FADEE p.114)`
    }
    // Re-memorize the first spent spell from the class's basic list.
    const basics = pc.classId === 'elf'
      ? ['sleep', 'fireball', 'lightning', 'protection', 'escape'] // no Blessing (divine law, p.67)
      : ['blessing', 'escape', 'lightning', 'fireball', 'protection', 'sleep']
    const missing = basics.find((s) => !pc.spells.includes(s as Character['spells'][number]))
    if (missing) {
      pc.spells.push(missing as Character['spells'][number])
      return `${pc.name} re-memorizes ${missing} while resting. (FADEE p.114)`
    }
    return `${pc.name} has no spent spell to re-memorize. (FADEE p.114)`
  }
  // Prayer recovery (cleric, FADEE pp.28, 114): +1 back, max 3.
  const kind = choice === 'prayer-healing' ? 'healing' : 'blessing'
  const left = clericPrayersLeft(pc)[kind]
  if (left < 3) {
    pc.conditions = pc.conditions.filter((c) => !c.startsWith(`prayer:${kind}:`))
    pc.conditions.push(`prayer:${kind}:${left + 1}`)
    return `${pc.name} regains 1 ${kind === 'healing' ? 'Healing' : 'Blessing'} prayer during rest (${left + 1} left). (FADEE p.114)`
  }
  return `${pc.name} has no spent ${kind === 'healing' ? 'Healing' : 'Blessing'} prayers. (FADEE p.114)`
}
