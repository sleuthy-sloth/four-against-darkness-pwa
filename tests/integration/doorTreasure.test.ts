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
 * +1 treasure behind a sealed or iron door (R129): one extra loot roll
 * on the encounter beyond such a door — spent on the FIRST victory in
 * that tile, not on every later victory there (e.g. a Wandering
 * Monsters ambush while passing through).
 */
async function setupWorld(seed: number) {
  const meta = await createCampaign(`Door Treasure Test ${seed}`, seed)
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

/** Arm a one-hit-kill minor combat on the current tile (no XP roll due). */
function armCombat(dungeon: DungeonState) {
  const party = useCampaignStore.getState().party
  const profile = profileFor('vermin', 1)
  const enemy = makeEnemy(profile, 'vermin', 1, 1, 1)
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

describe('bonus treasure behind a sealed/iron door (R129)', () => {
  it('grants the extra roll on the first victory only', async () => {
    const { dungeon } = await setupWorld(77)
    const tile = dungeon.tiles.find((t) => t.id === dungeon.currentTileId)!
    tile.bonusTreasure = true

    const first = armCombat(dungeon)
    await winByAttack(first.id)
    const logAfterFirst = useDungeonStore.getState().log
    expect(logAfterFirst.some((l) => l.text.includes('(+1 treasure'))).toBe(true)
    expect(tile.bonusTreasure).toBeUndefined()

    const second = armCombat(dungeon)
    await winByAttack(second.id)
    const newLines = useDungeonStore.getState().log.slice(logAfterFirst.length)
    expect(newLines.some((l) => l.text.includes('(+1 treasure'))).toBe(false)
  })
})
