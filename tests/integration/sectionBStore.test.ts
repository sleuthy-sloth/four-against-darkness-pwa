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
import { DUNGEON_TRAPS } from '../../src/rulesets/expanded/features'
import { trapLevelFor } from '../../src/engine/features/resolve'
import { lockpickBonus } from '../../src/engine/dungeon/doors'

/**
 * Store-level coverage for the Section B fixes: tile treasure claims
 * (F18), trap disarm (F19), the Tile Content 9 buyPassage gate, the
 * Final Boss treasure (F16), rest door-counting (F12), and the Search
 * Wandering Monsters ambush (F14). Mirrors the doorTreasure harness
 * (fake-indexeddb store, seeded campaign RNG).
 */
async function setupWorld(seed: number) {
  const meta = await createCampaign(`Section B Store Test ${seed}`, seed)
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

/** Arm a one-hit-kill combat on the current tile (major boss when asked). */
function armCombat(dungeon: DungeonState, finalBoss: boolean) {
  const party = useCampaignStore.getState().party
  // Final Bosses are always Major Foes (generate.ts: the boss roll only
  // runs for major profiles) — arm a boss-table Major so the kill lands
  // through life, the way real boss fights resolve.
  const table = finalBoss ? 'boss' : 'vermin'
  const profile = profileFor(table, 1)
  const enemy = makeEnemy(profile, table, 1, 1, 1)
  enemy.isFinalBossFlag = finalBoss
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

describe('tile treasure (R114 rolls 2–3, F18)', () => {
  it('claims plain treasure and spends the tile', async () => {
    const { dungeon } = await setupWorld(101)
    const tile = dungeon.tiles.find((t) => t.id === dungeon.currentTileId)!
    tile.content = { roll: 2, kind: 'treasure' }
    useDungeonStore.setState({ dungeon: { ...dungeon } })

    await useDungeonStore.getState().claimTileTreasure()

    const after = useDungeonStore.getState()
    expect(after.dungeon?.tiles.find((t) => t.id === dungeon.currentTileId)?.content?.kind).toBe('empty')
    expect(after.log.some((l) => l.text.includes('Treasure taken:'))).toBe(true)
    expect(after.dungeon?.pendingChoice ?? null).toBeNull()
  })

  it('trapped treasure offers a disarm, then pays out once disarmed (R132)', async () => {
    const seed = 102
    const { dungeon, party } = await setupWorld(seed)
    const tile = dungeon.tiles.find((t) => t.id === dungeon.currentTileId)!
    tile.content = { roll: 3, kind: 'treasureTrapped' }
    useDungeonStore.setState({ dungeon: { ...dungeon } })

    // Mirror the store's campaign RNG: the claim rolls the trap table
    // (1 die), the disarm rolls one more.
    const mirror = new Rng(seed)
    const trap = DUNGEON_TRAPS[mirror.d(6) - 1]
    const disarmDie = mirror.d(6)
    const rogue = party.find((p) => p.classId === 'rogue')!
    const level = trapLevelFor(trap, 1)
    const willSucceed = disarmDie + lockpickBonus(rogue) >= level

    await useDungeonStore.getState().claimTileTreasure()

    let st = useDungeonStore.getState()
    expect(st.dungeon?.pendingChoice?.kind).toBe('trap')
    expect(st.dungeon?.pendingChoice?.origin).toBe('treasure')
    expect(st.dungeon?.pendingChoice?.trap).toBe(trap)

    await st.answerTrapDisarm(rogue.id)
    st = useDungeonStore.getState()
    expect(st.dungeon?.pendingChoice).toBeNull()
    if (willSucceed) {
      expect(
        st.dungeon?.tiles.find((t) => t.id === dungeon.currentTileId)?.content?.trapDisarmed,
      ).toBe(true)
      expect(st.log.some((l) => l.text.includes('disarms the trap'))).toBe(true)
      // The loot is still claimable after a successful disarm.
      await st.claimTileTreasure()
      st = useDungeonStore.getState()
      expect(st.dungeon?.tiles.find((t) => t.id === dungeon.currentTileId)?.content?.kind).toBe('empty')
    } else {
      expect(st.log.some((l) => l.text.includes('fails to disarm'))).toBe(true)
      expect(
        st.dungeon?.tiles.find((t) => t.id === dungeon.currentTileId)?.content?.trapDisarmed,
      ).not.toBe(true)
    }
  })
})

describe('buyPassage gate (R114 roll 9 / R126)', () => {
  it('refuses on a non-Content-9 tile, spends 2 Clues on a Content-9 tile', async () => {
    const { dungeon, meta } = await setupWorld(103)
    useCampaignStore.setState({ campaign: { ...meta, clues: 2 } })
    const tile = dungeon.tiles.find((t) => t.id === dungeon.currentTileId)!
    expect(tile.contentRoll).not.toBe(9)

    await useDungeonStore.getState().buyPassage('caverns')
    expect(useDungeonStore.getState().error).toMatch(/Tile Content 9/)
    expect(useDungeonStore.getState().dungeon?.environment).toBe('dungeon')

    tile.contentRoll = 9
    useDungeonStore.setState({ dungeon: { ...dungeon }, error: null })
    await useDungeonStore.getState().buyPassage('caverns')
    expect(useDungeonStore.getState().dungeon?.environment).toBe('caverns')
    expect(useCampaignStore.getState().campaign?.clues).toBe(0)
  })
})

describe('Final Boss treasure (R118, F16)', () => {
  it('triples gold or raises it to 100gp on a slain Final Boss', async () => {
    const { dungeon, party } = await setupWorld(104)
    const goldBefore = party.reduce((n, p) => n + p.gold, 0)
    const boss = armCombat(dungeon, true)
    await winByAttack(boss.id)

    const st = useDungeonStore.getState()
    expect(st.log.some((l) => l.text.includes('Final Boss — treasure tripled'))).toBe(true)
    const goldAfter = useCampaignStore.getState().party.reduce((n, p) => n + p.gold, 0)
    expect(goldAfter - goldBefore).toBeGreaterThanOrEqual(100)
  })
})

describe('rest door-counting (R133, F12)', () => {
  it('nails only the door exits — one bag of nails suffices for a room with one door', async () => {
    const { dungeon, party } = await setupWorld(105)
    const tile = dungeon.tiles.find((t) => t.id === dungeon.currentTileId)!
    // One door, the rest plain openings (plus a synthetic opening if the
    // shape has a single exit, so the count discriminates either way).
    tile.exits.forEach((e, i) => {
      e.door = i === 0
    })
    if (tile.exits.length < 2) {
      tile.exits.push({
        id: 'test-open-exit',
        cell: { ...tile.cells[0] },
        edge: 'N',
        door: false,
        toTileId: null,
      })
    }
    expect(tile.exits.length).toBeGreaterThanOrEqual(2)
    expect(tile.exits.filter((e) => e.door).length).toBe(1)
    party[0].equipment.push('bag of nails')
    const nailsBefore = party.reduce((n, p) => n + p.equipment.filter((e) => e === 'bag of nails').length, 0)
    useDungeonStore.setState({ dungeon: { ...dungeon } })

    await useDungeonStore.getState().rest()

    const st = useDungeonStore.getState()
    expect(st.error).toBeNull()
    expect(st.dungeon?.rested).toBe(true)
    const nailsAfter = useCampaignStore
      .getState()
      .party.reduce((n, p) => n + p.equipment.filter((e) => e === 'bag of nails').length, 0)
    expect(nailsAfter).toBe(nailsBefore - 1)
  })
})

describe('Search Wandering Monsters ambush (R123, F14)', () => {
  it('a Search roll of 1 starts a surprise ambush at once', async () => {
    // Seed 7: the campaign RNG's first d6 is 1 (verified against Rng).
    const { dungeon, party } = await setupWorld(7)
    party[0].equipment.push('lantern')
    useDungeonStore.setState({ dungeon: { ...dungeon } })

    await useDungeonStore.getState().search()

    const st = useDungeonStore.getState()
    expect(st.dungeon?.pendingWanderingMonsters).toBeNull()
    expect(st.dungeon?.combat).not.toBeNull()
    expect(st.log.some((l) => l.text.includes('Wandering Monsters attack!'))).toBe(true)
  })
})
