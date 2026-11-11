import { create } from 'zustand'
import { Rng } from '../engine/core/rng'
import {
  createParty as engineCreateParty,
  type CreateCharacterRequest,
} from '../engine/characters/create'
import type { Character } from '../rulesets/schema/character'
import {
  createCampaign,
  getCampaign,
  listCampaigns,
  loadParty,
  saveParty,
} from '../database/repositories/campaignRepo'
import type { CampaignMeta } from '../database/db'

/**
 * Campaign/party application state (PROJECT_SPEC Part VI §17). The store holds
 * UI state only; game rules live in the engine, persistence in Dexie, and the
 * seeded RNG state lives with the campaign so saves reproduce exactly.
 */

interface CampaignState {
  campaign: CampaignMeta | null
  party: Character[]
  loading: boolean
  error: string | null
  loadLastCampaign: () => Promise<void>
  newCampaign: (name: string) => Promise<void>
  createParty: (requests: CreateCharacterRequest[]) => Promise<boolean>
  clearError: () => void
}

export const useCampaignStore = create<CampaignState>((set) => ({
  campaign: null,
  party: [],
  loading: false,
  error: null,

  loadLastCampaign: async () => {
    set({ loading: true })
    try {
      const campaigns = await listCampaigns()
      const latest = campaigns[0]
      if (!latest) {
        set({ campaign: null, party: [], loading: false })
        return
      }
      const party = await loadParty(latest.id)
      set({ campaign: latest, party, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  newCampaign: async (name) => {
    set({ loading: true, error: null })
    try {
      const seed = Date.now() >>> 0
      const meta = await createCampaign(name, seed)
      set({ campaign: meta, party: [], loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  createParty: async (requests) => {
    const { campaign } = useCampaignStore.getState()
    if (!campaign) {
      set({ error: 'no active campaign' })
      return false
    }
    set({ loading: true, error: null })
    try {
      const rng = Rng.deserialize(JSON.parse(campaign.rngState))
      const party = engineCreateParty(requests, rng, campaign.id)
      await saveParty(campaign.id, party)
      // Persist RNG state so future rolls continue the sequence
      const meta = await getCampaign(campaign.id)
      if (meta) {
        const { touchCampaign } = await import('../database/repositories/campaignRepo')
        await touchCampaign(campaign.id, { rngState: JSON.stringify(rng.serialize()) })
      }
      set({ party, loading: false })
      return true
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false })
      return false
    }
  },

  clearError: () => set({ error: null }),
}))
