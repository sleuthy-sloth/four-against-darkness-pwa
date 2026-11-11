import Dexie, { type EntityTable } from 'dexie'
import type { Character } from '../rulesets/schema/character'

/**
 * Local database (PROJECT_SPEC Part VI §18): IndexedDB via Dexie, schema-
 * versioned from day one. Characters store full validated Character records;
 * campaigns carry the seed + serialized RNG state so every roll stays
 * reproducible. Migrations: bump SCHEMA_VERSION with an upgrade path; never
 * drop columns implicitly.
 */
export const SCHEMA_VERSION = 3

export interface CampaignMeta {
  id: string
  name: string
  ruleset: string
  seed: number
  /** Serialized Rng state (engine/core/rng.ts) — restored on load. */
  rngState: string
  createdAt: number
  lastModified: number
  saveVersion: number
}

/** Full Character record (rulesets/schema/character.ts), indexed by campaign. */
export type CharacterRecord = Character & { campaignId: string }

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
  dungeons!: EntityTable<DungeonRecord, 'id'>

  constructor() {
    super('four-against-darkness')
    this.version(1).stores({
      campaigns: 'id, name, lastModified',
      characters: 'id, campaignId, classId',
      events: 'id, campaignId, timestamp',
    })
    // v2: characters now hold the full validated record (same keys/indexes).
    this.version(2)
      .stores({
        campaigns: 'id, name, lastModified',
        characters: 'id, campaignId, classId',
        events: 'id, campaignId, timestamp',
      })
      .upgrade(async (tx) => {
        // v1 rows were conceptual stubs and never shipped to users; clear
        // rather than guess at migration semantics (PROJECT_SPEC Rule 4).
        await tx.table('characters').clear()
      })
    // v3: dungeon state per campaign (JSON blob, keyed by campaign id).
    this.version(SCHEMA_VERSION).stores({
      campaigns: 'id, name, lastModified',
      characters: 'id, campaignId, classId',
      events: 'id, campaignId, timestamp',
      dungeons: 'id',
    })
  }
}

/** Serialized DungeonState (engine/dungeon/generate.ts). */
export interface DungeonRecord {
  id: string // campaignId
  state: unknown
  savedAt: number
}

let dbInstance: FourADDatabase | null = null

/** Singleton accessor — one open connection per page lifetime. */
export function getDb(): FourADDatabase {
  if (!dbInstance) {
    dbInstance = new FourADDatabase()
  }
  return dbInstance
}
