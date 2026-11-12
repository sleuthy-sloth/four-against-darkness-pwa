/**
 * XP systems (Part 14, pp.117-118). Four interchangeable systems; Classical
 * is the default and the only one implemented before Release 0.5.
 *
 * - classical: 1 roll per Major Foe (+1 Final Boss), 1 per 10 Minor
 *   encounters, 1 per Secret (R171). Rolls are made when earned; the player
 *   picks which PC rolls; d6 > L (6 always) levels up (R170).
 * - slow: no rolls — 1 Level to one surviving PC per successful adventure
 *   (R172). "Successful" = the Final Boss is slain; the level is assigned
 *   from the victory card, like a Classical roll.
 * - oldSchool: tally XP — Minor Foes = sum of their L ×10 (Vermin halved),
 *   Major Foes = L×10 + 5 per Life, +1 XP per gp collected (R173).
 *   Level-up/skill costs (Tier+2)×100. No same PC twice in a row unless
 *   sole survivor. Non-combat XP rolls become Tier×100 XP.
 * - slower: Classical earning, but XP is stored as points; spending XP =
 *   target level + an XP roll (+1 per extra XP spent) (R174). Tier
 *   training costs 500/1000/2500/5000gp for T2-5. Skill costs (current L
 *   XP + 100×L gp) are OUT of core scope — expert skills are not in this
 *   build (R175) — so that part is not implemented; see report.
 */

export type XpSystem = 'classical' | 'slow' | 'oldSchool' | 'slower'

export const XP_SYSTEMS: Array<{ id: XpSystem; name: string; blurb: string }> = [
  { id: 'classical', name: 'Classical', blurb: 'XP rolls when earned: 1 per Major Foe, 1 per 10 Minor encounters, 1 per Secret.' },
  { id: 'slow', name: 'Slow and Sure', blurb: 'No rolls: 1 Level to one surviving PC per successful adventure.' },
  { id: 'oldSchool', name: 'Old School', blurb: 'Tally XP from Foes and gold; spend (Tier+2)×100 XP to level up.' },
  { id: 'slower', name: 'Slower Advancement', blurb: 'Classical earning, XP stored as points; spend the target level in XP to roll for a level.' },
]

export function tierOf(level: number): number {
  if (level >= 20) return 5
  if (level >= 15) return 4
  if (level >= 10) return 3
  if (level >= 5) return 2
  return 1
}

/** Old School level-up cost (R173): (Tier+2)×100, Tier of the PC's level. */
export function oldSchoolLevelCost(level: number): number {
  return (tierOf(level) + 2) * 100
}

/** Slower Advancement tier-training cost in gp (R174), for levelling INTO a tier. */
export function tierTrainingCost(newLevel: number): number {
  if (newLevel === 5) return 500
  if (newLevel === 10) return 1000
  if (newLevel === 15) return 2500
  if (newLevel === 20) return 5000
  return 0
}

/** XP value of one defeated Foe group under Old School (R173). */
export function oldSchoolFoeXp(
  isMajor: boolean,
  isVermin: boolean,
  level: number,
  life: number,
  count: number,
): number {
  if (isMajor) return level * 10 + 5 * life
  const per = level * 10
  const total = per * count
  return isVermin ? Math.floor(total / 2) : total
}
