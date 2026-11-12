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
