import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import { createParty } from '../../src/engine/characters/create'
import { createCampaign, saveParty } from '../../src/database/repositories/campaignRepo'
import { newDungeon, type DungeonState } from '../../src/engine/dungeon/generate'
import { makeEnemy, type CombatState } from '../../src/engine/combat/combat'
import { profileFor } from '../../src/rulesets/expanded/monsters'
import { QUEST_RETRIEVAL_ITEMS } from '../../src/rulesets/expanded/environments'
import { useCampaignStore } from '../../src/state/campaignStore'
import { useDungeonStore } from '../../src/state/dungeonStore'

/**
 * Quest types 3/4 mechanics (R155/R089, Release 0.5 A2): subdual capture
 * (Sleep or −1 attacks, rope to deliver) and rare-item retrieval (1-in-6
 * per Major Foe slain, delivered unused).
 */
async function setupWorld(seed: number) {
  const meta = await createCampaign(`Quest Test ${seed}`, seed)
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

/** Arm a winnable boss combat (Orc Brute, L1) on the current tile. */
function armBoss(dungeon: DungeonState) {
  const party = useCampaignStore.getState().party
  const profile = profileFor('boss', 2) // Orc Brute — subdual-able (not Undead)
  const enemy = makeEnemy(profile, 'boss', 1, 1, 5)
  const combat: CombatState = {
    tileId: dungeon.currentTileId,
    enemies: [enemy],
    phase: 'pcTurn',
    round: 1,
    participants: party.filter((p) => p.status !== 'dead'),
    log: [],
    surprised: false,
    marchingOrder: party.map((p) => p.id),
  }
  dungeon.combat = combat
  useDungeonStore.setState({ dungeon: { ...dungeon } })
  return enemy
}

async function winBySubdual(enemyId: string, sleepFirst: boolean) {
  const st = () => useDungeonStore.getState()
  const wizard = useCampaignStore.getState().party.find((p) => p.classId === 'wizard')!
  const warrior = useCampaignStore.getState().party.find((p) => p.classId === 'warrior')!
  if (sleepFirst) {
    wizard.spells = ['sleep']
    await st().combatCast(wizard.id, 'sleep', enemyId)
  }
  for (let i = 0; i < 25; i++) {
    if (st().dungeon?.combat?.phase === 'won') return
    const live = useCampaignStore.getState().party.find((p) => p.status !== 'dead')
    if (!live) throw new Error('party wiped before the win')
    await st().combatAttackSubdue(warrior.id, enemyId)
  }
  throw new Error('combat did not resolve to a win')
}

async function winByAttack(enemyId: string) {
  for (let i = 0; i < 25; i++) {
    const st = useDungeonStore.getState()
    if (st.dungeon?.combat?.phase === 'won') return
    const live = useCampaignStore.getState().party.find((p) => p.status !== 'dead')
    if (!live) throw new Error('party wiped before the win')
    await st.combatAttack(live.id, enemyId)
  }
  throw new Error('combat did not resolve to a win')
}

describe('Quest type 3 — "I want it alive" (R155/R089)', () => {
  it('Sleep + subdual attacks capture the target alive; the quest progresses', async () => {
    const { dungeon } = await setupWorld(301)
    dungeon.quest = {
      roll: 3,
      target: 'Orc Brute',
      amount: 0,
      giverTileId: dungeon.currentTileId,
      progress: 0,
      complete: false,
    }
    const enemy = armBoss(dungeon)
    await winBySubdual(enemy.id, true)
    const q = useDungeonStore.getState().dungeon!.quest!
    expect(q.subdued).toBe(true)
    expect(q.progress).toBe(1)
  })

  it('subdual attacks alone (no Sleep) also capture it', async () => {
    const { dungeon } = await setupWorld(302)
    dungeon.quest = {
      roll: 3,
      target: 'Orc Brute',
      amount: 0,
      giverTileId: dungeon.currentTileId,
      progress: 0,
      complete: false,
    }
    const enemy = armBoss(dungeon)
    await winBySubdual(enemy.id, false)
    expect(useDungeonStore.getState().dungeon!.quest!.subdued).toBe(true)
  })

  it('killing a slept target outright does NOT count as a capture', async () => {
    const { dungeon } = await setupWorld(303)
    dungeon.quest = {
      roll: 3,
      target: 'Orc Brute',
      amount: 0,
      giverTileId: dungeon.currentTileId,
      progress: 0,
      complete: false,
    }
    const enemy = armBoss(dungeon)
    const wizard = useCampaignStore.getState().party.find((p) => p.classId === 'wizard')!
    wizard.spells = ['sleep']
    await useDungeonStore.getState().combatCast(wizard.id, 'sleep', enemy.id)
    await winByAttack(enemy.id)
    const q = useDungeonStore.getState().dungeon!.quest!
    expect(q.subdued).toBeFalsy()
    expect(q.progress).toBe(0)
  })

  it('a captured target needs a rope to claim; claiming consumes the rope', async () => {
    const { dungeon } = await setupWorld(304)
    dungeon.quest = {
      roll: 3,
      target: 'Orc Brute',
      amount: 0,
      giverTileId: dungeon.currentTileId,
      progress: 0,
      complete: false,
    }
    const enemy = armBoss(dungeon)
    await winBySubdual(enemy.id, true)
    // Rogue starts with a rope; without one the claim must refuse.
    const rogue = useCampaignStore.getState().party.find((p) => p.classId === 'rogue')!
    rogue.equipment = rogue.equipment.filter((e) => e !== 'rope')
    await useDungeonStore.getState().claimQuest()
    expect(useDungeonStore.getState().dungeon!.quest).not.toBeNull()
    expect(useDungeonStore.getState().error).toMatch(/rope/)
    rogue.equipment.push('rope')
    await useDungeonStore.getState().claimQuest()
    expect(useDungeonStore.getState().dungeon!.pendingChoice?.kind).toBe('questPc')
    const pc = useCampaignStore.getState().party.find((p) => p.status !== 'dead')!
    await useDungeonStore.getState().questPcPick(pc.id)
    // Delivering the captive consumes the rope.
    expect(rogue.equipment).not.toContain('rope')
    expect(useDungeonStore.getState().dungeon!.quest).toBeNull()
  })
})

describe('Quest type 4 — "Bring me that" (R155)', () => {
  it('a slain Major Foe can carry the item (1-in-6); delivering it completes the quest', async () => {
    let found = false
    for (let seed = 310; seed < 340 && !found; seed++) {
      const { dungeon } = await setupWorld(seed)
      const itemName = QUEST_RETRIEVAL_ITEMS[0]
      dungeon.quest = {
        roll: 4,
        target: '',
        amount: 0,
        giverTileId: dungeon.currentTileId,
        progress: 0,
        complete: false,
        itemName,
      }
      const enemy = armBoss(dungeon)
      await winByAttack(enemy.id)
      const st = useDungeonStore.getState()
      if (st.dungeon!.quest!.itemFound) {
        found = true
        const carrier = useCampaignStore
          .getState()
          .party.find((p) => p.equipment.includes(`quest item: ${itemName}`))
        expect(carrier).toBeDefined()
        await st.claimQuest()
        expect(useDungeonStore.getState().dungeon!.pendingChoice?.kind).toBe('questPc')
        const pc = useCampaignStore.getState().party.find((p) => p.status !== 'dead')!
        await useDungeonStore.getState().questPcPick(pc.id)
        // Delivering the item consumes it.
        expect(carrier!.equipment).not.toContain(`quest item: ${itemName}`)
        expect(useDungeonStore.getState().dungeon!.quest).toBeNull()
      }
    }
    expect(found).toBe(true)
  })
})
