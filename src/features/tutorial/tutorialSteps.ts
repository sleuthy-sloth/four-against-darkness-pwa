/**
 * The how-to-play tutorial step machine (Milestone 4).
 *
 * Pure data + predicates — no React, no stores — so the transitions are
 * unit-testable. The coach (TutorialCoach.tsx) renders the current step and
 * advances it; this file only decides WHAT each step teaches and WHEN it
 * counts as done.
 *
 * Two kinds of step:
 *   - `tap`: a teaching line the player reads, then taps Continue. The
 *     coach shows a "go there" note until the player is on the step's route.
 *   - `event`: the player does the thing in the real game (explores a tile,
 *     wins a fight, searches a room...). The step is satisfied by the live
 *     game state, never by a fake. If the player already did the thing
 *     before the step became current, the coach shows Continue instead of
 *     auto-advancing past unread teaching.
 *
 * Rules discipline: every rule stated here is checked against the engine or
 * docs/RULES_VERIFICATION.md. Page cites are the book's own (FADEE).
 */

export interface TutorialSnapshot {
  route: string
  partySize: number
  /** Tiles in the current dungeon (1 = the starting room). */
  tiles: number
  /** Some tile holds an uncleared encounter right now. */
  encounterPresent: boolean
  /** A combat is in progress (any phase). */
  combatActive: boolean
  /** A combat ended won, lost, or fled. */
  combatResolved: boolean
  /** Some tile's encounter was cleared (a fight was won there). */
  encounterCleared: boolean
  /** Some tile has been searched. */
  searched: boolean
  /** The party rested this adventure. */
  rested: boolean
}

export type TutorialAdvance = 'tap' | 'event'

export interface TutorialStep {
  id: string
  title: string
  /** One short teaching line, ledger/manuscript voice, plain language. */
  body: string
  /** Shown while the player still has to do the thing (event steps). */
  hint?: string
  /** Shown when the step teaches on another route (tap steps). */
  goThereHint?: string
  advance: TutorialAdvance
  /** Route the step teaches on; undefined = any route. */
  route?: string
  /** Label for the tap action. */
  cta?: string
  /** Where the tap action navigates; undefined = stay put. */
  goTo?: string
  /** Event steps: true when the player has done the thing. */
  satisfied?: (snap: TutorialSnapshot) => boolean
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the delve',
    body: 'Four Against Darkness is a solo dungeon crawl: four adventurers, one torch, and a dungeon that does not care that you are new. Go in, find the Final Boss, slay it, and come out alive — that is the whole game.',
    advance: 'tap',
    route: '/campaign',
    cta: 'Begin the delve',
    goTo: '/party',
  },
  {
    id: 'party',
    title: 'Your party',
    body: 'Four delvers, each with a class, a Life total, and a place in the marching order — the leader fights first in corridors. Torsten carries four bags of nails; you will want them later. Tap a portrait to see what each one can do.',
    advance: 'tap',
    route: '/party',
    cta: 'Enter the dungeon',
    goTo: '/dungeon',
  },
  {
    id: 'explore',
    title: 'The map',
    body: 'Each tile is a room or a corridor. Tap a glowing exit — the torch disc — to step through; the dungeon draws the next tile and rolls what is inside. A way that leads nowhere is a dead end: try another exit.',
    hint: 'Tap a glowing exit disc on the map.',
    advance: 'event',
    route: '/dungeon',
    satisfied: (s) => s.tiles >= 2,
  },
  {
    id: 'room',
    title: 'Reading a room',
    body: 'The tile\u2019s label tells you its shape; the icons tell you what is here — a chest for treasure, a skull for the boss, a fountain for a feature. The panel below the map says what your party can do in this room.',
    advance: 'tap',
    route: '/dungeon',
    cta: 'Onward',
  },
  {
    id: 'encounter',
    title: 'Something lives here',
    body: 'Sooner or later, Foes. The encounter card shows what they are and their level — the number your attacks must beat. You can fight, or flee and live to delve another day.',
    hint: 'Keep exploring — when Foes appear, tap Engage.',
    advance: 'event',
    route: '/dungeon',
    satisfied: (s) =>
      s.encounterPresent || s.combatActive || s.combatResolved || s.encounterCleared,
  },
  {
    id: 'combat',
    title: 'Fighting',
    body: 'Attack: roll your Tier die plus class bonuses — hit if you meet the Foe\u2019s level, and the die explodes on its highest face. Defence: roll HIGHER than the Foe\u2019s level, or take 1 damage; a natural 1 always fails. Minor Foes have 1 Life each; a hero at 0 Life is dead.',
    hint: 'Fight the combat — choose attackers and roll.',
    advance: 'event',
    route: '/dungeon',
    satisfied: (s) => s.combatResolved || (!s.combatActive && s.encounterCleared),
  },
  {
    id: 'treasure',
    title: 'Treasure and searching',
    body: 'An empty room can be searched once — you may find hidden gold. A chest icon means treasure is here, though the full loot tables arrive in a later release. Search the room you are standing in.',
    hint: 'In an empty room, tap \u201cSearch this tile\u201d.',
    advance: 'event',
    route: '/dungeon',
    satisfied: (s) => s.searched,
  },
  {
    id: 'rest',
    title: 'Resting',
    body: 'Once per adventure, in a room cleared of Foes whose neighbours are explored and cleared, the party can rest — nailing the doors shut, one bag of nails per door. Each delver recovers 1 Life or 1 spent ability; then a wandering-monster roll follows. An empty room counts as cleared — rest where you stand.',
    hint: 'In a cleared or empty room, tap \u201cRest here\u201d.',
    advance: 'event',
    route: '/dungeon',
    satisfied: (s) => s.rested,
  },
  {
    id: 'journal',
    title: 'The journal',
    body: 'Every roll, every find, every fall is written down here — the delve\u2019s own chronicle, beginning with the backstory that brought your party below. The filters let you read one kind of entry at a time.',
    advance: 'tap',
    route: '/journal',
    goThereHint: 'Tap the Journal tab below to see the delve\u2019s chronicle.',
    cta: 'Got it',
  },
  {
    id: 'inventory',
    title: 'Your packs',
    body: 'Everything the party carries — weapons, armour, rope, rations, and Torsten\u2019s nails — lives here, with the party\u2019s gold counted in brass. Between delves, spend it at the Outfitter.',
    advance: 'tap',
    route: '/inventory',
    goThereHint: 'Tap the Inventory tab below to open the packs.',
    cta: 'Got it',
  },
  {
    id: 'goal',
    title: 'The goal',
    body: 'Somewhere below is the Final Boss — the dungeon\u2019s heart. Each Major Foe you meet brings it closer: roll a d6, add 1 for every Major Foe met so far, and on a 6 or more the next Major Foe IS the Final Boss. Slay it, then leave the dungeon alive. The Lady in White may offer a quest along the way — a second goal, if you want it.',
    advance: 'tap',
    route: '/dungeon',
    cta: 'Delve on',
  },
  {
    id: 'handoff',
    title: 'The training wheels are off',
    body: 'That is the whole of it — explore, fight, search, rest, and keep the journal. This campaign is now yours, like any other: the dungeon, the dice, and the choices are all real, and the tutorial will not appear again. Good delving.',
    advance: 'tap',
    route: '/dungeon',
    cta: 'Start delving',
  },
]

export function getTutorialStep(id: string): TutorialStep | undefined {
  return TUTORIAL_STEPS.find((s) => s.id === id)
}

/** The step after `id`, or null when `id` is the last step. */
export function nextTutorialStepId(id: string): string | null {
  const i = TUTORIAL_STEPS.findIndex((s) => s.id === id)
  if (i < 0 || i + 1 >= TUTORIAL_STEPS.length) return null
  return TUTORIAL_STEPS[i + 1].id
}

export function tutorialStepIndex(id: string): number {
  return TUTORIAL_STEPS.findIndex((s) => s.id === id)
}

/** A fresh, empty snapshot — nothing done yet, standing on the dashboard. */
export function emptyTutorialSnapshot(route = '/campaign'): TutorialSnapshot {
  return {
    route,
    partySize: 0,
    tiles: 0,
    encounterPresent: false,
    combatActive: false,
    combatResolved: false,
    encounterCleared: false,
    searched: false,
    rested: false,
  }
}
