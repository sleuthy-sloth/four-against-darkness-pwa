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

### Added — Phase 2 character system (2026-11-10)
- Seeded RNG engine with serialized state, dice formulas, d3/d66, roll log
- Zod schemas + core-8 class data pack (page-cited FADEE pp.24-65)
- Character/party creation engine with verified book stats and validation
- Dexie schema v2 (full character records, campaign RNG state) + campaign repo
- Campaign dashboard flow, party screen, 4-class creation form, character sheet
- 30 passing tests (unit + fake-indexeddb persistence); build green
- Live browser smoke test: create → persist → reload → sheet all verified
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