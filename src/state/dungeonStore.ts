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
import {
  fleeCombat,
  lifeFromFormula,
  makeEnemy,
  payBribe,
  pcAttack,
  rollReactions,
  startCombat,
  xpDue,
  castSpell,
  castHealing,
  type CastableSpell,
  type CombatState,
} from '../engine/combat/combat'
import { getCampaign, touchCampaign } from '../database/repositories/campaignRepo'
import { loadDungeon, saveDungeon } from '../database/repositories/dungeonRepo'
import { rollLoot } from '../engine/treasure/loot'
import { getDb } from '../database/db'

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
  /** XP available to spend after a won fight (FADEE p.117). */
  pendingXp: { major: number; minor: boolean; boss: boolean } | null
  ensureDungeon: () => Promise<void>
  explore: (exitId: string) => Promise<void>
  search: () => Promise<void>
  claimFind: (choice: 'hidden-treasure' | 'secret-door' | 'clue') => Promise<void>
  /** Begin combat from the current tile's encounter (FADEE p.90). */
  beginCombat: () => Promise<void>
  combatAttack: (pcId: string, enemyId: string) => Promise<void>
  combatCast: (pcId: string, spell: CastableSpell, enemyId: string | null) => Promise<void>
  combatHeal: (pcId: string, targetId: string) => Promise<void>
  combatWait: () => Promise<void>
  combatPayBribe: () => Promise<void>
  combatFlee: () => Promise<void>
  spendXpRoll: (pcId: string) => Promise<void>
  clearError: () => void
}

async function persist(state: DungeonState, rng: Rng, campaignId: string): Promise<void> {
  await saveDungeon(campaignId, state)
  await touchCampaign(campaignId, { rngState: JSON.stringify(rng.serialize()) })
}

/** Persist journal events (PROJECT_SPEC §26; Dexie events table). */
async function appendEvents(
  campaignId: string,
  type: string,
  entries: { ts: number; text: string }[],
): Promise<void> {
  if (!entries.length) return
  const db = getDb()
  await db.transaction('rw', db.events, async () => {
    await db.events.bulkPut(
      entries.map((e, i) => ({
        id: `${campaignId}-${e.ts}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        campaignId,
        type,
        timestamp: e.ts,
        payload: e.text,
      })),
    )
  })
}

export const useDungeonStore = create<DungeonStoreState>((set, get) => ({
  dungeon: null,
  log: [],
  busy: false,
  error: null,
  pendingFind: null,
  lastTreasure: null,
  pendingXp: null,

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
    dungeon.combat = null // leaving any concluded fight behind
    const result = exploreThrough(dungeon, rng, exitId, hcl)
    await persist(result.state, rng, campaign.id)
    set({
      dungeon: result.state,
      log: [...get().log, ...result.events.map((text) => ({ ts: Date.now(), text }))].slice(-100),
    })
    await appendEvents(campaign.id, 'explore', result.events.map((text) => ({ ts: Date.now(), text })))
    // Wandering Monster ambush (FADEE pp.104, 107): they strike first.
    if (result.state.pendingAmbush) {
      const enc = result.state.pendingAmbush
      result.state.pendingAmbush = null
      const enemies = [
        makeEnemy(
          enc.monster,
          enc.table,
          enc.level,
          enc.count,
          lifeFromFormula(enc.level, enc.monster.lifeFormula, enc.monster.flatLife),
        ),
      ]
      const combat = startCombat(dungeon.currentTileId, party.filter((p) => p.status !== 'dead'), enemies, rng, {
        forceSurprise: true,
      })
      dungeon.combat = combat
      await persist(dungeon, rng, campaign.id)
      set({
        dungeon: { ...dungeon },
        log: [...get().log, ...combat.log.map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
      })
      await appendEvents(campaign.id, 'combat', combat.log.map((l) => ({ ts: l.ts, text: l.text })))
    }
  },

  beginCombat: async () => {
    const { dungeon } = get()
    const { campaign, party } = await import('./campaignStore').then((m) =>
      m.useCampaignStore.getState(),
    )
    if (!dungeon || !campaign || dungeon.combat) return
    const enc = dungeon.tiles.find((t) => t.id === dungeon.currentTileId)?.content?.encounter
    if (!enc) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    const enemies = [
      makeEnemy(
        enc.monster,
        enc.table,
        enc.level,
        enc.count,
        lifeFromFormula(enc.level, enc.monster.lifeFormula, enc.monster.flatLife),
      ),
    ]
    enemies[0].isFinalBossFlag = !!enc.isFinalBoss
    const combat = startCombat(dungeon.currentTileId, party.filter((p) => p.status !== 'dead'), enemies, rng)
    dungeon.combat = combat
    await persist(dungeon, rng, campaign.id)
    set({
      dungeon: { ...dungeon },
      log: [...get().log, ...combat.log.map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
    })
  },

  combatAttack: async (pcId, enemyId) => {
    const { dungeon } = get()
    const { campaign, party } = await import('./campaignStore').then((m) =>
      m.useCampaignStore.getState(),
    )
    const combat = dungeon?.combat
    if (!dungeon || !campaign || !combat) return
    const pc = party.find((p) => p.id === pcId)
    if (!pc) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    pcAttack(combat, rng, pc, enemyId)
    await persist(dungeon, rng, campaign.id)
    set({
      dungeon: { ...dungeon },
      log: [...get().log, ...combat.log.slice(-6).map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
    })
    await appendEvents(campaign.id, 'combat', combat.log.slice(-6).map((l) => ({ ts: l.ts, text: l.text })))
    if (combat.phase === 'won' || combat.phase === 'lost') {
      // Sync party casualties/levels to Dexie; surface XP due on victory
      const { saveParty } = await import('../database/repositories/campaignRepo')
      await saveParty(campaign.id, party)
      if (combat.phase === 'won') {
        const due = xpDue(combat)
        // Classical XP (FADEE p.117): 1 roll per Major Foe (+1 Final Boss);
        // Minors accrue 1 roll per 10 encounters.
        let rolls = due.majorSlain + (due.finalBoss ? 1 : 0)
        if (due.minorEncounter) {
          dungeon.minorEncountersTally = (dungeon.minorEncountersTally ?? 0) + 1
          if (dungeon.minorEncountersTally >= 10) {
            dungeon.minorEncountersTally -= 10
            rolls += 1
          }
        }
        // Loot: once per cleared encounter (FADEE p.99), Foe's treasure modifier.
        const mod = combat.enemies[0]?.profile.treasure ?? '0'
        const loot = rollLoot(rng, mod)
        if (loot.gold > 0) {
          const living = party.filter((p) => p.status !== 'dead')
          if (living.length) {
            const each = Math.floor(loot.gold / living.length)
            living.forEach((p) => (p.gold += each))
          }
        }
        const carrier = party.find((p) => p.status !== 'dead')
        if (carrier && loot.scroll) {
          carrier.equipment.push(`scroll of ${loot.scroll.spell}`)
        }
        if (carrier && loot.magic) {
          carrier.equipment.push(loot.magic.name)
        }
        set({ pendingXp: rolls > 0 ? { major: rolls, minor: due.minorEncounter, boss: due.finalBoss } : null })
        await appendEvents(campaign.id, 'loot', [
          { ts: Date.now(), text: loot.text },
        ])
      }
    }
  },

  combatCast: async (pcId, spell, enemyId) => {
    const { dungeon } = get()
    const { campaign, party } = await import('./campaignStore').then((m) =>
      m.useCampaignStore.getState(),
    )
    const combat = dungeon?.combat
    if (!dungeon || !campaign || !combat) return
    const pc = party.find((p) => p.id === pcId)
    if (!pc) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    castSpell(combat, rng, pc, spell, enemyId)
    await persist(dungeon, rng, campaign.id)
    set({
      dungeon: { ...dungeon },
      log: [...get().log, ...combat.log.slice(-6).map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
    })
    if (combat.phase === 'won' || combat.phase === 'lost') {
      const { saveParty } = await import('../database/repositories/campaignRepo')
      await saveParty(campaign.id, party)
      if (combat.phase === 'won') {
        const due = xpDue(combat)
        let rolls = due.majorSlain + (due.finalBoss ? 1 : 0)
        if (due.minorEncounter) {
          dungeon.minorEncountersTally = (dungeon.minorEncountersTally ?? 0) + 1
          if (dungeon.minorEncountersTally >= 10) {
            dungeon.minorEncountersTally -= 10
            rolls += 1
          }
        }
        const mod = combat.enemies[0]?.profile.treasure ?? '0'
        const loot = rollLoot(rng, mod)
        if (loot.gold > 0) {
          const living = party.filter((p) => p.status !== 'dead')
          if (living.length) {
            const each = Math.floor(loot.gold / living.length)
            living.forEach((p) => (p.gold += each))
          }
        }
        const carrier = party.find((p) => p.status !== 'dead')
        if (carrier && loot.scroll) carrier.equipment.push(`scroll of ${loot.scroll.spell}`)
        if (carrier && loot.magic) carrier.equipment.push(loot.magic.name)
        set({ pendingXp: rolls > 0 ? { major: rolls, minor: due.minorEncounter, boss: due.finalBoss } : null })
        await appendEvents(campaign.id, 'loot', [{ ts: Date.now(), text: loot.text }])
      }
    }
  },

  combatHeal: async (pcId, targetId) => {
    const { dungeon } = get()
    const { campaign, party } = await import('./campaignStore').then((m) =>
      m.useCampaignStore.getState(),
    )
    const combat = dungeon?.combat
    if (!dungeon || !campaign || !combat) return
    const pc = party.find((p) => p.id === pcId)
    const target = party.find((p) => p.id === targetId)
    if (!pc || !target) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    castHealing(combat, rng, pc, target)
    await persist(dungeon, rng, campaign.id)
    set({
      dungeon: { ...dungeon },
      log: [...get().log, ...combat.log.slice(-6).map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
    })
  },

  combatWait: async () => {
    const { dungeon } = get()
    const { campaign } = await import('./campaignStore').then((m) =>
      m.useCampaignStore.getState(),
    )
    const combat = dungeon?.combat
    if (!dungeon || !campaign || !combat || combat.phase !== 'opening') return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    rollReactions(combat, rng)
    await persist(dungeon, rng, campaign.id)
    set({
      dungeon: { ...dungeon },
      log: [...get().log, ...combat.log.slice(-6).map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
    })
  },

  combatPayBribe: async () => {
    const { dungeon } = get()
    const { campaign, party } = await import('./campaignStore').then((m) =>
      m.useCampaignStore.getState(),
    )
    const combat = dungeon?.combat
    if (!dungeon || !campaign || !combat || !combat.pendingBribe) return
    payBribe(combat, party)
    await persist(dungeon, Rng.deserialize(JSON.parse(campaign.rngState)), campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    set({
      dungeon: { ...dungeon },
      log: [...get().log, ...combat.log.slice(-6).map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
    })
  },

  combatFlee: async () => {
    const { dungeon } = get()
    const { campaign, party } = await import('./campaignStore').then((m) =>
      m.useCampaignStore.getState(),
    )
    const combat = dungeon?.combat
    if (!dungeon || !campaign || !combat) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    fleeCombat(combat, rng)
    // FADEE p.98: flee to a visited tile — use the way we came in.
    const here = dungeon.tiles.find((t) => t.id === dungeon.currentTileId)
    const back = here?.exits.find((e) => e.toTileId)
    if (back?.toTileId) dungeon.currentTileId = back.toTileId
    dungeon.combat = null
    await persist(dungeon, rng, campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    set({
      dungeon: { ...dungeon },
      log: [...get().log, ...combat.log.slice(-6).map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
    })
  },

  spendXpRoll: async (pcId) => {
    const { dungeon } = get()
    const { campaign, party } = await import('./campaignStore').then((m) =>
      m.useCampaignStore.getState(),
    )
    if (!dungeon || !campaign) return
    const pc = party.find((p) => p.id === pcId)
    if (!pc || pc.status === 'dead') return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    // FADEE p.117: XP roll = d6 > current L (6 always succeeds); level-up is
    // immediate: +1 current and max Life, bonuses scale with L.
    const roll = rng.d(6)
    const success = roll > pc.level || roll === 6
    const entries: LogEntry[] = [
      { ts: Date.now(), text: `XP roll for ${pc.name}: d6=${roll} vs L${pc.level} → ${success ? 'LEVEL UP!' : 'no level'}` },
    ]
    if (success) {
      pc.level += 1
      pc.maxLife += 1
      pc.currentLife += 1
      entries.push({ ts: Date.now(), text: `${pc.name} reaches L${pc.level}: +1 max and current Life, bonuses increase.` })
    }
    // Consume one available roll (Major/boss rolls are per-kill; minors accrue)
    const { pendingXp } = get()
    if (pendingXp) {
      const remaining = pendingXp.major > 0 ? pendingXp.major - 1 : 0
      set({ pendingXp: remaining > 0 ? { ...pendingXp, major: remaining } : null })
    }
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    await persist(dungeon, rng, campaign.id)
    set({ log: [...get().log, ...entries].slice(-100) })
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
