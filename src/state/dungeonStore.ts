import { create } from 'zustand'
import { Rng } from '../engine/core/rng'
import {
  currentTile,
  exploreThrough,
  newDungeon,
  openExits,
  rollEncounter,
  rollHiddenTreasure,
  searchTile,
  rollSecretDoorBonus,
  type DungeonState,
  type EncounterRoll,
  type PendingChoicePayload,
} from '../engine/dungeon/generate'
import type { Character } from '../rulesets/schema/character'
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
  castScroll,
  castBlessing,
  drinkHealingPotion,
  applyBandage,
  canLeaveCombat,
  type CastableSpell,
  type ScrollSpell,
  type CombatState,
} from '../engine/combat/combat'
import { getCampaign, touchCampaign } from '../database/repositories/campaignRepo'
import { loadDungeon, saveDungeon } from '../database/repositories/dungeonRepo'
import { rollLoot } from '../engine/treasure/loot'
import {
  DUNGEON_EVENTS,
  DUNGEON_FEATURES,
  type DungeonTrap,
  TRAP_INFO,
  FEATURE_INFO,
  EVENT_INFO,
  ITEM_INFO,
} from '../rulesets/expanded/features'
import { canRest, beginRest, applyRestChoice } from '../engine/camp/rest'
import { QUEST_TABLE, QUEST_SOURCES, EPIC_REWARDS } from '../rulesets/expanded/quests'
import {
  profileFor,
} from '../rulesets/expanded/monsters'
import {
  attemptPuzzle,
  resolveEvent,
  resolveFeature,
  resolveTrap,
  rollDungeonEvent,
  touchStatue,
  type FeatureResult,
  type EventResult,
} from '../engine/features/resolve'
import { getDb } from '../database/db'
import { useCampaignStore } from './campaignStore'

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
  /** Undo stack (PROJECT_SPEC §19): in-memory, 5 deep. */
  undoStack: Snapshot[]
  /** Confirmation pending for an undo (major actions require it). */
  confirmUndo: { label: string } | null
  ensureDungeon: () => Promise<void>
  explore: (exitId: string) => Promise<void>
  search: () => Promise<void>
  claimFind: (choice: 'hidden-treasure' | 'secret-door' | 'clue') => Promise<void>
  /** Begin combat from the current tile's encounter (FADEE p.90). */
  beginCombat: () => Promise<void>
  combatAttack: (pcId: string, enemyId: string) => Promise<void>
  combatCast: (pcId: string, spell: CastableSpell, enemyId: string | null) => Promise<void>
  combatCastScroll: (pcId: string, spell: string, enemyId: string | null) => Promise<void>
  combatHeal: (pcId: string, targetId: string) => Promise<void>
  combatPotion: (pcId: string) => Promise<void>
  combatWait: () => Promise<void>
  combatPayBribe: () => Promise<void>
  combatFlee: () => Promise<void>
  /** Leave a concluded combat behind and return to the room's tile actions. */
  leaveCombat: () => Promise<void>
  spendXpRoll: (pcId: string) => Promise<void>
  /** Answer a pending feature/event choice (FADEE pp.152-153). */
  chooseTemple: (pcId: string) => Promise<void>
  statueTouch: (touch: boolean) => Promise<void>
  puzzleAttempt: (pcId: string, solve: boolean) => Promise<void>
  ghostPick: (pcId: string, gainMadness: boolean) => Promise<void>
  healerHeal: (pcId: string, points: number) => Promise<void>
  alchemistBuy: (pcId: string, item: 'healing potion' | 'blade poison') => Promise<void>
  /** Secrets (FADEE pp.122-123): reveal with 3 Clues, then use. */
  beginSecretReveal: () => Promise<void>
  pickSecret: (secretId: string, arg?: string) => Promise<void>
  pickSecretPc: (pcId: string) => Promise<void>
  pickWeaknessTarget: (species: string) => Promise<void>
  pickSecretItem: (itemName: string) => Promise<void>
  /** Open the item-choice dialog for the item-location secret. */
  beginSecretItem: () => Promise<void>
  useTreasureLocation: () => Promise<void>
  /** Rest once per adventure in a cleared, nail-secured room (FADEE p.114). */
  rest: () => Promise<void>
  restPick: (pcId: string, choice: 'life' | 'spell' | 'prayer-healing' | 'prayer-blessing') => Promise<void>
  /** Outfitter (between adventures, FADEE pp.82-85). */
  buyItem: (pcId: string, item: string) => Promise<void>
  /** Undo system (PROJECT_SPEC §19): confirm + reverse the last action. */
  requestUndo: () => void
  cancelUndo: () => void
  performUndo: () => Promise<void>
  /** Quest system (FADEE pp.153, 161-163). */
  questAccept: () => Promise<void>
  questDecline: () => Promise<void>
  claimQuest: () => Promise<void>
  questPcPick: (pcId: string) => Promise<void>
  clearError: () => void
}

async function persist(state: DungeonState, rng: Rng, campaignId: string): Promise<void> {
  await saveDungeon(campaignId, state)
  const rngJson = JSON.stringify(rng.serialize())
  await touchCampaign(campaignId, { rngState: rngJson })
  // Keep the campaign store's meta in sync, or the next action re-reads a
  // STALE rngState and replays the same dice sequence (groundhog-day bug).
  const cs = useCampaignStore.getState()
  if (cs.campaign?.id === campaignId) {
    useCampaignStore.setState({ campaign: { ...cs.campaign, rngState: rngJson } })
  }
}

/** Append to the Zustand log (kept short) — helper for feature/event flows. */
function appendLog(messages: string[]): void {
  const { log } = useDungeonStore.getState()
  useDungeonStore.setState({ log: [...log, ...messages.map((text) => ({ ts: Date.now(), text }))].slice(-100) })
}

/**
 * Mirror an XP award into both the store (the victory card and the exit
 * gates read it) and the dungeon record (Dexie, so a reload mid-victory
 * keeps the roll). The two must never drift: a roll that exists in one
 * but not the other is either unspendable or silently lost.
 */
function setPendingXp(
  dungeon: DungeonState,
  xp: { major: number; minor: boolean; boss: boolean } | null,
): void {
  dungeon.pendingXp = xp
  useDungeonStore.setState({ pendingXp: xp })
}

/** Encounter roll for event-spawned Wandering Monsters (FADEE p.153). */
function rollEncounterSimple(
  state: DungeonState,
  rng: Rng,
  profile: ReturnType<typeof import('../rulesets/expanded/monsters').profileFor>,
  hcl: number,
): EncounterRoll {
  const events: string[] = []
  const enc = rollEncounter(state, rng, profile, hcl, events)
  if (profile.major) enc.isFinalBoss = false // WM Majors never Final Boss (p.104)
  return enc
}

/** FADEE p.114: the 1-in-6 Wandering Monsters roll happens AFTER recovery. */
async function rollWanderingAfterRest(
  dungeon: DungeonState,
  rng: Rng,
  party: Character[],
  campaign: { id: string; secrets?: string[] },
): Promise<void> {
  const roll = rng.d(6)
  if (roll !== 1) {
    appendLog([`Rest complete — no Wandering Monsters (rolled ${roll}). (FADEE p.114)`])
    return
  }
  const tableRoll = rng.d(6)
  const table = tableRoll <= 2 ? 'vermin' : tableRoll <= 4 ? 'minions' : tableRoll === 5 ? 'weird' : 'boss'
  const enc = rollEncounterSimple(dungeon, rng, profileFor(table, tableRoll), Math.max(1, ...party.map((p) => p.level)))
  enc.isFinalBoss = false
  const enemies = [
    makeEnemy(enc.monster, enc.table, enc.level, enc.count, lifeFromFormula(enc.level, enc.monster.lifeFormula, enc.monster.flatLife)),
  ]
  const combat = startCombat(dungeon.currentTileId, party.filter((p) => p.status !== 'dead'), enemies, rng, {
    marchingOrder: party.map((p) => p.id),
    secrets: campaign.secrets,
  })
  dungeon.combat = combat
  await persist(dungeon, rng, campaign.id)
  appendLog(['Wandering Monsters burst in as the party rests — but the nailed doors gave the party the first attack! (FADEE p.114)', ...combat.log.map((l) => l.text)])
  await appendEvents(campaign.id, 'combat', combat.log.map((l) => ({ ts: l.ts, text: l.text })))
}

/** Append messages, persist, and stash any player choice (FADEE pp.152-153). */
async function finishFeature(
  state: DungeonState,
  rng: Rng,
  campaignId: string,
  fr: FeatureResult,
  party: Character[],
): Promise<void> {
  state.pendingChoice = fr.choice
    ? { ...fr.choice, prompt: promptFor(fr.choice as PendingChoicePayload, party) }
    : null
  await persist(state, rng, campaignId)
  appendLog(fr.messages)
  await appendEvents(campaignId, 'event', fr.messages.map((text) => ({ ts: Date.now(), text })))
}

/** Same for special events, which may also spawn an ambush or a trap. */
async function finishEvent(
  state: DungeonState,
  rng: Rng,
  campaignId: string,
  er: EventResult,
  party: Character[],
  hcl: number,
  leaderIndex: number,
  questActive = false,
  ladyRefused = false,
): Promise<void> {
  const messages = [...er.messages]
  if (er.trap) {
    const info = TRAP_INFO[er.trap]
    messages.push(`${info.text} (${info.source})`)
    const tr = resolveTrap(rng, party, er.trap, hcl, leaderIndex)
    messages.push(...tr.messages)
    await appendEvents(campaignId, 'event', tr.messages.map((text) => ({ ts: Date.now(), text })))
  }
  state.pendingChoice = er.choice ? { ...er.choice, prompt: promptFor(er.choice as PendingChoicePayload, party) } : null
  void questActive
  void ladyRefused
  await persist(state, rng, campaignId)
  appendLog(messages)
  if (er.ambush) {
    // Wandering Monsters from the events table (FADEE p.153): surprise combat.
    const { profileFor } = await import('../rulesets/expanded/monsters')
    const profile = profileFor(er.ambush.table, er.ambush.tableRoll)
    const enc = rollEncounterSimple(state, rng, profile, er.ambush.hcl)
    const enemies = [
      makeEnemy(
        enc.monster,
        enc.table,
        enc.level,
        enc.count,
        lifeFromFormula(enc.level, enc.monster.lifeFormula, enc.monster.flatLife),
      ),
    ]
    const combat = startCombat(state.currentTileId, party.filter((p) => p.status !== 'dead'), enemies, rng, {
      forceSurprise: true,
    })
    state.combat = combat
    await persist(state, rng, campaignId)
    appendLog(combat.log.map((l) => l.text))
    await appendEvents(campaignId, 'combat', combat.log.map((l) => ({ ts: l.ts, text: l.text })))
  }
}

/** Undo snapshot (PROJECT_SPEC §19): full reversal incl. RNG + journal. */
interface Snapshot {
  label: string
  campaignId: string
  dungeonJson: string | null
  partyJson: string
  meta: { rngState: string; clues?: number; secrets?: string[]; epic?: number[] }
  journalCutoff: number
  logLen: number
}

const UNDO_LIMIT = 5

/** Capture a pre-action snapshot (call FIRST in every mutating action). */
async function snap(label: string, campaignId: string): Promise<void> {
  const st = useDungeonStore.getState()
  const cs = useCampaignStore.getState()
  if (!cs.campaign || cs.campaign.id !== campaignId) return
  const { loadJournal } = await import('../database/repositories/journalRepo')
  const journal = await loadJournal(campaignId)
  const cutoff = journal.length ? journal[journal.length - 1].timestamp + 1 : 0
  st.undoStack = [
    ...st.undoStack.slice(-(UNDO_LIMIT - 1)),
    {
      label,
      campaignId,
      dungeonJson: st.dungeon ? JSON.stringify(st.dungeon) : null,
      partyJson: JSON.stringify(cs.party),
      meta: {
        rngState: cs.campaign.rngState,
        clues: cs.campaign.clues,
        secrets: cs.campaign.secrets,
        epic: cs.campaign.epic,
      },
      journalCutoff: cutoff,
      logLen: st.log.length,
    },
  ]
}

/** Push campaign meta fields into the campaign store (avoid stale reads). */
function syncCampaign(patch: Partial<{ clues: number; secrets: string[]; epic: number[] }>): void {
  const cs = useCampaignStore.getState()
  if (cs.campaign) useCampaignStore.setState({ campaign: { ...cs.campaign, ...patch } })
}

/** Save the party when a combat has concluded (won/lost/fled). */
async function savePartyIfCombatOver(
  dungeon: DungeonState,
  campaignId: string,
  phase: string,
  party: Character[],
): Promise<void> {
  if (phase === 'won' || phase === 'lost' || phase === 'fled') {
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaignId, party)
    // Victory clears the tile's encounter (Resting prerequisite, FADEE p.114).
    if (phase === 'won' && dungeon.combat) {
      const tile = dungeon.tiles.find((t) => t.id === dungeon.currentTileId)
      if (tile?.content) tile.content.cleared = true
    }
    // Secrets consumed in combat (Terrifying) write back (FADEE p.123).
    if (dungeon.combat?.secrets) {
      const cs = useCampaignStore.getState()
      const secrets = dungeon.combat.secrets
      if (JSON.stringify(secrets) !== JSON.stringify(cs.campaign?.secrets)) {
        await touchCampaign(campaignId, { secrets })
        syncCampaign({ secrets })
      }
    }
  }
  void dungeon
}

/** Build a human prompt for the pending choice dialog. */
function promptFor(choice: NonNullable<PendingChoicePayload>, party: Character[]): string {
  const living = party.filter((p) => p.status !== 'dead')
  switch (choice.kind) {
    case 'temple':
      return 'Choose a PC to gain +1 Attack vs. undead and demons (until they kill one).'
    case 'statue':
      return 'Touch the statue (1-3: it awakens; 4-6: it breaks with gold) or leave it alone?'
    case 'puzzle':
      return `Try to solve the puzzle box (L${choice.level}) or leave it alone?`
    case 'ghost':
      return 'For each PC that failed the Save: lose 1 Life or gain 1 Madness?'
    case 'healer':
      return 'The healer heals 1 Life per 10gp. Choose a PC and how many points.'
    case 'alchemist':
      return 'Buy a healing potion (50gp, heals all) or blade poison (30gp, +1 vs. first Foe)?'
    default:
      return 'Choose.'
  }
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
  undoStack: [],
  confirmUndo: null,
  lastTreasure: null,
  pendingXp: null,

  ensureDungeon: async () => {
    const { campaign, party } = useCampaignStore.getState()
    if (!campaign) return
    set({ busy: true, error: null })
    try {
      const existing = await loadDungeon(campaign.id)
      if (existing) {
        // A reload mid-victory restores the unspent roll with the dungeon;
        // without this the XP card never renders and the roll is lost.
        set({ dungeon: existing, busy: false, pendingXp: existing.pendingXp ?? null })
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
    await snap('explore', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign) return
    // XP rolls are assigned before leaving a victory (FADEE p.117): a map
    // exit must not carry an unspent roll out of the room, where it would
    // resurface on a later victory's card or be overwritten by the next win.
    if (get().pendingXp) {
      appendLog([
        'Assign your XP rolls before leaving the room — each roll goes to one adventurer (FADEE p.117).',
      ])
      return
    }
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
        marchingOrder: party.map((p) => p.id),
        secrets: campaign.secrets,
      })
      dungeon.combat = combat
      await persist(dungeon, rng, campaign.id)
      set({
        dungeon: { ...dungeon },
        log: [...get().log, ...combat.log.map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
      })
      await appendEvents(campaign.id, 'combat', combat.log.map((l) => ({ ts: l.ts, text: l.text })))
      return
    }
    // Special feature / special event resolution (FADEE pp.152-153).
    const tile = result.state.tiles.find((t) => t.id === result.state.currentTileId)
    const content = tile?.content
    if (content && !result.state.pendingChoice) {
      const tier = Math.ceil(Math.max(...party.map((p) => p.level)) / 2)
      if (content.kind === 'specialFeature' && content.specialFeatureRoll) {
        const feature = DUNGEON_FEATURES[content.specialFeatureRoll - 1]
        const fr = resolveFeature(
          rng,
          party,
          feature,
          result.state.fountainsSeen ?? 0,
          hcl,
          tier,
        )
        if (feature === 'fountain') result.state.fountainsSeen = (result.state.fountainsSeen ?? 0) + 1
        await finishFeature(result.state, rng, campaign.id, fr, party)
      } else if (content.kind === 'specialEvents' && !content.eventRoll) {
        // Rooms roll the Special Events Table once (FADEE p.152 row 4).
        const event = rollDungeonEvent(rng)
        content.eventRoll = DUNGEON_EVENTS.indexOf(event) + 1
        const er = resolveEvent(
          rng,
          party,
          event,
          hcl,
          !!result.state.healerMet,
          !!result.state.alchemistMet,
        )
        if (event === 'healer') result.state.healerMet = true
        if (event === 'alchemist') result.state.alchemistMet = true
        await finishEvent(result.state, rng, campaign.id, er, party, hcl, 0, !!result.state.quest, !!result.state.ladyRefused)
      }
    }
  },

  beginCombat: async () => {
    await snap('beginCombat', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
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
    const combat = startCombat(
      dungeon.currentTileId,
      party.filter((p) => p.status !== 'dead'),
      enemies,
      rng,
      { marchingOrder: party.map((p) => p.id), secrets: campaign.secrets },
    )
    dungeon.combat = combat
    // A reaction can end the encounter before any blow is struck (FADEE
    // p.91): the foes flee, ignore the party, or parley. The tile is
    // cleared all the same — otherwise no combat action ever runs, the
    // encounter stays uncleared, and Rest (FADEE p.114) is blocked forever
    // in every room next to it. Victory by reaction clears the tile just
    // as victory by sword does (see combatAttack/combatCast below).
    if (combat.phase === 'won') {
      const tile = dungeon.tiles.find((t) => t.id === dungeon.currentTileId)
      if (tile?.content) tile.content.cleared = true
    }
    await persist(dungeon, rng, campaign.id)
    set({
      dungeon: { ...dungeon },
      log: [...get().log, ...combat.log.map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
    })
  },

  combatAttack: async (pcId, enemyId) => {
    await snap('combatAttack', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    const combat = dungeon?.combat
    if (!dungeon || !campaign || !combat) return
    const pc = party.find((p) => p.id === pcId)
    if (!pc) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    pcAttack(combat, rng, pc, enemyId)
    // Victory clears the tile BEFORE persist: persist rewrites the campaign
    // meta, which re-runs DungeonScreen's ensureDungeon and reloads the
    // dungeon from Dexie — a flag set after persist is wiped on that reload
    // (Rest, FADEE p.114, then fails in every room next to this one).
    if (combat.phase === 'won') {
      const t = dungeon.tiles.find((x) => x.id === dungeon.currentTileId)
      if (t?.content) t.content.cleared = true
    }
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
        const t = dungeon.tiles.find((x) => x.id === dungeon.currentTileId)
        if (t?.content) t.content.cleared = true
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
        const xp = rolls > 0 ? { major: rolls, minor: due.minorEncounter, boss: due.finalBoss } : null
        setPendingXp(dungeon, xp)
        // Persist the award with the dungeon: a reload before the roll is
        // assigned must restore it, not drop it.
        await persist(dungeon, rng, campaign.id)
        await appendEvents(campaign.id, 'loot', [
          { ts: Date.now(), text: loot.text },
        ])
      }
    }
  },

  combatCast: async (pcId, spell, enemyId) => {
    await snap('combatCast', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    const combat = dungeon?.combat
    if (!dungeon || !campaign || !combat) return
    const pc = party.find((p) => p.id === pcId)
    if (!pc) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    castSpell(combat, rng, pc, spell, enemyId)
    // Victory clears the tile BEFORE persist (see combatAttack: a flag set
    // after persist is wiped when ensureDungeon reloads from Dexie).
    if (combat.phase === 'won') {
      const t = dungeon.tiles.find((x) => x.id === dungeon.currentTileId)
      if (t?.content) t.content.cleared = true
    }
    await persist(dungeon, rng, campaign.id)
    set({
      dungeon: { ...dungeon },
      log: [...get().log, ...combat.log.slice(-6).map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
    })
    if (combat.phase === 'won' || combat.phase === 'lost') {
      const { saveParty } = await import('../database/repositories/campaignRepo')
      await saveParty(campaign.id, party)
      if (combat.phase === 'won') {
        const t = dungeon.tiles.find((x) => x.id === dungeon.currentTileId)
        if (t?.content) t.content.cleared = true
        // Quest type 1 progress: the named Boss was slain (FADEE p.161).
        if (dungeon.quest && dungeon.quest.roll === 1 && !dungeon.quest.complete) {
          const slainName = combat.enemies[0]?.profile.name
          if (slainName && slainName === dungeon.quest.target) {
            dungeon.quest.progress += 1
            appendLog([`Quest progress: the ${slainName} is slain! Bring its head to the Quest-giver's tile. (FADEE p.161)`])
          }
        }
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
        const xp = rolls > 0 ? { major: rolls, minor: due.minorEncounter, boss: due.finalBoss } : null
        setPendingXp(dungeon, xp)
        // Persist the award with the dungeon: a reload before the roll is
        // assigned must restore it, not drop it.
        await persist(dungeon, rng, campaign.id)
        await appendEvents(campaign.id, 'loot', [{ ts: Date.now(), text: loot.text }])
      }
    }
  },

  combatHeal: async (pcId, targetId) => {
    await snap('combatHeal', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
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

  /** Scroll cast in combat (FADEE p.75): 1 turn; destroys the scroll. */
  combatCastScroll: async (pcId, spell, enemyId) => {
    await snap('combatCastScroll', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    const combat = dungeon?.combat
    if (!dungeon || !campaign || !combat) return
    const pc = party.find((p) => p.id === pcId)
    if (!pc) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    castScroll(combat, rng, pc, spell as ScrollSpell, enemyId)
    // Victory clears the tile BEFORE persist (see combatAttack: a flag set
    // after persist is wiped when ensureDungeon reloads from Dexie).
    if (combat.phase === 'won') {
      const t = dungeon.tiles.find((x) => x.id === dungeon.currentTileId)
      if (t?.content) t.content.cleared = true
    }
    await persist(dungeon, rng, campaign.id)
    set({
      dungeon: { ...dungeon },
      log: [...get().log, ...combat.log.slice(-6).map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
    })
    await savePartyIfCombatOver(dungeon, campaign.id, combat.phase, party)
  },

  /** Healing potion mid-combat: free action, 1 per PC per adventure (p.83). */
  combatPotion: async (pcId) => {
    await snap('combatPotion', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    const combat = dungeon?.combat
    if (!dungeon || !campaign) return
    const pc = party.find((p) => p.id === pcId)
    if (!pc) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    try {
      drinkHealingPotion(combat ?? null, pc)
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) })
      return
    }
    await persist(dungeon, rng, campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    set({
      dungeon: { ...dungeon },
      log: [...get().log, { ts: Date.now(), text: `${pc.name} drinks a healing potion (free action, FADEE p.83).` }].slice(-100),
    })
  },

  combatWait: async () => {
    await snap('combatWait', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign } = useCampaignStore.getState()
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
    await snap('combatPayBribe', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    const combat = dungeon?.combat
    if (!dungeon || !campaign || !combat || !combat.pendingBribe) return
    payBribe(combat, party)
    // Non-violent encounter (FADEE p.161, Quest type 5): bribes count.
    dungeon.nonViolentTally = (dungeon.nonViolentTally ?? 0) + 1
    if (dungeon.quest?.roll === 5 && !dungeon.quest.complete) {
      dungeon.quest.progress = dungeon.nonViolentTally
      if (dungeon.quest.progress >= 3) {
        appendLog([`Quest progress: 3 non-violent encounters — the peace Quest is complete! (FADEE p.161)`])
      } else {
        appendLog([`Quest progress: ${dungeon.quest.progress}/3 non-violent encounters. (FADEE p.161)`])
      }
    }
    await persist(dungeon, Rng.deserialize(JSON.parse(campaign.rngState)), campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    set({
      dungeon: { ...dungeon },
      log: [...get().log, ...combat.log.slice(-6).map((l) => ({ ts: l.ts, text: l.text }))].slice(-100),
    })
  },

  combatFlee: async () => {
    await snap('combatFlee', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
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

  /**
   * Leave a concluded combat behind and return to the room's tile actions.
   * The victory panel otherwise stays up with no dismiss: the tile panel
   * (Rest, Search) is replaced by the combat panel whenever dungeon.combat
   * exists, and the only other exits are explore() and combatFlee() — both
   * leave the room. A win must not trap the player in the room they just
   * cleared. Mutate first, then persist (same order as the Milestone 4
   * cleared-flag fix: persist reloads the dungeon from Dexie, so a flag
   * set after persist would be wiped). An unspent XP roll holds the party
   * here: both exits refuse while pendingXp is set, so the roll is spent
   * from the victory card before leaving (FADEE p.117).
   */
  leaveCombat: async () => {
    await snap('leaveCombat', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign } = useCampaignStore.getState()
    if (!dungeon || !campaign || !dungeon.combat) return
    if (!canLeaveCombat(dungeon.combat.phase)) return
    // Backstop for the disabled button: an unspent roll holds the party in
    // the room until it is assigned (FADEE p.117).
    if (get().pendingXp) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    dungeon.combat = null
    await persist(dungeon, rng, campaign.id)
    set({ dungeon: { ...dungeon } })
  },

  spendXpRoll: async (pcId) => {
    await snap('spendXpRoll', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
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
    // Consume one available roll (Major/boss rolls are per-kill; minors accrue).
    // Mirror into the dungeon record so a reload after spending keeps the
    // remaining count; the persist below saves it.
    const { pendingXp } = get()
    if (pendingXp) {
      const remaining = pendingXp.major > 0 ? pendingXp.major - 1 : 0
      dungeon.pendingXp = remaining > 0 ? { ...pendingXp, major: remaining } : null
      set({ pendingXp: dungeon.pendingXp })
    }
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    await persist(dungeon, rng, campaign.id)
    set({ log: [...get().log, ...entries].slice(-100) })
  },

  search: async () => {
    await snap('search', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign } = useCampaignStore.getState()
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
    await snap('claimFind', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon, pendingFind } = get()
    const { campaign } = useCampaignStore.getState()
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
      // Milestone 5 (C4): the found door is drawn on the map as a badge on
      // this tile. Display only — the engine adds no exit for it.
      const foundTile = dungeon.tiles.find((t) => t.id === pendingFind.tileId)
      if (foundTile) foundTile.secretDoorFound = true
      set({ dungeon })
    } else {
      const cs = useCampaignStore.getState()
      if (cs.campaign) {
        const clues = (cs.campaign.clues ?? 0) + 1
        await touchCampaign(cs.campaign.id, { clues })
        useCampaignStore.setState({ campaign: { ...cs.campaign, clues } })
        entries.push({ ts: Date.now(), text: `The party gains 1 Clue (pool: ${clues}). (FADEE p.108)` })
      }
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

  // ---------- feature/event choices (FADEE pp.152-153) ----------

  chooseTemple: async (pcId) => {
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign || dungeon.pendingChoice?.kind !== 'temple') return
    const pc = party.find((p) => p.id === pcId)
    if (!pc || pc.status === 'dead') return
    pc.conditions.push('temple-blessing')
    dungeon.pendingChoice = null
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    await persist(dungeon, rng, campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    appendLog([`${pc.name} receives the temple blessing: +1 Attack vs. undead and demons until they slay one. (FADEE p.152)`])
    await appendEvents(campaign.id, 'event', [{ ts: Date.now(), text: `Temple blessing on ${pc.name} (FADEE p.152)` }])
  },

  statueTouch: async (touch) => {
    await snap('statueTouch', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign || dungeon.pendingChoice?.kind !== 'statue') return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    const choice = dungeon.pendingChoice
    dungeon.pendingChoice = null
    if (!touch) {
      await persist(dungeon, rng, campaign.id)
      appendLog(['The party leaves the statue alone. (FADEE p.152)'])
      await appendEvents(campaign.id, 'event', [{ ts: Date.now(), text: 'Statue left alone (FADEE p.152)' }])
      return
    }
    const majorTally = dungeon.majorFoesMet
    const sr = touchStatue(rng, choice.hcl ?? 1, choice.tier ?? 1, majorTally)
    if (sr.combat) {
      // Living statue: Major Foe; tally it for future Final Boss rolls.
      dungeon.majorFoesMet += 1
      const enemies = sr.combat.enemies.map((e) =>
        makeEnemy(
          {
            roll: 1,
            name: e.profile.name,
            family: 'construct',
            category: e.profile.category ?? 'Artificial',
            levelOffset: 0,
            countFormula: '1',
            lifeFormula: undefined,
            flatLife: e.life,
            attacks: 1,
            treasure: e.profile.treasure,
            major: true,
            special: [],
            reactions: ['Always fight to the death (living statue, FADEE p.152)'],
            source: 'FADEE p.152',
          },
          'boss',
          e.level,
          e.count,
          e.life,
        ),
      )
      enemies[0].isFinalBossFlag = !!sr.combat.isFinalBoss
      const combat = startCombat(dungeon.currentTileId, party.filter((p) => p.status !== 'dead'), enemies, rng, {
        forceSurprise: false,
        marchingOrder: party.map((p) => p.id),
        secrets: campaign.secrets,
      })
      dungeon.combat = combat
      await persist(dungeon, rng, campaign.id)
      appendLog([...sr.messages, ...combat.log.map((l) => l.text)])
      await appendEvents(campaign.id, 'event', sr.messages.map((text) => ({ ts: Date.now(), text })))
    } else {
      if (sr.gold) {
        const living = party.filter((p) => p.status !== 'dead')
        const each = Math.floor(sr.gold / Math.max(1, living.length))
        living.forEach((p) => (p.gold += each))
      }
      await persist(dungeon, rng, campaign.id)
      const { saveParty } = await import('../database/repositories/campaignRepo')
      await saveParty(campaign.id, party)
      appendLog(sr.messages)
      await appendEvents(campaign.id, 'loot', sr.messages.map((text) => ({ ts: Date.now(), text })))
    }
  },

  puzzleAttempt: async (pcId, solve) => {
    await snap('puzzleAttempt', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign || dungeon.pendingChoice?.kind !== 'puzzle') return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    const level = dungeon.pendingChoice.level ?? 1
    dungeon.pendingChoice = null
    if (!solve) {
      await persist(dungeon, rng, campaign.id)
      appendLog(['The party leaves the puzzle box alone. (FADEE p.152)'])
      return
    }
    const pc = party.find((p) => p.id === pcId && p.status !== 'dead')
    if (!pc) return
    const pr = attemptPuzzle(rng, pc, level)
    if (pr.gold) {
      const living = party.filter((p) => p.status !== 'dead')
      const each = Math.floor(pr.gold / Math.max(1, living.length))
      living.forEach((p) => (p.gold += each))
    }
    await persist(dungeon, rng, campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    appendLog(pr.messages)
    await appendEvents(campaign.id, 'event', pr.messages.map((text) => ({ ts: Date.now(), text })))
  },

  ghostPick: async (pcId, gainMadness) => {
    await snap('ghostPick', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign || dungeon.pendingChoice?.kind !== 'ghost') return
    const pc = party.find((p) => p.id === pcId)
    if (!pc) return
    const entries: string[] = []
    if (gainMadness) {
      // Madness: 1 point now; L1-4 PCs may take 2 damage instead — the player
      // already chose Madness here (FADEE p.113).
      const m = (pc.conditions.find((c) => c.startsWith('madness')) ?? 'madness:0')
      const n = parseInt(m.split(':')[1] ?? '0', 10) + 1
      pc.conditions = pc.conditions.filter((c) => !c.startsWith('madness'))
      pc.conditions.push(`madness:${n}`)
      entries.push(`${pc.name} gains 1 Madness (total ${n}). (FADEE p.153, 112)`)
    } else {
      pc.currentLife = Math.max(0, pc.currentLife - 1)
      if (pc.currentLife === 0) pc.status = 'dead'
      entries.push(`${pc.name} loses 1 Life (${pc.currentLife}/${pc.maxLife}). (FADEE p.153)`)
    }
    const remaining = (dungeon.pendingChoice.pcIds ?? []).filter((id) => id !== pcId)
    dungeon.pendingChoice = remaining.length
      ? { ...dungeon.pendingChoice, pcIds: remaining }
      : null
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    await persist(dungeon, rng, campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    appendLog(entries)
    await appendEvents(campaign.id, 'event', entries.map((text) => ({ ts: Date.now(), text })))
  },

  healerHeal: async (pcId, points) => {
    await snap('healerHeal', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign || dungeon.pendingChoice?.kind !== 'healer') return
    const pc = party.find((p) => p.id === pcId && p.status !== 'dead')
    if (!pc || points < 1) return
    const cost = points * 10
    if (pc.gold < cost) {
      set({ error: `${pc.name} has only ${pc.gold}gp (healing costs ${cost}gp).` })
      return
    }
    const healed = Math.min(points, pc.maxLife - pc.currentLife)
    pc.gold -= healed * 10
    pc.currentLife += healed
    dungeon.pendingChoice = null
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    await persist(dungeon, rng, campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    appendLog([`The wandering healer restores ${healed} Life on ${pc.name} for ${healed * 10}gp. (FADEE p.153)`])
    await appendEvents(campaign.id, 'event', [{ ts: Date.now(), text: `Healer: ${pc.name} +${healed} Life for ${healed * 10}gp (FADEE p.153)` }])
  },

  alchemistBuy: async (pcId, item) => {
    await snap('alchemistBuy', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign || dungeon.pendingChoice?.kind !== 'alchemist') return
    const pc = party.find((p) => p.id === pcId && p.status !== 'dead')
    if (!pc) return
    const price = item === 'healing potion' ? 50 : 30
    if (pc.gold < price) {
      set({ error: `${pc.name} has only ${pc.gold}gp (${item} costs ${price}gp).` })
      return
    }
    pc.gold -= price
    if (item === 'healing potion') {
      pc.equipment.push('healing potion')
    } else {
      pc.equipment.push('blade poison')
    }
    dungeon.pendingChoice = null
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    await persist(dungeon, rng, campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    appendLog([`${pc.name} buys ${item} for ${price}gp from the wandering alchemist. (FADEE p.153)`])
    await appendEvents(campaign.id, 'loot', [{ ts: Date.now(), text: `Alchemist: ${pc.name} buys ${item} for ${price}gp (FADEE p.153)` }])
  },

  // ---------- Secrets (FADEE pp.122-123) ----------

  /** Step 1: spend 3 Clues, choose the Secret type. */
  beginSecretReveal: async () => {
    const { dungeon } = get()
    const { campaign } = useCampaignStore.getState()
    if (!dungeon || !campaign) return
    if ((campaign.clues ?? 0) < 3) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    await touchCampaign(campaign.id, { clues: (campaign.clues ?? 0) - 3 })
    syncCampaign({ clues: (campaign.clues ?? 0) - 3 })
    await persist(dungeon, rng, campaign.id)
    dungeon.pendingChoice = {
      kind: 'secret',
      source: 'FADEE pp.122-123',
      prompt: 'Choose a Secret to reveal (the discovering PC then immediately gains 1 XP roll).',
    }
    set({ dungeon: { ...dungeon } })
  },

  /** Step 2: the chosen Secret → pick the discovering PC. */
  pickSecret: async (secretId, arg) => {
    const { dungeon } = get()
    if (!dungeon || dungeon.pendingChoice?.kind !== 'secret') return
    dungeon.pendingChoice = {
      kind: 'secretPc',
      source: 'FADEE p.122',
      prompt: 'Who discovers the Secret? (That PC immediately gains 1 XP roll.)',
    }
    // carry the pending secret type on the dungeon until the PC is picked
    set({ dungeon: { ...dungeon }, pendingSecret: { id: secretId, arg } } as never)
  },

  /** Step 3: the PC rolls XP immediately (FADEE p.122). */
  pickSecretPc: async (pcId) => {
    const { dungeon, pendingSecret } = get() as { dungeon: DungeonState | null; pendingSecret?: { id: string; arg?: string } }
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign || !pendingSecret) return
    const pc = party.find((p) => p.id === pcId && p.status !== 'dead')
    if (!pc) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    const roll = rng.d(6)
    const success = roll > pc.level || roll === 6
    const entries: string[] = [`Secret XP roll for ${pc.name}: d6=${roll} vs L${pc.level} → ${success ? 'LEVEL UP!' : 'no level'} (FADEE p.122)`]
    if (success) {
      pc.level += 1
      pc.maxLife += 1
      pc.currentLife += 1
    }
    if (pendingSecret.id === 'weakness') {
      // species chosen next
      dungeon.pendingChoice = {
        kind: 'secretWeakness',
        source: 'FADEE p.122',
        prompt: 'Pick the Major Foe species whose weakness is now known.',
      }
    } else {
      const encoded = pendingSecret.arg ? `${pendingSecret.id}:${pendingSecret.arg}` : pendingSecret.id
      const cs = useCampaignStore.getState()
      const secrets = [...(cs.campaign?.secrets ?? []), encoded]
      await touchCampaign(campaign.id, { secrets })
      syncCampaign({ secrets })
      entries.push(`Secret revealed: ${pendingSecret.id}${pendingSecret.arg ? ` (${pendingSecret.arg})` : ''}. (FADEE pp.122-123)`)
      dungeon.pendingChoice = null
    }
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    await persist(dungeon, rng, campaign.id)
    set({ pendingSecret: undefined, dungeon: { ...dungeon }, log: [...get().log, ...entries.map((text) => ({ ts: Date.now(), text }))].slice(-100) } as never)
    await appendEvents(campaign.id, 'event', entries.map((text) => ({ ts: Date.now(), text })))
  },

  /** Weakness target selection completes the Weakness secret. */
  pickWeaknessTarget: async (species) => {
    const { dungeon } = get()
    const { campaign } = useCampaignStore.getState()
    if (!dungeon || !campaign || dungeon.pendingChoice?.kind !== 'secretWeakness') return
    const cs = useCampaignStore.getState()
    const secrets = [...(cs.campaign?.secrets ?? []), `weakness:${species}`]
    await touchCampaign(campaign.id, { secrets })
    syncCampaign({ secrets })
    dungeon.pendingChoice = null
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    await persist(dungeon, rng, campaign.id)
    appendLog([`Weakness of a Foe: every PC attacks ${species} at +2 in whole combats. (FADEE p.122)`])
    await appendEvents(campaign.id, 'event', [{ ts: Date.now(), text: `Secret: Weakness of ${species} (FADEE p.122)` }])
  },

  /** Location secrets: usable from the dungeon panel in the right tile. */
  pickSecretItem: async (itemName) => {
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign) return
    // consume the item-location secret
    const cs = useCampaignStore.getState()
    const secrets = (cs.campaign?.secrets ?? []).filter((s) => s !== 'item-location')
    await touchCampaign(campaign.id, { secrets })
    syncCampaign({ secrets })
    const carrier = party.find((p) => p.status !== 'dead')
    if (carrier) carrier.equipment.push(itemName)
    dungeon.pendingChoice = null
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    await persist(dungeon, rng, campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    appendLog([`Secret password spoken: ${itemName} is revealed! (FADEE p.122)`])
    await appendEvents(campaign.id, 'loot', [{ ts: Date.now(), text: `Item-location secret: ${itemName} (FADEE p.122)` }])
  },

  /** Open the item-choice dialog for the item-location secret (FADEE p.122). */
  beginSecretItem: async () => {
    const { dungeon } = get()
    if (!dungeon || dungeon.pendingChoice) return
    dungeon.pendingChoice = {
      kind: 'secretItem',
      source: 'FADEE p.122',
      prompt: 'Speak the password — which magic item appears?',
    }
    set({ dungeon: { ...dungeon } })
  },

  useTreasureLocation: async () => {
    await snap('useTreasureLocation', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign) return
    const tile = dungeon.tiles.find((t) => t.id === dungeon.currentTileId)
    if (!tile || tile.contentRoll === null || tile.content?.encounter) return
    const cs = useCampaignStore.getState()
    const secrets = (cs.campaign?.secrets ?? []).filter((s) => s !== 'treasure-location')
    await touchCampaign(campaign.id, { secrets })
    syncCampaign({ secrets })
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    const gold = rng.roll(3, 6, 0, 'treasure-location 3d6 (FADEE p.122)') * 10
    const living = party.filter((p) => p.status !== 'dead')
    const each = Math.floor(gold / Math.max(1, living.length))
    living.forEach((p) => (p.gold += each))
    await persist(dungeon, rng, campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    appendLog([`The password opens a wall niche: ${gold} gp! (FADEE p.122)`])
    await appendEvents(campaign.id, 'loot', [{ ts: Date.now(), text: `Treasure-location secret: ${gold} gp (FADEE p.122)` }])
  },

  // ---------- Resting (FADEE pp.113-114) ----------

  rest: async () => {
    await snap('rest', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign) return
    const tile = dungeon.tiles.find((t) => t.id === dungeon.currentTileId)
    if (!tile) return
    const nails = party.reduce((n, p) => n + p.equipment.filter((e) => e === 'bag of nails').length, 0)
    // Neighbors: every linked exit's target must be explored and cleared.
    const neighborsCleared = tile.exits
      .filter((e) => e.toTileId)
      .every((e) => {
        const t = dungeon.tiles.find((x) => x.id === e.toTileId)
        return !!t && (!t.content?.encounter || t.content.cleared === true)
      })
    const check = canRest({
      doorCount: tile.exits.length,
      neighborsCleared,
      tileCleared: !tile.content?.encounter || tile.content.cleared === true,
      nailsHeld: nails,
      alreadyRested: dungeon.rested === true,
    })
    if (!check.ok) {
      set({ error: check.reason })
      return
    }
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    const outcome = beginRest(party, tile.exits.length)
    dungeon.rested = true
    // If nobody has anything to recover, there is no pick to make — opening
    // the rest dialog with an empty list would leave an undismissable
    // overlay over the whole app. Go straight to the wandering-monster roll.
    if (outcome.pendingPcIds.length > 0) {
      dungeon.pendingChoice = {
        kind: 'rest',
        source: 'FADEE p.114',
        pcIds: outcome.pendingPcIds,
        prompt: 'Each PC recovers 1 Life or 1 spent ability (spell or prayer).',
      }
    } else {
      dungeon.pendingChoice = null
    }
    await persist(dungeon, rng, campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    appendLog(outcome.messages)
    await appendEvents(campaign.id, 'event', outcome.messages.map((text) => ({ ts: Date.now(), text })))
    if (outcome.pendingPcIds.length === 0) {
      await rollWanderingAfterRest(dungeon, rng, party, campaign)
    }
  },

  restPick: async (pcId, choice) => {
    await snap('restPick', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign || dungeon.pendingChoice?.kind !== 'rest') return
    const pc = party.find((p) => p.id === pcId && p.status !== 'dead')
    if (!pc) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    const msg = applyRestChoice(pc, choice, rng)
    const remaining = (dungeon.pendingChoice.pcIds ?? []).filter((id) => id !== pcId)
    dungeon.pendingChoice = remaining.length
      ? { ...dungeon.pendingChoice, pcIds: remaining }
      : null
    await persist(dungeon, rng, campaign.id)
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    appendLog([msg])
    // FADEE p.114: the 1-in-6 WM roll happens AFTER recovery; nailed doors
    // (always required here) mean the party attacks first even if surprised.
    if (!remaining.length) {
      await rollWanderingAfterRest(dungeon, rng, party, campaign)
    }
  },

  /** Outfitter purchase (between adventures, FADEE pp.82-85). */
  buyItem: async (pcId, item) => {
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!campaign) return
    const pc = party.find((p) => p.id === pcId && p.status !== 'dead')
    const info = ITEM_INFO[item]
    if (!pc || !info) return
    if (pc.gold < info.price) {
      set({ error: `${pc.name} has only ${pc.gold}gp (${item} costs ${info.price}gp).` })
      return
    }
    pc.gold -= info.price
    pc.equipment.push(item)
    const rng = dungeon && campaign ? Rng.deserialize(JSON.parse(campaign.rngState)) : null
    if (dungeon) await persist(dungeon, rng!, campaign.id)
    else await touchCampaign(campaign.id, {})
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    appendLog([`${pc.name} buys ${item} for ${info.price}gp at the outfitter. (FADEE pp.82-85)`])
  },

  // ---------- Quests (FADEE pp.153, 161-163) ----------

  questAccept: async () => {
    await snap('questAccept', useCampaignStore.getState().campaign?.id ?? '')
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign || dungeon.pendingChoice?.kind !== 'quest') return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    const roll = rng.d(6)
    let target = ''
    let amount = 0
    if (roll === 1 || roll === 3) {
      // Roll on any Boss Monster Table to select the target (p.161).
      target = profileFor('boss', rng.d(6)).name
    } else if (roll === 2) {
      amount = rng.roll(1, 6, 0, 'quest gold d6 (p.161)') * 50
      const held = party.reduce((n, p) => n + p.gold, 0)
      if (held >= amount) amount *= 2 // already carrying it: double (p.161)
    }
    dungeon.quest = { roll, target, amount, giverTileId: dungeon.currentTileId, progress: 0, complete: false }
    dungeon.pendingChoice = null
    await persist(dungeon, rng, campaign.id)
    appendLog([`Quest accepted: ${QUEST_TABLE[roll - 1]} (${QUEST_SOURCES[roll]})`])
    await appendEvents(campaign.id, 'event', [{ ts: Date.now(), text: `Quest ${roll} accepted: ${dungeon.quest.target || dungeon.quest.amount || ''}` }])
  },

  questDecline: async () => {
    const { dungeon } = get()
    const { campaign } = useCampaignStore.getState()
    if (!dungeon || !campaign || dungeon.pendingChoice?.kind !== 'quest') return
    dungeon.ladyRefused = true
    dungeon.pendingChoice = null
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    await persist(dungeon, rng, campaign.id)
    appendLog(['The party refuses the Quest; the Lady disappears. (FADEE p.153)'])
  },

  /** Claim the reward at the Quest-giver's tile (types 1/2) or anywhere (5/6). */
  claimQuest: async () => {
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign || !dungeon.quest || dungeon.quest.complete) return
    const q = dungeon.quest
    const atGiver = dungeon.currentTileId === q.giverTileId
    let eligible = false
    if (q.roll === 1) eligible = q.progress > 0 && atGiver
    else if (q.roll === 2) {
      const held = party.reduce((n, p) => n + p.gold, 0)
      eligible = held >= q.amount && atGiver
    }
    else if (q.roll === 5) eligible = q.progress >= 3
    else if (q.roll === 6) {
      // Interpretation (noted in RULES_VERIFICATION): layout complete = no
      // unexplored exits remain anywhere and every tile is cleared.
      const allCleared = dungeon.tiles.every((t) => !t.content?.encounter || t.content.cleared === true)
      const noOpen = dungeon.tiles.every((t) => t.exits.every((e) => e.toTileId))
      eligible = allCleared && noOpen
    }
    else eligible = false // types 3/4: capture/retrieval mechanics pending
    if (!eligible) {
      set({ error: 'The Quest is not complete yet (or you are not at the Quest-giver’s tile).' })
      return
    }
    dungeon.pendingChoice = {
      kind: 'questPc',
      source: 'FADEE p.153',
      prompt: 'Quest complete! Choose the PC who gains 1 XP (and the Enchanted weapon, if that is the reward).',
    }
    set({ dungeon: { ...dungeon } })
  },

  questPcPick: async (pcId) => {
    const { dungeon } = get()
    const { campaign, party } = useCampaignStore.getState()
    if (!dungeon || !campaign || dungeon.pendingChoice?.kind !== 'questPc') return
    const pc = party.find((p) => p.id === pcId && p.status !== 'dead')
    if (!pc) return
    const rng = Rng.deserialize(JSON.parse(campaign.rngState))
    // 1 XP: immediate roll (FADEE p.153)
    const roll = rng.d(6)
    const success = roll > pc.level || roll === 6
    const entries = [`Quest XP roll for ${pc.name}: d6=${roll} vs L${pc.level} → ${success ? 'LEVEL UP!' : 'no level'} (FADEE p.153)`]
    if (success) {
      pc.level += 1
      pc.maxLife += 1
      pc.currentLife += 1
    }
    // Epic Rewards roll (FADEE pp.162-163)
    const epicRoll = rng.d(6)
    const reward = EPIC_REWARDS.find((r) => r.roll === epicRoll)!
    const cs = useCampaignStore.getState()
    const epic = [...(cs.campaign?.epic ?? []), epicRoll]
    await touchCampaign(campaign.id, { epic })
    syncCampaign({ epic })
    const carrier = party.find((p) => p.status !== 'dead') ?? pc
    entries.push(`Epic reward (d6=${epicRoll}): ${reward.name} — ${reward.text} (${reward.source})`)
    if (epicRoll === 1) {
      // The Book counts as 1 scroll of each basic spell (p.162).
      for (const sp of ['blessing', 'escape', 'lightning', 'fireball', 'protection', 'sleep']) {
        carrier.equipment.push(`scroll of ${sp}`)
      }
    } else if (epicRoll === 3) {
      pc.conditions.push('enchanted-weapon')
    } else if (epicRoll === 4 || epicRoll === 5) {
      carrier.equipment.push(reward.name.toLowerCase())
      if (epicRoll === 5) {
        // destined target: roll on any Major Foe table (p.162)
        const species = profileFor('boss', rng.d(6)).name
        entries.push(`The arrow of slaying is destined for: ${species}.`)
      }
    } else if (epicRoll === 6) {
      const cleric = party.find((p) => p.classId === 'cleric' && p.status !== 'dead')
      if (cleric) cleric.conditions.push('holy-symbol')
      else carrier.equipment.push('holy symbol of healing')
    }
    dungeon.quest = null
    dungeon.pendingChoice = null
    const { saveParty } = await import('../database/repositories/campaignRepo')
    await saveParty(campaign.id, party)
    await persist(dungeon, rng, campaign.id)
    set({ dungeon: { ...dungeon }, log: [...get().log, ...entries.map((text) => ({ ts: Date.now(), text }))].slice(-100) })
    await appendEvents(campaign.id, 'event', entries.map((text) => ({ ts: Date.now(), text })))
  },

  // ---------- Undo (PROJECT_SPEC §19) ----------

  requestUndo: () => {
    const { undoStack } = get()
    if (!undoStack.length) {
      set({ error: 'Nothing to undo yet.' })
      return
    }
    // Every undo is treated as major (it can reverse a combat round, a death
    // or a treasure roll): explicit confirmation per PROJECT_SPEC §19.
    set({ confirmUndo: { label: undoStack[undoStack.length - 1].label } })
  },

  cancelUndo: () => set({ confirmUndo: null }),

  performUndo: async () => {
    const { undoStack } = get()
    const { campaign } = useCampaignStore.getState()
    const snap = undoStack[undoStack.length - 1]
    set({ confirmUndo: null })
    if (!snap || !campaign || campaign.id !== snap.campaignId) return
    // Restore Dexie first (party + dungeon + meta + journal cutoff).
    const { saveParty } = await import('../database/repositories/campaignRepo')
    const party = JSON.parse(snap.partyJson) as Character[]
    await saveParty(snap.campaignId, party)
    const metaPatch = { rngState: snap.meta.rngState, clues: snap.meta.clues, secrets: snap.meta.secrets, epic: snap.meta.epic }
    await touchCampaign(snap.campaignId, metaPatch)
    const { loadJournal, deleteEventsAfter } = await import('../database/repositories/journalRepo')
    await deleteEventsAfter(snap.campaignId, snap.journalCutoff)
    if (snap.dungeonJson) {
      await saveDungeon(snap.campaignId, JSON.parse(snap.dungeonJson))
    }
    useCampaignStore.setState({
      campaign: { ...campaign, ...metaPatch },
      party,
    })
    const dungeon = snap.dungeonJson ? (JSON.parse(snap.dungeonJson) as DungeonState) : null
    useDungeonStore.setState({
      dungeon,
      undoStack: undoStack.slice(0, -1),
    })
    useDungeonStore.setState((st) => ({
      log: st.log.slice(0, snap.logLen),
    }))
  },

  clearError: () => set({ error: null }),
}))

export { openExits, currentTile }
