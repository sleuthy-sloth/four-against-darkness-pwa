import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import { tierOf } from '../../src/engine/xp'
import { profileFor } from '../../src/rulesets/expanded/monsters'
import type { Character } from '../../src/rulesets/schema/character'
import {
  applyMajorDamage,
  attackBonusFor,
  defenseBonusFor,
  isGiantTrollOgre,
  makeEnemy,
  meleeWeaponFor,
  pcAttack,
  rollCombatDie,
  rollExplodingD6,
  rollReactions,
  startCombat,
  xpDue,
  type CombatState,
} from '../../src/engine/combat/combat'
import { newDungeon } from '../../src/engine/dungeon/generate'
import { dungeonHcl, useDungeonStore } from '../../src/state/dungeonStore'
import { createParty } from '../../src/engine/characters/create'
import { createCampaign, saveParty } from '../../src/database/repositories/campaignRepo'
import { useCampaignStore } from '../../src/state/campaignStore'

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

describe('R009: exploding dice log the dice actually rolled', () => {
  it('the roll history records the real chain, not a fresh re-roll', () => {
    // Find a seed whose first die explodes, so the chain is multi-die.
    for (let seed = 1; seed < 50; seed++) {
      const r = rng(seed)
      const { rolls, total } = rollExplodingD6(r, 'test explosion')
      if (rolls.length < 2) continue
      const last = r.history()[r.history().length - 1]
      expect(last.rolls).toEqual(rolls)
      expect(last.total).toEqual(total)
      expect(last.count).toBe(rolls.length)
      return
    }
    throw new Error('no exploding seed found in 1..50')
  })

  it('a non-exploding roll also logs its single die', () => {
    const r = rng(4)
    const { rolls, total } = rollCombatDie(
      { tileId: 't', enemies: [], phase: 'pcTurn', round: 0, participants: [], log: [], surprised: false } as CombatState,
      r,
      'test',
    )
    const last = r.history()[r.history().length - 1]
    expect(last.rolls).toEqual(rolls)
    expect(last.total).toEqual(total)
  })
})

describe('R004/R007: level notation and tiers', () => {
  it('tier boundaries are L5/L10/L15/L20', () => {
    expect(tierOf(1)).toBe(1)
    expect(tierOf(4)).toBe(1)
    expect(tierOf(5)).toBe(2)
    expect(tierOf(9)).toBe(2)
    expect(tierOf(10)).toBe(3)
    expect(tierOf(14)).toBe(3)
    expect(tierOf(15)).toBe(4)
    expect(tierOf(19)).toBe(4)
    expect(tierOf(20)).toBe(5)
  })

  it('+½L rounds down (cleric L3 = +1)', () => {
    expect(attackBonusFor(pc('cleric', 'C', { level: 3 })).bonus).toBe(1)
    expect(attackBonusFor(pc('cleric', 'C', { level: 4 })).bonus).toBe(2)
  })
})

describe('R075: situational attack bonuses', () => {
  it('cleric attacks at +L vs undead instead of +½L', () => {
    const undead = makeEnemy(profileFor('minions', 1), 'minions', 3, 1, 1) // Skeletons or Zombies
    const cleric = pc('cleric', 'C', { level: 4 })
    expect(attackBonusFor(cleric).bonus).toBe(2) // +½L with no target
    expect(attackBonusFor(cleric, undead).bonus).toBe(4) // +L vs undead
  })

  it('dwarf gets +1 vs goblins, elf +1 vs orcs', () => {
    const goblins = makeEnemy(profileFor('minions', 2), 'minions', 3, 1, 1)
    const orcs = makeEnemy(profileFor('minions', 4), 'minions', 3, 1, 1)
    expect(attackBonusFor(pc('dwarf', 'D', { level: 2 }), goblins).bonus).toBe(3) // +L +1
    expect(attackBonusFor(pc('dwarf', 'D', { level: 2 }), orcs).bonus).toBe(2) // +L only
    expect(attackBonusFor(pc('elf', 'E', { level: 2 }), orcs).bonus).toBe(3) // +L +1
    expect(attackBonusFor(pc('elf', 'E', { level: 2 }), goblins).bonus).toBe(2) // +L only
  })

  it('elf loses the +L class bonus with a two-handed melee weapon', () => {
    const elf2h = pc('elf', 'E', { level: 2, equipment: ['two-handed weapon', 'light armor'] })
    expect(attackBonusFor(elf2h).bonus).toBe(0)
    const orcs = makeEnemy(profileFor('minions', 4), 'minions', 3, 1, 1)
    expect(attackBonusFor(elf2h, orcs).bonus).toBe(1) // only the +1 vs orcs
  })

  it('two-handed weapons give +1 to any class that wields one', () => {
    expect(meleeWeaponFor(pc('warrior', 'W', { equipment: ['two-handed weapon'] })).mod).toBe(1)
    expect(meleeWeaponFor(pc('barbarian', 'B', { equipment: ['two-handed weapon'] })).mod).toBe(1)
    expect(meleeWeaponFor(pc('warrior', 'W')).mod).toBe(0)
    expect(meleeWeaponFor(pc('rogue', 'R')).mod).toBe(-1)
  })
})

describe('R076/R077: situational defense bonuses', () => {
  it('dwarf +1 and halfling +L vs giant/troll/ogre', () => {
    const ogre = makeEnemy(profileFor('boss', 3), 'boss', 4, 1, 5)
    const trolls = makeEnemy(profileFor('minions', 5), 'minions', 4, 3, 1)
    const dwarf = pc('dwarf', 'D') // light armor +1, shield +1
    expect(defenseBonusFor(dwarf, ogre).bonus).toBe(3) // 2 + 1 vs ogre
    expect(defenseBonusFor(dwarf, trolls).bonus).toBe(3)
    const halfling = pc('halfling', 'H', { level: 3 }) // no armor/shield
    expect(defenseBonusFor(halfling, ogre).bonus).toBe(3) // +L
    expect(defenseBonusFor(halfling, trolls).bonus).toBe(3)
  })

  it('a Giant Spider is an Animal, not a giant — no bonus', () => {
    const spider = makeEnemy(profileFor('weird', 5), 'weird', 4, 1, 5)
    expect(isGiantTrollOgre('Giant Spider')).toBe(false)
    expect(isGiantTrollOgre('Ogre')).toBe(true)
    expect(isGiantTrollOgre('Trolls')).toBe(true)
    expect(isGiantTrollOgre('Hoary Ogre')).toBe(true)
    expect(defenseBonusFor(pc('dwarf', 'D'), spider).bonus).toBe(2) // armor + shield only
  })

  it('noShield drops exactly the shield bonus', () => {
    const warrior = pc('warrior', 'W')
    expect(defenseBonusFor(warrior).bonus).toBe(2)
    expect(defenseBonusFor(warrior, null, { noShield: true }).bonus).toBe(1)
  })
})

describe('R076/R124: a natural 1 always fails defense; surprise strips shields', () => {
  it('a natural 1 fails even when the total beats the Foe L', () => {
    // Seed-search full combats for a defense roll whose first die is 1
    // with bonuses that would otherwise pass: the log must record the
    // failure, never an avoid.
    for (let seed = 1; seed < 400; seed++) {
      const party = [pc('warrior', 'A')] // defense +2 (armor + shield)
      const goblins = [makeEnemy(profileFor('minions', 2), 'minions', 2, 12, 1)]
      const state = startCombat('t', party, goblins, rng(seed))
      state.phase = 'pcTurn'
      for (let round = 0; round < 12 && !state.enemies.every((e) => e.count === 0); round++) {
        state.phase = 'pcTurn'
        if (party[0].status === 'dead') break
        try {
          pcAttack(state, rng(seed * 100 + round), party[0], state.enemies[0].id)
        } catch {
          break
        }
        const idx = state.log.findIndex((l) => l.text.includes('rolled a natural 1: it always fails'))
        if (idx >= 0) {
          // The natural-1 line follows a defense line whose total beat L.
          const defLine = [...state.log.slice(0, idx)].reverse().find((l) => l.text.includes('defense d6[1]'))
          expect(defLine).toBeDefined()
          expect(defLine!.text).toMatch(/needs > L2/)
          return
        }
      }
    }
    throw new Error('no natural-1 defense found in 400 seeds')
  })

  it('a surprised party loses its shield bonus on turn 1', () => {
    // A forced surprise runs the foes' turn at once (ending back on the
    // PCs' turn); the reaction roll may bribe instead, so scan seeds.
    for (let seed = 1; seed < 50; seed++) {
      const party = [pc('warrior', 'A')]
      const goblins = [makeEnemy(profileFor('minions', 2), 'minions', 3, 4, 1)]
      const state = startCombat('t', party, goblins, rng(seed), { forceSurprise: true })
      if (state.phase !== 'pcTurn') continue
      expect(state.log.some((l) => l.text.includes('no shield — surprised'))).toBe(true)
      return
    }
    throw new Error('no surprise-fight seed found in 1..50')
  })
})

describe('R081: a Major Foe weakens only BELOW half Life', () => {
  it('exactly half Life does not weaken; below half does', () => {
    const ogre = makeEnemy(profileFor('boss', 3), 'boss', 4, 1, 4)
    const state = startCombat('t', [pc('warrior', 'A')], [ogre], rng(1))
    applyMajorDamage(state, ogre, 2) // 4 → 2, exactly half
    expect(ogre.life).toBe(2)
    expect(ogre.weakened).toBeFalsy()
    expect(ogre.level).toBe(4)
    applyMajorDamage(state, ogre, 1) // 2 → 1, below half
    expect(ogre.weakened).toBe(true)
    expect(ogre.level).toBe(3)
  })
})

describe('R100/R171/R172: reaction wins and Final Boss XP', () => {
  it('a Reaction win marks the combat as a no-loot win', () => {
    const party = [pc('warrior', 'A'), pc('cleric', 'B'), pc('rogue', 'C'), pc('wizard', 'D')]
    const enemy = makeEnemy(profileFor('minions', 2), 'minions', 3, 2, 1)
    const state = startCombat('t', party, [enemy], rng(1))
    let tries = 0
    while (!enemy.fled && tries < 200) {
      enemy.fled = false
      state.log = []
      rollReactions(state, rng(tries + 1))
      tries++
    }
    expect(enemy.fled).toBe(true)
    expect(state.phase).toBe('won')
    expect(state.noLootWin).toBe(true)
  })

  it('a fled Final Boss earns no boss bonus; a slain one does', () => {
    const boss = makeEnemy(profileFor('boss', 3), 'boss', 4, 1, 5)
    boss.isFinalBossFlag = true
    const state = startCombat('t', [pc('warrior', 'A')], [boss], rng(1))
    boss.fled = true
    expect(xpDue(state).finalBoss).toBe(false)
    boss.fled = false
    boss.life = 0
    expect(xpDue(state).finalBoss).toBe(true)
    expect(xpDue(state).majorSlain).toBe(1)
  })
})

describe('R006: HCL is fixed at first entry, not rescaled by levelling', () => {
  it('newDungeon stores the entry HCL', () => {
    const dungeon = newDungeon('campaign-1', new Rng(5), 3)
    expect(dungeon.hcl).toBe(3)
  })

  it('dungeonHcl prefers the stored HCL over the current party max', () => {
    const dungeon = newDungeon('campaign-1', new Rng(5), 1)
    const party = [pc('warrior', 'A', { level: 3 }), pc('cleric', 'B', { level: 2 })]
    expect(dungeonHcl(dungeon, party)).toBe(1)
  })

  it('dungeonHcl falls back to the party max for older saves without one', () => {
    const dungeon = newDungeon('campaign-1', new Rng(5), 1)
    delete (dungeon as { hcl?: number }).hcl
    const party = [pc('warrior', 'A', { level: 3 }), pc('cleric', 'B', { level: 2 })]
    expect(dungeonHcl(dungeon, party)).toBe(3)
  })
})

describe('R170: no XP roll to a PC that just levelled', () => {
  async function setupWorld(seed: number) {
    const meta = await createCampaign(`Section A Test ${seed}`, seed)
    const rng = new Rng(seed)
    const party = createParty(
      [
        { name: 'Anya', classId: 'cleric' },
        { name: 'Joss', classId: 'rogue' },
        { name: 'Torsten', classId: 'warrior' },
        { name: 'Fen', classId: 'wizard' },
      ],
      rng,
      meta.id,
    )
    await saveParty(meta.id, party)
    useCampaignStore.setState({ campaign: meta, party, loading: false })
    const dungeon = newDungeon(meta.id, new Rng(seed))
    useDungeonStore.setState({ dungeon, pendingXp: null, log: [], undoStack: [], busy: false, error: null })
    return { meta, party, dungeon }
  }

  it('blocks the just-levelled PC while other survivors remain', async () => {
    const { party, dungeon } = await setupWorld(301)
    const roller = party[0]
    dungeon.lastXpLevelUpPcId = roller.id
    dungeon.pendingXp = { major: 2, minor: false, boss: false }
    useDungeonStore.setState({ dungeon: { ...dungeon }, pendingXp: { major: 2, minor: false, boss: false } })
    await useDungeonStore.getState().spendXpRoll(roller.id)
    // Blocked: no roll consumed, no level change, an error is shown.
    expect(useDungeonStore.getState().pendingXp).toEqual({ major: 2, minor: false, boss: false })
    expect(useDungeonStore.getState().error).toMatch(/just levelled/)
    expect(roller.level).toBe(1)
  })

  it('lets another PC spend the roll in the same batch', async () => {
    const { party, dungeon } = await setupWorld(302)
    dungeon.lastXpLevelUpPcId = party[0].id
    dungeon.pendingXp = { major: 2, minor: false, boss: false }
    useDungeonStore.setState({ dungeon: { ...dungeon }, pendingXp: { major: 2, minor: false, boss: false } })
    await useDungeonStore.getState().spendXpRoll(party[1].id)
    expect(useDungeonStore.getState().pendingXp).toEqual({ major: 1, minor: false, boss: false })
  })

  it('lets the just-levelled PC roll when they are the only survivor', async () => {
    const { party, dungeon } = await setupWorld(303)
    for (const p of party.slice(1)) p.status = 'dead'
    const roller = party[0]
    dungeon.lastXpLevelUpPcId = roller.id
    dungeon.pendingXp = { major: 1, minor: false, boss: false }
    useDungeonStore.setState({ dungeon: { ...dungeon }, pendingXp: { major: 1, minor: false, boss: false } })
    await useDungeonStore.getState().spendXpRoll(roller.id)
    expect(useDungeonStore.getState().pendingXp).toBeNull()
  })
})
