import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import { profileFor } from '../../src/rulesets/expanded/monsters'
import type { Character } from '../../src/rulesets/schema/character'
import { makeEnemy, pcAttack, startCombat } from '../../src/engine/combat/combat'
import { newDungeon } from '../../src/engine/dungeon/generate'
import { useDungeonStore } from '../../src/state/dungeonStore'
import { createParty } from '../../src/engine/characters/create'
import { createCampaign, saveParty } from '../../src/database/repositories/campaignRepo'
import { useCampaignStore } from '../../src/state/campaignStore'

/**
 * Rules-verification rulings 5, 8, 9 (FADEE pp.105, 118).
 * Each test is named after the ruling it proves.
 */

const rng = (seed = 1) => new Rng(seed)

function pc(classId: string, name: string, overrides: Partial<Character> = {}): Character {
  const kits: Record<string, string[]> = {
    warrior: ['light armor', 'shield', 'hand weapon'],
    wizard: ['light weapon', 'spellbook', 'writing implements'],
  }
  const maxLife = { warrior: 7, wizard: 3 }[classId]!
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

/**
 * Rng stub serving a fixed sequence of d6 faces, consumed in order by
 * d() (cf. combat.ts's own `{ d: () => 1 } as unknown as Rng` in payBribe).
 * Faces repeat the last value once the sequence runs out, so a combat
 * that rolls more dice than planned still resolves deterministically.
 */
function stubRng(faces: number[]): Rng {
  let i = 0
  const next = () => faces[Math.min(i++, faces.length - 1)]
  return {
    d: () => next(),
    record: (_count: number, _sides: number, _mod: number, rolls: number[]) =>
      rolls.reduce((a, b) => a + b, 0),
    roll: () => next(),
  } as unknown as Rng
}

function finalBoss(level = 5, life = 5) {
  const boss = makeEnemy(profileFor('boss', 3), 'boss', level, 1, life)
  boss.isFinalBossFlag = true
  return boss
}

describe('R105: Final Boss "+1 attack" (FADEE p.105)', () => {
  it('a Final Boss attacks at L+1 — a defense roll that beats L5 still fails', () => {
    const wizard = pc('wizard', 'Fen') // Defense +0, 3 Life
    const boss = finalBoss(5, 5)
    const state = startCombat('t', [wizard], [boss], rng(1), { noExplosions: true })
    state.phase = 'pcTurn'
    // Attack roll 1 (miss), then the boss's attack: defense d6 = 6.
    pcAttack(state, stubRng([1, 6]), wizard, boss.id)
    // 6 beats L5, but the boss attacks at L+1 = 6: 6 does not beat 6.
    expect(wizard.currentLife).toBe(2)
    expect(state.log.some((l) => l.text.includes('Final Boss +1 attack'))).toBe(true)
    expect(state.log.some((l) => l.text.includes('needs > L6'))).toBe(true)
  })

  it('a non-boss L5 foe is still defended against at L5', () => {
    const wizard = pc('wizard', 'Fen')
    const ogre = makeEnemy(profileFor('boss', 3), 'boss', 5, 1, 5)
    const state = startCombat('t', [wizard], [ogre], rng(1), { noExplosions: true })
    state.phase = 'pcTurn'
    pcAttack(state, stubRng([1, 6]), wizard, ogre.id)
    expect(wizard.currentLife).toBe(3) // 6 > 5: avoids the attack
  })

  it('PCs still hit the Final Boss at its base L (Defense stays L)', () => {
    const warrior = pc('warrior', 'Torsten')
    const boss = finalBoss(5, 5)
    const state = startCombat('t', [warrior], [boss], rng(1), { noExplosions: true })
    state.phase = 'pcTurn'
    // Attack d6 = 4, +1 warrior class = 5: hits L5, would miss L6.
    pcAttack(state, stubRng([4, 6]), warrior, boss.id)
    expect(boss.life).toBe(4)
    // Major Foes log damage, not 'Hit!' (that text is Minor-only).
    expect(state.log.some((l) => l.text.includes('takes 1 damage'))).toBe(true)
  })
})

async function setupWorld(seed: number) {
  const meta = await createCampaign(`Rulings Test ${seed}`, seed)
  const rngState = new Rng(seed)
  const party = createParty(
    [
      { name: 'Anya', classId: 'cleric' },
      { name: 'Joss', classId: 'rogue' },
      { name: 'Torsten', classId: 'warrior' },
      { name: 'Fen', classId: 'wizard' },
    ],
    rngState,
    meta.id,
  )
  await saveParty(meta.id, party)
  useCampaignStore.setState({ campaign: meta, party, loading: false })
  const dungeon = newDungeon(meta.id, new Rng(seed))
  useDungeonStore.setState({ dungeon, pendingXp: null, log: [], undoStack: [], busy: false, error: null })
  return { meta, party, dungeon }
}

describe('R173: Old School cost uses the TARGET level (FADEE p.118)', () => {
  it('levelling L4 → L5 costs 400 (Tier 2 of the target level), not 300', async () => {
    const { party, dungeon } = await setupWorld(401)
    const p = party[0]
    p.level = 4
    dungeon.oldSchoolXp = 400
    useDungeonStore.setState({ dungeon: { ...dungeon } })
    await useDungeonStore.getState().spendOldSchoolXp(p.id)
    expect(p.level).toBe(5)
    expect(useDungeonStore.getState().dungeon!.oldSchoolXp).toBe(0)
    expect(useDungeonStore.getState().error).toBeNull()
  })

  it('300 XP is not enough to go L4 → L5', async () => {
    const { party, dungeon } = await setupWorld(402)
    const p = party[0]
    p.level = 4
    dungeon.oldSchoolXp = 300
    useDungeonStore.setState({ dungeon: { ...dungeon } })
    await useDungeonStore.getState().spendOldSchoolXp(p.id)
    expect(p.level).toBe(4)
    expect(useDungeonStore.getState().dungeon!.oldSchoolXp).toBe(300)
    expect(useDungeonStore.getState().error).toMatch(/400/)
  })
})

describe('R174: Slower Advancement — only a NATURAL 6 auto-succeeds (FADEE p.118)', () => {
  it('a boosted total of 6 (die 5 + 1) does NOT auto-succeed', async () => {
    // Seed 2: the campaign RNG's first d6 is 5. The task's literal example
    // (target L5, die 5 + 1) cannot discriminate — a boosted 6 beats
    // current L4 through the normal `roll > L` check under either reading —
    // so this uses current L6 / target L7, where the boosted 6 meets
    // neither `roll > L` nor the natural-6 clause.
    const { party, dungeon } = await setupWorld(2)
    const p = party[0]
    p.level = 6
    dungeon.storedXp = 8 // target L7 (7 XP) + 1 extra
    useDungeonStore.setState({ dungeon: { ...dungeon } })
    await useDungeonStore.getState().spendStoredXp(p.id, 1)
    expect(p.level).toBe(6)
    expect(useDungeonStore.getState().dungeon!.storedXp).toBe(0) // cost still spent
  })

  it('a natural 6 auto-succeeds even when it does not beat L', async () => {
    // Seed 4: the campaign RNG's first d6 is 6.
    const { party, dungeon } = await setupWorld(4)
    const p = party[0]
    p.level = 6
    dungeon.storedXp = 7 // target L7
    useDungeonStore.setState({ dungeon: { ...dungeon } })
    await useDungeonStore.getState().spendStoredXp(p.id)
    expect(p.level).toBe(7)
  })
})
