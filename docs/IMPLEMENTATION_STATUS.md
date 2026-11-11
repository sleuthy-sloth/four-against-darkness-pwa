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

- [ ] Verify the Phase 1 shell on a real iPhone (install to home screen, offline launch)

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
- [ ] Zod — installed, first schemas arrive with the rules data model (Phase 2)
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

Phase 2: character system — Zod schemas + class data pack for the 8 core classes (page-cited from RULES_VERIFICATION Part 3), party creation, Dexie persistence, unit tests. Do not touch the 13 non-core classes until Release 0.5.
