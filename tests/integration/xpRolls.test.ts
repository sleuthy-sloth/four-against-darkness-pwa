import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import { createParty } from '../../src/engine/characters/create'
import { createCampaign, saveParty } from '../../src/database/repositories/campaignRepo'
import { newDungeon } from '../../src/engine/dungeon/generate'
import { makeEnemy, type CombatState } from '../../src/engine/combat/combat'
import { profileFor } from '../../src/rulesets/expanded/monsters'
import { useCampaignStore } from '../../src/state/campaignStore'
import { useDungeonStore } from '../../src/state/dungeonStore'
import type { DungeonState } from '../../src/engine/dungeon/generate'

/**
 * XP-roll lifecycle (FADEE p.117): a roll earned in one fight must be
 * assigned before the party leaves the victory — never silently dropped,
 * never auto-rolled, never resurfaced on a later fight's card.
 *
 * Reproduces the lingering-roll quirk: before the fix, both exits
 * (explore() and leaveCombat()) cleared the combat while pendingXp stayed
 * set, so the roll either resurfaced on a later fight's card or was
 * silently overwritten by the next win. Release 0.5 (A6) also fixed the
 * other half: scroll/reaction wins never awarded XP or loot at all — now
 * every victory path awards through the same helper.
 */
async function setupWorld(seed: number) {
  const meta = await createCampaign(`XP Test ${seed}`, seed)
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

/** Arm a one-hit-kill combat on the current tile (no startCombat reactions). */
function armCombat(dungeon: DungeonState, major: boolean) {
  const party = useCampaignStore.getState().party
  const profile = major ? profileFor('boss', 1) : profileFor('vermin', 1)
  const enemy = makeEnemy(profile, major ? 'boss' : 'vermin', 1, 1, 1)
  enemy.isFinalBossFlag = false
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

async function winByAttack(enemyId: string) {
  for (let i = 0; i < 20; i++) {
    const st = useDungeonStore.getState()
    if (st.dungeon?.combat?.phase === 'won') return
    const live = useCampaignStore.getState().party.find((p) => p.status !== 'dead')
    if (!live) throw new Error('party wiped before the win')
    await st.combatAttack(live.id, enemyId)
  }
  throw new Error('combat did not resolve to a win')
}

describe('XP rolls are assigned before leaving a victory (FADEE p.117)', () => {
  it('refuses both exits while an XP roll is unspent', async () => {
    const { party, dungeon } = await setupWorld(101)
    const enemy = armCombat(dungeon, true)
    await winByAttack(enemy.id)
    const st = useDungeonStore.getState()
    expect(st.dungeon?.combat?.phase).toBe('won')
    expect(st.pendingXp).toEqual({ major: 1, minor: false, boss: false })

    // "Back to the room" must not clear the victory while a roll is due.
    await useDungeonStore.getState().leaveCombat()
    expect(useDungeonStore.getState().dungeon?.combat).not.toBeNull()
    expect(useDungeonStore.getState().pendingXp).toEqual({ major: 1, minor: false, boss: false })

    // A map exit must not either.
    const tileBefore = useDungeonStore.getState().dungeon!.currentTileId
    const exitId = useDungeonStore
      .getState()
      .dungeon!.tiles.find((t) => t.id === tileBefore)!.exits[0].id
    await useDungeonStore.getState().explore(exitId)
    expect(useDungeonStore.getState().dungeon?.currentTileId).toBe(tileBefore)
    expect(useDungeonStore.getState().dungeon?.combat).not.toBeNull()
    expect(useDungeonStore.getState().pendingXp).toEqual({ major: 1, minor: false, boss: false })
    void party
  })

  it('lets the player leave once every roll is assigned', async () => {
    const { dungeon } = await setupWorld(102)
    const enemy = armCombat(dungeon, true)
    await winByAttack(enemy.id)
    expect(useDungeonStore.getState().pendingXp).toEqual({ major: 1, minor: false, boss: false })

    const pc = useCampaignStore.getState().party.find((p) => p.status !== 'dead')!
    await useDungeonStore.getState().spendXpRoll(pc.id)
    expect(useDungeonStore.getState().pendingXp).toBeNull()

    await useDungeonStore.getState().leaveCombat()
    expect(useDungeonStore.getState().dungeon?.combat).toBeNull()

    const tileBefore = useDungeonStore.getState().dungeon!.currentTileId
    const exitId = useDungeonStore
      .getState()
      .dungeon!.tiles.find((t) => t.id === tileBefore)!.exits[0].id
    await useDungeonStore.getState().explore(exitId)
    expect(useDungeonStore.getState().dungeon?.currentTileId).not.toBe(tileBefore)
  })

  it('a scroll-won fight awards its own XP roll (Release 0.5, A6)', async () => {
    const { dungeon } = await setupWorld(103)
    const enemy1 = armCombat(dungeon, true)
    await winByAttack(enemy1.id)
    expect(useDungeonStore.getState().pendingXp).toEqual({ major: 1, minor: false, boss: false })

    const pc = useCampaignStore.getState().party.find((p) => p.status !== 'dead')!
    await useDungeonStore.getState().spendXpRoll(pc.id)
    await useDungeonStore.getState().leaveCombat()
    expect(useDungeonStore.getState().pendingXp).toBeNull()

    // Second fight, won by fireball scroll — before 0.5 this path never
    // awarded XP at all, so a roll here could only have been a stale one.
    // Now the scroll-kill earns its own roll, exactly one.
    const wizard = useCampaignStore.getState().party.find((p) => p.classId === 'wizard')!
    wizard.equipment.push('scroll of fireball')
    const enemy2 = armCombat(dungeon, true)
    await useDungeonStore.getState().combatCastScroll(wizard.id, 'fireball', enemy2.id)
    expect(useDungeonStore.getState().dungeon?.combat?.phase).toBe('won')
    expect(useDungeonStore.getState().pendingXp).toEqual({ major: 1, minor: false, boss: false })
  })

  it('a reaction win (foes flee) awards NO loot but still counts the minor tally (R100/R171)', async () => {
    // Vermin roll 1 flees on 1-3: brute-force seeds until the reaction roll
    // flees. A single minor win earns no immediate roll in the Classical
    // system (1 roll per 10 minor encounters) — its award is the tally
    // increment. Loot is NOT rolled: a Reaction Flee is "vanish, no
    // treasure" (FADEE p.101); treasure on fleeing Foes (p.99) is for
    // Foes that break off mid-combat (Morale), not for a Reaction win.
    let won = false
    for (let seed = 200; seed < 240 && !won; seed++) {
      const { dungeon } = await setupWorld(seed)
      const party = useCampaignStore.getState().party
      const profile = profileFor('vermin', 1)
      const enemy = makeEnemy(profile, 'vermin', 1, 3, 1)
      const combat: CombatState = {
        tileId: dungeon.currentTileId,
        enemies: [enemy],
        phase: 'opening',
        round: 1,
        participants: party.filter((p) => p.status !== 'dead'),
        log: [],
        surprised: false,
        marchingOrder: party.map((p) => p.id),
      }
      dungeon.combat = combat
      useDungeonStore.setState({ dungeon: { ...dungeon }, pendingXp: null })
      await useDungeonStore.getState().combatWait()
      const st = useDungeonStore.getState()
      if (st.dungeon?.combat?.phase === 'won') {
        won = true
        expect(st.dungeon.minorEncountersTally).toBe(1)
        // No treasure roll on a Reaction win (R100); the log says so.
        expect(st.log.some((l) => l.text.includes('No treasure'))).toBe(true)
        expect(st.log.some((l) => l.text.includes('Treasure:'))).toBe(false)
        // No roll is due yet, so leaving is allowed.
        await useDungeonStore.getState().leaveCombat()
        expect(useDungeonStore.getState().dungeon?.combat).toBeNull()
      }
    }
    expect(won).toBe(true)
  })

  it('a reaction win on the 10th minor encounter earns the roll and gates the exit', async () => {
    let won = false
    for (let seed = 200; seed < 240 && !won; seed++) {
      const { dungeon } = await setupWorld(seed)
      const party = useCampaignStore.getState().party
      const profile = profileFor('vermin', 1)
      const enemy = makeEnemy(profile, 'vermin', 1, 3, 1)
      const combat: CombatState = {
        tileId: dungeon.currentTileId,
        enemies: [enemy],
        phase: 'opening',
        round: 1,
        participants: party.filter((p) => p.status !== 'dead'),
        log: [],
        surprised: false,
        marchingOrder: party.map((p) => p.id),
      }
      dungeon.combat = combat
      dungeon.minorEncountersTally = 9
      useDungeonStore.setState({ dungeon: { ...dungeon }, pendingXp: null })
      await useDungeonStore.getState().combatWait()
      const st = useDungeonStore.getState()
      if (st.dungeon?.combat?.phase === 'won') {
        won = true
        expect(st.pendingXp).toEqual({ major: 1, minor: true, boss: false })
        await useDungeonStore.getState().leaveCombat()
        expect(useDungeonStore.getState().dungeon?.combat).not.toBeNull()
      }
    }
    expect(won).toBe(true)
  })

  it('a second major win earns exactly one roll, never stacking on the first', async () => {
    const { dungeon } = await setupWorld(104)
    const enemy1 = armCombat(dungeon, true)
    await winByAttack(enemy1.id)
    const pc = useCampaignStore.getState().party.find((p) => p.status !== 'dead')!
    await useDungeonStore.getState().spendXpRoll(pc.id)
    await useDungeonStore.getState().leaveCombat()

    const enemy2 = armCombat(dungeon, true)
    await winByAttack(enemy2.id)
    expect(useDungeonStore.getState().pendingXp).toEqual({ major: 1, minor: false, boss: false })
  })

  it('an unspent roll survives a reload of the dungeon', async () => {
    const { dungeon } = await setupWorld(105)
    const enemy = armCombat(dungeon, true)
    await winByAttack(enemy.id)
    expect(useDungeonStore.getState().pendingXp).toEqual({ major: 1, minor: false, boss: false })

    // Simulate a page reload: drop the in-memory store, reload from Dexie.
    useDungeonStore.setState({ dungeon: null, pendingXp: null })
    await useDungeonStore.getState().ensureDungeon()
    expect(useDungeonStore.getState().pendingXp).toEqual({ major: 1, minor: false, boss: false })
    expect(useDungeonStore.getState().dungeon?.combat?.phase).toBe('won')

    // And the gate still holds after the reload.
    await useDungeonStore.getState().leaveCombat()
    expect(useDungeonStore.getState().dungeon?.combat).not.toBeNull()
  })
})
