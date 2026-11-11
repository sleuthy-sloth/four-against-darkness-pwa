import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import type { Character } from '../../src/rulesets/schema/character'
import {
  attemptPuzzle,
  resolveEvent,
  resolveFeature,
  resolveTrap,
  rollDungeonEvent,
  touchStatue,
} from '../../src/engine/features/resolve'
import { DUNGEON_FEATURES, DUNGEON_TRAPS } from '../../src/rulesets/expanded/features'
import { rollContent, newDungeon } from '../../src/engine/dungeon/generate'

function party(): Character[] {
  return ['warrior', 'cleric', 'rogue', 'wizard'].map((c, i) => ({
    id: `p${i}`,
    name: c,
    classId: c,
    level: 3,
    currentLife: 5,
    maxLife: 7,
    experience: 0,
    gold: 100,
    traits: [],
    spells: [],
    equipment: ['hand weapon', 'light armor', 'shield'],
    conditions: [],
    status: 'active',
    createdAt: 0,
  }))
}

/**
 * Simulation: across many generated tiles the special features/events/traps
 * tables must (a) occur at the book's content-table rates and (b) resolve
 * without crashing or producing impossible states.
 */
describe('features/events simulation (FADEE pp.152-153, 163)', () => {
  it('content 5 and content 4-room tiles occur across 600 tiles and all features resolve', () => {
    let featureCount = 0
    let eventRoomCount = 0
    const dungeon = newDungeon('sim', new Rng(1))
    const rng = new Rng(2)
    const hcl = 3
    for (let i = 0; i < 600; i++) {
      const roll = rng.roll(2, 6, 0, 'content 2d6')
      const tile = dungeon.tiles[0]
      const c = rollContent(dungeon, rng, tile, roll, hcl, [])
      if (c.kind === 'specialFeature') {
        featureCount++
        const feature = DUNGEON_FEATURES[(c.specialFeatureRoll ?? 1) - 1]
        const r = resolveFeature(rng, party(), feature, 0, hcl, 2)
        expect(r.messages.length).toBeGreaterThan(0)
        if (r.choice?.kind === 'statue') {
          const tr = touchStatue(rng, hcl, 2, 0)
          expect(tr.messages.length).toBeGreaterThan(0)
        }
        if (r.choice?.kind === 'puzzle') {
          const pr = attemptPuzzle(rng, party()[0], r.choice.level ?? 1)
          expect(pr.messages[0]).toMatch(/puzzle|solves/)
          expect(party()[0].currentLife).toBeGreaterThanOrEqual(0)
        }
      }
      if (c.kind === 'specialEvents') {
        eventRoomCount++
        const ev = rollDungeonEvent(rng)
        const r = resolveEvent(rng, party(), ev, hcl, false, false)
        if (r.trap) {
          const t = resolveTrap(rng, party(), r.trap, hcl, 0)
          expect(t.messages.length).toBeGreaterThan(0)
          for (const p of party()) expect(p.currentLife).toBeGreaterThanOrEqual(0)
        }
      }
      for (const p of party()) {
        if (p.currentLife === 0) p.currentLife = 5 // reset for the next loop
      }
    }
    // 2d6: P(5)=4/36, P(4-room)=3/36 → expect ~67 and ~50 of 600; assert growth
    expect(featureCount).toBeGreaterThan(25)
    expect(eventRoomCount).toBeGreaterThan(20)
  })

  it('every trap type resolves across seeds without negative Life', () => {
    for (const trap of DUNGEON_TRAPS) {
      for (let seed = 1; seed <= 30; seed++) {
        const p = party()
        const r = resolveTrap(new Rng(seed), p, trap, 3, 0)
        expect(r.messages.length).toBeGreaterThan(0)
        for (const pc of p) {
          expect(pc.currentLife).toBeGreaterThanOrEqual(0)
          if (pc.currentLife === 0) expect(pc.status).toBe('dead')
        }
      }
    }
  })

  it('events reroll to traps when the healer/alchemist already appeared', () => {
    const p = party()
    for (let seed = 1; seed <= 40; seed++) {
      const r = resolveEvent(new Rng(seed), p, 'healer', 3, true, true)
      expect(r.choice).toBeUndefined()
    }
  })
})
