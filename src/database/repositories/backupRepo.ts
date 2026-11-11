import { getDb, type CheckpointRecord, type DungeonRecord, type EventRecord } from '../db'
import type { CampaignMeta } from '../db'
import type { Character } from '../../rulesets/schema/character'
import type { DungeonState } from '../../engine/dungeon/generate'

/**
 * Save management (PROJECT_SPEC §18/§19): full-campaign archives for
 * export/import, named checkpoints, and complete campaign deletion
 * (campaigns + characters + dungeon + events + checkpoints).
 */

export interface CampaignArchive {
  kind: '4ad-campaign'
  version: number
  campaign: CampaignMeta
  characters: Character[]
  dungeon: DungeonState | null
  journal: EventRecord[]
}

export async function exportCampaign(id: string): Promise<CampaignArchive> {
  const db = getDb()
  const campaign = await db.campaigns.get(id)
  if (!campaign) throw new Error(`unknown campaign: ${id}`)
  const [characters, dungeonRows, journal] = await Promise.all([
    db.characters.where('campaignId').equals(id).toArray(),
    db.dungeons.where('id').equals(id).toArray() as Promise<DungeonRecord[]>,
    db.events.where('campaignId').equals(id).toArray(),
  ])
  const dungeon = dungeonRows[0]?.state as DungeonState | null
  return {
    kind: '4ad-campaign',
    version: 1,
    campaign,
    characters,
    dungeon,
    journal,
  }
}

/** Import an archive as a NEW campaign (fresh id) — never overwrites. */
export async function importArchive(archive: CampaignArchive): Promise<string> {
  if (archive?.kind !== '4ad-campaign') throw new Error('not a 4AD campaign export')
  const db = getDb()
  const newId = `camp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const campaign: CampaignMeta = {
    ...archive.campaign,
    id: newId,
    name: `${archive.campaign.name} (imported)`,
    lastModified: Date.now(),
  }
  await db.transaction('rw', db.campaigns, db.characters, db.dungeons, db.events, async () => {
    await db.campaigns.put(campaign)
    await db.characters.bulkPut(
      archive.characters.map((c) => ({ ...c, id: `${newId}-${c.id}`, campaignId: newId })),
    )
    if (archive.dungeon) {
      await db.dungeons.put({ id: newId, state: { ...archive.dungeon, campaignId: newId }, savedAt: Date.now() })
    }
    if (archive.journal.length) {
      await db.events.bulkPut(
        archive.journal.map((e) => ({ ...e, id: `${newId}-${e.timestamp}-${Math.random().toString(36).slice(2, 6)}`, campaignId: newId })),
      )
    }
  })
  return newId
}

// ---------- checkpoints ----------

export async function saveCheckpoint(
  campaignId: string,
  name: string,
  archive: CampaignArchive,
): Promise<void> {
  const db = getDb()
  const rec: CheckpointRecord = { campaignId, name, ts: Date.now(), payload: archive }
  await db.checkpoints.add(rec)
}

export async function listCheckpoints(campaignId: string): Promise<CheckpointRecord[]> {
  const db = getDb()
  const rows = await db.checkpoints.where('campaignId').equals(campaignId).reverse().sortBy('ts')
  return rows
}

/** Restore a checkpoint by overwriting the campaign's current data. */
export async function restoreCheckpoint(checkpointId: number): Promise<string> {
  const db = getDb()
  const cp = await db.checkpoints.get(checkpointId)
  if (!cp) throw new Error('checkpoint not found')
  const a = cp.payload as CampaignArchive
  const campaignId = a.campaign.id
  await db.transaction('rw', db.campaigns, db.characters, db.dungeons, db.events, async () => {
    await db.campaigns.put({ ...a.campaign, lastModified: Date.now() })
    await db.characters.where('campaignId').equals(campaignId).delete()
    await db.characters.bulkPut(a.characters.map((c) => ({ ...c, campaignId })))
    await db.dungeons.where('id').equals(campaignId).delete()
    if (a.dungeon) await db.dungeons.put({ id: campaignId, state: a.dungeon, savedAt: Date.now() })
    await db.events.where('campaignId').equals(campaignId).delete()
    if (a.journal.length) await db.events.bulkPut(a.journal)
  })
  return campaignId
}

export async function deleteCheckpoint(checkpointId: number): Promise<void> {
  const db = getDb()
  await db.checkpoints.delete(checkpointId)
}

/** Delete a campaign and ALL of its rows (dungeon, events, checkpoints). */
export async function deleteCampaignFull(id: string): Promise<void> {
  const db = getDb()
  await db.transaction('rw', db.campaigns, db.characters, db.dungeons, db.events, db.checkpoints, async () => {
    await db.characters.where('campaignId').equals(id).delete()
    await db.dungeons.where('id').equals(id).delete()
    await db.events.where('campaignId').equals(id).delete()
    await db.checkpoints.where('campaignId').equals(id).delete()
    await db.campaigns.delete(id)
  })
}

/** Duplicate a campaign via archive round-trip (fresh id). */
export async function duplicateCampaign(id: string): Promise<string> {
  const archive = await exportCampaign(id)
  archive.campaign = {
    ...archive.campaign,
    name: `${archive.campaign.name} (copy)`,
  }
  const db = getDb()
  const newId = `camp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  await db.transaction('rw', db.campaigns, db.characters, db.dungeons, db.events, async () => {
    await db.campaigns.put({ ...archive.campaign, id: newId, lastModified: Date.now() })
    await db.characters.bulkPut(
      archive.characters.map((c) => ({ ...c, id: `${newId}-${c.id}`, campaignId: newId })),
    )
    if (archive.dungeon) await db.dungeons.put({ id: newId, state: { ...archive.dungeon, campaignId: newId }, savedAt: Date.now() })
    if (archive.journal.length) {
      await db.events.bulkPut(
        archive.journal.map((e) => ({ ...e, id: `${newId}-${e.timestamp}-${Math.random().toString(36).slice(2, 6)}`, campaignId: newId })),
      )
    }
  })
  return newId
}
