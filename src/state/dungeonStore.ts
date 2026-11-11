import { create } from 'zustand'
import { Rng } from '../engine/core/rng'
import {
  currentTile,
  exploreThrough,
  newDungeon,
  openExits,
  rollHiddenTreasure,
  searchTile,
  rollSecretDoorBonus,
  type DungeonState,
} from '../engine/dungeon/generate'
import { getCampaign, touchCampaign } from '../database/repositories/campaignRepo'
import { loadDungeon, saveDungeon } from '../database/repositories/dungeonRepo'

/**
 * Dungeon application state (PROJECT_SPEC §10, §23). Engine functions do the
 * rules work; the store persists each completed action transactionally and
 * keeps the RNG state in sync so every save reproduces exactly.
 */

interface LogEntry {
  ts: number
  text: string
}

interface DungeonStoreState {
  dungeon: DungeonState | null
  log: LogEntry[]
  busy: boolean
  error: string | null
  /** Pending search-choice UI state (FADEE p.107: player picks the find). */
  pendingFind: { tileId: string } | null
  lastTreasure: { gold: number; complication: string } | null
  ensureDungeon: () => Promise<void>
  explore: (exitId: string) => Promise<void>
  search: () => Promise<void>
  claimFind: (choice: 'hidden-treasure' | 'secret-door' | 'clue') => Promise<void>
  clearError: () => void
}

async function persist(state: DungeonState, rng: Rng, campaignId: string): Promise<void> {
  await saveDungeon(campaignId, state)
  await touchCampaign(campaignId, { rngState: JSON.stringify(rng.serialize()) })
}

export const useDungeonStore = create<DungeonStoreState>((set, get) => ({
  dungeon: null,
  log: [],
  busy: false,
  error: null,
  pendingFind: null,
  lastTreasure: null,

  ensureDungeon: async () => {
    const { campaign, party } = await import('./campaignStore').then((m) =>
      m.useCampaignStore.getState(),
    )
    if (!campaign) return
    set({ busy: true, error: null })
    try {
      const existing = await loadDungeon(campaign.id)
      if (existing) {
        set({ dungeon: existing, busy: false })
        return
      }
      const rng = Rng.deserialize(JSON.parse(campaign.rngState))
      const fresh = newDungeon(campaign.id, rng)
      await persist(fresh, rng, campaign.id)
      const meta = await getCampaign(campaign.id)
      set({
        dungeon: fresh,
        busy: false,
        log: [{ ts: Date.now(), text: 'The party enters the dungeon. (FADEE p.104)' }],
      })
      void meta
      void party
    } catch (e) {
      set({ error: String(e), busy: false })
    }
  },

  explore: async (exitId) => {
    const { dungeon } = get()
    const { campaign, party } = await import('./campaignStore').then((m) =>
      m.useCampaignStore.getState(),
    )
    if (!dungeon || !campaign) return
    const hcl = Math.max(1, ...party.map((p) => p.level))
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    const result = exploreThrough(dungeon, rng, exitId, hcl)
    await persist(result.state, rng, campaign.id)
    set({
      dungeon: result.state,
      log: [...get().log, ...result.events.map((text) => ({ ts: Date.now(), text }))].slice(-100),
    })
  },

  search: async () => {
    const { dungeon } = get()
    const { campaign } = await import('./campaignStore').then((m) =>
      m.useCampaignStore.getState(),
    )
    if (!dungeon || !campaign) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    const result = searchTile(dungeon, rng, dungeon.currentTileId)
    await persist(result.state, rng, campaign.id)
    const log = [...get().log, { ts: Date.now(), text: `Search: ${result.result}` }]
    if (result.result === 'find') {
      set({ dungeon: result.state, log, pendingFind: { tileId: dungeon.currentTileId } })
    } else {
      set({ dungeon: result.state, log })
    }
  },

  claimFind: async (choice) => {
    const { dungeon, pendingFind } = get()
    const { campaign } = await import('./campaignStore').then((m) =>
      m.useCampaignStore.getState(),
    )
    if (!dungeon || !campaign || !pendingFind) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    const entries: LogEntry[] = []
    if (choice === 'hidden-treasure') {
      const hcl = Math.max(1)
      const result = rollHiddenTreasure(dungeon, rng, hcl)
      entries.push({
        ts: Date.now(),
        text: `Hidden treasure: ${result.gold} gp! ${result.complication}`,
      })
      // Gold lands in the party ledger in Phase 5 (inventory); recorded now.
    } else if (choice === 'secret-door') {
      const bonus = rollSecretDoorBonus(rng)
      entries.push({
        ts: Date.now(),
        text: bonus.safeExit
          ? 'The secret door hides a SAFE SHORTCUT OUT of the dungeon! (FADEE p.108)'
          : 'A secret door is drawn on the map — roll a fresh tile beyond it when you step through.',
      })
    } else {
      entries.push({ ts: Date.now(), text: 'The party gains 1 Clue. (FADEE p.109)' })
    }
    set({
      pendingFind: null,
      log: [...get().log, ...entries].slice(-100),
      ...(choice === 'hidden-treasure' ? {} : {}),
    })
    // Persist only RNG-consuming choices
    if (choice !== 'clue') {
      await persist(dungeon, rng, campaign.id)
    }
  },

  clearError: () => set({ error: null }),
}))

export { openExits, currentTile }
