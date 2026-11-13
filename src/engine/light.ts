import type { Character } from '../rulesets/schema/character'

/**
 * Light & darkness (R093/R094, pp.93, 110; R041 p.146).
 *
 * - A working light = a lantern carried by a living PC, a lit torch with
 *   rooms remaining, a Glittering Crystal (hands-free, R153), or a
 *   Glowmaggot-lit fungal tile. Without one: -2 attack/defense/saves, no
 *   ranged weapons, no Search.
 * - Torch: 6 rooms (R094). Tracked as rooms entered with a lit torch.
 * - Lantern: carried in a hand (or on a shield hook). Bearer killed /
 *   paralyzed / stoned → it drops; picking it up costs 1 turn (R094).
 *
 * DARKVISION (ruling 2026-11-13, owner's best judgement; FADEE p.93):
 * dwarf and elf have darkvision. Halflings do not.
 */
export const DARKVISION_CLASSES: string[] = ['dwarf', 'elf']

export interface LightState {
  hasLight: boolean
  /** What provides the light, if anything. */
  source: 'lantern' | 'torch' | 'crystal' | 'glowmaggots' | 'none'
  /** Living PC carrying the lantern, if any. */
  lanternBearerId: string | null
  /** Is a torch lit right now? */
  torchLit: boolean
  /** Rooms entered with this torch lit (6 = it burns out, R094). */
  torchRooms: number
  /** Has the party's lantern been dropped (bearer fell)? */
  lanternDropped: boolean
  /** Every living PC is darkvision-exempt (no light needed). */
  darkvision: boolean
}

export function computeLight(
  party: Character[],
  opts: {
    torchLit: boolean
    torchRooms: number
    lanternDropped: boolean
    /** Fungal tile lit by Glowmaggots (R175 table: no lantern needed). */
    glowmaggots?: boolean
  },
): LightState {
  const living = party.filter((p) => p.status !== 'dead')
  const lanternBearer = living.find((p) => p.equipment.includes('lantern'))
  const hasCrystal = living.some((p) => p.equipment.includes('Glittering Crystal'))
  const hasTorch = living.some((p) => p.equipment.includes('torch'))
  const darkvision =
    living.length > 0 && living.every((p) => DARKVISION_CLASSES.includes(p.classId))
  let source: LightState['source'] = 'none'
  let hasLight = darkvision
  if (lanternBearer && !opts.lanternDropped) {
    source = 'lantern'
    hasLight = true
  } else if (hasCrystal) {
    source = 'crystal'
    hasLight = true
  } else if (hasTorch && opts.torchLit && opts.torchRooms < 6) {
    source = 'torch'
    hasLight = true
  } else if (opts.glowmaggots) {
    source = 'glowmaggots'
    hasLight = true
  }
  return {
    hasLight,
    source,
    lanternBearerId: lanternBearer?.id ?? null,
    torchLit: hasTorch && opts.torchLit && opts.torchRooms < 6,
    torchRooms: opts.torchRooms,
    lanternDropped: opts.lanternDropped,
    darkvision,
  }
}

/** Darkness penalty (R093/R075/R077): -2 to attack, Defense and Saves. */
export function darknessPenalty(light: LightState): number {
  return light.hasLight ? 0 : -2
}

/** A caster needs a free hand (R041): lantern/torch/magic-item hands are NOT free. */
export function hasFreeHand(pc: Character): boolean {
  const eq = pc.equipment
  // Wand / holy-symbol hands count as free; lantern / torch / other magic
  // items occupy the hand. (Two-handed weapons occupy both — not modelled
  // beyond the weapon modifier; a caster with one is treated as busy.)
  if (eq.includes('lantern') || eq.includes('torch')) return false
  if (eq.some((e) => /Wand of Sleep|Fireball Staff|Ring of Teleportation/.test(e))) return false
  return true
}
