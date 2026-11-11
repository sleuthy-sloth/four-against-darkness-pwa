import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'

describe('seeded RNG (PROJECT_SPEC §8)', () => {
  it('produces identical sequences from the same seed', () => {
    const a = new Rng(42)
    const b = new Rng(42)
    const seqA = Array.from({ length: 20 }, () => a.d(6))
    const seqB = Array.from({ length: 20 }, () => b.d(6))
    expect(seqA).toEqual(seqB)
  })

  it('stays within dice bounds', () => {
    const rng = new Rng(7)
    for (let i = 0; i < 500; i++) {
      const v = rng.d(6)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
    }
  })

  it('implements FADEE d3 (p.2): 1-2→1, 3-4→2, 5-6→3', () => {
    const rng = new Rng(1)
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const v = rng.d3()
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(3)
      seen.add(v)
    }
    expect(seen).toEqual(new Set([1, 2, 3]))
  })

  it('implements FADEE d66 (p.2): tens then units, 11..66', () => {
    const rng = new Rng(3)
    for (let i = 0; i < 100; i++) {
      const v = rng.d66()
      expect(v).toBeGreaterThanOrEqual(11)
      expect(v).toBeLessThanOrEqual(66)
      expect(v % 10).not.toBe(0)
    }
  })

  it('parses dice formulas and logs every roll with a reason', () => {
    const rng = new Rng(9)
    const total = rng.formula('2d6+1', 'test roll')
    expect(total).toBeGreaterThanOrEqual(3)
    expect(total).toBeLessThanOrEqual(13)
    const log = rng.history()
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ dice: 6, count: 2, modifier: 1, reason: 'test roll' })
    expect(log[0].rolls).toHaveLength(2)
  })

  it('round-trips serialized state', () => {
    const a = new Rng(1234)
    a.d(6)
    a.d(6)
    const snapshot = a.serialize()
    const b = Rng.deserialize(snapshot)
    expect(Array.from({ length: 10 }, () => a.d(6))).toEqual(
      Array.from({ length: 10 }, () => b.d(6)),
    )
  })

  it('rejects invalid formulas', () => {
    const rng = new Rng(5)
    expect(() => rng.formula('2xd6')).toThrow(/invalid dice formula/)
  })
})
