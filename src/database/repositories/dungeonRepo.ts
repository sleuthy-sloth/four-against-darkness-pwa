import { getDb, type DungeonRecord } from '../db'
import type { DungeonState } from '../../engine/dungeon/generate'

/** Dungeon persistence (PROJECT_SPEC §18): one JSON blob per campaign. */

export async function saveDungeon(campaignId: string, state: DungeonState): Promise<void> {
  const rec: DungeonRecord = { id: campaignId, state, savedAt: Date.now() }
  await getDb().transaction('rw', getDb().dungeons, async () => {
    await getDb().dungeons.put(rec)
  })
}

export async function loadDungeon(campaignId: string): Promise<DungeonState | null> {
  const rec = await getDb().dungeons.get(campaignId)
  return rec ? (rec.state as DungeonState) : null
}

export async function deleteDungeon(campaignId: string): Promise<void> {
  await getDb().dungeons.delete(campaignId)
}
