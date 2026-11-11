import Dexie, { type EntityTable } from 'dexie'
import type { Character } from '../rulesets/schema/character'

/**
 * Local database (PROJECT_SPEC Part VI §18): IndexedDB via Dexie, schema-
 * versioned from day one. Characters store full validated Character records;
 * campaigns carry the seed + serialized RNG state so every roll stays
 * reproducible. Migrations: bump SCHEMA_VERSION with an upgrade path; never
 * drop columns implicitly.
 */
export const SCHEMA_VERSION = 4

export interface CampaignMeta {
  id: string
  name: string
  ruleset: string
  seed: number
  /** Serialized Rng state (engine/core/rng.ts) — restored on load. */
  rngState: string
  /** Party clue pool — 3 spent reveal a Secret (FADEE pp.108, 122). */
  clues?: number
  /** Revealed Secrets, encoded ('weakness:Orcs', 'terrifying:1', …). */
  secrets?: string[]
  /** Epic reward rolls earned from completed Quests (FADEE p.162). */
  epic?: number[]
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
  checkpoints!: EntityTable<CheckpointRecord, 'id'>

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
    this.version(3).stores({
      campaigns: 'id, name, lastModified',
      characters: 'id, campaignId, classId',
      events: 'id, campaignId, timestamp',
      dungeons: 'id',
    })
    // v4: named checkpoints for save management (PROJECT_SPEC §18).
    this.version(SCHEMA_VERSION).stores({
      campaigns: 'id, name, lastModified',
      characters: 'id, campaignId, classId',
      events: 'id, campaignId, timestamp',
      dungeons: 'id',
      checkpoints: '++id, campaignId, ts',
    })
  }
}

/** Named manual checkpoint (PROJECT_SPEC §18). */
export interface CheckpointRecord {
  id?: number
  campaignId: string
  name: string
  ts: number
  /** Full snapshot: dungeon + party + campaign meta patch. */
  payload: unknown
}

/** Serialized DungeonState (engine/dungeon/generate.ts). */
export interface DungeonRecord {
  id: string // campaignId
  state: unknown
  savedAt: number
}

let dbInstance: FourADDatabase | null = null

/** Singleton accessor — one open connection per page lifetime.
 * Survives Vite HMR re-execution by caching on globalThis; on a Dexie
 * VersionError (DB newer than code — dev churn or a stale cached bundle),
 * the database is deleted and recreated rather than leaving the app bricked.
 * Recovery logs loudly: data written by a NEWER build is discarded, which is
 * acceptable only because the newer build never shipped. */
export function getDb(): FourADDatabase {
  const g = globalThis as { __fourADDb?: FourADDatabase }
  if (!dbInstance && g.__fourADDb) dbInstance = g.__fourADDb
  if (!dbInstance) {
    dbInstance = new FourADDatabase()
    dbInstance.open().catch((e: Error) => {
      if (/newer version|VersionError/i.test(String(e))) {
        console.warn('[4AD] database schema is newer than this build — resetting local DB')
        dbInstance!.delete()
        dbInstance = new FourADDatabase()
        g.__fourADDb = dbInstance
      } else {
        throw e
      }
    })
    g.__fourADDb = dbInstance
  }
  return dbInstance
}
