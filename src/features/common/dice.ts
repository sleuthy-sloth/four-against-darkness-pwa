/**
 * Drawn dice (plan item C6): parse a roll out of a log line and render it as
 * a die face. The log keeps its mono numerals; the *moment* of the roll gets
 * a drawn die. Display-only: this reads the engine's own log text, it never
 * rolls anything and never changes a result.
 *
 * Recognised formats (the engine's fixed spellings):
 *   "d6=4"            → single d6, value 4
 *   "d66 = 35"        → d66, tens 3 / units 5
 *   "... explod..."   → exploding chain (oxblood marker only)
 */

export type ParsedRoll =
  | { kind: 'd6'; value: number; exploding: boolean }
  | { kind: 'd66'; tens: number; units: number; exploding: boolean }

export function parseRollFromText(text: string): ParsedRoll | null {
  const exploding = /\bexplod/i.test(text)
  const d66 = /\bd66\s*=\s*([1-6])([1-6])\b/i.exec(text)
  if (d66) {
    return { kind: 'd66', tens: Number(d66[1]), units: Number(d66[2]), exploding }
  }
  const d6 = /\bd6\s*=\s*([1-6])\b/i.exec(text)
  if (d6) {
    return { kind: 'd6', value: Number(d6[1]), exploding }
  }
  return null
}

/**
 * Damage out of a log line (Stream 2 — damage numerals). Display-only:
 * reads the engine's fixed spellings, never rolls anything.
 *   "<Foe> takes 2 damage → 3/5 Life."          → foe damage
 *   "<PC> fails the defense: 1 damage → ..."    → PC damage
 *   "<PC> takes 1 damage → ..."                 → PC damage (flee hits,
 *     the cap's bite)
 * "A natural 1 always fails: 1 damage." names no target, so it parses
 * to null — the grid shake already covers that hit. The caller decides
 * foe-vs-PC by matching `target` against its own name lists.
 */
export function parseDamageFromText(text: string): { target: string; amount: number } | null {
  const defense = /^(.+?) fails the defense: (\d+) damage\b/.exec(text)
  if (defense) return { target: defense[1], amount: Number(defense[2]) }
  const takes = /^(.+?) takes (\d+) damage\b/.exec(text)
  if (takes) return { target: takes[1], amount: Number(takes[2]) }
  return null
}

/**
 * Healing out of a log line (Stream 2 — healing glow + numeral).
 *   "<Cleric> prays for Healing: <PC> recovers 4 Life → ..."
 *   "<PC> drinks a healing potion and recovers ALL 5 lost Life → ..."
 * A wasted potion ("at full Life — it is wasted") carries no number
 * and parses to null.
 */
export function parseHealFromText(text: string): { target: string; amount: number } | null {
  const prayer = /prays for Healing: (.+?) recovers (\d+) Life\b/.exec(text)
  if (prayer) return { target: prayer[1], amount: Number(prayer[2]) }
  const potion = /^(.+?) drinks a healing potion and recovers ALL (\d+)/.exec(text)
  if (potion) return { target: potion[1], amount: Number(potion[2]) }
  return null
}

/**
 * The attacker named on the "X attacks Y: d6[…]" line just before a
 * strike (Stream 2 — the lunge lands on the true attacker, not just
 * the best attacker). Scans back at most 3 lines: a minor-slay can put
 * a "sleeping … dispatched" line between the attack and the "Hit!".
 * A spell's damage line has no attack line before it, so this returns
 * null for casts — the foe still shakes, but no PC lunges.
 */
export function parseAttackerForStrike(lines: string[], strikeIdx: number): string | null {
  for (let i = strikeIdx; i >= Math.max(0, strikeIdx - 3); i--) {
    const m = /^(.+?) attacks (.+): d6\[/.exec(lines[i])
    if (m) return m[1]
  }
  return null
}

/** Pip centres for a d6 face in a 100×100 box (standard layout). */
export function pipsFor(value: number): Array<{ x: number; y: number }> {
  const tl = { x: 28, y: 28 }
  const tr = { x: 72, y: 28 }
  const ml = { x: 28, y: 50 }
  const mr = { x: 72, y: 50 }
  const bl = { x: 28, y: 72 }
  const br = { x: 72, y: 72 }
  const c = { x: 50, y: 50 }
  switch (value) {
    case 1:
      return [c]
    case 2:
      return [tl, br]
    case 3:
      return [tl, c, br]
    case 4:
      return [tl, tr, bl, br]
    case 5:
      return [tl, tr, c, bl, br]
    case 6:
      return [tl, tr, ml, mr, bl, br]
    default:
      return []
  }
}
