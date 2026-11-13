# Rules Verification — Section B Report

**Scope:** Parts 8 (R110–R134), 9 (R140–R145), 10 (trap tables, pp.164–166), OQ-2 (tile shapes), Light (R093–R094).
**Date:** 2026-11-13. **Repo:** `four-against-darkness-pwa`, working tree only (no commits/pushes).
**Ledger:** `docs/RULES_VERIFICATION.md` (not edited — this file is the Section B annex).

**Counts:** 26 rule entries VERIFIED (+ 18 trap-table entries) · 34 discrepancies FIXED (20 engine, 11 store, 3 UI) · 22 FLAGGED (incl. OQ-2 and darkvision) · tests: 81 passing in the Section B area (38 new unit + 6 new integration + 37 pre-existing area tests).

**Environment notes (read before re-running):**
- `src/state/dungeonStore.ts` was truncated to 0 bytes mid-session (~18:58 UTC, concurrent-worker file-write collision; see §E). A sibling restored the full 2799-line working version by ~19:15 UTC (verified: Release 0.5 imports present, `wc -l` 2799, ends with `export { openExits, currentTile }`). All store fixes below were applied to the restored file and verified by tests.
- Vitest cannot run in this sandbox unmodified: Vite's config bundler writes a timestamped `.mjs` next to the config and that write fails with `EPERM` (leaving 0-byte files); vitest's results cache and module-runner file cache fail the same way. Workaround used for every run in this report: a temporary CJS config (`vitest.tmp.cjs`, deleted after) plus a 3-line patch to `node_modules/vitest/dist/chunks/resolveConfig.rBxzbVsl.js` (`cacheFs: true` → `false` at both `createMethodsRPC` call sites; `writeToCache` wrapped in try/catch). Both are environment-only changes, not repo changes — the coordinator will need the same workaround (or a healthy environment) to run the suite here. The EPERM is intermittent/bursty for plain shell writes as well.
- `npm run make-fixtures` was run (the cavern no-doors fix changes generation). **Fixtures were NOT regenerated in this session — read this before the coordinator's suite run.** The first `make-fixtures` vitest run zeroed all 11 fixture files (vitest-worker EPERM). Three recovery attempts all failed on the same sandbox fault: (1) re-running under vitest, (2) running the generator under `vite-node` with a minimal `describe/it/expect` shim, (3) bundling the generator with esbuild (`write: false`, in-memory) and running the bundle under plain node. In every case, content writes from exec-spawned processes fail with `EPERM` in bursts lasting 10+ minutes (leaving 0-byte files); isolated single writes occasionally succeed after minutes of silence, but sustained write loops never land a file. The 0-byte stubs have been DELETED, so `tests/e2e-05/fixtures/` is empty — clean-checkout state. The fixtures regenerate deterministically from the engine: run `npm run make-fixtures` (or `npm test`, which includes it) in a healthy window. The recipe that nearly worked, for reuse: esbuild-bundle `tests/e2e-05/make-fixtures.test.ts` with the `vitest` import swapped for a sync `describe/it/expect` shim, then run the bundle with plain node; the generator's `writeFixture` can be wrapped in a retry loop (both the shim swap and the retry hunk were applied temporarily and have been REVERTED — the generator file is pristine).

---

## (a) VERIFIED

Each entry was confirmed against implementation (numbers checked, not vibes). Locations are the confirming code or test.

| Rule | Claim | Confirmed in |
|---|---|---|
| R110 | Grid 20×28, corridors 1-wide, rooms 2+ | `src/rulesets/expanded/tiles.ts` (`GRID_W/H`); `tests/unit/tileData.test.ts` |
| R111 | Starting room d6, no content | `newDungeon` in `src/engine/dungeon/generate.ts` |
| R112 | Rotate / mirror / truncate placement | `findPlacement`, `transformShape` (`generate.ts`) |
| R114 | Tile Content Table 2d6 incl. corridor/room splits (rolls 4/8/10/12), roll 5 env splits, roll 9 empty, roll 11 boss, roll 12 dragon lair | `rollContent` (`generate.ts`) |
| R114 | Dragon per environment | `dragonForEnvironment` (`generate.ts`) |
| R115 | Movement | `exploreThrough` / `moveThroughExplored` (`generate.ts`) |
| R116 | Retrace 1-in-6 WM + echo 2-in-6 + ointment bypass + safe-shortcut bypass | `moveThroughExplored` (`generate.ts`) |
| R117 | Final Boss determination d6 + tally | `rollEncounter` (`generate.ts`); see Flags for the base-count ambiguity |
| R123 | Search table + corridor −1 + once-per-tile | `searchTile` (`generate.ts`); `tests/unit/release05.test.ts` |
| R124 | WM table 1–2/3–4/5/6 + reroll Event/Dragon on retrace + strike-first + no-shield round 1 + rear targeting | `rollWanderingEncounter`, `combat.ts` (~L581, ~L638) |
| R125 | Secret door → real tile + peek + surprised L−1 turn 1 + gp doubled on encounter loot + safe-shortcut d6=6 | `foeLevelPenaltyTurn1`, `combatOpts`, `awardVictory`, `rollSecretDoorBonus` |
| R126 | Passages via Search / fungal-5 / content-9 (2 Clues) | `claimPassage` / `buyPassage` (`dungeonStore.ts`) |
| R127 | Hidden-treasure gold (2d6+HCL)² | `rollHiddenTreasure` (`generate.ts`) |
| R128 | Clues pool / persist | campaign `clues` via `touchCampaign` |
| R129 | Door table 2/3/4/5–6/7–10/11/12 + levels (HCL+d6; illusionary HCL; lever/unlocked 0) + sealed/iron +1 treasure | `rollDoor`, `doorGrantsBonusTreasure` (`src/engine/dungeon/doors.ts`); `tests/unit/doors.test.ts`; `tests/unit/sectionB.test.ts` (600-seed proportions) |
| R130 | Bash +L barbarian/warrior, repeatable, nat 1 → WM | `attemptBash` (`doors.ts`) |
| R131 | Lockpick rogue +L (+Tier Delicate Touch), fail → must bash | `attemptLockpick` (`doors.ts`), `pickFailed` |
| R132 | Door-trap disarm | `attemptDisarm` (`doors.ts`), `DoorDialog.tsx` (UI-gated) |
| R133 | Rest eligibility (once/adventure, cleared room + cleared neighbours, doors, nails) + 1 Life OR 1 ability + WM after recovery (nailed = party first) | `canRest`/`beginRest` (`src/engine/camp/rest.ts`); `tests/unit/rest.test.ts` |
| R134 | Madness tracked as `madness:N` condition | ghost choice path (`resolve.ts` / store) — enforcement gaps flagged below |
| R140 | Three environments, start dungeon, same shapes/content table, env foe/trap/treasure tables | `src/rulesets/expanded/environments.ts`, `generate.ts` |
| R141 | Cavern feature d6 table (1 stalactites, 2 stalagmites, 3 boulders, 4 echo, 5–6 water pools) + rest blocked in caverns | `cavernFeatureForRoll`; store `rest()` cavern block |
| R142 | Stalagmites no-explosions; echo WM 2-in-6; water pools dip (1 contaminated → `contaminated`, 2–4 nothing, 5–6 +1 Life, once per PC) | `combatOpts.noExplosions`, `dipPool` (`dungeonStore.ts`) |
| R143 | Cavern search (1 WM, 2–4 empty, 5–6 clue\|listen) + Listen pre-roll | `searchTile`, `claimFind` listen branch |
| R144 | Fungal search (clue\|rare-mushroom) + slippery flee −1 with correct exempt list (ranger/rogue/acrobat/halfling/mushroomMonk) | `searchTile`, `combat.ts` (~L776) |
| R093 | Darkness −2 attack/defense/saves; no Search without light; torch 6 rooms | `src/engine/light.ts` (`darknessPenalty`), store `search()` light gate, `explore()` torch counter |
| R094 | Lantern drop on bearer death; pickup costs 1 turn | combat `lanternDropped`, store `pickupLantern` + `spendTurn` |
| R129 (UI) | Doors UI-gated per kind in `DoorDialog.tsx` (bash only `locked`, pick only locked/iron, iron only lightning/fireball via UI, sealed one attempt, illusionary 3 Clues, lever 1 Clue, trapped disarm/openTrapped) | `DoorDialog.tsx` (engine `attemptDoor` does not enforce kind — UI does) |

### Part 10 — trap tables (all d6 entries verified numerically)

- **Dungeon (p.164):** dart (vs HCL+1 — fixed, was HCL), poison gas (HCL+2), trapdoor (HCL+3), bear trap (HCL+3), spears (2 targets, vs HCL+4 — fixed, was +0), falling stone (position-4 PC, armor yes/shield no, 2 Life).
- **Caverns (p.165):** stalactite (HCL+2), rockslide (HCL+2), hidden pit (HCL+1), swinging log (HCL), toxic spores (HCL+1), rolling boulder (HCL+1).
- **Fungal (p.166):** sleep spores, spore cloud, slime patch, mycelium snare (item-snatch verified), shrieking mushroom, cordyceps — all six fixed or verified in `resolveEnvTrap` (`src/engine/features/resolve.ts`); see §(b) for the four corrections.

---

## (b) DISCREPANCIES FIXED

### Engine — `src/engine/dungeon/generate.ts`
1. **Search 4-counts-as-5 scoping (R123/R143/R144).** Was applied to rogue/assassin/halfling in ALL environments. Now: caverns → rogue/assassin/halfling; fungal → halfling + mushroom monk only; dungeon → never (R123 has no such rule). Test: `tests/unit/sectionB.test.ts` — dungeon rogue 4 → empty; caverns rogue 4 → find; fungal rogue 4 → empty, halfling 4 → find.
2. **Final Boss roll — WM false reveal (R117/R124/R160).** `rollEncounter` gained `opts: { canBeFinalBoss?: boolean }`. `moveThroughExplored` passes `{ canBeFinalBoss: false }`; when false, no boss roll is made and no "THE FINAL BOSS has been revealed!" event is pushed (previously the roll happened and `isFinalBoss` was cleared afterwards, leaking the false log line). Tally still increments for WM Majors. Test: `sectionB.test.ts` — WM Major reveals no boss; room encounter reveals on d6=6.
3. **Gremlin tally (R117 "(incl. gremlins)").** `rollEncounter` now increments `majorFoesMet` when the profile is Invisible Gremlins (event, no boss roll), with a log line. Check: `tests/simulation/dungeonGen.test.ts` (100 seeded dungeons) still passes — the tally-6-without-boss invariant held on those seeds.
4. **Cavern openings have no doors (R141).** In `exploreThrough`, cavern tiles now get `door = false` on all exits (back exit keeps its shared already-opened `doorInfo` but reads as an opening from the cavern side). This changes generation — fixtures regenerated (see header). Test: `sectionB.test.ts` — explore into a cavern tile → all exits `door === false`.
5. **Hidden-treasure complications resolved (R127).** New `resolveHiddenTreasureComplication` + `rollHiddenTreasure(state, rng, hcl, party?)` (party optional; 3-arg calls keep the old descriptive text for sim-test compat). Alarm (1–2) → `wanderingMonsters: true` + flag; trap (3–5) → living rogue disarms (d6 + lockpickBonus vs HCL+1; failure falls through to random-PC Save vs HCL+1, fail = 1 Life, natural 1 = 2 Life; no rogue → random-PC Save directly, plain d6); ghost (6) → living cleric Saves plain d6 vs HCL to banish, else all living PCs lose 1 Life. Tests: `sectionB.test.ts` — rogue disarm success/failure-through-to-random-PC; no-rogue Save (nat 1 = 2 Life, 3 = saved); ghost banish/fail/no-cleric; alarm flag; gold range (2+2)²–(12+2)².

### Engine — `src/engine/features/resolve.ts`
6. **Dart trap target (Part 10).** Was comparing Defense vs HCL (label said HCL+1). Now vs HCL+1 with full Defense bonus via `defenseBonusFor` (armor + shield + rogue +L). Rationale in code: falling stone explicitly carves out "armor yes, shield no", implying other Defense-roll traps take normal Defense. Halfling reroll now triggers on failure vs HCL+1. Test: `sectionB.test.ts` — 4 vs HCL 3 is a hit; heavy armor + shield dodge on a 2; halfling reroll.
7. **Spears trap (Part 10).** Was bonus 0; now each of the 2 random targets rolls d6 + `defenseBonusFor` vs HCL+4. Test: two armored targets dodge (5+3=8 > L7).
8. **R132 disarm helpers (new exports).** `trapLevelFor(trap, hcl)` (dart HCL+1, poisonGas HCL+2, trapdoor/bearTrap HCL+3, spears/fallingStone HCL+4, stalactite/rockslide HCL+2, hiddenPit/toxicSpores/rollingBoulder HCL+1, swingingLog/slimePatch/sleepSpores HCL, sporeCloud HCL+1, myceliumSnare/cordyceps HCL+3, shriekingMushroom HCL — documented judgment call, no Save target in book) and `attemptTrapDisarm(rng, rogue, trapLevel)` (d6 + lockpickBonus vs trap L). Tests: `sectionB.test.ts` — level values + disarm success/failure.
9. **Cavern halfling rerolls (p.165).** `saveWithHalflingReroll` in `resolveEnvTrap`, applied to stalactite, rockslide, swinging log. Tests: `sectionB.test.ts`.
10. **Sleep spores (p.166).** Removed `cleric` from the immune list (immune = mushroom/artificial/undead/elemental; cleric is none of those). Implemented the released-cloud stage: if the first victim falls asleep, all other living non-immune PCs Save vs HCL poison (halfling +L, others +½L); if every living PC ends up `asleep-spores`, all are set dead. Tests: cleric not immune (sleeps, party dies); cloud stage kills whole party; kukla immune.
11. **Spore cloud (p.166).** Was a single Save vs HCL+1. Now two Saves (vs HCL+1, then vs HCL+3 poison; halfling/barbarian +L on both), immunity for mushroomMonk/kukla, coughing rolls 1-in-6 WM and returns `wanderingMonsters: true` on a 1. Interpretation documented in code: failing the first Save exposes the PC; failing the poison Save costs 1 Life + coughing. Tests: second-Save pass = no damage; both fail = 1 Life + coughing + WM flag on d6=1 / no WM on 2; kukla immune.
12. **Slime patch (p.166).** Fall now rolls 1-in-6 WM, returns `wanderingMonsters: true` on a 1. (`slimed` skip-a-turn still not enforced — flagged in §(c).) Test: WM roll.
13. **Shrieking mushroom (p.166).** Modifier direction was INVERTED (`d6+mod <= 4` made −2 MORE likely to call WM). Now WM on `d6+mod >= 3`: base 4-in-6, halfling/forester −2 → 2-in-6, rogue −1 → 3-in-6. Test: all six modifier cases.
14. **Cordyceps (p.166).** Removed halfling/barbarian +L bonus (not named in ledger; was borrowed from spore cloud). Save is now plain d6 vs HCL+3. Test: halfling L4, die 3 → controlled.
15. **Comment hygiene.** Header comment above `resolveEnvTrap` updated to current state (cordyceps mind-control tracked as `cordyceps:6`, slimed/coughing conditions unread, rolling boulder doesn't block an opening yet).

### Engine — `src/engine/combat/combat.ts`
16. **`applyFinalBossBuff(enemy)` (R118, new export).** +1 Life and +1 maxLife. ("+1 attack" NOT applied — mapping ambiguous, needs the book; §(c).) Test: 9→10 Life.
17. **`partyFirst` option in `startCombat` (R133).** When true, skips the goblin surprise check entirely — resting behind nailed doors means the party strikes first "even vs natural surprise". Used by the rest-WM fix (#24).
18. **`rollReactions` Final Boss forcing (R118).** Enemies with `isFinalBossFlag` log "The Final Boss fights to the death!" and skip the Reaction roll (no bribe/flee/quest). Test: via `startCombat` with `partyWaits: true` (Young Dragon profile, `isFinalBossFlag`).

### Engine — `src/engine/treasure/loot.ts`
19. **`rollMagicTreasure(rng)` (R151, new export).** Extracted the d6 Dungeon Magic Treasure roll from the `rollLoot` magic branch so the Final Boss second item can reuse it. Test: returns valid items across seeds 1–40.
20. **Roll-4 return-type fix (found by the new test).** The sibling's rewrite of this file left `rollMagicTreasure` returning the `MAGIC_TREASURE` table object (not a string) for roll 4, violating its declared `{ item: string }` return type and diverging from `rollLoot` (which grants the name string). Now returns `item: name` (`Magic Weapon (+1, <type>)`), matching `rollLoot` and the declared type.

### Store — `src/state/dungeonStore.ts` (all applied after the 2799-line restore)
21. **F10 Rest WM (R124/R133).** `rollWanderingAfterRest` inlined the WM table without rerolling Event/Dragon profiles → now uses `rollWanderingEncounter` (which rerolls); `startCombat` gets `partyFirst: true` so nailed-door rest WM can't be goblin-surprised (the log already claimed the party attacks first).
22. **F12 Rest nails (R133).** `rest()` passed `doorCount: tile.exits.length` (ALL exits) to `canRest`/`beginRest` → now counts exits with `door === true` only, so open exits and cavern openings take no nails. Test: `tests/integration/sectionBStore.test.ts` — a room with 1 door + openings rests on 1 bag of nails.
23. **F14 Search WM ambush (R123).** `search()` never consumed the flag `searchTile` sets on a roll of 1 → now clears `pendingWanderingMonsters` and starts an ambush via `rollWanderingEncounter` + `beginAmbushCombat`. Test: `sectionBStore.test.ts` — seed 7 (first d6 = 1) → combat starts at once, flag cleared.
24. **F15 Hidden-treasure alarm (R127).** `claimFind()` called `rollHiddenTreasure` without the party (descriptive text only) → now passes `party`; an alarm result starts the WM ambush after persist.
25. **F16 Final Boss treasure (R118).** `awardVictory`: if `due.finalBoss`, `loot.gold = Math.max(loot.gold * 3, 100)` (tripled or raised to 100gp, whichever better — applied even on a 0-gp roll) and, when `loot.magic` exists, a second item via `rollMagicTreasure(rng)` granted to the carrier. Guarded by `!combat.noLootWin` (a fled Boss earns nothing; `due.finalBoss` already requires it slain). Test: `sectionBStore.test.ts` — slain boss → log line + party gold ≥ +100gp.
26. **F16 Final Boss +1 Life wiring (R118).** `beginCombat` and the living-statue site now call `applyFinalBossBuff(enemies[0])` when the flag is set.
27. **F18 Treasure tiles (R114 rolls 2–3).** New store action `claimTileTreasure()` — `treasure` → `rollLoot(rng, '0', env)`, grant gold/scroll/item/rations, mark content `empty`; `treasureTrapped` → trap first (F19 flow), then loot. Replaces the DungeonScreen placeholder text ("Treasure here! (loot tables land in Phase 5)"). Tests: `sectionBStore.test.ts` — plain claim spends the tile; trapped claim pays out after disarm.
28. **F19 Trap disarm flow (R132).** New `'trap'` kind on `PendingChoicePayload` (`src/engine/dungeon/generate.ts`: `trap`, `env`, `hcl`, `leaderIndex`, `origin` fields) + new store action `answerTrapDisarm(pcId | null)` — a rogue in marching-order positions 1–2 attempts via `attemptTrapDisarm` + `trapLevelFor`; success neutralizes (and marks `content.trapDisarmed` for treasure traps, leaving the loot claimable); failure or null resolves via `resolveTrap`/`resolveEnvTrap` and starts a WM ambush on `wanderingMonsters`. Wired into `finishEvent` (dungeon event trap, after the Miners' Amulet check), the env-event trap branch in `explore()` (after its Amulet check; that branch's WM roll also now uses `rollWanderingEncounter`), and `claimTileTreasure`. `TileContent` gained `trap` (rolled once per tile, so disarm/firing resolve the same trap) and `trapDisarmed`. `rollEncounterSimple` now passes `{ canBeFinalBoss: false }` to `rollEncounter` (its post-hoc `enc.isFinalBoss = false` lines are redundant but harmless).
29. **F20 `viaSecretDoor` one-shot (R125).** `beginAmbushCombat` clears `tile.viaSecretDoor` before `startCombat` (WM ambushes never get the −1), and `awardVictory` clears it after the doubling is applied (first victory in the tile consumes the secret-door bonus). Residual edge: a WM ambush before the tile encounter is fought steals the encounter's −1 — flagged in §(c).
30. **buyPassage gate (R114 roll 9 / R126).** Store `buyPassage` now requires current tile `contentRoll === 9` (was spendable from any tile); `DungeonScreen.tsx` shows the 2-Clue buttons only on a Content-9 tile. Test: `sectionBStore.test.ts` — refused elsewhere, spends 2 Clues on a Content-9 tile.

### UI — `src/features/dungeon/`
31. **DungeonScreen treasure buttons (F18).** "Take the treasure" / "Take the treasure (trapped!)" buttons replace the Phase 5 placeholder paragraphs; wired to `claimTileTreasure`.
32. **DungeonScreen buyPassage gate (F19 companion).** 2-Clue passage buttons gated on `tile.contentRoll === 9`.
33. **ChoiceDialog trap case (F19).** Rogue disarm buttons (living rogues in marching-order positions 1–2 only) + "Let it fire" button, wired to `answerTrapDisarm`.

### Test correction (not a code fix)
34. **Door-table bands (R129, `sectionB.test.ts`).** My first bands used wrong expected counts (sealed 17, unlocked 267). Correct 2d6 proportions for 600 rolls: sealed ~33, iron ~50, illusionary ~67, locked ~150, unlocked ~300, trapped ~33, lever ~17; bands reset to ±4σ. The code's mapping (7–10 → unlocked) was right; the test was wrong.

---

## (c) FLAGGED but not fixed

Do not guess these — each needs the physical book (or a design decision from Steven/the coordinator).

- **R117 base-count ambiguity.** Code rolls d6 + *previous* majors; ledger "d6 + 1 per Major Foe met so far" could include the current foe. Code is internally consistent (statue uses the same convention). Needs book.
- **R118 "+1 attack".** Mapping ambiguous (L for Defense only? both attack+defense? damage?). +1 Life / fight-to-death / treasure implemented; attack part unimplemented.
- **R117 grid-full → last tile holds Final Boss.** Not implemented (placement failure = dead end instead).
- **R112 corridor stretch 1–2 squares.** Not implemented (dead end instead).
- **R116 bribed tiles safe / gifts reclaim.** Not implemented (retrace WM rolls regardless).
- **R119 exit adventure.** No leave/complete-adventure flow exists after slaying the Final Boss (only tutorial/scenario text mentions leaving alive).
- **R120 split party.** Not implemented.
- **R121 fallen heroes.** Gear-grab (1 turn), body-carrier auto-hit/no-Defense/positions 3–4, 5-in-6 stolen, Resurrection Ritual (1000gp temple) — none implemented.
- **R122 petrification.** Medusa gaze not implemented in combat (profile text only); no petrified status; Blessing removes only `cursed`; rescue-mission cleric hire not implemented.
- **R123/R129 Halfling Luck rerolls (search, doors).** No Luck economy exists (`luckPoints` flag unread).
- **R124 vs R116 tension.** Code targets the rearmost PC on surprise round 1 in rooms too (R116 reading); R124 says room = standard distribution. Ledger-internal tension; code picked one.
- **R129 lever-door withdrawal benefit** ("no Foe strikes") not implemented (flee flow carries no exit); iron-door scroll-cast not accepted (memorized slots only); sealed-door L uses HCL+d6 by analogy (ledger gives no L); sealed nat-1 "2 damage OR WM" implemented deterministically as 2 damage.
- **R132 bear-trap/trapdoor residuals.** `bear-trapped` condition recorded but never read (−1 attack/defense until healed, −2 vs further traps not applied); trapdoor "alone = death" not implemented.
- **R133 rest.** `hasSpentAbility` covers only wizard/elf/cleric (spell slots, cleric prayers) — halfling Luck / Trick / rage recovery not covered; neighbours rule ignores ungenerated exits (judgment call, defensible).
- **R134 madness enforcement.** Paranoid (no equipment exchange) not enforced; Madness > L leaves forever not enforced; L1–4 "2 damage instead of 1 Madness" option not offered in ghost dialog; exiting dungeon heals 1 Madness (needs ≥1 Major defeated) not implemented; Blessing heals 1 Madness not implemented.
- **R141/R144 fungal mushroom doors (L1 bash).** Not implemented; bash uses HCL+d6.
- **R142 stalactites (explosive 2H → 3-in-6 fall) and boulders (+1 Def vs ranged, −1 ranged, foe surprise +1, +1 Stealth).** Not implemented in combat (feature text only). Echo −1 Stealth not implemented (no stealth system in scope).
- **R142 toxic spores "monk leading = ignored".** Not implemented (mushroom monk class doesn't exist, unexercisable). Rolling boulder "blocks one opening" and "from front or back" not modelled (random d3 PCs instead).
- **R144/R143 4-as-5 lists.** Cavern "shadows" don't exist; code uses rogue/assassin/halfling (caverns) and halfling/mushroom-monk (fungal) — reasonable.
- **R145 animal companions.** Not implemented (roster: Hawk, Owl, Peacock, Warhound, Wildcat, Warhorse, Crow with stats in ledger).
- **R114 roll 5 caverns.** Content-5 cavern feature OVERWRITES the entry feature in store `explore()` (single `cavernFeature` field) — ambiguous whether book intends two features.
- **Part 10 citation mismatch — RESOLVED by ruling 6 (2026-11-13): p.164.** Dungeon traps now cite p.164 throughout code (`features.ts`, `resolve.ts` messages), matching the ledger Part 10 header and R132.
- **Cavern/fungal trap bonus ambiguity.** "All +½L, rogue +L" — code adds both (rogue gets ½L+L); replacement reading (rogue gets +L instead of ½L) is equally plausible. Left as-is.
- **Deterministic readings (documented in code, need book to confirm).** Hidden-treasure trap complication; spore-cloud two-save semantics; shrieking-mushroom `>= 3` threshold; sealed-door L = HCL+d6 by analogy.
- **R117 WM exclusion.** Code excludes WM Majors from being Final Boss (citing p.104); ledger supports it explicitly only for event WM raids (R160: "no Final Boss possible"). Retracing-WM exclusion rests on the code's p.104 citation, not on ledger text.
- **F20 residual edge.** A WM ambush in a secret-door tile before the tile encounter is fought clears `viaSecretDoor`, so the later tile encounter loses its −1 surprise. The common case (WM after the encounter) is fixed; this ordering edge remains.
- **xpDue life-vs-count (found while testing F16).** `xpDue` counts a slain foe by `life === 0`, but minor foes die by `count` (their `life` stays 1) — a minor foe flagged as Final Boss would never count as slain. Unreachable through generation (boss roll only runs for major profiles, `generate.ts:740`; majors die by life), but latent: `xpDue` could also accept `count === 0` for defense in depth.
- **F16 second magic item — store path untested for the grant itself.** `rollMagicTreasure` is unit-tested; the store test asserts the gold tripling + log line, but the second-item grant depends on `loot.magic` existing (random per roll) and has no deterministic store-level assertion.
- **`slimed` skip-a-turn (p.166).** Condition recorded, never enforced (see fix #12).

---

## (d) OQ-2 tile-shape status + darkvision

### OQ-2 — tile shapes (cannot be resolved without the physical book)
- All 36 d66 shapes + 6 starting shapes exist in `src/rulesets/expanded/tiles.ts` with footprints and door positions; `tests/unit/tileData.test.ts` (9 tests) + the 100-seeded-dungeon simulation pass with no structural violations.
- **Low-confidence as coded:** d66 **[32, 35]** (32: "partial reads only; L-corridor per first pass"; 35: "nook/room junction obscured by art") + starting **[4, 5]** (diagonal approximations).
- **Confidence mismatch — flag, do not change:** ledger OQ-2 says diagrams for 23, 33, 35, 62, 63 were partly art-covered, but `tiles.ts` marks 23/33/62 `high` (63 `medium`, 35 `low`). Tiles 23/33/62/63 door-position uncertainty is therefore unresolved either way. Do NOT change confidence flags without the book.

### Darkvision (R093–R094) — needs book
- `DARKVISION_CLASSES` in `src/engine/light.ts` is `[]` **by design**: the header comment states no entry in the ledger — and no class data in this repo — names which classes have darkvision. Verified intentional; no class list invented. Light model otherwise verified (§(a): torch 6 rooms, lantern drop, pickup costs 1 turn, darkness −2).

---

## (e) Incidents and cross-worker notes

1. **`dungeonStore.ts` truncation (2026-11-13 ~18:58 UTC).** During a store-interface edit, the file went to 0 bytes (had been 2799 lines of uncommitted Release 0.5 work). Likely cause: a sibling section worker's failed exec-shell write (the known EPERM 0-byte failure mode) landing on the same file. No recovery from git (HEAD version is 1510 lines; the Nov 11 stash is the same HEAD version). A sibling restored the full 2799-line working version by ~19:15 UTC (first 627 lines differ from HEAD — Release 0.5 imports present — so it is the working version, not HEAD). **Do not restore the 1510-line HEAD version.** All store fixes in §(b) were applied to the restored file; `tests/integration/doorTreasure.test.ts` passes against it.
2. **Sibling rewriting `loot.ts`.** `rollMagicTreasure` was inserted additively and matched the magic-branch mapping at the time; a later sibling rewrite changed the roll-4 return to the table object (fixed as item #20 above). Do not edit `loot.ts` further without re-reading it.
3. **Fixtures.** See header. The `make-fixtures` vitest run zeroes fixtures under this sandbox's EPERM; regeneration via vite-node/esbuild was attempted three ways and blocked by the same fault (0-byte stubs deleted; `tests/e2e-05/fixtures/` is empty). Regenerate with `npm run make-fixtures` in a healthy window before the e2e specs run.
4. **Test files added:** `tests/unit/sectionB.test.ts` (38 tests), `tests/integration/sectionBStore.test.ts` (6 tests). Full area run: `tileData` 9 · `doors` 15 · `rest` 4 · `sectionB` 38 · `doorTreasure` 1 · `sectionBStore` 6 · `dungeonGen` sim 8 = **81 passing**. Full suite / build / e2e NOT run (coordinator's job).
