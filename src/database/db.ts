import Dexie, { type EntityTable } from 'dexie'

/**
 * Local database (Part VI §18): IndexedDB via Dexie, schema-versioned from day
 * one. Phase 1 scope is the shell only — the campaign tables below are the
 * minimal landing shape for Phase 2 (characters/party) and Phase 3+ (dungeon,
 * events, generator state). Migrations: bump SCHEMA_VERSION and add a numbered
 * upgrade path; never drop columns implicitly.
 */
export const SCHEMA_VERSION = 1

export interface CampaignMeta {
  id: string
  name: string
  ruleset: string
  seed: number
  createdAt: number
  lastModified: number
  saveVersion: number
}

export interface CharacterRecord {
  id: string
  campaignId: string
  name: string
  classId: string
  level: number
  experience: number
  currentHP: number
  maximumHP: number
  status: 'active' | 'incapacitated' | 'dead'
}

export interface EventRecord {
  id: string
  campaignId: string
  type: string
  timestamp: number
  payload: unknown
}

export class FourADDatabase extends Dexie {
  campaigns!: EntityTable<CampaignMeta, 'id'>
  characters!: EntityTable<CharacterRecord, 'id'>
  events!: EntityTable<EventRecord, 'id'>

  constructor() {
    super('four-against-darkness')
    this.version(SCHEMA_VERSION).stores({
      campaigns: 'id, name, lastModified',
      characters: 'id, campaignId, classId',
      events: 'id, campaignId, timestamp',
    })
  }
}

let dbInstance: FourADDatabase | null = null

/** Singleton accessor — one open connection per page lifetime. */
export function getDb(): FourADDatabase {
  if (!dbInstance) {
    dbInstance = new FourADDatabase()
  }
  return dbInstance
}
