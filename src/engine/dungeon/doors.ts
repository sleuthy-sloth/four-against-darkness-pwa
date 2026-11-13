import type { Rng } from '../core/rng'
import type { Character } from '../../rulesets/schema/character'
import { tierOf } from '../xp'
import type { PlacedExit, PlacedTile } from './generate'

/**
 * Locked doors (R129-R131) and the door table (2d6, rolled per door at
 * tile generation).
 *
 * A door is rolled only for exits with `door: true` — plain openings can
 * never lock. The roll is deterministic under the seeded RNG, so the map
 * can show the door's state before the party reaches it. Older saves
 * whose exits carry no `doorInfo` default to unlocked: `doorNeedsAction`
 * is false and the map renders them as plain closed doors.
 *
 * Honest gaps vs the ledger (R129-R131 name classes this build does not
 * have — only warrior, barbarian, elf, dwarf, cleric, rogue, halfling
 * and wizard exist):
 * - Lockpicking classes: only rogue exists here, so only rogues pick.
 * - Illusionary door: the illusionist spellcasting roll can never be
 *   exercised; only the 3-Clues option works.
 * - Lever door: the gnome gadget point can never be exercised; only the
 *   1-Clue option works.
 * - Halfling Luck: the build has no Luck-spend economy (the halfling
 *   class def only carries a `luckPoints: true` data flag nothing reads),
 *   so the R129 Luck reroll is not wired to anything.
 * - "Good lock-picks 25 (+1)": no such item exists anywhere in this
 *   build's data (no price list carries it), so no +1 is applied for
 *   carrying lock-picks; R131 names classes only, no item requirement.
 * - Sealed door level: the ledger says "roll vs door L" without giving
 *   the sealed door's L; this build uses HCL+d6, the same generation
 *   pattern as iron and locked doors.
 * - Sealed door roll of 1: the ledger says "caster takes 2 damage OR
 *   Wandering Monsters"; this build takes the deterministic reading
 *   (caster takes 2 damage).
 * - Trapped door Save target: the ledger does not say who saves; this
 *   build uses the party leader, matching the engine's trapdoor and
 *   bear-trap conventions.
 * - Lever-door withdrawal benefit ("no Foe strikes"): the flee flow
 *   carries no exit, so there is no grounded way to know the party fled
 *   through the lever door; only the Clue-open part is implemented.
 * - Iron door spell: a memorized Lightning/Fireball slot is spent.
 *   Scrolls are not accepted — there is no out-of-combat scroll cast in
 *   this build.
 */

export type DoorKind =
  | 'sealed'
  | 'iron'
  | 'illusionary'
  | 'locked'
  | 'unlocked'
  | 'trapped'
  | 'lever'

export interface DoorInfo {
  kind: DoorKind
  /** Door level L (HCL+d6 at generation for iron/locked/trapped/sealed;
      HCL for illusionary's spellcasting roll; 0 for unlocked/lever). */
  level: number
  /** The door has been opened by one of the book's options. */
  open?: boolean
  /** A lockpick attempt failed — R131: failure means the door must be bashed. */
  pickFailed?: boolean
  /** The trapped door's trap was disarmed (rogue). */
  disarmed?: boolean
  /** Sealed-door spellcasting attempts used (one attempt per door). */
  attempts?: number
}

/** Roll the 2d6 door table (R129) for one door exit. */
export function rollDoor(rng: Rng, hcl: number): DoorInfo {
  const roll = rng.roll(2, 6, 0, 'door table 2d6')
  const level = hcl + rng.d(6)
  switch (roll) {
    case 2:
      return { kind: 'sealed', level }
    case 3:
      return { kind: 'iron', level }
    case 4:
      return { kind: 'illusionary', level: hcl }
    case 5:
    case 6:
      return { kind: 'locked', level }
    case 11:
      return { kind: 'trapped', level }
    case 12:
      return { kind: 'lever', level: 0 }
    default:
      return { kind: 'unlocked', level: 0 }
  }
}

/**
 * Roll doors for every door exit on a freshly placed tile. `skipExitId`
 * is the back exit onto the tile the party came from — it shares the
 * traversed door and is linked by the caller, not rolled fresh.
 */
export function rollDoorsForTile(tile: PlacedTile, rng: Rng, hcl: number, skipExitId?: string): void {
  for (const exit of tile.exits) {
    if (!exit.door || exit.doorInfo || exit.id === skipExitId) continue
    exit.doorInfo = rollDoor(rng, hcl)
  }
}

/** Does tapping this exit need a door action before the party can pass? */
export function doorNeedsAction(exit: PlacedExit): boolean {
  const info = exit.doorInfo
  if (!exit.door || !info || info.open) return false
  return info.kind !== 'unlocked'
}

/** Doors behind which the book grants +1 treasure (R129). */
export function doorGrantsBonusTreasure(info: DoorInfo | undefined): boolean {
  return info?.kind === 'sealed' || info?.kind === 'iron'
}

export function doorLabel(info: DoorInfo): string {
  switch (info.kind) {
    case 'sealed':
      return `Magically sealed door (L${info.level})`
    case 'iron':
      return `Iron door (L${info.level})`
    case 'illusionary':
      return 'Illusionary door'
    case 'locked':
      return `Locked door (L${info.level})`
    case 'unlocked':
      return 'Unlocked door'
    case 'trapped':
      return `Trapped door (trap L${info.level})`
    case 'lever':
      return 'Lever door'
  }
}

export function hasTrait(pc: Character, name: string): boolean {
  return pc.traits.some((t) => t.name === name)
}

/**
 * Rogue lockpicking / trap-disarming bonus (Rogue, p.60): +L always,
 * +Tier with the Delicate Touch trait.
 */
export function lockpickBonus(pc: Character): number {
  return pc.level + (hasTrait(pc, 'Delicate Touch') ? tierOf(pc.level) : 0)
}

/** Bash bonus (R130): +L for barbarians and warriors, nobody else. */
export function bashBonus(pc: Character): number {
  return pc.classId === 'barbarian' || pc.classId === 'warrior' ? pc.level : 0
}

/**
 * Leader's Save bonus vs a door trap, borrowed from the engine's
 * trapdoor/bear-trap convention: rogues +L, halflings and elves +1.
 */
export function trapSaveBonus(pc: Character): number {
  let bonus = 0
  if (pc.classId === 'rogue') bonus += pc.level
  if (pc.classId === 'halfling' || pc.classId === 'elf') bonus += 1
  return bonus
}

export interface DoorAttempt {
  success: boolean
  /** Natural d6 shown (1 matters: bashing attracts Wandering Monsters). */
  die: number
  total: number
  target: number
  messages: string[]
  /** Wandering Monsters attracted (bash natural 1, R130). */
  wanderingMonsters?: boolean
}

function attempt(rng: Rng, bonus: number): { die: number; total: number } {
  const die = rng.d(6)
  return { die, total: die + bonus }
}

/** Lockpicking (R131): rogue Save vs door L; failure means bash it. */
export function attemptLockpick(rng: Rng, pc: Character, exit: PlacedExit): DoorAttempt {
  const info = exit.doorInfo!
  const bonus = lockpickBonus(pc)
  const { die, total } = attempt(rng, bonus)
  if (total >= info.level) {
    info.open = true
    return {
      success: true,
      die,
      total,
      target: info.level,
      messages: [
        `${pc.name} picks the lock (d6 ${die} +${bonus} = ${total} vs L${info.level}) — the door swings open.`,
      ],
    }
  }
  info.pickFailed = true
  return {
    success: false,
    die,
    total,
    target: info.level,
    messages: [
      `${pc.name} fails to pick the lock (d6 ${die} +${bonus} = ${total} vs L${info.level}) — the door must be bashed now.`,
    ],
  }
}

/** Bashing (R130): Save vs door L, repeatable; a natural 1 attracts Wandering Monsters. */
export function attemptBash(rng: Rng, pc: Character, exit: PlacedExit): DoorAttempt {
  const info = exit.doorInfo!
  const bonus = bashBonus(pc)
  const { die, total } = attempt(rng, bonus)
  if (total >= info.level) {
    info.open = true
    return {
      success: true,
      die,
      total,
      target: info.level,
      messages: [
        `${pc.name} bashes the door down (d6 ${die}${bonus ? ` +${bonus}` : ''} = ${total} vs L${info.level}).`,
      ],
    }
  }
  const naturalOne = die === 1
  return {
    success: false,
    die,
    total,
    target: info.level,
    wanderingMonsters: naturalOne,
    messages: [
      naturalOne
        ? `${pc.name} bashes at the door and rolls a 1 (d6 ${die}${bonus ? ` +${bonus}` : ''} = ${total} vs L${info.level}) — the noise attracts Wandering Monsters!`
        : `${pc.name} bashes at the door (d6 ${die}${bonus ? ` +${bonus}` : ''} = ${total} vs L${info.level}) — it holds. Try again.`,
    ],
  }
}

/**
 * Sealed door (R129): a spellcaster rolls d6+L vs door L, one attempt.
 * A natural 1 costs the caster 2 Life (deterministic reading of the
 * ledger's "2 damage OR Wandering Monsters").
 */
export function attemptSealed(rng: Rng, pc: Character, exit: PlacedExit): DoorAttempt {
  const info = exit.doorInfo!
  info.attempts = (info.attempts ?? 0) + 1
  const { die, total } = attempt(rng, pc.level)
  if (die === 1) {
    pc.currentLife = Math.max(0, pc.currentLife - 2)
    if (pc.currentLife === 0) pc.status = 'dead'
    return {
      success: false,
      die,
      total,
      target: info.level,
      messages: [
        `${pc.name} rolls a 1 against the sealed door — the wards lash back for 2 Life (${pc.currentLife}/${pc.maxLife}).`,
      ],
    }
  }
  if (total >= info.level) {
    info.open = true
    return {
      success: true,
      die,
      total,
      target: info.level,
      messages: [
        `${pc.name} breaks the seal (d6 ${die} +${pc.level} = ${total} vs L${info.level}) — the door opens.`,
      ],
    }
  }
  return {
    success: false,
    die,
    total,
    target: info.level,
    messages: [
      `${pc.name} fails against the seal (d6 ${die} +${pc.level} = ${total} vs L${info.level}) — the one attempt is spent.`,
    ],
  }
}

/** Rogue disarm of a trapped door (R129): Save vs trap L. */
export function attemptDisarm(rng: Rng, pc: Character, exit: PlacedExit): DoorAttempt {
  const info = exit.doorInfo!
  const bonus = lockpickBonus(pc)
  const { die, total } = attempt(rng, bonus)
  if (total >= info.level) {
    info.disarmed = true
    info.open = true
    return {
      success: true,
      die,
      total,
      target: info.level,
      messages: [
        `${pc.name} disarms the trap (d6 ${die} +${bonus} = ${total} vs L${info.level}) — the door opens safely.`,
      ],
    }
  }
  return {
    success: false,
    die,
    total,
    target: info.level,
    messages: [
      `${pc.name} fails to disarm the trap (d6 ${die} +${bonus} = ${total} vs L${info.level}) — opening it now triggers the trap.`,
    ],
  }
}

/**
 * The trapped door's trap fires (R129): the leader Saves vs trap L or
 * loses 1 Life. Called when the door is opened without a successful
 * disarm — either no rogue is available, or the disarm failed.
 */
export function triggerDoorTrap(rng: Rng, leader: Character, exit: PlacedExit): DoorAttempt {
  const info = exit.doorInfo!
  info.open = true
  const bonus = trapSaveBonus(leader)
  const { die, total } = attempt(rng, bonus)
  if (total >= info.level) {
    return {
      success: true,
      die,
      total,
      target: info.level,
      messages: [
        `The trap fires as the door opens — ${leader.name} Saves (d6 ${die}${bonus ? ` +${bonus}` : ''} = ${total} vs L${info.level}) and avoids it.`,
      ],
    }
  }
  leader.currentLife = Math.max(0, leader.currentLife - 1)
  if (leader.currentLife === 0) leader.status = 'dead'
  return {
    success: false,
    die,
    total,
    target: info.level,
    messages: [
      `The trap fires as the door opens — ${leader.name} fails the Save (d6 ${die}${bonus ? ` +${bonus}` : ''} = ${total} vs L${info.level}) and loses 1 Life (${leader.currentLife}/${leader.maxLife}).`,
    ],
  }
}
