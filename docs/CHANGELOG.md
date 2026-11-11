# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub repository initialized
- Project documentation suite (11 files)
- Architecture documentation
- Rules verification framework (all UNVERIFIED)
- Data model specification
- Implementation roadmap
- Testing strategy
- Copyright and content policy
- Deployment guide

### Added — Phase 5f: quests + Epic Rewards; Phase 5 COMPLETE (2026-11-10)
- Lady in White: accept/decline, Quest Table roll, refusal tracking (pp.153, 161)
- Quest types 1/2/5/6 with progress tracking and giver-tile claims; types 3/4 accepted and flagged pending subdual/retrieval mechanics
- Epic Rewards (pp.162-163): Book of Skalitos (6 scrolls), Gold of Kerrak Dar, Enchanted weapon (best-of-2 dice), Shield of Warning, Arrow of slaying (destined target rolled), Holy symbol (+2 Healing)
- README screenshots: mobile + desktop app captures
- 107 tests; Phase 5 (complete adventure mechanics) closed
- Between-adventures outfitter at book prices (pp.82-85); nails economy unblocks Resting
- Resting (p.114): cleared room + cleared neighbors, nails per door, per-PC recovery (Life / re-memorize spell / regain prayer), 1-in-6 WM after recovery with the party striking first
- Wizard L+2 / elf L spell-slot math verified against p.64; cleared-tile tracking
- Campaign clue pool (p.108); Reveal-a-Secret flow at 3 Clues with immediate XP roll for the discoverer (pp.122-123)
- Weakness of a Foe, Terrifying Secret, treasure-location, item-location secrets; story Secrets flagged pending
- Marching order UI (reorder) with WM-ambush rear targeting (p.104); foes'-turn indexing fix
- Scrolls cast in combat from any PC (barbarians barred, p.75): +L spellcasters / +1 others / +0 clerics; scroll destroyed; Blessing auto-targets a cursed PC (p.67)
- Healing potion (all damage, 1/adventure, free action in combat) and bandage (+1 Life, never in combat) from Inventory and combat panel (p.83)
- Dungeon Special Features table fully resolved (p.152): Fountain, Blessed Temple, Armory, Cursed Altar, Statue (living-statue boss fight or 3d6×10gp), Puzzle Box (Save vs. its L)
- Dungeon Special Events table (p.153): Ghost fear Saves with Life-or-Madness choice, WM ambushes, wandering healer & alchemist shops, trap rolls; Lady in White appears (quest acceptance deferred, flagged)
- Dungeon Traps table (p.163): all six traps with exact Save/Defense math
- Equipment exchange with same-build armor rule and combat restrictions (p.111); ChoiceDialog for every player choice
- 97 tests including a 600-tile features/events simulation; live-verified ambush combat and consumables
- Spells in combat: Sleep/Fireball/Lightning/Protection/Escape; slots consumed on cast (p.64); failed casts waste the spell (p.67); Sleep immunities; sleeping-foe rules (p.68)
- Cleric Healing prayer with per-adventure 3-use tracking (p.28)
- Wandering Monster ambushes on retrace: forced-surprise combat from the WM tables (pp.104, 107)
- Loot engine: Treasure Table rows + Magic Treasure with modifiers (pp.157-158); gold pooled, scrolls/magic items carried
- Classical XP economy (p.117): Major-Foe rolls + Final Boss bonus; minor accrual 1 roll per 10 encounters
- Journal screen with category filters; engine events persist to Dexie (§26)
- FADEE p.104 truncation in tile placement; move-through markers on explored exits
- RNG-state sync fix (stale campaign meta replayed dice) + Dexie VersionError recovery; 79 tests green
- Combat engine: exploding dice, modifier summaries from pp.146-148, minor/major damage math, Morale, reactions, bribes, fleeing, PC death, XP accounting
- CombatPanel UI with target selection and a fully explained combat log
- Combat persisted within the dungeon record; 68 tests green; live fight verified end-to-end

### Added — Phase 3 dungeon generation (2026-11-10)
- Tile data pack (42 shapes, confidence-flagged, OQ-2 verified via zoomed crops)
- Dungeon monster tables (dungeon environment) as page-cited data
- Seeded generation engine: transforms, content 2d6 routing, encounters with HCL caps, Final Boss tally, search/hidden treasure/secret doors
- Dexie v3 dungeons table; interactive SVG map screen with pan/pinch/zoom, tap-to-explore, collapsible info panel
- Simulation suite: 100 seeded dungeons, structural validation; 47 tests total green

### Added — Phase 2 character system (2026-11-10)
- Seeded RNG engine with serialized state, dice formulas, d3/d66, roll log
- Zod schemas + core-8 class data pack (page-cited FADEE pp.24-65)
- Character/party creation engine with verified book stats and validation
- Dexie schema v2 (full character records, campaign RNG state) + campaign repo
- Campaign dashboard flow, party screen, 4-class creation form, character sheet
- 30 passing tests (unit + fake-indexeddb persistence); build green
- Live browser smoke test: create → persist → reload → sheet all verified

### Added — Phase 1 app shell (2026-11-10)
- Phase 1 app shell: Vite + React 18 + TypeScript + Tailwind + react-router
- 5-tab navigation with honest Phase-labelled stub screens (no fake features)
- Zustand settings store; Dexie database (schema v1: campaigns, characters, events)
- vite-plugin-pwa: manifest, autoUpdate SW, procedural placeholder icons
- Vitest unit suite: 4 navigation tests, all passing
- `npm run build` verified green (tsc strict + Vite + SW precache 10 entries)

## [0.0.0] - 2026-11-10

### Added
- Initial project setup
- Repository created at github.com/sleuthy-sloth/four-against-darkness-pwa
- MIT license
- README.md