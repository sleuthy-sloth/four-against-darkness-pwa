import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import { createParty } from '../../src/engine/characters/create'
import {
  createCampaign,
  getCampaign,
  loadParty,
  saveParty,
  deleteCampaign,
} from '../../src/database/repositories/campaignRepo'

/**
 * Persistence integration test (PROJECT_SPEC §30 workflows 10-12):
 * save campaign → reload → continue exploration with identical state.
 * Runs against fake-indexeddb; the browser path is identical Dexie code.
 */
describe('campaign persistence (Dexie)', () => {
  it('campaign + party survive save/reload with reproducible RNG', async () => {
    const seed = 777
    const meta = await createCampaign('Test Delve', seed)
    const stored = await getCampaign(meta.id)
    expect(stored?.name).toBe('Test Delve')
    expect(stored?.seed).toBe(seed)

    const rng = new Rng(seed)
    const party = createParty(
      [
        { name: 'Bruggo', classId: 'warrior' },
        { name: 'Gravus', classId: 'cleric' },
        { name: 'Shilsa', classId: 'rogue' },
        { name: 'Flauros', classId: 'wizard' },
      ],
      rng,
      meta.id,
    )
    await saveParty(meta.id, party)

    // Reload from "disk"
    const reloaded = await loadParty(meta.id)
    expect(reloaded).toHaveLength(4)
    const bruggo = reloaded.find((c) => c.name === 'Bruggo')
    expect(bruggo?.maxLife).toBe(7)
    expect(bruggo?.classId).toBe('warrior')

    // RNG continuation: serialized state replays the same future rolls
    const savedState = JSON.parse(stored!.rngState)
    const rngA = Rng.deserialize(savedState)
    const rngB = Rng.deserialize(savedState)
    expect(rngA.d(6)).toBe(rngB.d(6))
  })

  it('re-saving replaces the old party (transactional)', async () => {
    const meta = await createCampaign('Resave', 42)
    const rng = new Rng(42)
    const first = createParty(
      ['warrior', 'cleric', 'rogue', 'wizard'].map((classId) => ({ name: `A-${classId}`, classId })),
      rng,
      meta.id,
    )
    await saveParty(meta.id, first)
    const second = createParty(
      ['barbarian', 'elf', 'dwarf', 'halfling'].map((classId) => ({
        name: `B-${classId}`,
        classId,
      })),
      rng,
      meta.id,
    )
    await saveParty(meta.id, second)
    const reloaded = await loadParty(meta.id)
    expect(reloaded).toHaveLength(4)
    expect(reloaded.every((c) => c.classId !== 'warrior')).toBe(true)
  })

  it('deleting a campaign removes its party too', async () => {
    const meta = await createCampaign('Doomed', 5)
    const rng = new Rng(5)
    await saveParty(
      meta.id,
      createParty(
        ['warrior', 'cleric', 'rogue', 'wizard'].map((classId) => ({
          name: `X-${classId}`,
          classId,
        })),
        rng,
        meta.id,
      ),
    )
    await deleteCampaign(meta.id)
    expect(await getCampaign(meta.id)).toBeUndefined()
    expect(await loadParty(meta.id)).toHaveLength(0)
  })
})
