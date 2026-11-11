# Implementation Status

**Last Updated**: 2026-11-10
**Current Phase**: Phase 0 COMPLETE except verification pass; rules research DONE

## Completed Work

- [x] Rules research — UNBLOCKED and DONE (owner delivered the Expanded Edition PDF 2026-11-10)
- [x] Full mechanic inventory in docs/RULES_VERIFICATION.md (~180 page-cited rule entries, 20 classes, 30 spells, 24 monster tables, all generation/treasure/trap/event tables, 5 open questions flagged)
- [x] docs/GAME_RULES.md rewritten as original-language engine reference

- [x] Environment inspection (Node v26.8.2, npm 11.19.1, Git 2.47.3, gh 2.101.0)
- [x] GitHub authentication verified (sleuthy-sloth, repo scope)
- [x] GitHub repository created: four-against-darkness-pwa
- [x] Repository cloned to ~/repos/four-against-darkness-pwa
- [x] Project documentation created (11 files in docs/)
- [x] Project spec preserved as docs/PROJECT_SPEC.md
- [x] Architecture documented
- [x] Data model documented
- [x] Implementation roadmap created
- [x] Testing strategy documented
- [x] Copyright and content policy established
- [x] Deployment guide created
- [x] Changelog initialized
- [x] ADR-0001: Technology stack decision recorded

## Current Work

- [ ] Release 0.5 scope: environments (caverns/grottoes tables + secret passages), quest types 3/4 (subdual capture, item retrieval), trinket magic-item effects, light/darkness, more XP systems

## Completed Work (Phase 6 — campaign systems; Phase 6 COMPLETE)

- [x] Undo (§19): pre-action snapshots (dungeon JSON, party, RNG/clues/secrets/epic meta, journal cutoff) before all 22 mutating actions; ⟲ button with explicit confirm dialog; restores Dexie + store, deletes journal events after the cutoff — verified live (journal 3→4→3)
- [x] Named checkpoints (§18): Dexie v4 `checkpoints` table; save/restore/delete with per-campaign scoping and restore confirmation (Settings screen)
- [x] Export/import (§17): full-campaign JSON archives (campaign + party + dungeon + journal) — download from Settings, import as a NEW campaign (fresh ids, no clobbering); duplicate via archive round-trip
- [x] Multi-campaign management (§17): dashboard lists all campaigns with open/copy/delete; destructive delete requires explicit confirmation and removes ALL rows (fix: old deleteCampaign left dungeon+events rows orphaned)
- [x] Real Settings screen (§27): save management, ruleset note, credits & licensing (MIT code, CC BY 3.0 icons, publisher non-affiliation)
- [x] Migrations: Dexie chain 1→4 with upgrade paths; VersionError recovery (earlier)
- [x] Integration tests for archives/checkpoints/deletion (111 total); build clean; live-verified end-to-end

## Completed Work (Graphics overhaul — map + characters)

- [x] Map: patterned parchment/stone floors (torch-lit current tile, darker corridors), carved two-layer walls, door leaf + swing-arc glyphs, content iconography on tiles (chest/monsters/fountain/temple/altar/statue/puzzle box), party banner token
- [x] Characters: class portrait icons on party cards and character sheets (game-icons.net CC BY 3.0, attributed in src/assets/icons/ATTRIBUTION.md); README credits icon art — book art NOT used (copyrighted; repo stays MIT for code, icons carry their own license)
- [x] 107 tests green; build clean; screenshots refreshed in both environments

## Completed Work (Phase 5f — quests, epic rewards; Phase 5 COMPLETE)

- [x] Lady in White quest flow (pp.153, 161-162): accept/decline dialog; refusal makes her ignore future appearances; Quest Table roll d6
- [x] Quest types implemented: 1 (named Boss slain → bring head to giver's tile), 2 (bring d6×50gp, doubled if already held), 5 (3 non-violent encounters — bribes tracked, no return), 6 (interpretation noted in RULES_VERIFICATION: layout fully explored + all tiles cleared); types 3/4 accepted-and-tracked with pending-mechanics labels (subdual capture, item retrieval)
- [x] Completion: 1 XP roll for a chosen PC (p.153) + Epic Rewards roll (pp.162-163) — Book of Skalitos (6 scrolls), Gold of Kerrak Dar (search-chest record), Enchanted weapon (best-of-2 attack dice on the chosen PC), Shield of Warning, Arrow of slaying (destined species rolled), Holy symbol (+2 Healing)
- [x] Quest status line + Claim button in the dungeon panel; QuestDialog choices
- [x] Screenshots (mobile 390×844 @2x + desktop 1280×800) embedded in README: dungeon map, party, campaign dashboard, journal
- [x] 107 tests green; build clean

## Completed Work (Phase 5e — outfitter + Resting)

- [x] Outfitter (between adventures, pp.82-85): rations/rope/lantern/bandage/nails/potion/Blessing scroll at book prices, bought per PC in Inventory
- [x] Resting (pp.113-114): once per adventure; cleared room + cleared explored neighbors; 1 bag of nails nailed per door (consumed); each PC recovers 1 Life, a re-memorized spell (wizard L+2 / elf L slots, p.64), or a spent prayer; 1-in-6 WM roll after recovery, nailed doors giving the party first attack
- [x] Cleared-encounter tracking on tiles (Rest prerequisite)
- [x] Clue pool on the campaign, accumulating across adventures (p.108); Search clue claims count; at 3 Clues the Reveal-a-Secret flow opens (pp.122-123)
- [x] Secrets implemented: Weakness of a Foe (+2 attack vs chosen species), Terrifying Secret (one auto-failed Morale), hidden-treasure location (3d6×10gp in empty non-entrance rooms), hidden magic item location (choice of item); discovering PC gains 1 immediate XP roll (p.122); story Secrets deferred to the supplements milestone, listed as pending
- [x] Marching order: reorderable party (leader first, rearmost last, pp.97/104); WM ambushes strike the rearmost PC in round 1 (p.104) — fixed a foes'-turn indexing bug found by the test (targets vs living)
- [x] Dungeon panel now shows each feature's rule text (fountain/temple/altar/statue/puzzle box) instead of a placeholder

## Completed Work (Phase 5 remainder batch)

- [x] Scrolls (FADEE p.75): any PC except barbarians casts from a scroll (1 turn, destroys it); bonuses — spellcasters +L, non-spellcasters +1, clerics +0 (Blessing excepted); scroll buttons in combat; Blessing scroll auto-targets a cursed PC (p.67, p.152)
- [x] Consumables (FADEE p.83): healing potion (heals ALL, 1/PC/adventure, free action even in combat — combat panel button), bandage (+1 Life, 1/PC/adventure, never in combat) usable from Inventory
- [x] Special Features (FADEE p.152) all six: Fountain (first-encounter heal), Blessed Temple (choice: +1 vs. undead/demons until a kill), Armory, Cursed Altar (random PC 'cursed' condition, removable by Blessing/temple), Statue (touch choice: living statue HCL+3 Tier+5 fight w/ Final Boss roll, or 3d6×10gp no-XP), Puzzle Box (Save vs. its L, wizards/rogues +L, 1 dmg per fail, success rolls Treasure)
- [x] Special Events (FADEE p.153) all six: Ghost (Save vs. L4 fear, clerics +L, per-PC Life-or-Madness choice, madness:N condition), Wandering Monsters ambush (forced surprise), Lady in White (appears; quest acceptance deferred — flagged, no silent substitution), Traps roll, wandering healer (10gp/Life, once/adventure, reroll after), wandering alchemist (50gp potion / 30gp poison, once/adventure, reroll→trap)
- [x] Dungeon Traps (FADEE p.163) all six: dart (halfling reroll), poison gas (barb/halfling +L), trapdoor (armor Save penalties, +1 halfling/elf, rogue +L), bear trap (persistent -1 condition), spears (2 random PCs), falling stone (position 4, armor yes shield no, 2 Life) — Marching Order pending, leader = party[0], noted
- [x] Equipment exchange (FADEE p.111) in Inventory: give-item flow, armor only same-build (dwarf/halfling/elf vs humanoids), combat restrictions enforced with rule text
- [x] ChoiceDialog UI for all player choices; 97 tests (spells/loot/features/events/traps + 600-tile sim with growth assertions); build clean; live-verified: WM ambush combat, scroll buttons, potion button, encounter→victory→loot

- [x] Spells in combat: Sleep/Fireball/Lightning/Protection/Escape with slot consumption (p.64), wasted-spell rule (p.67), Sleep immunities, sleeping foes auto-hit/dispatch-at-will (p.68); cleric Healing prayer with 3-use tracking (p.28); spell buttons in CombatPanel
- [x] Wandering Monster ambushes: retrace 1-in-6 rolls the WM tables and opens a forced-surprise combat (pp.104, 107); event/dragon rerolls; WM Majors can never be the Final Boss
- [x] Loot engine: Treasure Table dungeon rows + Magic Treasure (pp.157-158) with treasure modifiers; gold pooled to living PCs; scrolls/magic items carried by a living PC; rolled once per cleared encounter (p.99)
- [x] Classical XP economy (p.117): 1 roll per Major Foe + Final Boss bonus; minors accrue 1 roll per 10 encounters; XP rolls decrement availability
- [x] Journal (PROJECT_SPEC §26): engine events persist to Dexie by category; JournalScreen with filters
- [x] FADEE p.104 truncation implemented (a shape that won't fit is clipped and still rolls content); map now renders move-through markers on explored exits (no more stranded parties)
- [x] RNG-state sync bug fixed: dungeon actions updated the campaign meta in place (a stale rngState replayed identical dice — caught live as six identical d66 rolls)
- [x] Dexie hardening: globalThis singleton across HMR + VersionError recovery (delete + recreate) instead of a bricked app
- [x] 79 tests green; build clean; live-verified: encounter → melee fight with exploding-dice kill → loot roll (Sleep scroll) → journal with filters

- [x] Combat engine (engine/combat/combat.ts): exploding tier dice, class/armor/shield/weapon modifiers per FADEE pp.146-148, Minor-group slaying (total ÷ L), Major damage per L-multiple, weaken-below-half, group Morale once per encounter, hated-class attack distribution, natural-1-always-fails defense
- [x] Reactions: parser + automation for flee/flee-if-outnumbered/bribe/fight/ignore/peaceful; bribes paid from pooled party gold; unhandled reactions flagged as fights with a source note (no silent substitutions)
- [x] Flee resolution (each Foe strikes once, shields negated); PC death at 0 Life (FADEE p.105); XP accounting (Major rolls, minor encounter per 10, Final Boss bonus)
- [x] Combat state persisted inside the dungeon record; party casualties sync to Dexie after each fight
- [x] CombatPanel UI: enemy/target selection, party health grid, engage/wait/bribe/flee, full explained combat log, XP-roll assignment prompt
- [x] Tests: 16 unit + 5 sim (160 auto-resolved combats, determinism, loop bounds) — 68 total green
- [x] Live-verified in browser: 10× Mushroom Men L3 fought to victory through the UI; Cleric fell to a failed defense (logged); Morale broke the goblin... (mushroom men) group below half; XP roll spent → Warrior L2 with +1 Life

## Completed Work (Phase 3 — dungeon generation, map live)

- [x] OQ-2 tile-shape verification pass: zoomed vision crops of pp.149-151; tiles 51-56, 63 corrected, 23/33/24/26/34/41/42/43/44/45/46/62/65/36 confirmed high/medium; 32/35 remain low-confidence (art-obscured)
- [x] Tile data pack: 6 starting + 36 d66 shapes with cells/exits/door-vs-opening/confidence (rulesets/expanded/tiles.ts)
- [x] Dungeon monster tables (dungeon environment) as data with HCL caps, quantity formulas, reactions (rulesets/expanded/monsters.ts)
- [x] Generation engine: transform placement (rotate × mirror), dead ends, 2d6 content routing, encounter rolls (level = HCL + offset with caps), Final Boss tally, search-once, hidden treasure (2d6+HCL)² + complications, secret-door safe-exit roll
- [x] Dexie v3: dungeons table (per-campaign JSON state)
- [x] Dungeon screen: SVG map (cells/walls/doors/openings), fog-of-war styling, party marker, tap-exit-to-explore with pan/pinch/zoom/recenter, collapsible bottom panel with content + search + find-choice + log
- [x] Sim tests: 100 seeded dungeons validating bounds/overlap/connectivity/reciprocal links; caught and fixed a placement-geometry inversion
- [x] Live-verified in browser: start tile → 2 explorations → search → reload persistence (map redraws from saved state)
- Known dev-only caveat: repeated HMR edits of db.ts churn the Dexie version chain (dev DB hit v30 and reset); production chain is 1→2→3 and clean

- [x] Seeded RNG engine (mulberry32, serialized state, d3/d66/dice-formula parser, roll log) — PROJECT_SPEC §8
- [x] Zod schemas: ClassDef, TraitDef, Character, Party (rulesets/schema)
- [x] Core-8 class data pack with full trait tables, page-cited (rulesets/expanded/coreClasses.ts)
- [x] Character/party creation engine: Life formulas (both L+N and N+L orders), class kits, halfling rations + 2-trait rule, spell-slot assignment with list validation, per-adventure counters modeled (prayers/rage/luck)
- [x] Dexie schema v2: full Character records + campaign RNG state; v1 stub migration clears (never shipped)
- [x] Campaign repo: transactional create/save/load/delete, lastModified bump
- [x] Zustand campaign store; campaign dashboard with New-campaign flow; party screen; 4-class creation form; character sheet (Life/XP/gp/traits/spells/equipment/abilities)
- [x] Tests: 30 passing (rng 7, class data 6, creation 10, navigation 4, persistence 3) — includes fake-indexeddb save/reload/continue
- [x] Browser smoke test on the dev server: campaign → party creation → reload persistence → character sheet, all live-verified

## Pending Work

### Phase 0 Remaining
- [ ] Verification pass: owner spot-checks RULES_VERIFICATION.md, resolves the 5 open questions (OQ-1 Search Table "0-1" misprint; OQ-2 tile-shape diagram confirmation)

### Phase 1 (App Shell) — code complete, acceptance partially verified
- [x] Vite + React + TypeScript project
- [x] Tailwind CSS configured (dungeon palette: stone/parchment/torch)
- [x] React Router with 5-tab navigation (Explore, Party, Journal, Inventory, Settings)
- [x] Zustand settings store (typed actions, in-memory Phase 1)
- [x] Dexie.js database (schema-versioned: campaigns, characters, events)
- [x] vite-plugin-pwa (manifest, autoUpdate service worker, precache 10 entries)
- [x] Procedural placeholder icons (192/512/apple-touch) — original shapes
- [x] Vitest: 4 passing navigation tests
- [x] `npm run build` passes (tsc clean; 168.6 kB js / 6.9 kB css)
### Phase 2 (Character System) — code complete, engine tests green
- [x] Zod schemas installed and first schemas shipped (ClassDef/TraitDef/Character/Party)
- [x] Core-8 class definitions + creation + party management + persistence
- [ ] Wire the spell-slot/trait pickers into the creation UI (engine-validated, UI defaults today)
- [ ] iPhone device verification (install, offline launch, touch nav)

### Phase 2-7
All pending Phase 0 and Phase 1 completion

## Known Bugs

None known.

## Unverified Mechanics

- All mechanics are RESEARCHED with page citations (docs/RULES_VERIFICATION.md) — none yet VERIFIED (needs the second pass above), IMPLEMENTED, or TESTED.
- Tile-shape diagrams (pp.149-151) were transcribed from page images: highest transcription risk, must be re-verified before Phase 3.

## Failed Tests

None.

## Outstanding Dependencies

- Owner spot-check of RULES_VERIFICATION.md (open questions OQ-1, OQ-2)
- iPhone for PWA testing
- Cloudflare API token + account ID (deployment wiring, Phase 7)

## Next Recommended Task

Phase 4 remainder + Phase 5: spells in combat, then treasure/loot tables and the Journal.

## [Unreleased] — Phase 4 combat core (2026-11-10)
### Added
- Combat engine: exploding dice, modifier summaries from pp.146-148, minor/major damage math, Morale, reactions, bribes, fleeing, PC death, XP accounting
- CombatPanel UI with target selection and a fully explained combat log
- Combat persisted within the dungeon record; 68 tests green; live fight verified end-to-end

## [Unreleased] — Phase 3 dungeon generation (2026-11-10)
### Added
- Tile data pack (42 shapes, confidence-flagged, OQ-2 verified via zoomed crops)
- Dungeon monster tables (dungeon environment) as page-cited data
- Seeded generation engine: transforms, content 2d6 routing, encounters with HCL caps, Final Boss tally, search/hidden treasure/secret doors
- Dexie v3 dungeons table; interactive SVG map screen with pan/pinch/zoom, tap-to-explore, collapsible info panel
- Simulation suite: 100 seeded dungeons, structural validation; 47 tests total green
