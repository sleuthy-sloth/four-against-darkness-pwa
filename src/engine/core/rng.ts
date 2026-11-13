/**
 * Seeded PRNG + dice utilities (PROJECT_SPEC Part V §8).
 * No Math.random anywhere in game mechanics; every roll is traceable and
 * reproducible from a seed. FADEE dice codes (R002): d3, d6, d6+N, 2d6, d66.
 */
export interface RollRecord {
  id: number
  dice: number
  count: number
  modifier: number
  rolls: number[]
  total: number
  reason: string
}

export class Rng {
  private state: number
  private rollLog: RollRecord[] = []
  private nextId = 1

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** mulberry32 — small, fast, well-documented seeded PRNG. */
  private next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Raw uniform integer in [1, sides]. */
  d(sides: number): number {
    return Math.floor(this.next() * sides) + 1
  }

  /** Roll `count` dice of `sides`, sum + modifier, log the roll. */
  roll(count: number, sides: number, modifier = 0, reason = ''): number {
    const rolls: number[] = []
    for (let i = 0; i < count; i++) rolls.push(this.d(sides))
    const total = rolls.reduce((a, b) => a + b, 0) + modifier
    this.rollLog.push({
      id: this.nextId++,
      dice: sides,
      count,
      modifier,
      rolls,
      total,
      reason,
    })
    return total
  }

  /** Record a roll whose dice are already known (e.g. an exploding chain
   *  rolled die-by-die): the log must show the dice actually rolled, never
   *  a fresh re-roll. */
  record(count: number, sides: number, modifier: number, rolls: number[], reason = ''): number {
    const total = rolls.reduce((a, b) => a + b, 0) + modifier
    this.rollLog.push({
      id: this.nextId++,
      dice: sides,
      count,
      modifier,
      rolls: [...rolls],
      total,
      reason,
    })
    return total
  }

  /** FADEE d3: roll d6, 1-2=1, 3-4=2, 5-6=3 (FADEE p.2). */
  d3(): number {
    return Math.ceil(this.d(6) / 2)
  }

  /** FADEE d66: first die = tens digit, second = units → 11..66 (FADEE p.2). */
  d66(): number {
    return this.d(6) * 10 + this.d(6)
  }

  /** Dice formula parser: "d6", "2d6", "d6+3", "5d6", "d3", or a plain integer. */
  formula(expr: string, reason = ''): number {
    const s = expr.trim()
    if (/^-?\d+$/.test(s)) return parseInt(s, 10)
    const m = /^(\d*)d(\d+)([+-]\d+)?$/.exec(s)
    if (!m) throw new Error(`invalid dice formula: ${expr}`)
    const count = m[1] ? parseInt(m[1], 10) : 1
    const sides = parseInt(m[2], 10)
    const mod = m[3] ? parseInt(m[3], 10) : 0
    return this.roll(count, sides, mod, reason)
  }

  history(): readonly RollRecord[] {
    return this.rollLog
  }

  /** Serializable state for save/restore (PROJECT_SPEC §8 persistence). */
  serialize(): { state: number; nextId: number } {
    return { state: this.state, nextId: this.nextId }
  }

  static deserialize(data: { state: number; nextId: number }): Rng {
    const rng = new Rng(data.state)
    rng.nextId = data.nextId
    return rng
  }
}
