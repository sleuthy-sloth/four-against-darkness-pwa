import type { Character } from '../../rulesets/schema/character'
import type { MonsterProfile } from '../../rulesets/expanded/monsters'

/**
 * Magic-item & trinket effects (R151-R154, pp.158-161). Verified reading
 * first: before 0.5, loot.ts granted magic items as plain equipment strings
 * with no engine hooks anywhere (the treasure.ts comment said "hooks in
 * the inventory engine" — there were none). The hooks live here.
 *
 * Equipment encoding: charged items carry their charges in the string,
 * e.g. 'Wand of Sleep (3 charges)'. Counts in parentheses are the single
 * source of truth; helpers below read/write them.
 */

export function chargesOf(pc: Character, prefix: string): number {
  const item = pc.equipment.find((e) => e.startsWith(prefix))
  if (!item) return 0
  const m = /\((\d+) charges?\)/.exec(item)
  return m ? parseInt(m[1], 10) : 1
}

export function setCharges(pc: Character, prefix: string, charges: number): void {
  const idx = pc.equipment.findIndex((e) => e.startsWith(prefix))
  if (idx < 0) return
  if (charges <= 0) {
    pc.equipment.splice(idx, 1)
    return
  }
  pc.equipment[idx] = `${prefix} (${charges} ${charges === 1 ? 'charge' : 'charges'})`
}

export function hasItem(pc: Character, name: string): boolean {
  return pc.equipment.some((e) => e === name || e.startsWith(`${name} (`))
}

export function removeItem(pc: Character, name: string): boolean {
  const idx = pc.equipment.findIndex((e) => e === name || e.startsWith(`${name} (`))
  if (idx < 0) return false
  pc.equipment.splice(idx, 1)
  return true
}

/** Wand of Sleep (R151): wizards, illusionists and elves only. */
export function canUseWand(pc: Character): boolean {
  return (
    (pc.classId === 'wizard' || pc.classId === 'illusionist' || pc.classId === 'elf') &&
    chargesOf(pc, 'Wand of Sleep') > 0
  )
}

/** Fireball Staff (R151): wizards only, 2 charges. */
export function canUseStaff(pc: Character): boolean {
  return pc.classId === 'wizard' && chargesOf(pc, 'Fireball Staff') > 0
}

/** Ring of Teleportation (R151): once, auto-pass a Defense roll by leaving combat. */
export function hasRing(pc: Character): boolean {
  return pc.equipment.includes('Ring of Teleportation')
}

/** Fools' Gold (R151): one use, auto-satisfies the next Bribe demand. */
export function hasFoolsGold(party: Character[]): Character | undefined {
  return party.find((p) => p.equipment.includes("Fools' Gold"))
}

/** Magic Weapon (R151): +1 Attack while carried. */
export function magicWeaponBonus(pc: Character): number {
  return pc.equipment.some((e) => e.startsWith('Magic Weapon')) ? 1 : 0
}

/** Potion of Healing is already wired: the combat potion button covers it
 * (drinkHealingPotion, 1/PC/adventure, free action). Loot now grants it
 * under the inventory name 'healing potion' so the button finds it. */
export function hasHealingPotion(pc: Character): boolean {
  return pc.equipment.includes('healing potion')
}

// ---------- Rare Mushrooms (R152) ----------

/** Slumber Amanita: +Tier to a Sleep casting. Consumed on use. */
export function useSlumberAmanita(pc: Character): boolean {
  return removeItem(pc, 'Slumber Amanita')
}

/** Puffball Smokebomb: free-action drop; the party flees unattacked. */
export function useSmokebomb(pc: Character): boolean {
  return removeItem(pc, 'Puffball Smokebomb')
}

/** Brown Cap Delight: 1 ration, or 3 as a bribe. */
export function useBrownCap(pc: Character): boolean {
  if (!removeItem(pc, 'Brown Cap Delight')) return false
  pc.equipment.push('rations')
  return true
}

/** Phoenix Mushroom: +1 Defense/Saves for 3 tiles, then lose 1 Life. */
export function usePhoenix(pc: Character): boolean {
  if (!removeItem(pc, 'Phoenix Mushroom')) return false
  pc.conditions.push('phoenix:3')
  return true
}

/** Healer's Chanterelle: full heal. Expires at the end of the adventure. */
export function useChanterelle(pc: Character): { healed: number } | null {
  if (!removeItem(pc, "Healer's Chanterelle")) return null
  const healed = pc.maxLife - pc.currentLife
  pc.currentLife = pc.maxLife
  return { healed }
}

// ---------- Cavern special items (R153) ----------

/** Miners' Amulet: the position-1 wearer ignores 1 trap once/adventure. */
export function amuletUnused(pc: Character): boolean {
  return pc.equipment.includes("Miners' Amulet") && !pc.conditions.includes('amulet-used')
}
export function spendAmulet(pc: Character): void {
  pc.conditions.push('amulet-used')
}

/** Miners' Ointment: once, ignore a Wandering Monsters arrival or gremlins. */
export function hasOintment(party: Character[]): Character | undefined {
  return party.find((p) => p.equipment.includes("Miners' Ointment"))
}

// ---------- Fungal rare items (R154) ----------

/** Xicthul's Cap: thrown, d3 damage automatically; the thrower takes 1 damage. */
export function useXicthulCap(pc: Character): boolean {
  return removeItem(pc, "Xicthul's Cap")
}

/** Red Death: thrown, 1 damage or -1 L to living Foes for 1 turn. */
export function useRedDeath(pc: Character): boolean {
  return removeItem(pc, 'Red Death')
}

/** Morel Crusher: force a Morale roll at -1, once. */
export function useMorelCrusher(pc: Character): boolean {
  return removeItem(pc, 'Morel Crusher')
}

/** White angels (Basket, R154): each a ration that heals 2 Life. */
export function whiteAngelCount(pc: Character): number {
  const item = pc.equipment.find((e) => e.startsWith('white angel x'))
  if (!item) return 0
  return parseInt(item.replace('white angel x', ''), 10) || 0
}
export function eatWhiteAngel(pc: Character): boolean {
  const idx = pc.equipment.findIndex((e) => e.startsWith('white angel x'))
  if (idx < 0) return false
  const n = whiteAngelCount(pc)
  if (n <= 1) pc.equipment.splice(idx, 1)
  else pc.equipment[idx] = `white angel x${n - 1}`
  pc.currentLife = Math.min(pc.maxLife, pc.currentLife + 2)
  return true
}

// ---------- Subdual (R089, p.99) ----------

/**
 * Subdual is impossible vs Unliving, hordes, Vermin, and pain-immune
 * creatures. The engine knows table kind + category; "hordes" (a profile
 * with a very large group) has no data marker, so it is not checked here.
 */
export function isSubdualImmune(profile: MonsterProfile, tableKind: string): boolean {
  if (tableKind === 'vermin') return true
  if (/Unliving|Undead/.test(profile.category)) return true
  if (/pain-immune|immune to pain/i.test(profile.special.join(' '))) return true
  if (/Artificial/.test(profile.category) && /no pain|feels no pain/i.test(profile.special.join(' '))) return true
  return false
}
