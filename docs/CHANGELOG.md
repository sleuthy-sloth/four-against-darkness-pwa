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

### Added — Visual polish milestone 2: art direction (2026-11-11)
- Portraits (plan C1): the three non-face class portraits replaced with matching
  faces from game-icons.net, all clean line art — warrior → `delapouite/viking-head.svg`
  (was a full figure), cleric → `delapouite/monk-face.svg` (was praying hands),
  halfling → `cathelineau/bad-gnome.svg` (was a door). The other five faces were
  already faces and are unchanged. New frags ship clean (no background square, no
  baked fill); `attribution.json` + `ATTRIBUTION.md` updated (all CC BY 3.0)
- Monster family icons (plan C2): per-family set — vermin → `delapouite/rat.svg`,
  goblinoid → `delapouite/goblin-head.svg` (existing), undead → `lorc/ghost.svg`,
  demon → `lorc/imp-laugh.svg`, beast → `delapouite/bear-head.svg`,
  construct → `delapouite/golem-head.svg`, boss → `badges/skull.svg`. Each of the
  24 monster profiles carries a display-only `family` field (`MonsterFamily` in
  `src/rulesets/expanded/monsters.ts`); `DungeonScreen` maps family → icon, so a
  tile's encounter shows its family's glyph (e.g. Skeletal Rats → ghost,
  Hobgoblins → goblin head). Boss/dragon-lair tiles show the skull in an oxblood
  ring (`r=0.44`, `stroke-torch`); the skull renders at size 1.6 because its glyph
  only fills ~25% of its 512 canvas (vs ~93% for the goblin-head)
- Lockup (plan B4): original ink line art — open tome + arched stone doorway with a
  descending stair, oxblood wax seal, wordmark in real Noto Serif text (not paths)
  — in `src/features/common/Lockup.tsx`, wired into the campaign dashboard (replaces
  the bare `<h1>`) and into `index.html` as the first-paint splash; the raster
  concept art is direction only and is never shipped
- Tests: `monsterFamilies` unit suite (every profile has a valid family, every
  family is used); `iconUtils` real-fragment list extended to the new art + skull

### Fixed — Visual polish milestone 2 (2026-11-11)
- The `badges/skull.svg` glyph sits at canvas (128,128) instead of the (256,256)
  centre every other icon uses, so at map scale it rendered off-centre (and, at
  the default icon size, as a speck inside the boss ring). The frag now wraps the
  path in `<g transform="translate(128,127.5)">` to centre the glyph; verified by
  a bounding-box audit of all 23 icons (skull was the only outlier)

### Added — Visual polish milestone 1 (2026-11-11)
- Fix #0: game-icons fragments bake `fill="#fff"` into every art path, overriding
  `currentColor` — class portraits rendered white-on-cream (invisible) and the
  monsters icon showed as a white blob on the map. New shared `cleanIconFragment`
  strips the baked fill and the background square; portraits now take their class
  colors, map icons take ink-with-parchment-halo (`.map-icon`)
- Map icons: content glyphs at full ink + halo (ink alone is 2.44:1 on room floors,
  a light fill alone 2.62:1 on corridors); party token keeps near-white on oxblood;
  boss/dragon-lair tiles now show the skull instead of the generic monsters icon
- Contrast: `faint` darkened `#6e6255` → `#5f5346` (4.47:1 → 5.63:1 on canvas, AA);
  brass documented decorative/large-only (3.20:1, never body text)
- Distinct icons for the triple-use stone sphere: altar → sword-altar, puzzle box →
  puzzle, monsters → goblin head (all Delapouite, CC BY 3.0; attribution updated)
- App icons regenerated (the Phase 1 placeholders were black squares with malformed
  PNG encoding, undecodable by PIL): interim Tome & Delve mark (parchment, ink
  double-rule, oxblood wax seal, "4AD" in Noto Serif) at all 8 manifest sizes plus a
  maskable 512, Apple touch icon, and favicon.ico — generator in `tools/make-icons.py`
- PWA chrome: manifest `theme_color`/`background_color` aligned to parchment `#e8dfca`
  (were stale dark navy), `favicon.ico` + `robots.txt` added, manifest `screenshots`
  (mobile + desktop) added, `index.html` theme-color aligned
- Tests: `iconUtils` unit suite (incl. real-fragment cleaning) + design-token WCAG AA
  contrast gates reading the real `tailwind.config.js`

### Fixed — Production dungeon crash (found during this milestone's verification)
- The Explore tab crashed in production builds (`TypeError: Cannot read properties of
  undefined (reading 'getState')` in `ensureDungeon`) while working in dev. Root cause:
  `dungeonStore` reached the campaign store through 66 dynamic
  `import('./campaignStore')` calls; in the production bundle the `.then((m) =>
  m.useCampaignStore.getState())` chains resolve to the already-destructured
  `{campaign, party}` instead of the module namespace, so `m.useCampaignStore` is
  undefined. There is no circular dependency (campaignStore never imports
  dungeonStore), so all 66 sites now use a static
  `import { useCampaignStore } from './campaignStore'`. Verified in the production
  build: new campaign → party → Explore loads, full reload on /dungeon loads,
  exploring through exits works with zero page errors. The bug was reproduced on
  pristine HEAD (f024323) before the fix, confirming it predates this milestone.

### Added — Phase 6: campaign systems; Phase 6 COMPLETE (2026-11-10)
- Undo: pre-action snapshots before every mutating action with an explicit confirmation dialog; full reversal of dungeon, party, RNG state and journal
- Named checkpoints (Dexie v4) with restore confirmation; full-campaign JSON export/import as new campaigns; campaign duplicate
- Multi-campaign dashboard list with confirmed deletion of every campaign row (fixed orphaned dungeon/event rows on delete)
- Real Settings screen: save management, ruleset note, credits & licensing
- 111 tests including archive round-trip integration; live-verified undo (journal reversal), checkpoint save, campaign list
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