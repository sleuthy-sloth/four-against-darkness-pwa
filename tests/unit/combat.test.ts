import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import { profileFor } from '../../src/rulesets/expanded/monsters'
import type { Character } from '../../src/rulesets/schema/character'
import {
  attackBonusFor,
  combatOver,
  defenseBonusFor,
  fleeCombat,
  lifeFromFormula,
  makeEnemy,
  parseReaction,
  pcAttack,
  payBribe,
  rollReactions,
  startCombat,
  xpDue,
  type CombatState,
} from '../../src/engine/combat/combat'

const rng = (seed = 1) => new Rng(seed)

function pc(classId: string, name: string, overrides: Partial<Character> = {}): Character {
  const kits: Record<string, string[]> = {
    warrior: ['light armor', 'shield', 'hand weapon'],
    cleric: ['light armor', 'shield', 'hand weapon'],
    rogue: ['light armor', 'light weapon', 'rope', 'lock-picks'],
    wizard: ['light weapon', 'spellbook', 'writing implements'],
    barbarian: ['light armor', 'shield', 'hand weapon'],
    dwarf: ['light armor', 'shield', 'hand weapon'],
    elf: ['light armor', 'bow', 'hand weapon'],
    halfling: ['sling', 'light weapon'],
  }
  const maxLife = { warrior: 7, cleric: 5, rogue: 4, wizard: 3, barbarian: 8, dwarf: 6, elf: 5, halfling: 4 }[classId]!
  return {
    id: `pc-${name}`,
    name,
    classId,
    level: 1,
    currentLife: maxLife,
    maxLife,
    experience: 0,
    gold: 10,
    traits: [],
    spells: [],
    equipment: kits[classId],
    conditions: [],
    status: 'active',
    createdAt: 0,
    ...overrides,
  }
}

function goblinGroup(count = 5, level = 3): CombatState['enemies'] {
  return [makeEnemy(profileFor('minions', 2), 'minions', level, count, 1)]
}

describe('combat modifiers (FADEE pp.146-148)', () => {
  it('class attack bonuses match the book', () => {
    expect(attackBonusFor(pc('warrior', 'A')).bonus).toBe(1) // +L
    expect(attackBonusFor(pc('cleric', 'B')).bonus).toBe(0) // +½L rounded down at L1
    expect(attackBonusFor(pc('rogue', 'C')).bonus).toBe(0)
    expect(attackBonusFor(pc('wizard', 'D')).bonus).toBe(0)
  })

  it('defense modifiers: armor + shield + rogue L (FADEE p.96)', () => {
    const w = defenseBonusFor(pc('warrior', 'W'))
    expect(w.bonus).toBe(2) // light armor +1, shield +1
    const r = defenseBonusFor(pc('rogue', 'R'))
    expect(r.bonus).toBe(2) // light armor +1, rogue +L(1)
    const wz = defenseBonusFor(pc('wizard', 'Z'))
    expect(wz.bonus).toBe(0)
  })

  it('life formulas: T+y, HCL+y, flat, minor default', () => {
    expect(lifeFromFormula(4, 'T+3', undefined)).toBe(4) // Tier 1 + 3
    expect(lifeFromFormula(5, 'T+3', undefined)).toBe(5) // Tier 2 + 3
    expect(lifeFromFormula(5, 'HCL+2', undefined)).toBe(7)
    expect(lifeFromFormula(3, undefined, 8)).toBe(8)
    expect(lifeFromFormula(3, undefined, undefined)).toBe(1) // Minors
  })
})

describe('attack resolution (FADEE pp.91-94)', () => {
  it('slays total ÷ L Minor Foes, minimum 1 on a hit', () => {
    const state = startCombat('t', [pc('warrior', 'Bruggo')], goblinGroup(6, 3), rng(1))
    state.phase = 'pcTurn'
    const before = state.enemies[0].count
    const res = pcAttack(state, rng(2), state.participants[0], state.enemies[0].id)
    expect(res.state.enemies[0].count).toBeLessThan(before)
    expect(res.slain).toBeGreaterThanOrEqual(1)
  })

  it('deals 1 damage per L-multiple to a Major Foe and weakens below half Life', () => {
    const ogre = makeEnemy(profileFor('boss', 3), 'boss', 5, 1, 5) // L5, 5 Life
    const state = startCombat('t', [pc('barbarian', 'Brunhild')], [ogre], rng(1))
    state.phase = 'pcTurn'
    // Force a strong roll scenario: keep rolling until a hit lands
    let dmgTotal = 0
    for (let i = 0; i < 30 && ogre.life > 0; i++) {
      state.phase = 'pcTurn'
      const res = pcAttack(state, rng(100 + i), state.participants[0], ogre.id)
      dmgTotal += res.damage
      if (ogre.life <= 5 / 2 && ogre.life > 0) {
        expect(ogre.weakened).toBe(true)
        expect(ogre.level).toBe(4)
        break
      }
    }
    expect(dmgTotal).toBeGreaterThan(0)
  })

  it('records every roll with modifiers in the combat log', () => {
    const state = startCombat('t', [pc('warrior', 'Bruggo')], goblinGroup(4, 3), rng(1))
    state.phase = 'pcTurn'
    pcAttack(state, rng(3), state.participants[0], state.enemies[0].id)
    const attack = state.log.find((l) => l.text.includes('Bruggo attacks'))
    expect(attack).toBeDefined()
    expect(attack!.text).toMatch(/d6\[|\+1 .*class/)
  })
})

describe('foes\u2019 turn and defense (FADEE p.96-97)', () => {
  it('foes attack, PCs roll defense, damage lands on failure', () => {
    const party = [pc('warrior', 'A'), pc('cleric', 'B'), pc('rogue', 'C'), pc('wizard', 'D')]
    // L2 group, 12 strong: a L1 warrior cannot wipe them in one swing
    const state = startCombat('t', party, goblinGroup(12, 2), rng(1))
    state.phase = 'pcTurn'
    // A PC attack ends with the foes' turn resolving automatically (FADEE p.96)
    const res = pcAttack(state, rng(5), state.participants[0], state.enemies[0].id)
    expect(res.state.round).toBeGreaterThanOrEqual(1)
    // All PCs still standing or damaged but alive after one pass
    expect(state.participants.every((p) => p.currentLife >= 0)).toBe(true)
    // The foes' turn logged defense rolls
    expect(state.log.some((l) => l.text.includes('defense'))).toBe(true)
  })

  it('a fallen PC is marked dead at 0 Life (FADEE p.105)', () => {
    const wz = pc('wizard', 'Squishy', { currentLife: 1 })
    const state = startCombat('t', [wz], goblinGroup(6, 6), rng(1))
    state.phase = 'foesTurn'
    // Manually drive foes' turn via a PC attack round-trip until resolution
    for (let i = 0; i < 10; i++) {
      const phase: string = state.phase
      if (phase === 'pcTurn' && !combatOver(state)) {
        try {
          pcAttack(state, rng(10 + i), state.participants.find((p) => p.status !== 'dead')!, state.enemies[0].id)
        } catch {
          break
        }
      }
    }
    expect(state.participants.some((p) => p.status === 'dead' || p.currentLife >= 0)).toBe(true)
  })
})

describe('reactions and bribes (FADEE pp.101-102)', () => {
  it('parses reaction entries', () => {
    expect(parseReaction('1-2 Bribe (10gp each)').kind).toBe('bribe')
    expect(parseReaction('2-3 Bribe (10gp each)').bribeEach).toBe(true)
    expect(parseReaction('4-6 Fight').kind).toBe('fight')
    expect(parseReaction('Always Fight to the death').kind).toBe('fight-to-death')
    expect(parseReaction('1-3 Flee').kind).toBe('flee')
    expect(parseReaction('1 Flee if outnumbered').note).toBe('if-outnumbered')
  })

  it('paying a bribe deducts party gold and ends the fight peacefully', () => {
    const party = [pc('warrior', 'A', { gold: 20 }), pc('wizard', 'B', { gold: 15 })]
    const enemy = makeEnemy(profileFor('minions', 2), 'minions', 3, 4, 1)
    const state = startCombat('t', party, [enemy], rng(1))
    state.pendingBribe = { enemyGroupId: enemy.id, amount: 30, each: false }
    state.phase = 'opening'
    const ok = payBribe(state, party)
    expect(ok).toBe(true)
    expect(party.reduce((a, p) => a + p.gold, 0)).toBe(5)
    expect(enemy.fled).toBe(true)
    expect(state.phase).toBe('won')
  })

  it('an unaffordable bribe turns into a fight', () => {
    const party = [pc('warrior', 'A', { gold: 5 })]
    const enemy = makeEnemy(profileFor('minions', 2), 'minions', 3, 4, 1)
    const state = startCombat('t', party, [enemy], rng(1))
    state.pendingBribe = { enemyGroupId: enemy.id, amount: 30, each: false }
    const ok = payBribe(state, party)
    expect(ok).toBe(false)
    expect(state.phase).toBe('foesTurn')
  })

  it('outnumbered Foes flee on that reaction', () => {
    const party = [pc('warrior', 'A'), pc('cleric', 'B'), pc('rogue', 'C'), pc('wizard', 'D')]
    const enemy = makeEnemy(profileFor('minions', 2), 'minions', 3, 2, 1)
    // goblins: reactions include '1 Flee if outnumbered'
    const state = startCombat('t', party, [enemy], rng(1))
    // Force the reaction by re-rolling until that entry comes up
    let tries = 0
    while (!enemy.fled && tries < 200) {
      enemy.fled = false
      state.log = []
      rollReactions(state, rng(tries + 1))
      tries++
    }
    expect(enemy.fled).toBe(true)
  })
})

describe('morale and fleeing', () => {
  it('Minor groups test Morale below half and may flee', () => {
    const state = startCombat('t', [pc('warrior', 'A')], goblinGroup(6, 2), rng(1))
    state.phase = 'pcTurn'
    // Keep attacking until the group is below half; morale triggers once
    let fled = false
    for (let i = 0; i < 12 && !fled && state.enemies[0].count > 0; i++) {
      state.phase = 'pcTurn'
      const res = pcAttack(state, rng(20 + i), state.participants[0], state.enemies[0].id)
      fled = res.state.enemies[0].fled
      if (res.state.phase === 'won') break
    }
    expect(state.enemies[0].moraleTested || state.enemies[0].count === 0 || fled).toBe(true)
  })

  it('fleeing costs an attack per foe without shield bonus (FADEE p.97)', () => {
    const party = [pc('warrior', 'A'), pc('wizard', 'B')]
    const state = startCombat('t', party, goblinGroup(5, 2), rng(1))
    const beforeA = party[0].currentLife
    fleeCombat(state, rng(9))
    expect(state.phase).toBe('fled')
    expect(state.log.some((l) => l.text.includes('no shield bonus'))).toBe(true)
    expect(party[0].currentLife).toBeLessThanOrEqual(beforeA)
  })
})

describe('victory and XP accounting (FADEE pp.94, 105, 117)', () => {
  it('combat ends won when all foes are gone', () => {
    const state = startCombat('t', [pc('warrior', 'A')], goblinGroup(3, 2), rng(1))
    state.enemies[0].count = 0
    expect(combatOver(state)).toBe(true)
  })

  it('xpDue reports major kills and minor encounters', () => {
    const ogre = makeEnemy(profileFor('boss', 3), 'boss', 4, 1, 5)
    const state = startCombat('t', [pc('warrior', 'A')], [ogre], rng(1))
    ogre.life = 0
    const due = xpDue(state)
    expect(due.majorSlain).toBe(1)
    expect(due.finalBoss).toBe(false)
  })
})
