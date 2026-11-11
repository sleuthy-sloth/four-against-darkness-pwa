import { getDb, type EventRecord } from '../db'
import type { Rng } from '../../engine/core/rng'

/** Journal persistence (PROJECT_SPEC §26): filtered chronological history. */

export type JournalCategory = 'explore' | 'combat' | 'loot' | 'search' | 'event'

export async function saveEvent(
  campaignId: string,
  type: JournalCategory,
  ts: number,
  text: string,
  rng: Rng,
): Promise<void> {
  const db = getDb()
  const rec: EventRecord = {
    id: `${campaignId}-${ts}-${Math.random().toString(36).slice(2, 8)}`,
    campaignId,
    type,
    timestamp: ts,
    payload: text,
  }
  await db.transaction('rw', db.events, async () => {
    await db.events.put(rec)
  })
  void rng
}

/** Journal rollback for undo (PROJECT_SPEC §19): drop events at/after cutoff. */
export async function deleteEventsAfter(campaignId: string, cutoff: number): Promise<void> {
  const db = getDb()
  if (cutoff <= 0) return
  const doomed = (await db.events.where('campaignId').equals(campaignId).toArray())
    .filter((e) => e.timestamp >= cutoff)
    .map((e) => e.id)
  await db.events.bulkDelete(doomed)
}

export async function loadJournal(campaignId: string): Promise<EventRecord[]> {
  const db = getDb()
  return db.events.where('campaignId').equals(campaignId).reverse().sortBy('timestamp')
}
