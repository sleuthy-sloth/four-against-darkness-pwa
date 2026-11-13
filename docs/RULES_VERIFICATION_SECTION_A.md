# Rules Verification — Section A: Core resolution, stealth, combat, XP

**Worker:** Section A (Parts 1, 5, 6, 14 — R001–R011, R060–R064, R070–R096, R170–R175)
**Repo:** `four-against-darkness-pwa` (working tree only; no commits, no pushes, no e2e)
**Date:** 2026-11-13
**Counts:** 33 verified (31 full + 2 partial) · 9 fixed · 28 flagged
(Several entries appear in both the verified and flagged lists: the core of the
rule is implemented, but a sub-part is missing or ambiguous. Those are marked
"partial" below.)

## Incident note — `src/state/dungeonStore.ts` was truncated and restored

During this pass `src/state/dungeonStore.ts` (2,799 lines) was found truncated
to **0 bytes** (mtime 2026-11-13 18:58:44). The cause was not my own edits —
my edits to that file had been verified in place by grep beforehand, and files
I never touched were modified at the same time, so another concurrent process
in this environment truncated it. The local repo is a shallow clone (1 commit,
`f024323`); HEAD's copy is only 1,510 lines and lacks many methods the current
tree uses, so HEAD was **not** used for the restore.

**Restore:** the file was transcribed from `origin/main` (`87919e89`) via live
`curl | sed` reads and verified byte-for-byte:

- `wc -l` = 2,799, `wc -c` = 121,188
- md5 `79c0b7972a5668e26d9cb30b5e0b871e` — identical to the remote file
- (A first attempt via the browser's paginated fetch served a stale snapshot
  for one page range and was discarded; the `curl` transcription is the one
  that verifies.)

**Re-applied on top of the restore** (these three store-side fixes had been
lost with the truncation): the `dungeonHcl` stored-HCL helper + use sites
(R006), the `noLootWin` branch in `awardVictory` (R100), and the
`lastXpLevelUpPcId` guard in `spendXpRoll` (R170). All other fixes in this
pass live in `combat.ts`, `rng.ts`, and `generate.ts`, which were never
truncated and are intact.

**Coordinator warning:** the restored file is `origin/main` + the three fixes
above. If any other agent had uncommitted local changes in
`src/state/dungeonStore.ts` that were not yet on `main`, those changes are
**not** in the restored file. Please confirm with the other section workers
before merging.

**Addendum (19:19 UTC):** after the restore and re-application, another
worker modified `src/state/dungeonStore.ts` again (mtime 19:19:08 UTC),
adding their own section's work: `applyFinalBossBuff` / Final Boss treasure
tripling + second Magic Treasure (R118), `claimTileTreasure` / `answerTrapDisarm`
+ `attemptTrapDisarm` / `trapLevelFor` (R114/R132), `lifeFloor`,
`canBeFinalBoss`, R125/F20 `viaSecretDoor` consumption, the R123 Search-1
Wandering Monsters ambush, the `partyFirst` rest ambush, and
`scrollEquipmentName` use. All three Section A fixes above are still present
in the file (verified by diff), and the area suite was re-run against the
current tree at 19:19:53 — still **75/75 green**. A stray copy
`src/state/dungeonStore.RESTORED.ts` also exists in the tree (not mine);
the coordinator should check whether it is stale or another worker's
in-progress restore.

## Test results (area suite, 2026-11-13 ~19:17)

Command (threads pool; the default pool fails with EPERM in this sandbox —
see `/tmp/vitest-sectionA.config.cjs`):

```
node node_modules/vitest/dist/cli.js run --config /tmp/vitest-sectionA.config.cjs \
  --cache=false --pool=threads \
  tests/unit/combat.test.ts tests/unit/dice.test.ts tests/unit/rng.test.ts \
  tests/integration/xpRolls.test.ts tests/unit/rulesSectionA.test.ts
```

**75 passed, 0 failed** (5 files): combat 19, dice 20, rng 7, xpRolls 7,
rulesSectionA 22. The 5 R170 store tests in `rulesSectionA.test.ts` previously
failed only because the store file was 0 bytes at the time; they pass against
the restored + fixed store.

## (a) VERIFIED

### Part 1 — Core resolution (R001–R011)

- **R001 — Foes never roll.** Only PC attack/defense/spell rolls exist; Foe
  attacks resolve via PC Defense rolls (`src/engine/combat/combat.ts`,
  `runFoesTurn`).
- **R002 — Dice codes d3/d6/d66.** `Rng.d3` (ceil(d6/2)), d6, 2d6 / `d6+N`
  (formula parser), d66 (first die tens) — `src/engine/core/rng.ts`;
  `tests/unit/rng.test.ts`, `tests/unit/dice.test.ts`. (d100: see flagged —
  `formula('d100')` is uniform 1–100, not 2×d10; no caller in the build.)
- **R003 — Level as target number.** Attack hits if ≥ L; Defense succeeds if
  > L (`pcAttack`, `runFoesTurn`).
- **R004 — +½L rounds down.** `Math.floor(L/2)`; `tests/unit/rulesSectionA.test.ts`
  ("+½L rounds down (cleric L3 = +1)").
- **R007 — Tier numbers 5/10/15/20.** `tierOf` in `src/engine/xp.ts`;
  `tests/unit/rulesSectionA.test.ts` ("tier boundaries are L5/L10/L15/L20").
- **R009 — Explosion rule.** Die explodes on its max, cumulative, not an
  auto-success. (Log bug fixed — see Fixed #1.)
  `tests/unit/rulesSectionA.test.ts` ("the roll history records the real chain").
- **R010 — Saves roll ≥ target, with only named modifiers; distinct from
  Defense (roll > target).** Spot-checked trap saves in
  `src/engine/features/resolve.ts` (dart uses Defense `>`; poison gas Save
  uses `>=`).

### Part 5 — Stealth (R060–R064)

- **Stealth data only (no mechanic).** `stealthBonus` values exist in
  `src/rulesets/expanded/coreClasses.ts` (warrior 0, barbarian ½L, elf flat +1,
  dwarf ½L, cleric ½L, rogue +L, halfling +L, wizard 0), but **no Stealth Save
  function exists anywhere**. All of R060–R064 is flagged, not verified.

### Part 6 — Combat (R070–R096)

- **R070 — First decision (partial).** Opening choice attack-now vs wait for
  Reactions is implemented (`startCombat` returns `'opening'`;
  `combatWait`); surprise → Reactions rolled. (Turn structure itself is
  flagged — only one PC acts per round before Foes act.)
- **R071 — Surprise.** Surprise forces Reactions / Foes strike first
  (`forceSurprise` in `beginAmbushCombat`, `startCombat`); per-Foe surprise
  chances are flagged (R072).
- **R073 — Ranged-first sequence (partial).** The opening-choice/wait
  structure exists, but there is no ranged phase (flagged).
- **R074 — Attack roll.** Tier die + class + situational + weapon, hit if ≥ L,
  explode on max (`pcAttack`).
- **R076/R077 — Attack/defense modifier summaries.** Light +1 / heavy +2 /
  shield +1 / rogue +L on defense; class +L / +½L on attack. Situational
  modifiers were missing and are now implemented (see Fixed #6).
- **R078 — Failed defense = 1 damage.** (Per-Foe profile damage is text only
  — flagged.)
- **R079 — Damage = floor(total ÷ L), min 1.** Minors slain; Major damage.
- **R080/R096 — Morale.** Below half (`count*2 < initialCount`), d6 1–3 flee,
  once per encounter (`moraleTested`), `neverMorale` respected; Goblin
  Swarmlings −1; Morel Crusher −1 consumed on use.
- **R081 — Major Foe weakens below half Life (L−1).** Strictness fixed
  (see Fixed #4).
- **R083 — Fleeing Foes.** Morale-fled Foes' treasure is taken via the normal
  loot path (distinct from Reaction flee — see Fixed #7). (Parting attack
  and boss/Minion splits are flagged.)
- **R084 — Marching order (partial).** Marching order exists
  (`combatOpts.marchingOrder`); Wandering-Monster rear ambush is implemented
  (`runFoesTurn` rear-round targeting, R124). Corridor positional rules are
  flagged.
- **R085 — Assigning attacks.** `assignTargets` implements even split +
  hated-class extras (trolls/goblins→dwarf, orcs→elf, undead→cleric) +
  lowest-Life. (The more-Foes-than-PCs branch is dead code — flagged.)
- **R087 — Flee.** Each Foe attacks once, no shield bonus (`fleeCombat`);
  fungal slippery −1 with class exemptions; Puffball Smokebomb unattacked
  flee. (Distribution order is flagged.)
- **R088 — Combat end.** Won/lost/fled phases; `canLeaveCombat` only for
  concluded phases.
- **R089 — Subdual.** −1 attack, subdued at 0 Life; immunity guarded in the
  store (`isSubdualImmune` in `src/engine/items/magicItems.ts`: Vermin
  table, Undead/Unliving, pain-immune).
- **R090 — Loot.** Once per cleared encounter; secret-door doubling;
  sealed/iron +1 treasure. (Reaction-win loot fixed — see Fixed #7;
  barbarian refusal / hand-weapon breaks / WM loot are flagged.)
- **R093/R094 — Darkness.** −2 attack/defense/saves via `src/engine/light.ts`
  `darknessPenalty`, applied to attack/defense/spellcasting in combat; Search
  blocked without light; torch 6 rooms, torch out on natural 1, lantern
  drops when bearer falls, pickup costs 1 turn (`spendTurn` /
  `combatPickupLantern`). (Darkness −2 to Saves outside combat and torch-as-
  weapon are flagged.)
- **R125 — Secret-door entry.** Foes' L −1 turn 1 (`foeLevelPenaltyTurn1`
  via `combatOpts`).

### Part 14 — XP & advancement (R170–R175)

- **R170 — XP roll.** d6 > L, 6 always succeeds, immediate +1 current/max
  Life; rolls gated before leaving victory (`pendingXp` + `leaveCombat` /
  `explore` gates; `tests/integration/xpRolls.test.ts`). (No-repeat guard
  fixed — see Fixed #9.)
- **R171 — Classical.** 1 roll per Major, +1 Final Boss, 1 per 10 minor
  encounters, 1 per Secret (immediate roll in `pickSecretPc`).
- **R172 — Slow and Sure.** `pendingLevelUps` on Final Boss slain,
  `spendLevelUp`.
- **R173 — Old School.** Tally via `oldSchoolFoeXp` (Minors L×10, Vermin
  halved, Majors L×10+5/Life, +1/gp), cost `(Tier+2)×100`, no-same-PC-twice
  (`lastLevelUpPcId`), non-combat rolls → Tier×100 (`pickSecretPc`). (Tier
  basis ambiguity flagged.)
- **R174 — Slower Advancement.** Stored XP, spend target level + roll
  (+1/extra), tier training 500/1000/2500/5000 gp. (Boosted-6 ambiguity
  flagged.)

## (b) FIXED

1. **R009 — exploding-dice log recorded fabricated dice.**
   `rollExplodingD6` (`combat.ts`) called `rng.roll(...)` to log the chain,
   which rolled fresh dice; the history showed different faces than the
   attack. Fix: added `Rng.record(count, sides, modifier, rolls, reason)` to
   `src/engine/core/rng.ts` (logs already-known dice); `rollExplodingD6` now
   calls `rng.record(...)`. Test: `rulesSectionA.test.ts` "the roll history
   records the real chain, not a fresh re-roll".
2. **R076/R124 — natural-1 defense checked the total, not the die face.**
   Old code treated `finalTotal === 1` as the natural 1, so a die 1 with +2
   bonuses (total 3 vs L2) wrongly succeeded. Fix in `runFoesTurn` and
   `fleeCombat` (`combat.ts`): hit if `finalTotal <= effLevel ||
   rolls[0] === 1`, with a "rolled a natural 1: it always fails" log line
   when the total would otherwise pass. Test: seed-search test "a natural 1
   fails even when the total beats the Foe L".
3. **R076/R124 — surprise did not strip the shield bonus on turn 1.** Fix in
   `runFoesTurn`: when `state.surprised && state.round === 1` and the PC has
   a shield, defense drops the shield +1 (via new `defenseBonusFor(pc, enemy,
   { noShield })` option) and the log notes "no shield — surprised". Flee
   already stripped shields. Test: seed-search test "a surprised party loses
   its shield bonus on turn 1".
4. **R081 — Major Foe weakened at exactly half Life.** Old code used
   `life <= maxLife / 2`; the book says *below* half. Fix: `applyMajorDamage`
   (now exported for tests) uses `enemy.life * 2 < enemy.maxLife`. Test:
   "exactly half Life does not weaken; below half does".
5. **R006 — HCL rescaled as the party levelled.** `newDungeon` took an `hcl`
   param but never stored it; `explore` and other handlers recomputed HCL
   from current party level each time, so new tiles got harder after
   levelling. Fix: added `hcl?: number` to `DungeonState` in
   `src/engine/dungeon/generate.ts`, set it in `newDungeon`'s return, and
   added exported `dungeonHcl(dungeon, party)` in `dungeonStore.ts` (stored
   HCL preferred, fallback to current party max for older saves), used at
   `explore`, `rollWanderingAfterRest`, `claimFind` (hidden-treasure and
   secret-door), and the door-bash Wandering Monsters roll in `attemptDoor`.
   `ensureDungeon` still computes HCL from the party — that is the creation
   value being stored, not a rescale. Tests: 3 R006 tests in
   `rulesSectionA.test.ts`.
6. **R075/R076/R077 — missing situational modifiers.** `attackBonusFor(pc,
   enemy?)`: cleric +L vs Undead (replaces +½L); dwarf +1 vs goblins; elf +1
   vs orcs; elf loses the +L class bonus with a two-handed melee weapon.
   `meleeWeaponFor`: two-handed weapon +1 for any class (was barbarian-only).
   `defenseBonusFor(pc, enemy?, opts?)`: dwarf +1 and halfling +L vs
   giant/troll/ogre. New helper `isGiantTrollOgre(name)` matches troll/ogre/
   half-giant and bare "Giant …" foes but NOT "Giant Spider/Centipede/Snake/
   Toad" (Animals). `pcAttack` now passes the enemy to `attackBonusFor`;
   `runFoesTurn`/`fleeCombat` pass the enemy to `defenseBonusFor`. Existing
   no-enemy callers still work (optional params). Tests: R075/R076/R077
   tests in `rulesSectionA.test.ts`.
7. **R100/R090 — Reaction wins (Flee/Peaceful/Ignore) wrongly awarded
   treasure.** `awardVictory` rolled loot for every win. The ledger's R100
   says Flee = "vanish, no treasure", Peaceful = "pass through, no
   treasure"; R090's "even if Foes flee" is the mid-combat Morale flee
   (R083), not a Reaction win. Fix: added `noLootWin?: boolean` to
   `CombatState`, set in `rollReactions` when it resolves phase `'won'`;
   `awardVictory` uses a zero-gold `LootResult` dummy (logs "No treasure —
   the Foes let the party pass without a fight") and skips both the base
   loot roll, the multi-roll loop, and the +1 sealed/iron-door bonus roll
   when set, while the minor-encounter XP tally still counts. Bribe wins
   are untouched (ledger silent on bribe treasure). Tests:
   `rulesSectionA.test.ts` "a Reaction win marks the combat as a no-loot
   win" + `xpRolls.test.ts` "a reaction win (foes flee) awards NO loot but
   still counts the minor tally (R100/R171)" (asserts the log contains
   "No treasure" and no "Treasure:" line).
8. **R171/R172 — Final Boss XP/level-up awarded when the Final Boss fled.**
   `xpDue` counted any `isFinalBossFlag` enemy. Fix: `finalBoss` now
   requires `!e.fled && e.life === 0`. `majorSlain` already required that.
   Test: "a fled Final Boss earns no boss bonus; a slain one does".
9. **R170 — no XP roll to a PC that just levelled.** `spendXpRoll` let the
   same PC take a second roll in the same batch after levelling. Fix: added
   `lastXpLevelUpPcId?: string | null` to `DungeonState` (`generate.ts`);
   `spendXpRoll` blocks the just-levelled PC while other survivors remain
   and rolls are pending (error "just levelled — no second XP roll in this
   batch (unless sole survivor)"), allows it when sole survivor; set on a
   successful level-up, cleared when the batch is spent or a fresh Classical
   batch starts (`awardVictory`). Tests: 3 R170 tests in
   `rulesSectionA.test.ts` (blocked / another PC may spend / sole survivor
   may spend). Scope note: the guard covers the pending Classical batch
   only; `pickSecretPc` secret rolls do not consult `lastXpLevelUpPcId`.

## (c) FLAGGED but not fixed

Structural / out-of-scope / ambiguous — each needs an owner decision, a
larger refactor, or a ledger clarification. None of these was changed.

- **R070 turn structure.** The code's own comment says "if every living PC
  acted → foes' turn", but `pcAttack`/any PC action calls `endPcTurn`
  immediately, so only ONE PC acts per round before Foes act. Fixing would
  be a balance overhaul; flagged for owner decision.
- **R081/R085 foe attack counts.** Major Foes always make exactly 1
  attack/round (`attackers = 1` in `runFoesTurn`) despite profile `attacks`
  values of 2–4 in the monster data; Minor groups are capped at
  `min(awakeMinors, living.length)` attacks instead of one per Foe, which
  makes `assignTargets`' more-foes-than-PCs branch dead code. Same reasoning
  as R070.
- **R073 ranged-first sequence.** No ranged phase exists (no bow/crossbow/
  sling attack action; `pcAttack` is melee only; spells act on the PC turn
  like attacks). Flagged.
- **R008 tier dice.** All rolls are d6 regardless of level; no d8/d10/d12/d20
  tier die, and no explosion thresholds for them (d8→7+, d10→8+, d12→9+,
  d20→10+). The game is effectively Tier-1-only in its dice engine although
  XP can level PCs past L4. Flagged (engine-wide change).
- **R060–R064 stealth entirely absent.** No Stealth Save function, no
  group-stealth worst-modifier roll, no environment modifiers applied
  (boulders/echo stealth text exists only as description strings), no
  stealth outcomes (quiet exit / ambush L−1 / reveal-and-Reactions) and no
  scout-ahead variant. Flagged as not implemented. (Secret-door entry gives
  the ambush-like L−1, but that is R125, not stealth.)
- **R064 Stealth Training expert skill.** Absent with R175.
- **R072 surprise.** Per-Foe X-in-6 implemented only for Goblins (1-in-6 in
  `startCombat`); other profiles' surprise chances (e.g. 2-in-6 cave
  goblins, auto-surprise stalactomimics) live only in profile text.
- **R084 marching order.** Corridor rule (positions 1–2 melee only; rear
  ambush hits 3–4) not enforced in combat; narrow-corridor 2H −1 not
  implemented; combat doesn't know tile shape.
- **R086 withdraw.** No Withdraw action at all (distinct from Flee: retreat
  through a door, +1 Defense, lever doors negate strikes). Only Flee
  exists.
- **R083 fleeing-Foe parting attack.** "One last attack at +1 each (or a
  spell)" to cut down fleeing Foes is not offered; morale-fled Foes just
  vanish.
- **R082 bosses with Minions.** Encounters are always a single profile
  group; no split-party sub-fights, no +2 XP rolls for the split, no "no
  treasure for the Minor group".
- **R087 flee distribution.** `fleeCombat` attacks round-robin in party
  order (`living[i % living.length]`) instead of lowest-Life PCs first, then
  hated classes, then random; and it caps Minor attacks at party size
  instead of one per Foe.
- **R091 carrying limits.** Not implemented anywhere (200 gp, 2 shields, 3
  weapons per PC; −1 Defense/climb/jump/swim when over).
- **R092 masterwork.** No masterwork items exist in the data; "explode one
  step early" cannot apply.
- **R095 firearms.** No handgun/rifle items or rules (+2/+3, roll 1
  explodes, 2-turn reload, +1 Wandering Monsters roll per firearm combat).
- **R093 darkness −2 to Saves outside combat.** Trap/event saves in
  `src/engine/features/resolve.ts` take no darkness parameter; the −2
  applies to attack/defense/spellcasting in combat only.
- **R078 per-Foe damage.** Profile damage (e.g. Ogre "Tier+1 damage") is
  text only; all failed defenses deal 1.
- **R090 barbarian magic-item refusal / humanoid hand-weapon breaks on
  attack 1 / Wandering Monsters carry only weapons.** Not implemented (loot
  `carrier` is first living PC regardless of class; WM wins roll the normal
  loot table).
- **R094 torch +2 vs flammable.** Torch is a light source, not modelled as a
  weapon.
- **R005 rerolls.** No Luck/reroll economy exists (halfling `luckPoints: true`
  is a data flag nothing reads; `src/engine/dungeon/doors.ts` documents
  this). Only isolated rerolls exist (halfling dart-trap reroll in
  `resolve.ts`; trait text).
- **R174 Slower ambiguity.** `spendStoredXp` treats a boosted total of 6
  (`roll >= 6` on d6+extra) as auto-success; the book's "6 always succeeds"
  arguably means a natural 6. Flagged, not changed.
- **R173 Old School ambiguity.** Level-up cost uses the PC's current level's
  tier (`tierOf(pc.level)`); the ledger doesn't say current vs target tier
  (matters at L4→5 etc.). Flagged, not changed.
- **R075 halfling sling +L.** Unmodelled (no ranged combat).
- **R002 d100.** `formula('d100')` is uniform 1–100, not 2×d10 tens+units;
  no caller in the build, so unexercised.
- **R175 expert skills.** Not implemented (documented out of scope in
  `src/engine/xp.ts` header).
- **Ledger internal inconsistency (Part 3 vs R060).** Part 3's class table
  says elf Stealth +1 and halfling Stealth +L, but R060 says elf +½L and
  halfling +½L. The data follows the Part 3 table. Do not change without
  owner confirmation.

### Cross-boundary observations (not my section — noted, not fixed)

- **Part 4 / R044 Fireball.** Ledger says Minors slain = total − L, minimum
  1 *even on a failed roll*, but `castSpell` wastes the spell with no damage
  on a failed casting roll.
- **Part 10 dart trap (`src/engine/features/resolve.ts`).** Halfling reroll
  triggers on `defense <= hcl` but the defense fails on `<= hcl+1`, so a
  roll of exactly HCL+1 fails without the reroll — suspected off-by-one.

## Files changed in this pass (working tree only)

- `src/engine/core/rng.ts` — `Rng.record()` (Fixed #1).
- `src/engine/combat/combat.ts` — natural-1 defense, surprise shield strip,
  strict-half weakening, situational attack/defense modifiers,
  `isGiantTrollOgre`, `noLootWin`, fled-Final-Boss `xpDue` (Fixed #2, #3,
  #4, #6, #7-combat-part, #8).
- `src/engine/dungeon/generate.ts` — `DungeonState.hcl` stored by
  `newDungeon`; `DungeonState.lastXpLevelUpPcId` (Fixed #5, #9).
- `src/state/dungeonStore.ts` — restored byte-identical to `origin/main`
  `87919e89` after truncation, plus re-applied `dungeonHcl`, `noLootWin`
  `awardVictory` branch, `lastXpLevelUpPcId` `spendXpRoll` guard
  (Fixed #5-store, #7-store, #9-store).
- `tests/unit/rulesSectionA.test.ts` — new, 22 tests.
- `tests/integration/xpRolls.test.ts` — reaction-win test renamed and now
  asserts the "No treasure" log line and no "Treasure:" line.
- `docs/RULES_VERIFICATION_SECTION_A.md` — this file.
