# Rules Verification Report — Phase I (2026-11-13)

**Repo:** `four-against-darkness-pwa`, working tree only (no commits, no pushes).
**Remote head at time of pass:** `87919e89` (animation round).
**Method:** three workers split the ledger (Section A: Parts 1, 5, 6, 14; Section B:
Parts 8, 9, 10, OQ-2, light; Section C: Parts 2, 3, 4, 7, 11, 12, 13, 15), verified
each entry against `src/` by reading the code (numbers checked, not vibes), fixed real
discrepancies, and added tests. Detail per section: `docs/RULES_VERIFICATION_SECTION_A.md`,
`docs/RULES_VERIFICATION_SECTION_B.md`, `docs/RULES_VERIFICATION_SECTION_C.md`.
Per-entry status is in `docs/RULES_VERIFICATION.md` ("Verification pass (2026-11-13)").

**Counts:** Section A — 33 verified (31 full + 2 partial), 9 fixed, 28 flagged.
Section B — 26 rule entries + 18 trap-table entries verified, 34 fixed, 22 flagged.
Section C — 34 verified, 17 fix groups, 27 flagged. (An entry can be both
verified-core and flagged-sub-part; counts overlap by design.)
**Tests:** 443 unit/integration tests green (39 files); `tsc --noEmit` clean.
New test files: `tests/unit/rulesSectionA.test.ts` (22),
`tests/unit/sectionB.test.ts` (38), `tests/integration/sectionBStore.test.ts` (6),
`tests/unit/sectionC.test.ts` (31).
**Build:** full `vite build` could not complete in this sandbox — EPERM on file writes
(environment fault, not a code error). `tsc --noEmit` is clean and the Vite transform
succeeds on all 183 modules; only artifact emission (dist writes, service-worker write)
is blocked. Re-run `npm run build` in a healthy environment before deploying.

---

## (a) Discrepancies FIXED (60)

### Section A — Core resolution, stealth, combat, XP (9)
| # | Rule | What was wrong | What changed | Test |
| --- | --- | --- | --- | --- |
| A1 | R009 | Exploding-dice log called `rng.roll()`, recording fresh dice with different faces than the attack | Added `Rng.record()` (`rng.ts`); `rollExplodingD6` logs the actual chain. Coordinator follow-up: `record` call guarded (`typeof record === 'function'`) so test stub RNGs without a roll log don't crash; same guard applied to the no-explosions branch in `rollCombatDie` | `rulesSectionA.test.ts` "the roll history records the real chain" |
| A2 | R076/R124 | Natural-1 defense checked the total (`finalTotal === 1`), not the die face — a die 1 with +2 bonuses (total 3 vs L2) wrongly succeeded | `runFoesTurn` + `fleeCombat`: hit if `finalTotal <= effLevel \|\| rolls[0] === 1`, with a "natural 1" log line | Seed-search test "a natural 1 fails even when the total beats the Foe L" |
| A3 | R076/R124 | Surprise did not strip the shield bonus on turn 1 | `runFoesTurn`: when surprised and round 1, defense drops the shield +1 (`defenseBonusFor(..., { noShield })`), log notes "no shield — surprised" | Seed-search test "a surprised party loses its shield bonus on turn 1" |
| A4 | R081 | Major Foe weakened at exactly half Life (`life <= maxLife / 2`); book says *below* half | `applyMajorDamage` uses `enemy.life * 2 < enemy.maxLife` | "exactly half Life does not weaken; below half does" |
| A5 | R006 | HCL rescaled as the party levelled — `newDungeon` took `hcl` but never stored it; handlers recomputed HCL from current party level | `DungeonState.hcl` stored by `newDungeon`; exported `dungeonHcl(dungeon, party)` (stored HCL preferred, fallback to current max for older saves), used at `explore`, `rollWanderingAfterRest`, `claimFind`, door-bash WM roll | 3 R006 tests in `rulesSectionA.test.ts` |
| A6 | R075/R076/R077 | Missing situational modifiers | `attackBonusFor`: cleric +L vs Undead (replaces +½L), dwarf +1 vs goblins, elf +1 vs orcs, elf loses +L with 2H melee; `meleeWeaponFor`: 2H +1 any class; `defenseBonusFor`: dwarf +1 / halfling +L vs giant/troll/ogre (Giant Spider excluded via `isGiantTrollOgre`) | R075/R076/R077 tests |
| A7 | R100/R090 | Reaction wins (Flee/Peaceful/Ignore) wrongly awarded treasure | `noLootWin` flag on `CombatState`, set by `rollReactions` on a Reaction win; `awardVictory` skips loot (base roll, multi-roll, sealed/iron bonus) while the minor-encounter XP tally still counts | `rulesSectionA.test.ts` + `xpRolls.test.ts` "a reaction win awards NO loot but still counts the minor tally" |
| A8 | R171/R172 | Final Boss XP/level-up awarded when the Final Boss fled | `xpDue` requires `!e.fled && e.life === 0` for the Final Boss bonus | "a fled Final Boss earns no boss bonus; a slain one does" |
| A9 | R170 | No XP roll to a PC that just levelled in the same batch | `DungeonState.lastXpLevelUpPcId`; `spendXpRoll` blocks the just-levelled PC while other survivors remain (sole-survivor exception); cleared when the batch is spent or a fresh batch starts | 3 R170 tests (blocked / another PC may spend / sole survivor may spend) |

### Section B — Dungeon generation, tiles, doors, light, traps, environments (34)
| # | Rule | What was wrong | What changed | Test |
| --- | --- | --- | --- | --- |
| B1 | R123/R143/R144 | Search 4-counts-as-5 applied to rogue/assassin/halfling in ALL environments | Scoped: caverns → rogue/assassin/halfling; fungal → halfling + mushroom monk; dungeon → never | `sectionB.test.ts` (dungeon rogue 4 → empty; caverns rogue 4 → find; fungal rogue 4 → empty, halfling 4 → find) |
| B2 | R117/R124/R160 | `rollEncounter` made the Final Boss roll for Wandering Monsters, then cleared `isFinalBoss` — leaking a false "THE FINAL BOSS has been revealed!" log line | `rollEncounter` gained `opts: { canBeFinalBoss?: boolean }`; retrace/WM passes `false` (no roll, no event); tally still increments for WM Majors | `sectionB.test.ts` — WM Major reveals no boss; room encounter reveals on d6=6 |
| B3 | R117 | Invisible Gremlins (event) did not increment the Major-Foe tally ("incl. gremlins") | `rollEncounter` increments `majorFoesMet` for gremlins, with a log line | `tests/simulation/dungeonGen.test.ts` (100 seeded dungeons) still passes |
| B4 | R141 | Cavern tiles kept doors on their exits | `exploreThrough`: cavern tiles get `door = false` on all exits (back exit keeps shared already-opened `doorInfo` but reads as an opening from the cavern side). Changes generation — fixtures need regenerating (see §Environment) | `sectionB.test.ts` — explore into cavern → all exits `door === false` |
| B5 | R127 | Hidden-treasure complications were descriptive text only | New `resolveHiddenTreasureComplication` + `rollHiddenTreasure(state, rng, hcl, party?)`: alarm (1–2) → WM flag; trap (3–5) → living rogue disarms (d6 + lockpickBonus vs HCL+1; failure falls through to random-PC Save vs HCL+1, fail = 1 Life, natural 1 = 2 Life; no rogue → random-PC Save directly); ghost (6) → living cleric Saves d6 vs HCL to banish, else all living PCs lose 1 Life | `sectionB.test.ts` — rogue disarm success/failure; no-rogue Save (nat 1 = 2 Life); ghost banish/fail/no-cleric; alarm flag; gold range |
| B6 | Part 10 | Dart trap compared Defense vs HCL (label said HCL+1) | Now vs HCL+1 with full Defense bonus (armor + shield + rogue +L); halfling reroll triggers on failure vs HCL+1 | `sectionB.test.ts` — 4 vs HCL 3 is a hit; armored dodge on a 2; halfling reroll |
| B7 | Part 10 | Spears trap bonus was 0 | Each of 2 random targets rolls d6 + `defenseBonusFor` vs HCL+4 | Two armored targets dodge (5+3=8 > L7) |
| B8 | R132 | No trap-level/disarm helpers | New exports `trapLevelFor(trap, hcl)` (dart HCL+1, poisonGas HCL+2, trapdoor/bearTrap HCL+3, spears/fallingStone HCL+4, cavern/fungal levels) and `attemptTrapDisarm(rng, rogue, trapLevel)` (d6 + lockpickBonus vs trap L) | `sectionB.test.ts` — level values + disarm success/failure |
| B9 | Part 10 (p.165) | Cavern halfling rerolls missing | `saveWithHalflingReroll` in `resolveEnvTrap`, applied to stalactite, rockslide, swinging log | `sectionB.test.ts` |
| B10 | Part 10 (p.166) | Sleep spores: cleric wrongly immune; no released-cloud stage | Removed cleric from immune list; if the first victim falls asleep, all other living non-immune PCs Save vs HCL poison; if every living PC ends up asleep, all die | Cleric not immune (sleeps, party dies); cloud stage kills whole party; kukla immune |
| B11 | Part 10 (p.166) | Spore cloud was a single Save vs HCL+1 | Now two Saves (vs HCL+1, then vs HCL+3 poison; halfling/barbarian +L on both), immunity for mushroomMonk/kukla, coughing rolls 1-in-6 WM | Second-Save pass = no damage; both fail = 1 Life + coughing + WM flag on d6=1 |
| B12 | Part 10 (p.166) | Slime patch fall did not roll Wandering Monsters | Fall now rolls 1-in-6 WM, returns `wanderingMonsters: true` on a 1 | WM roll test |
| B13 | Part 10 (p.166) | Shrieking mushroom modifier direction INVERTED (`d6+mod <= 4` made −2 *more* likely to call WM) | Now WM on `d6+mod >= 3`: base 4-in-6, halfling/forester −2 → 2-in-6, rogue −1 → 3-in-6 | All six modifier cases |
| B14 | Part 10 (p.166) | Cordyceps wrongly gave halfling/barbarian +L (borrowed from spore cloud) | Save is now plain d6 vs HCL+3 | Halfling L4, die 3 → controlled |
| B15 | R118 | No `applyFinalBossBuff` | New export: +1 Life and +1 maxLife. ("+1 attack" NOT applied — mapping ambiguous; see §(b).) | 9→10 Life |
| B16 | R133 | Resting behind nailed doors could still be goblin-surprised | `partyFirst` option in `startCombat` skips the surprise check entirely | Via rest-WM test |
| B17 | R118 | Final Boss could be bribed/fled via Reactions | `rollReactions`: `isFinalBossFlag` enemies log "The Final Boss fights to the death!" and skip the Reaction roll | Via `startCombat` with `partyWaits: true` (Young Dragon) |
| B18 | R151 | No reusable Magic Treasure roll (Final Boss second item needed one) | New export `rollMagicTreasure(rng)` | Returns valid items across seeds 1–40 |
| B19 | R151 | `rollMagicTreasure` roll-4 returned the `MAGIC_TREASURE` table object, not a string (violated declared `{ item: string }` return type) | Returns `item: name` (`Magic Weapon (+1, <type>)`), matching `rollLoot` | Found by the new test |
| B20 | R124/R133 | Rest WM inlined the WM table without rerolling Event/Dragon profiles | `rollWanderingAfterRest` now uses `rollWanderingEncounter` (which rerolls); `startCombat` gets `partyFirst: true` | Rest-WM tests |
| B21 | R133 | Rest nails counted ALL exits (`tile.exits.length`) | Now counts exits with `door === true` only — open exits and cavern openings take no nails | `sectionBStore.test.ts` — room with 1 door + openings rests on 1 bag of nails |
| B22 | R123 | `search()` never consumed the flag `searchTile` sets on a roll of 1 | Now clears `pendingWanderingMonsters` and starts an ambush via `rollWanderingEncounter` + `beginAmbushCombat` | `sectionBStore.test.ts` — seed 7 (first d6 = 1) → combat starts at once, flag cleared |
| B23 | R127 | `claimFind()` called `rollHiddenTreasure` without the party (descriptive text only) | Now passes `party`; an alarm result starts the WM ambush after persist | `sectionBStore.test.ts` |
| B24 | R118 | Final Boss treasure not tripled/raised, no second magic item | `awardVictory`: if `due.finalBoss`, `loot.gold = Math.max(loot.gold * 3, 100)` and, when `loot.magic` exists, a second item via `rollMagicTreasure(rng)` granted to the carrier; guarded by `!combat.noLootWin` | `sectionBStore.test.ts` — slain boss → log line + party gold ≥ +100gp |
| B25 | R118 | Final Boss +1 Life never applied in combat | `beginCombat` and the living-statue site call `applyFinalBossBuff(enemies[0])` when the flag is set | Via boss tests |
| B26 | R114 | Treasure tiles (rolls 2–3) showed a placeholder ("Treasure here! (loot tables land in Phase 5)") | New store action `claimTileTreasure()`: `treasure` → `rollLoot`, grant gold/scroll/item/rations, mark content `empty`; `treasureTrapped` → trap first (B27 flow), then loot | `sectionBStore.test.ts` — plain claim spends the tile; trapped claim pays out after disarm |
| B27 | R132 | No trap disarm flow in the store/UI | New `'trap'` kind on `PendingChoicePayload` + store action `answerTrapDisarm(pcId | null)` — rogue in marching-order positions 1–2 attempts via `attemptTrapDisarm` + `trapLevelFor`; success neutralizes (marks `content.trapDisarmed` for treasure traps); failure or null resolves via `resolveTrap`/`resolveEnvTrap` and starts a WM ambush on `wanderingMonsters`. Wired into `finishEvent`, the env-event trap branch in `explore()`, and `claimTileTreasure`. `TileContent` gained `trap` (rolled once per tile) and `trapDisarmed` | `sectionBStore.test.ts`; UI: `ChoiceDialog.tsx` rogue disarm buttons + "Let it fire" |
| B28 | R125 | `viaSecretDoor` persisted — a later WM ambush or second victory could consume the secret-door bonus | `beginAmbushCombat` clears `tile.viaSecretDoor` before `startCombat`; `awardVictory` clears it after the doubling is applied (one-shot) | Residual edge flagged in §(b) (WM ambush before the tile encounter steals the −1) |
| B29 | R114/R126 | `buyPassage` spendable from any tile | Now requires current tile `contentRoll === 9`; `DungeonScreen.tsx` shows the 2-Clue buttons only on a Content-9 tile | `sectionBStore.test.ts` — refused elsewhere, spends 2 Clues on Content-9 |
| B30 | UI | Treasure placeholder paragraphs in `DungeonScreen.tsx` | "Take the treasure" / "Take the treasure (trapped!)" buttons wired to `claimTileTreasure` | `sectionBStore.test.ts` |
| B31 | UI | 2-Clue passage buttons shown on any tile | Gated on `tile.contentRoll === 9` | `sectionBStore.test.ts` |
| B32 | UI | No trap dialog | `ChoiceDialog.tsx` trap case: rogue disarm buttons (living rogues in positions 1–2 only) + "Let it fire", wired to `answerTrapDisarm` | `sectionBStore.test.ts` |
| B33 | R129 | Door-table test bands used wrong expected counts (sealed 17, unlocked 267) | Correct 2d6 proportions for 600 rolls: sealed ~33, iron ~50, illusionary ~67, locked ~150, unlocked ~300, trapped ~33, lever ~17; bands reset to ±4σ. The code's mapping (7–10 → unlocked) was right; the test was wrong | `sectionB.test.ts` 600-seed proportions |

### Section C — Classes, magic, treasure, monsters, equipment (17 groups)
| # | Rule | What was wrong | What changed | Test |
| --- | --- | --- | --- | --- |
| C1 | R150 | `++` treasure shift was 1, not 2 — Mummy treasure (+2) could land on rows 0–2 | `modToShift('++')` returns 2 | `sectionC.test.ts` "'++' never yields the empty row or the d6-gold row" |
| C2 | R150 | `none` treasure (Rats, Bats, Skeletal Rats, Skeletons/Zombies, Iron Eater) still rolled | `rollLoot` returns `{ gold: 0, text: 'No treasure — these Foes carry none.' }` for mod `'none'` | "'none' means no treasure at all, in any environment" |
| C3 | R150 | `no-magic` (Orcs, Orc Brute) had no effect | A row-6 magic result is replaced by d6×d6 gp | "'no-magic' replaces a magic result with d6×d6 gp" |
| C4 | R049 | Scrolls always rolled the 6 wizard spells | Scroll case rolls d12 `DRUID_SPELLS` (fungal bark) / `ILLUSIONIST_SPELLS` (cavern prism); `LootResult.scroll` now `{ spell?; list?; name? }`; new `scrollEquipmentName()` returns the stored name instead of `scroll of undefined` | Druid/illusionist/wizard scroll tests |
| C5 | R151 | Fungal row-6 magic could yield a Fireball Staff and never a Rare Mushroom | Documented interpretation (ledger gives no odds): d6 1–3 magic item, 4–6 Fungal Rare Item; a magic roll of 6 in fungal gives a Rare Mushroom roll instead of the Fireball Staff | "fungal magic never yields a Fireball Staff…" |
| C6 | R046/R047 | Druid & illusionist spell data missing | New `src/rulesets/expanded/extraSpells.ts`: `DRUID_SPELLS` + `ILLUSIONIST_SPELLS`, 12 entries each, paraphrased effects (FADEE pp.70–72, 73–75). Header notes casting has NO engine support yet | "extra spell lists" |
| C7 | R041 | Free hand never enforced for casting | `canCast` returns false when `!hasFreeHand(pc)`; `castSpell`/`castScroll` throw without a free hand; `CombatPanel` disables cast buttons when the caster's hand is busy (lantern/torch/Wand of Sleep/Fireball Staff/Ring of Teleportation occupy the hand; wand/holy-symbol hands count as free) | "free hand to cast" |
| C8 | R044/R050 | A memorized Blessing consumed the slot and did nothing | `CastableSpell` includes `'blessing'`; `castSpell` handles memorized Blessing via `castBlessing` + `endPcTurn`; CombatPanel spell button treats Blessing as targetless | "memorized Blessing" |
| C9 | R044 | Failed Fireball slew nothing | Failure branch still slays 1 Minor ("minimum 1 even on a failed roll") | "a failed Fireball still slays 1 Minor" |
| C10 | R044 | Sleep worked on dragons and L11+ Foes | Immunity extended to `category === 'Dragon'` and `enemy.level >= 11` (in addition to Unliving/Artificial/Elemental) | "Sleep fails on dragons" / "…on L11+ Foes even when the casting roll succeeds" |
| C11 | Part 12 | Minotaur Charge (FADEE p.169) missing | First Defense roll against a Minotaur attack is −1 on round 1 in `runFoesTurn`, with a log note | "Minotaur Charge" |
| C12 | R051 | Weakness secret lasted forever and targeted Minor species | New `consumeWeaknessSecret(state)`, called from `finishCombat`, `rollReactions` won path, both `fleeCombat` exits, Escape branch, `useTeleportRing` branch. `WEAKNESS_TARGETS` now the 11 dungeon Major species (Mummy, Orc Brute, Ogre, Medusa, Chaos Lord, Young Dragon, Minotaur, Iron Eater, Chimera, Catoblepas, Giant Spider) | "Weakness secret lasts one combat" |
| C13 | R150 | Multi-roll treasure was single-roll | Profiles carry `treasureRolls?: number`: Giant Spider `'++'` → `'0'` + 2 rolls; Chaos Lord `'++'` → `'+'` + 2 rolls; Young Dragon `'++'` → `'+'` + 3 rolls. `awardVictory` loops `rollLoot` that many times, combines gold/text, grants each extra roll's scroll/item/rations | "multi-roll treasure" (data-level) |
| C14 | R150 | Life floors dropped | `lifeFromFormula(level, formula, flat, minLife?)` applies `Math.max(minLife, result)`; Cavern Wraith `lifeFloor: 4`, Land Siren `lifeFloor: 3`; all 5 `lifeFromFormula` call sites pass `enc.monster.lifeFloor` | "life floors" |
| C15 | R114 | A full-Life/full-prayer cleric was listed as having a spent ability | `hasSpentAbility` cleric branch now `return healing < 3 || blessing < 3` (was `pc.spells.length < slots || ...` with `slots = 0 + (L−1)`, wrongly pending rest at L3+) | "cleric rest" |
| C16 | R023 | Halfling duplicate trait reroll was a single retry | `pickTraits` loops `do { rolls[1] = rng.d(6) } while (rolls[1] === rolls[0])` | "halfling traits" (200 seeds, rolls always distinct) |
| C17 | Part 3 | The 12 non-core classes had no data | New `src/rulesets/expanded/expandedClasses.ts` (13,980 bytes): Acrobat, Assassin, Bulwark, Druid, Gnome, Illusionist, Kukla, Light Gladiator, Mushroom Monk, Paladin, Ranger, Swashbuckler — ledger table values + condensed paraphrased abilities. `spellSlots` base convention matches coreClasses (slots = base + (L−1)): Druid 3, Gnome 1, Illusionist 4, rest 0. `maxPerParty: 1` on Bulwark and Mushroom Monk. No `traitTable` (book text unavailable), no `startingEquipment` (ledger lists wealth only) | "20-class table" |

---

## (b) Discrepancies FLAGGED but not fixed

Each needs the physical book, an owner decision, or a larger refactor. None was changed.

### Structural / engine-wide (needs a design decision or a refactor)
- **R070 turn structure.** The code's comment says "if every living PC acted → foes' turn", but `pcAttack`/any PC action calls `endPcTurn` immediately — only ONE PC acts per round before Foes act. Fixing is a balance overhaul.
- **R081/R085 foe attack counts.** Major Foes always make exactly 1 attack/round (`attackers = 1` in `runFoesTurn`) despite profile `attacks` values of 2–4; Minor groups are capped at `min(awakeMinors, living.length)` attacks instead of one per Foe, which makes `assignTargets`' more-Foes-than-PCs branch dead code. Same reasoning as R070.
- **R073 ranged-first sequence.** No ranged phase exists (no bow/crossbow/sling attack action; `pcAttack` is melee only; spells act on the PC turn like attacks).
- **R008 tier dice.** All rolls are d6 regardless of level; no d8/d10/d12/d20 tier die, no explosion thresholds for them. The game is effectively Tier-1-only in its dice engine although XP can level PCs past L4.
- **R060–R064 stealth entirely absent.** No Stealth Save function, no group-stealth worst-modifier roll, no environment modifiers applied, no stealth outcomes (quiet exit / ambush L−1 / reveal-and-Reactions), no scout-ahead variant. (Secret-door entry gives the ambush-like L−1, but that is R125, not stealth.)
- **R086 withdraw.** No Withdraw action at all (distinct from Flee: retreat through a door, +1 Defense, lever doors negate strikes). Only Flee exists.
- **R082 bosses with Minions.** Encounters are always a single profile group; no split-party sub-fights, no +2 XP rolls for the split, no "no treasure for the Minor group".
- **R087 flee distribution.** `fleeCombat` attacks round-robin in party order instead of lowest-Life PCs first, then hated classes, then random; caps Minor attacks at party size instead of one per Foe.
- **R091 carrying limits.** Not implemented (200 gp, 2 shields, 3 weapons per PC; −1 Defense/climb/jump/swim when over).
- **R092 masterwork.** No masterwork items exist in the data; "explode one step early" cannot apply.
- **R095 firearms.** No handgun/rifle items or rules (+2/+3, roll 1 explodes, 2-turn reload, +1 Wandering Monsters roll per firearm combat).
- **R093 darkness −2 to Saves outside combat.** Trap/event saves in `resolve.ts` take no darkness parameter; the −2 applies to attack/defense/spellcasting in combat only.
- **R078 per-Foe damage.** Profile damage (e.g. Ogre "Tier+1 damage") is text only; all failed defenses deal 1.
- **R090 barbarian magic-item refusal / humanoid hand-weapon breaks on attack 1 / Wandering Monsters carry only weapons.** Not implemented (loot `carrier` is first living PC regardless of class; WM wins roll the normal loot table).
- **R094 torch +2 vs flammable.** Torch is a light source, not modelled as a weapon.
- **R005 rerolls.** No Luck/reroll economy exists (halfling `luckPoints: true` is a data flag nothing reads). Only isolated rerolls exist (halfling dart-trap reroll; trait text).
- **R175 expert skills.** Not implemented (documented out of scope in `src/engine/xp.ts` header).
- **R042 Magic Resistance.** No data and no engine support anywhere.
- **R043 preventive casting.** No engine support.
- **R046/R047 druid/illusionist casting.** Data added (C6); no casting engine. Bark scrolls and prisms are inert inventory until casting lands.
- **R051 — 6 of 10 Secrets unimplemented.** Only Weakness, Terrifying Secret, Treasure Location, Item Location exist. Missing: Deal with a Foe, True name, New spell, Magical/spiritual power increase, Scroll location, Potion recipe.
- **R157/R158/R161 Fiendish Foes.** No Fiendish Foes tables, no Fiendish treasure tables, no R161 usage (only a `flatLife` field hints at it).
- **R100 reaction outcomes that fall through.** Quest, Blood Offering, Sleep, Food/rest, Magic Challenge, Trade Information, Capture, Trial of Champions, Puzzle have no engine handling; Ignore's "steal 1 treasure item via Stealth Save" not implemented.
- **R156 Epic Rewards with no engine hook.** Gold of Kerrak Dar (roll 2); Arrow of Slaying auto-3-damage (roll 5; destined species only logged); Shield of Warning's surprised/fleeing benefit (roll 4; treated as a normal shield, stripped while fleeing); Book of Skalitos dragon-breath destruction.
- **R145 animal companions.** Not implemented (roster: Hawk, Owl, Peacock, Warhound, Wildcat, Warhorse, Crow with stats in ledger).
- **R119 exit adventure.** No leave/complete-adventure flow after slaying the Final Boss.
- **R120 split party.** Not implemented.
- **R121 fallen heroes.** Gear-grab (1 turn), body-carrier auto-hit/no-Defense/positions 3–4, 5-in-6 stolen, Resurrection Ritual (1000gp temple) — none implemented.
- **R122 petrification.** Medusa gaze not implemented in combat (profile text only); no petrified status; Blessing removes only `cursed`; rescue-mission cleric hire not implemented.
- **R134 madness enforcement.** Paranoid (no equipment exchange) not enforced; Madness > L leaves forever not enforced; L1–4 "2 damage instead of 1 Madness" option not offered in ghost dialog; exiting dungeon heals 1 Madness (needs ≥1 Major defeated) not implemented; Blessing heals 1 Madness not implemented.
- **R084 marching order.** Corridor rule (positions 1–2 melee only; rear ambush hits 3–4) not enforced in combat; narrow-corridor 2H −1 not implemented; combat doesn't know tile shape.
- **R072 surprise.** Per-Foe X-in-6 implemented only for Goblins (1-in-6); other profiles' surprise chances (e.g. 2-in-6 cave goblins, auto-surprise stalactomimics) live only in profile text.
- **R083 fleeing-Foe parting attack.** "One last attack at +1 each (or a spell)" to cut down fleeing Foes is not offered; morale-fled Foes just vanish.
- **R027/R028 two-handed/shield strapping and weapon swap.** No engine mechanic.
- **R026 `savesAs` never read outside the data.** Save umbrella groups exist as data only; no save mechanic consumes them.
- **Class weapon/armor restrictions never enforced.** `weaponsAllowed` / `armorAllowed` exist as data only.
- **Two-handed-weapon busy hand NOT enforced for casting.** `hasFreeHand` does not treat a two-handed weapon as occupying the hand; enforcing it would break the elf's starting bow with no stow/swap mechanic in place. Deliberately left unenforced.
- **R141/R144 fungal mushroom doors (L1 bash).** Not implemented; bash uses HCL+d6.
- **R142 stalactites (explosive 2H → 3-in-6 fall) and boulders (+1 Def vs ranged, −1 ranged, foe surprise +1, +1 Stealth).** Not implemented in combat (feature text only).
- **R129 lever-door withdrawal benefit** ("no Foe strikes") not implemented (flee flow carries no exit); iron-door scroll-cast not accepted (memorized slots only); sealed-door L uses HCL+d6 by analogy (ledger gives no L); sealed nat-1 "2 damage OR WM" implemented deterministically as 2 damage.
- **R132 bear-trap/trapdoor residuals.** `bear-trapped` condition recorded but never read (−1 attack/defense until healed, −2 vs further traps not applied); trapdoor "alone = death" not implemented.
- **R133 rest.** `hasSpentAbility` covers only wizard/elf/cleric (spell slots, cleric prayers) — halfling Luck / Trick / rage recovery not covered; neighbours rule ignores ungenerated exits (judgment call, defensible).
- **R142 toxic spores "monk leading = ignored".** Not implemented (mushroom monk class doesn't exist, unexercisable). Rolling boulder "blocks one opening" and "from front or back" not modelled (random d3 PCs instead).
- **R114 roll 5 caverns.** Content-5 cavern feature OVERWRITES the entry feature in store `explore()` (single `cavernFeature` field) — ambiguous whether the book intends two features.
- **R143/R144 4-as-5 lists.** Cavern "shadows" don't exist; code uses rogue/assassin/halfling (caverns) and halfling/mushroom-monk (fungal) — reasonable.
- **R150 treasure-row OR alternatives resolved to a single fixed option.** Fungal row 2 (rations OR mushroom), row 3 (bark OR mushroom), row 4 (gem OR 2 mushroom rolls), row 5 (cavern gem OR prism) — the player is never offered the choice.
- **R155 quest type 2 cavern-gems / fungal-mushrooms variants not implemented.**
- **R121 Resurrection Ritual.** No engine.
- **Part 13 weapon/armor/firearm prices absent.** No shop for them; class kits only. Only the 8 consumables in `ITEM_INFO` are priced.
- **Part 13 torch price ambiguous.** Code charges 1 gp each; ledger reads "1/dozen". Noted only; not changed.
- **Skeletons/Zombies levelCap 6 applies to both.** The ledger caps only zombies.
- **Myco-Mimic "d3+1 attacks" stored as fixed 3.** The attacks field is a number; the d3+1 variance is lost.
- **Cavern/fungal count formulas and Reactions are engine defaults, not book data.** Already flagged in the `environments.ts` header; carried forward.
- **`QUEST_RETRIEVAL_ITEMS` is engine-invented.** Flagged in `environments.ts`; no book source for the retrieval-item list.
- **R075 halfling sling +L.** Unmodelled (no ranged combat).
- **R002 d100.** `formula('d100')` is uniform 1–100, not 2×d10 tens+units; no caller in the build, so unexercised.
- **R116 bribed tiles safe / gifts reclaim.** Not implemented (retrace WM rolls regardless).
- **R117 grid-full → last tile holds Final Boss.** Not implemented (placement failure = dead end instead).
- **R112 corridor stretch 1–2 squares.** Not implemented (dead end instead).
- **R124 vs R116 tension.** Code targets the rearmost PC on surprise round 1 in rooms too (R116 reading); R124 says room = standard distribution. Ledger-internal tension; code picked one.
- **R134/R133 rest neighbours.** Neighbours rule ignores ungenerated exits (judgment call).
- **`slimed` skip-a-turn (p.166).** Condition recorded, never enforced.
- **F20 residual edge.** A WM ambush in a secret-door tile before the tile encounter is fought clears `viaSecretDoor`, so the later tile encounter loses its −1 surprise. The common case (WM after the encounter) is fixed; this ordering edge remains.
- **xpDue life-vs-count (latent).** `xpDue` counts a slain foe by `life === 0`, but minor foes die by `count` (their `life` stays 1) — a minor foe flagged as Final Boss would never count as slain. Unreachable through generation (boss roll only runs for major profiles), but latent: `xpDue` could also accept `count === 0` for defense in depth.
- **F16 second magic item — store path untested for the grant itself.** `rollMagicTreasure` is unit-tested; the store test asserts the gold tripling + log line, but the second-item grant depends on `loot.magic` existing (random per roll) and has no deterministic store-level assertion.
- **R064 Stealth Training expert skill.** Absent with R175.
- **R117 WM exclusion.** Code excludes WM Majors from being Final Boss (citing p.104); ledger supports it explicitly only for event WM raids (R160: "no Final Boss possible"). Retracing-WM exclusion rests on the code's p.104 citation, not on ledger text.

### Ambiguities (ledger needs a ruling; code left as-is)

> All items in this list that carry a ruling number were resolved by the owner's best judgement on 2026-11-13 — see "Rulings applied" below. The remaining bullets (deterministic readings, fungal row-6 split, sleep vs dragons) are still open interpretations, not rulings.
- **R173 Old School tier basis.** Level-up cost uses the PC's current level's tier (`tierOf(pc.level)`); the ledger doesn't say current vs target tier (matters at L4→5 etc.).
- **R174 Slower Advancement boosted-6.** `spendStoredXp` treats a boosted total of 6 (`roll >= 6` on d6+extra) as auto-success; the book's "6 always succeeds" arguably means a natural 6.
- **R048 cleric scroll bonus.** Code (and `phase5.test.ts`) gives a cleric +0 on non-Blessing scrolls; the ledger ("non-casters +1, casters +L, clerics +L only on Blessing") does not state the non-Blessing cleric rate unambiguously. Left at +0.
- **R117 base-count.** Code rolls d6 + *previous* majors; ledger "d6 + 1 per Major Foe met so far" could include the current foe. Code is internally consistent (statue uses the same convention).
- **R118 "+1 attack".** Mapping ambiguous (L for Defense only? both attack+defense? damage?). +1 Life / fight-to-death / treasure implemented; attack part unimplemented.
- **Part 10 citation mismatch — RESOLVED by ruling 6 (2026-11-13): p.164.** Dungeon traps now cite p.164 throughout code (`features.ts`, `resolve.ts` messages), matching the ledger Part 10 header and R132.
- **Cavern/fungal trap bonus ambiguity.** "All +½L, rogue +L" — code adds both (rogue gets ½L+L); replacement reading (rogue gets +L instead of ½L) is equally plausible. Left as-is.
- **Deterministic readings (documented in code, need book to confirm).** Hidden-treasure trap complication; spore-cloud two-save semantics; shrieking-mushroom `>= 3` threshold; sealed-door L = HCL+d6 by analogy.
- **Ledger internal inconsistency (Part 3 vs R060).** Part 3's class table says elf Stealth +1 and halfling Stealth +L, but R060 says elf +½L and halfling +½L. The data follows the Part 3 table. Do not change without owner confirmation.
- **Fungal row-6 50/50 split (C5).** Documented interpretation — the ledger gives no odds.
- **Sleep vs dragons (C10).** Applies the R044 general rule ("most dragons") to all Dragon-category foes; the cavern/fungal dragon entries do not restate the immunity.

### Cross-boundary observations (noted by workers, not in their section)
- **Part 4 / R044 Fireball.** Ledger says Minors slain = total − L, minimum 1 *even on a failed roll* — fixed (C9).
- **Part 10 dart trap (`resolve.ts`).** Halfling reroll triggers on `defense <= hcl` but the defense fails on `<= hcl+1`, so a roll of exactly HCL+1 fails without the reroll — suspected off-by-one (fixed as part of B6: reroll now triggers on failure vs HCL+1).

---

## (c) Needs Steven's book

These could not be resolved without the physical copy at the time of the pass. All 12 were subsequently resolved by the owner's best judgement on 2026-11-13 — see "Rulings applied" below. The per-item notes are kept for the record.

1. **OQ-1 — Search Table "0-1" misprint (FADEE p.107).** The Search Table shows "0-1" on a d6 — almost certainly a misprint for "1". The code treats 1 = Wandering Monsters. **Confirm:** does the printed page show "0-1" or "1"? (If it genuinely shows "0-1", the table's d6 mapping needs re-reading.)
2. **OQ-2 — Tile shapes from page images (FADEE pp.149-151).** All 36 d66 shapes + 6 starting shapes exist in `src/rulesets/expanded/tiles.ts` with footprints and door positions, and the 100-seeded-dungeon simulation passes with no structural violations. **Low-confidence as coded:** d66 tiles **32** ("partial reads only; L-corridor per first pass") and **35** ("nook/room junction obscured by art"), plus starting tiles **4** and **5** (diagonal approximations). **Confidence mismatch to resolve:** the ledger's OQ-2 says diagrams for **23, 33, 35, 62, 63** were partly art-covered, but `tiles.ts` marks 23/33/62 `high` confidence (63 `medium`, 35 `low`). **Confirm:** for tiles 23, 33, 35, 62, 63 (and 32, and starting 4/5), are the coded footprints and door positions correct? Re-render pp.149-151 and compare each shape visually.
3. **Darkvision classes (FADEE p.93, R093/R094).** `DARKVISION_CLASSES` in `src/engine/light.ts` is `[]` **by design** — no entry in the ledger and no class data in this repo names which classes have darkvision. The light model is otherwise verified (torch 6 rooms, lantern drop, pickup costs 1 turn, darkness −2). **Confirm:** which classes (if any) have darkvision in the book? Name them and the code will fill the list.
4. **R117 Final Boss base count (FADEE p.105).** "d6 + 1 per Major Foe met so far" — does the count include the current foe, or only previous ones? Code uses previous only.
5. **R118 Final Boss "+1 attack" (FADEE p.105).** What does "+1 attack" mean — +1 to the Foe's L for Defense only, both attack and defense, or +1 damage? Code implements +1 Life, fight-to-death, and treasure; the attack part is unimplemented pending this answer.
6. **Part 10 dungeon traps page (FADEE p.163 vs p.164).** Code cites p.163; the ledger Part 10 header and R132 say p.164. **Confirm:** which page holds the dungeon Traps Table?
7. **R048 cleric scroll rate (FADEE p.76).** Non-Blessing scrolls: do clerics read at +0, +1, or +L? Code uses +0.
8. **R173 Old School tier basis (FADEE p.118).** Level-up cost is (Tier+2)×100 — Tier of the PC's current level or target level?
9. **R174 Slower Advancement boosted 6 (FADEE p.118).** "6 always succeeds" — a natural 6, or a boosted total ≥ 6?
10. **Part 3 vs R060 stealth inconsistency (FADEE pp.7, 78).** Part 3's class table says elf Stealth +1 and halfling Stealth +L; R060 says elf +½L and halfling +½L. **Confirm:** which is right?
11. **Part 13 torch price (FADEE p.81).** "Torch 1/dozen" — 1 gp per torch or 1 gp per dozen? Code charges 1 gp each.
12. **Cavern/fungal trap bonus (FADEE pp.165-166).** "All +½L, rogue +L" — does the rogue get +½L *and* +L, or +L *instead of* +½L? Code adds both.

---

## Rulings applied (2026-11-13, owner's best judgement)

All 12 open questions from section (c) above are RESOLVED. Full detail per ruling lives in `docs/RULES_VERIFICATION.md` ("Rulings (2026-11-13, owner's best judgement)").

| # | Ruling | What changed in code |
| --- | --- | --- |
| 1 | OQ-1: Search "0-1" is a misprint for "1" (p.107). | No code change — code already treats 1 = Wandering Monsters. |
| 2 | OQ-2: Tile shapes accepted as-is. | No code change. Residual uncertainty noted, not blocking: low-confidence d66 32/35 + starting 4/5; ledger-vs-`tiles.ts` confidence mismatch (23/33/35/62/63). |
| 3 | Darkvision: dwarf + elf (FADEE p.93); halflings do not. | `src/engine/light.ts` — `DARKVISION_CLASSES = ['dwarf', 'elf']`. Tests: `tests/unit/rulingsDarkvision.test.ts` (new); the two "list is empty by design" assertions in `tests/unit/sectionB.test.ts` and `tests/unit/release05.test.ts` updated to the ruled list. |
| 4 | R117 Final Boss base count: PREVIOUS Major Foes only. | No code change — code already rolls d6 + previous majors only. |
| 5 | R118 Final Boss "+1 attack": boss attacks at L+1; Defense stays at L. | `src/engine/combat/combat.ts` — foe attack roll; test added alongside the fix. (+1 Life, fight-to-death, treasure already implemented.) |
| 6 | Traps page: p.164, not p.163. | Citation only: `src/engine/features/resolve.ts` (Traps section) and `src/rulesets/expanded/features.ts` (`TRAP_INFO` sources + header comment); `tests/unit/phase5.test.ts` trap label; `docs/CHANGELOG.md` and `docs/IMPLEMENTATION_STATUS.md` trap mentions. The p.163 citation in `src/engine/combat/combat.ts:1070` (Holy symbol of healing, Epic Rewards) is a different rule and is unchanged. |
| 7 | R048 cleric scroll rate: +0 on non-Blessing scrolls. | No code change — code already uses +0. |
| 8 | R173 Old School cost: Tier of the TARGET level. | Call site in `src/state/dungeonStore.ts` passes `pc.level + 1`; test added alongside the fix. |
| 9 | R174 Slower boosted 6: NATURAL 6 only. | XP-roll site; test added alongside the fix. |
| 10 | Part 3 vs R060 stealth: Part 3 wins — elf Stealth +1, halfling Stealth +L. | No code change — stealth is not implemented yet; recorded as a DESIGN RULING for when the stealth system is built. |
| 11 | Torch price: 1 gp per dozen (FADEE p.81). | `src/rulesets/expanded/features.ts` — `ITEM_INFO['torch']` price 1, `unit: 'dozen'`, source p.81; shop UI shows "torch · 1gp/dozen" (`src/features/inventory/InventoryScreen.tsx`). Tests: `tests/unit/rulingsTorchPrice.test.ts` (new). The 'torch' equipment name is load-bearing (light system, free-hand rule, starting gear), so the entry was not renamed — the purchase unit is a dozen at 1 gp. |
| 12 | Cavern/fungal trap bonus: rogue gets +½L AND +L (both stack). | No code change — code already adds both. |

---

## Environment & incident notes

- **`src/state/dungeonStore.ts` truncation (2026-11-13 ~18:58 UTC).** The file (2,799 lines of uncommitted working-tree work) was found truncated to 0 bytes mid-session — a concurrent-worker exec-shell write collision (the known EPERM 0-byte failure mode). It was restored byte-identical to `origin/main` `87919e89` (2,799 lines, 121,188 bytes, md5 `79c0b7972a5668e26d9cb30b5e0b871e`), and all three workers' store-side fixes were re-applied on top and verified by tests. **Do not restore the 1510-line HEAD version** (the local clone's HEAD `f024323` predates most of the work). The restored file is `origin/main` + the verification fixes; if any worker had uncommitted `dungeonStore.ts` changes not on `main` before the truncation, they were lost — all three workers confirmed their fixes present after the restore, and the full suite (443 tests) passes against the current file (now 3,063 lines). A stray 0-byte `src/state/dungeonStore.RESTORED.ts` was removed by the coordinator.
- **Fixtures are EMPTY.** `tests/e2e-05/fixtures/` contains no files. A `make-fixtures` run during the pass zeroed all 11 fixture files (vitest-worker EPERM), and the 0-byte stubs were deleted. The fixtures regenerate deterministically from the engine — **run `npm run make-fixtures` (or `npm test`, which includes it) in a healthy window before the e2e specs run.** The fixtures are EXCLUDED from pushes, so this does not block a push, but e2e cannot run without them. Note: the cavern no-doors fix (B4) changes generation, so regenerated fixtures will differ from the previous set.
- **Vitest / Vite EPERM workaround.** `npx vitest` and `npm run build` fail at startup in this sandbox: Vite's config bundler writes a temp `.mjs` next to the config and that write fails with EPERM. The full suite was run via a programmatic runner (`/tmp/run-vitest.mjs`, `startVitest` with `config: false`): **443/443 pass**. `tsc --noEmit` passes. The `vite build` was attempted via a programmatic runner with an inline config (`/tmp/run-vite-build.mjs`, `configFile: false`) — it transforms all 183 modules, then fails writing the service worker / dist files (EPERM). Re-run `npm run build` in a healthy environment before deploying.
- **Coordinator fix after the workers finished.** One test failed in the full suite (`release05.test.ts` subdual test): `rng.record is not a function` — Worker A's `Rng.record()` is called by `rollExplodingD6`, but the test's `maxRng()` stub lacks `record`. Fixed by guarding the `record` call in `rollExplodingD6` and in the no-explosions branch of `rollCombatDie` (`typeof record === 'function'`; stub RNGs keep no roll log). Full suite re-run: **443/443 green**.
- **Concurrent-worker hazard (observed).** Three workers edited the same tree simultaneously; `combat.ts`, `dungeonStore.ts`, and `loot.ts` were all rewritten by more than one worker. Two cross-worker collisions were caught and fixed during the pass (Worker B fixed Worker C's `rollMagicTreasure` roll-4 return type; Worker C verified Worker A's foe-conditional bonuses rather than redoing them). Any future parallel work on these files should re-read them fresh before and verify immediately after.

---

## Files changed in this pass (working tree only)

- `src/engine/core/rng.ts` — `Rng.record()` (A1).
- `src/engine/combat/combat.ts` — natural-1 defense, surprise shield strip, strict-half weakening, situational attack/defense modifiers, `isGiantTrollOgre`, `noLootWin`, fled-Final-Boss `xpDue`, `applyFinalBossBuff`, `partyFirst`, Final Boss Reaction forcing, Minotaur Charge, free-hand casting, Blessing/Fireball/Sleep fixes, Weakness consumption, `record` guards (A2–A4, A6–A8, B15–B17, C7–C12, coordinator fix).
- `src/engine/dungeon/generate.ts` — `DungeonState.hcl`, `DungeonState.lastXpLevelUpPcId`, cavern no-doors, Final Boss `canBeFinalBoss` option, gremlin tally, hidden-treasure complications, `PendingChoicePayload.trap` fields, `TileContent.trap`/`trapDisarmed` (A5, A9, B2–B5, B27).
- `src/engine/dungeon/doors.ts` — (verified; door-table bands corrected in test, code mapping was right).
- `src/engine/features/resolve.ts` — dart/spears trap fixes, trap-level/disarm helpers, cavern halfling rerolls, sleep spores / spore cloud / slime patch / shrieking mushroom / cordyceps fixes (B6–B14); ruling 6: trap citations p.163 → p.164.
- `src/engine/treasure/loot.ts` — `++` shift, `none`/`no-magic`, scroll lists, fungal row-6 split, `rollMagicTreasure` export, `scrollEquipmentName` (B18–B19, C1–C5, C13).
- `src/engine/camp/rest.ts` — cleric `hasSpentAbility` fix (C15).
- `src/engine/characters/create.ts` — halfling trait loop (C16).
- `src/engine/light.ts` — ruling 3 (2026-11-13): `DARKVISION_CLASSES = ['dwarf', 'elf']` (was `[]` by design).
- `src/rulesets/expanded/expandedClasses.ts` — NEW, 12 non-core classes (C17).
- `src/rulesets/expanded/extraSpells.ts` — NEW, druid + illusionist ×12 (C6).
- `src/rulesets/expanded/monsters.ts` — `treasureRolls`, multi-roll profiles (C13).
- `src/rulesets/expanded/environments.ts` — Life floors (C14).
- `src/rulesets/expanded/secrets.ts` — Weakness targets (C12).
- `src/state/dungeonStore.ts` — restored after truncation; `dungeonHcl`, `noLootWin` awardVictory branch, `lastXpLevelUpPcId` guard, rest WM, rest nails, search WM ambush, hidden-treasure alarm, Final Boss treasure/buff, `claimTileTreasure`, `answerTrapDisarm`, `viaSecretDoor` one-shot, `buyPassage` gate, multi-roll loot loop, Life floors, quest/secret wiring (A5, A7, A9, B20–B29, C13–C14).
- `src/features/dungeon/DungeonScreen.tsx` — treasure buttons, buyPassage gate (B30–B31).
- `src/features/dungeon/ChoiceDialog.tsx` — trap case (B32).
- `src/features/dungeon/CombatPanel.tsx` — free-hand cast disabling, Blessing targetless (C7–C8).
- `src/database/db.ts` — comment example `weakness:Orcs` → `weakness:Ogre` (C12).
- `tests/unit/rulesSectionA.test.ts` — NEW, 22 tests.
- `src/rulesets/expanded/features.ts` — ruling 6: `TRAP_INFO` sources p.163 → p.164; ruling 11: `ITEM_INFO['torch']` price 1 per dozen (`unit: 'dozen'`, source p.81).
- `src/features/inventory/InventoryScreen.tsx` — ruling 11: shop shows "torch · 1gp/dozen" and "1 gp per dozen" in the buy dialog.
- `tests/unit/rulingsDarkvision.test.ts` — NEW, 7 tests (ruling 3).
- `tests/unit/rulingsTorchPrice.test.ts` — NEW, 3 tests (ruling 11).
- `tests/unit/sectionB.test.ts`, `tests/unit/release05.test.ts` — darkvision list assertions updated to `['dwarf', 'elf']` (ruling 3).
- `tests/unit/phase5.test.ts` — trap describe label p.163 → p.164 (ruling 6).
- `tests/integration/sectionBStore.test.ts` — NEW, 6 tests.
- `tests/unit/sectionC.test.ts` — NEW, 31 tests.
- `tests/integration/xpRolls.test.ts` — reaction-win test now asserts "No treasure" log line.
- `tests/unit/secrets.test.ts` — Weakness tests now use an Ogre combat.
- `docs/RULES_VERIFICATION.md` — verification-pass section (per-entry status) + header updated.
- `docs/RULES_VERIFICATION_SECTION_A.md`, `docs/RULES_VERIFICATION_SECTION_B.md`, `docs/RULES_VERIFICATION_SECTION_C.md` — per-section annexes.
- `docs/RULES_VERIFICATION_REPORT.md` — this file.
