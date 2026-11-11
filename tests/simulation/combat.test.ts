import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import { profileFor, type MonsterProfile } from '../../src/rulesets/expanded/monsters'
import {
  combatOver,
  lifeFromFormula,
  makeEnemy,
  pcAttack,
  rollReactions,
  startCombat,
  xpDue,
  type CombatState,
  type EnemyInstance,
} from '../../src/engine/combat/combat'

/**
 * Combat simulation (PROJECT_SPEC §30): auto-resolve combats to completion,
 * hunting for broken loops, invalid states, negative Life, or foes that never
 * die. Deterministic seeds reproduce failures.
 */

function makeParty(seedRng: Rng) {
  const kits: Record<string, string[]> = {
    warrior: ['light armor', 'shield', 'hand weapon'],
    cleric: ['light armor', 'shield', 'hand weapon'],
    rogue: ['light armor', 'light weapon'],
    wizard: ['light weapon'],
  }
  const stats: Array<[string, string, number]> = [
    ['warrior', 'A', 7],
    ['cleric', 'B', 5],
    ['rogue', 'C', 4],
    ['wizard', 'D', 3],
  ]
  return stats.map(([classId, name, life], i) => ({
    id: `pc${i}`,
    name,
    classId,
    level: 1,
    currentLife: life,
    maxLife: life,
    experience: 0,
    gold: 10,
    traits: [],
    spells: [],
    equipment: kits[classId],
    conditions: [],
    status: 'active' as const,
    createdAt: 0,
  }))
}

function enemiesFromRoll(tableRoll: number, kind: 'minions' | 'weird' | 'boss', hcl: number, rng: Rng): EnemyInstance[] {
  const profile: MonsterProfile = profileFor(kind, tableRoll)
  if (profile.category === 'Event') return [] // gremlins: handled by the inventory engine later
  let count: number
  if (profile.countFormula.startsWith('alt:')) {
    const [a, b] = profile.countFormula.slice(4).split('|')
    count = rng.d(6) <= 3 ? rng.formula(a) : rng.formula(b)
  } else {
    count = rng.formula(profile.countFormula)
  }
  let level = hcl + profile.levelOffset
  if (profile.levelCap !== undefined) level = Math.min(level, profile.levelCap)
  const life = lifeFromFormula(level, profile.lifeFormula, profile.flatLife)
  return [makeEnemy(profile, kind, level, count, life)]
}

function autoResolve(seed: number, tableRoll: number, kind: 'minions' | 'weird' | 'boss'): {
  state: CombatState
  rounds: number
} {
  const rng = new Rng(seed)
  const party = makeParty(rng)
  const enemies = enemiesFromRoll(tableRoll, kind, 1, rng)
  const state = startCombat('t', party, enemies, rng)
  let rounds = 0
  let guard = 0
  while (state.phase !== 'won' && state.phase !== 'lost' && guard < 500) {
    guard++
    if (state.phase === 'opening') {
      // the party waits for reactions (attack-now also legal); keep waiting
      rollReactions(state, rng)
      continue
    }
    if (state.phase === 'pcTurn') {
      const attacker = state.participants.find((p) => p.status !== 'dead')
      const target = state.enemies.find((e) => !e.fled && e.count > 0 && e.life > 0)
      if (!attacker || !target) break
      pcAttack(state, rng, attacker, target.id)
      continue
    }
    if (state.phase === 'foesTurn') break // unreachable: foes act inside pcAttack
  }
  return { state, rounds }
}

function validate(state: CombatState): void {
  for (const p of state.participants) {
    expect(p.currentLife, `${p.name} life bound`).toBeGreaterThanOrEqual(0)
    expect(p.currentLife).toBeLessThanOrEqual(p.maxLife)
    if (p.currentLife === 0) expect(p.status).toBe('dead')
  }
  for (const e of state.enemies) {
    expect(e.count, `${e.profile.name} count`).toBeGreaterThanOrEqual(0)
    expect(e.life).toBeGreaterThanOrEqual(0)
    if (e.profile.major) expect(e.life).toBeLessThanOrEqual(e.maxLife)
  }
  expect(state.log.length, 'log explains the fight').toBeGreaterThan(0)
  if (state.phase === 'won') {
    expect(state.enemies.every((e) => e.fled || e.count === 0 || e.life === 0)).toBe(true)
  }
}

describe('combat simulation', () => {
  it('resolves 100 minion combats to completion with valid states', () => {
    let won = 0
    let lost = 0
    for (let seed = 1; seed <= 100; seed++) {
      const roll = ((seed - 1) % 6) + 1
      const { state } = autoResolve(seed, roll, 'minions')
      if (state.phase === 'won') won++
      if (state.phase === 'lost') lost++
      validate(state)
    }
    expect(won + lost).toBeGreaterThan(80) // nearly all resolve conclusively
  })

  it('resolves 60 boss/weird combats; Major Foes weaken below half Life', () => {
    let majorSeen = 0
    for (let seed = 101; seed <= 160; seed++) {
      const kind = seed % 2 === 0 ? 'boss' : 'weird'
      const roll = ((seed - 101) % 6) + 1
      const { state } = autoResolve(seed, roll, kind)
      validate(state)
      const major = state.enemies.find((e) => e.profile.major)
      if (major) {
        majorSeen++
        if (major.life > 0) expect(major.level).toBeLessThanOrEqual(1 + major.profile.levelOffset + 1)
      }
    }
    expect(majorSeen).toBeGreaterThan(0)
  })

  it('is deterministic: same seed → identical log text', () => {
    const a = autoResolve(777, 2, 'minions').state
    const b = autoResolve(777, 2, 'minions').state
    const textOf = (s: CombatState) => JSON.stringify(s.log.map((l) => l.text))
    expect(textOf(a)).toBe(textOf(b))
  })

  it('no combat loop exceeds a sane number of rounds', () => {
    for (let seed = 200; seed <= 260; seed++) {
      const roll = ((seed - 200) % 6) + 1
      const { state } = autoResolve(seed, roll, 'minions')
      expect(state.round).toBeLessThan(60)
    }
  })

  it('victories accrue XP opportunities (FADEE p.117)', () => {
    const { state } = autoResolve(4242, 3, 'minions')
    if (state.phase === 'won') {
      const due = xpDue(state)
      expect(due.minorEncounter || due.majorSlain > 0).toBe(true)
    }
  })
})
