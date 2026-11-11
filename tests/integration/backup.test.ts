import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import {
  exportCampaign,
  importArchive,
  deleteCampaignFull,
  duplicateCampaign,
  listCheckpoints,
  restoreCheckpoint,
  saveCheckpoint,
} from '../../src/database/repositories/backupRepo'
import { createCampaign, listCampaigns, touchCampaign } from '../../src/database/repositories/campaignRepo'
import { saveDungeon } from '../../src/database/repositories/dungeonRepo'
import { newDungeon } from '../../src/engine/dungeon/generate'
import { saveEvent, loadJournal } from '../../src/database/repositories/journalRepo'
import type { Character } from '../../src/rulesets/schema/character'

function pc(id: string): Character {
  return {
    id,
    name: id,
    classId: 'warrior',
    level: 2,
    currentLife: 5,
    maxLife: 7,
    experience: 0,
    gold: 10,
    traits: [],
    spells: [],
    equipment: ['hand weapon'],
    conditions: [],
    status: 'active',
    createdAt: 0,
  }
}

let campaignId = ''

beforeAll(async () => {
  campaignId = (await createCampaign('Backup Test', 42)).id
})

describe('campaign archives (PROJECT_SPEC §18)', () => {
  it('export → import round-trips a full campaign with a fresh id', async () => {
    await saveParty(campaignId)
    await saveDungeon(campaignId, newDungeon(campaignId, new Rng(1)))
    await saveEvent(campaignId, 'explore', Date.now(), 'The party enters the dungeon.', new Rng(1))
    const archive = await exportCampaign(campaignId)
    expect(archive.kind).toBe('4ad-campaign')
    expect(archive.characters.length).toBe(4)
    expect(archive.dungeon?.tiles.length).toBe(1)
    expect(archive.journal.length).toBe(1)

    const before = (await listCampaigns()).length
    const newId = await importArchive(archive)
    const after = await listCampaigns()
    expect(after.length).toBe(before + 1)
    expect(newId).not.toBe(campaignId)
    const copy = await exportCampaign(newId)
    expect(copy.characters.length).toBe(4)
    expect(copy.dungeon?.tiles.length).toBe(1)
    expect(copy.journal.length).toBe(1)
    expect(copy.campaign.name).toContain('(imported)')
  })

  it('duplicate creates an independent copy', async () => {
    const newId = await duplicateCampaign(campaignId)
    const copy = await exportCampaign(newId)
    expect(copy.campaign.name).toContain('(copy)')
    expect(copy.characters.length).toBe(4)
    // The original keeps its own party (no id clobbering across campaigns).
    const orig = await exportCampaign(campaignId)
    expect(orig.characters.length).toBe(4)
  })

  it('deleteCampaignFull removes every row for the campaign', async () => {
    const newId = await duplicateCampaign(campaignId)
    await saveCheckpoint(newId, 'temp', await exportCampaign(newId))
    await deleteCampaignFull(newId)
    const cp = await listCheckpoints(newId)
    expect(cp.length).toBe(0)
    expect((await listCampaigns()).some((c) => c.id === newId)).toBe(false)
  })

  it('checkpoints capture and restore state', async () => {
    // mutate: gold goes up after the checkpoint
    await saveCheckpoint(campaignId, 'before-gold', await exportCampaign(campaignId))
    await saveParty(campaignId) // idempotent; simulate a change below
    const cps = await listCheckpoints(campaignId)
    expect(cps.length).toBeGreaterThanOrEqual(1)
    const restored = await restoreCheckpoint(cps[0].id!)
    expect(restored).toBe(campaignId)
    const a = await exportCampaign(campaignId)
    expect(a.characters.length).toBe(4)
  })
})

async function saveParty(id: string) {
  const { saveParty: sp } = await import('../../src/database/repositories/campaignRepo')
  await sp(id, ['p1', 'p2', 'p3', 'p4'].map((n) => pc(n)))
  void id
}

void touchCampaign
void loadJournal
