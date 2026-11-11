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

- [ ] Journal screen (Phase 3 remainder): persist the event log to the Dexie events table and render it with category filters

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

Phase 4: encounters and combat — attack/defense resolution per the pp.146-148 modifier summaries, monster turn automation, Morale, combat log, then treasure/loot (Phase 5 starts there too).

## [Unreleased] — Phase 3 dungeon generation (2026-11-10)
### Added
- Tile data pack (42 shapes, confidence-flagged, OQ-2 verified via zoomed crops)
- Dungeon monster tables (dungeon environment) as page-cited data
- Seeded generation engine: transforms, content 2d6 routing, encounters with HCL caps, Final Boss tally, search/hidden treasure/secret doors
- Dexie v3 dungeons table; interactive SVG map screen with pan/pinch/zoom, tap-to-explore, collapsible info panel
- Simulation suite: 100 seeded dungeons, structural validation; 47 tests total green
