import { getDb, type CampaignMeta, type CharacterRecord } from '../db'
import type { Character } from '../../rulesets/schema/character'

/**
 * Campaign persistence (PROJECT_SPEC Part VI §17-18). Transactional writes;
 * lastModified bumped on every mutation. Export/import arrive in Phase 6.
 *
 * A fixed seed always yields the same base id (`camp-<seed36>`), so scenario
 * and tutorial campaigns — which reuse a fixed seed — pass a unique
 * `idSuffix`, or a second start would overwrite the first campaign.
 */

export async function createCampaign(
  name: string,
  seed: number,
  opts?: { idSuffix?: string; scenarioId?: string; tutorial?: CampaignMeta['tutorial']; clues?: number },
): Promise<CampaignMeta> {
  const db = getDb()
  const meta: CampaignMeta = {
    id: `camp-${seed.toString(36)}${opts?.idSuffix ? `-${opts.idSuffix}` : ''}`,
    name: name.trim() || 'New Campaign',
    ruleset: 'fadee-expanded',
    seed,
    rngState: JSON.stringify({ state: seed >>> 0, nextId: 1 }),
    createdAt: Date.now(),
    lastModified: Date.now(),
    saveVersion: 2,
    ...(opts?.scenarioId ? { scenarioId: opts.scenarioId } : {}),
    ...(opts?.tutorial ? { tutorial: opts.tutorial } : {}),
    ...(opts?.clues !== undefined ? { clues: opts.clues } : {}),
  }
  await db.transaction('rw', db.campaigns, async () => {
    await db.campaigns.put(meta)
  })
  return meta
}

export async function listCampaigns(): Promise<CampaignMeta[]> {
  const db = getDb()
  return db.campaigns.orderBy('lastModified').reverse().toArray()
}

export async function getCampaign(id: string): Promise<CampaignMeta | undefined> {
  return getDb().campaigns.get(id)
}

export async function touchCampaign(id: string, patch: Partial<CampaignMeta>): Promise<void> {
  const db = getDb()
  await db.transaction('rw', db.campaigns, async () => {
    const meta = await db.campaigns.get(id)
    if (!meta) throw new Error(`unknown campaign: ${id}`)
    await db.campaigns.put({ ...meta, ...patch, lastModified: Date.now() })
  })
}

export async function saveParty(campaignId: string, characters: Character[]): Promise<void> {
  const db = getDb()
  const records: CharacterRecord[] = characters.map((c) => ({ ...c, campaignId }))
  await db.transaction('rw', db.characters, db.campaigns, async () => {
    await db.characters.where('campaignId').equals(campaignId).delete()
    await db.characters.bulkPut(records)
    const meta = await db.campaigns.get(campaignId)
    if (meta) await db.campaigns.put({ ...meta, lastModified: Date.now() })
  })
}

export async function loadParty(campaignId: string): Promise<Character[]> {
  const db = getDb()
  const rows = await db.characters.where('campaignId').equals(campaignId).toArray()
  return rows.map(({ campaignId: _c, ...character }) => character)
}

export async function updateCharacter(
  campaignId: string,
  character: Character,
): Promise<void> {
  const db = getDb()
  await db.transaction('rw', db.characters, db.campaigns, async () => {
    await db.characters.put({ ...character, campaignId })
    const meta = await db.campaigns.get(campaignId)
    if (meta) await db.campaigns.put({ ...meta, lastModified: Date.now() })
  })
}

export async function deleteCampaign(id: string): Promise<void> {
  const db = getDb()
  await db.transaction('rw', db.campaigns, db.characters, async () => {
    await db.characters.where('campaignId').equals(id).delete()
    await db.campaigns.delete(id)
  })
}
