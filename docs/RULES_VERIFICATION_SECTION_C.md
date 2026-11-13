# Rules Verification — Section C (Phase I)

**Scope:** Parts 2 (R020–R028), 3 (20-class table + per-class mechanics), 4 (R040–R051),
7 (R100), 11 (R150–R161), 12 (monsters), 13 (equipment), 15 (adventure structure).
**Date:** 2026-11-13. **Worker:** Section C. **Repo:** `four-against-darkness-pwa` (working tree only;
no commits, no pushes, no e2e).

**Method:** each ledger entry was checked against the implementation (numbers, formulas, and
branch behavior, not vibes). New tests: `tests/unit/sectionC.test.ts` (31 tests).
Test run (see "Test-runner note" below for why the programmatic runner was needed):

```
node /tmp/run-vitest.mjs tests/unit/classData.test.ts tests/unit/characterCreation.test.ts \
  tests/unit/spells.test.ts tests/unit/monsterFamilies.test.ts tests/unit/quests.test.ts \
  tests/unit/secrets.test.ts tests/integration/quests34.test.ts tests/unit/sectionC.test.ts
→ 8 files, 73 tests, all passing.
```

**Counts:** 34 verified · 17 fixed (grouped) · 27 flagged (not fixed).

**Sources:** the ledger is `docs/RULES_VERIFICATION.md` Parts 2, 3, 4, 7, 11, 12, 13, 15.
No book text was available in this environment (`~/inbox/4ad/fad-expanded.txt` does not exist),
so the 12 non-core class trait tables could not be transcribed — see F17 / §(d).

---

## (a) VERIFIED

### Part 2 — Character creation & party

1. **R020 — party of 4.** `createParty` throws unless exactly 4 PCs with distinct classes.
   `src/engine/characters/create.ts`; `tests/unit/characterCreation.test.ts`.
2. **R021 — PC definition.** `Character` schema carries level, Life, traits, spells, equipment,
   conditions, gold, XP. `src/rulesets/schema/character.ts`; `create.ts`.
3. **R022 — starting level & kit.** All PCs start at L1; starting wealth is rolled per class
   (`startingWealth`: `2d6` Warrior, `d6` Barbarian, `2d6` Elf, `3d6` Dwarf, `d6` Cleric,
   `3d6` Rogue, `2d6` Halfling, `4d6` Wizard). `coreClasses.ts`; `create.ts`.
4. **R023 — traits.** 1 trait pick per PC; Halfling picks 2, and duplicate rolls are rerolled
   until distinct (loop fix, see F16). `create.ts` `pickTraits`;
   `tests/unit/sectionC.test.ts` ("halfling traits", 200 seeds).
5. **R025 — core 8 classes.** Warrior, Barbarian, Elf, Dwarf, Cleric, Rogue, Wizard, Halfling
   are the playable set. `coreClasses.ts` `CORE_CLASSES`; `tests/unit/classData.test.ts`.
6. **R026 — save umbrella groups (data).** `savesAs` matches the ledger groups for all 20 classes
   (warrior, barbarian, elf, dwarf, cleric, rogue, halfling, wizard, monk for Mushroom Monk).
   Asserted in `tests/unit/sectionC.test.ts` ("20-class table"). Engine use of saves is
   flagged in §(c) #21 — `savesAs` is never read outside the data.
7. **R024 (race = class) / R025 — class table values (core 8).** Attack/defense bonuses,
   Life formulas, stealth, starting wealth, spell slots verified against the ledger
   (Warrior +L / L+6 / 2d6; Barbarian +L / L+7; Elf +L / L+4 / stealth +1 / 1 slot;
   Dwarf +L melee / L+5 / 3d6; Cleric +½L / L+4; Rogue Def +L / L+3 / stealth +L;
   Halfling L+3 / stealth +L; Wizard L+2 / 4d6 / 3 slots).
   `coreClasses.ts`; `tests/unit/sectionC.test.ts`.

### Part 3 — Classes (20-class table)

8. **20-class table values.** All 20 classes verified: attack bonus, defense bonus, Life formula,
   saves, stealth bonus, starting wealth, spell slots — core 8 in `coreClasses.ts`,
   other 12 in the new `expandedClasses.ts` (see F17). `tests/unit/sectionC.test.ts`
   ("all 20 classes are present with ledger table values").
9. **Spell slots grow with level.** Slots = base + (L−1): wizard L+2, elf L, druid 2+L,
   gnome L, illusionist L+3. `src/engine/camp/rest.ts` (`slots = base + (L−1)`).

### Part 4 — Magic & spells

10. **R040 — casting.** Casting roll is d6 + caster L vs target L; a failed roll wastes the spell.
    `src/engine/combat/combat.ts` `castSpell`/`castSpellEffect`; `tests/unit/spells.test.ts`.
11. **R044 — the 6 basic wizard spells.** Sleep / Fireball / Lightning / Protection / Escape /
    Blessing effects implemented, including: failed Fireball still slays 1 Minor (fixed, F9),
    Sleep immunity for Unliving/Artificial/Elemental, dragons, and L11+ Foes (fixed, F10),
    memorized Blessing lifting a curse (fixed, F8). `combat.ts`; `tests/unit/spells.test.ts`
    and `tests/unit/sectionC.test.ts`.
12. **R045 — random spell table.** Order verified: blessing, escape, lightning, fireball,
    protection, sleep. `src/rulesets/expanded/treasure.ts` `RANDOM_SPELL_TABLE`;
    `tests/unit/spells.test.ts`.
13. **R046 — druid spells ×12 (data).** `DRUID_SPELLS`, rolls 1–12, paraphrased effects,
    FADEE pp.70–72. `src/rulesets/expanded/extraSpells.ts` (new, F6);
    `tests/unit/sectionC.test.ts`. Casting has no engine support — flagged §(c) #8.
14. **R047 — illusionist spells ×12 (data).** `ILLUSIONIST_SPELLS`, rolls 1–12, FADEE pp.73–75.
    Same files as #13. Casting has no engine support — flagged §(c) #8.
15. **R048 — scrolls.** Casters read at +L, non-casters at +1, barbarians barred, scrolls are
    destroyed on cast; bark scrolls roll the druid list, prisms the illusionist list,
    wizard scrolls the 6 basic spells (fixed, F4). `combat.ts` `castScroll`;
    `src/engine/treasure/loot.ts`; `tests/unit/phase5.test.ts` ("a non-spellcaster reads
    at +1, a cleric at +0 (except Blessing)") and `tests/unit/sectionC.test.ts`.
    The non-Blessing cleric rate is ambiguous in the ledger — flagged §(c) #1.
16. **R050 — prayers.** Healing d6+L, Blessing lifts curses, 3 of each per adventure, no free
    hand needed. `combat.ts` `castHealing`/`castBlessing`/`clericPrayersLeft`
    (`prayer:healing:<n>` / `prayer:blessing:<n>` condition markers);
    `src/engine/camp/rest.ts` `hasSpentAbility` (fixed, F15).
17. **R051 — Secrets (partial).** Weakness, Terrifying Secret, Treasure Location, Item Location
    exist in `src/rulesets/expanded/secrets.ts`. Weakness now targets the 11 dungeon Major
    species and lasts one combat (fixed, F12). The other 6 secrets are missing — §(c) #12.

### Part 7 — Reactions

18. **R100 — reaction outcomes (implemented subset).** Fight, Fight to the death, Flee,
    Flee if outnumbered, Bribe, Ignore, Peaceful are implemented in
    `combat.ts` `rollReactions`/`parseReaction`. Outcomes with no handling (Quest, Blood
    Offering, Sleep, Food/rest, Magic Challenge, Trade Information, Capture, Trial of
    Champions, Puzzle) are flagged §(c) #9–#10; Ignore's steal-a-treasure-item step is
    flagged §(c) #11.

### Part 11 — Treasure & items

19. **R150 — Treasure Table.** All rows in all 3 environments verified:
    `src/engine/treasure/loot.ts` `TREASURE_TABLE` (row 0 nothing, 1 gold d6, 2 gold 2d6 /
    fungal rations, 3 scroll, 4 jewel, 5 chest/jewel, 6 magic / cavern item). Modifier
    behavior fixed — F1 ('++'), F2 ('none'), F3 ('no-magic'), F13 (multi-roll).
    `tests/unit/sectionC.test.ts`.
20. **R151 — Dungeon Magic Treasure.** 6 items verified, incl. typed Magic Weapon and
    Potion of Healing (roll 5), Fireball Staff (roll 6). `treasure.ts` `MAGIC_TREASURE`;
    `tests/unit/sectionC.test.ts`. Fungal row-6 handling fixed — F5.
21. **R152 — Purple Truffle, fake vs real.** Implemented in `loot.ts` (fungal special items).
22. **R153 / R154 — Caverns Special Item / Fungal Rare Item tables.** 6 entries each.
    `loot.ts` `rollSpecialItem`.
23. **R155 — Quest Table, types 1–6.** All six types implemented in
    `src/state/dungeonStore.ts` `questAccept`/`claimQuest`/`questPcPick`: type 2 doubling
    when already held, type 3 rope + subdual, type 4 1-in-6 per Major, type 5 3 non-violent,
    type 6 all-cleared interpretation. `tests/unit/quests.test.ts`,
    `tests/integration/quests34.test.ts`.
24. **R156 — Epic Rewards.** Book = 6 scrolls, Enchanted Weapon best-of-2 via the
    `enchanted-weapon` condition, Holy Symbol +2 healing. `dungeonStore.ts` `claimQuest`.
    Four rewards have no engine hook — flagged §(c) #19.
25. **R159 / R160 — Special Features & Special Events.** Wired via
    `src/rulesets/expanded/features.ts` and `src/engine/dungeon/resolve.ts`.

### Part 12 — Monsters

26. **Dungeon Boss table — all 6 entries verified.** Mummy, Orc Brute, Ogre, Medusa, Chaos Lord,
    Young Dragon: level offsets, Life formulas, attack counts, treasure modifiers.
    `src/rulesets/expanded/monsters.ts` `DUNGEON_TABLES.boss`;
    `tests/unit/monsterFamilies.test.ts` and `tests/unit/sectionC.test.ts`
    (Chaos Lord / Young Dragon multi-roll, F13).
27. **Dungeon Vermin / Minions / Weird — sampled deeply (≥3 per table) and matching.**
    `monsters.ts`; `tests/unit/monsterFamilies.test.ts`.
28. **Caverns / Fungal Grottoes — L and Life formulas verified** against the ledger, including
    the life floors (Cavern Wraith HCL+2 min 4; Land Siren HCL min 3 — fixed, F14).
    `src/rulesets/expanded/environments.ts` `CAVERN_TABLES` / `FUNGAL_TABLES`;
    `tests/unit/sectionC.test.ts`.
29. **R093 / R094 — light & darkness.** Torch lasts 6 rooms, `computeLight`, Glittering Crystal
    is hands-free. `src/engine/light.ts`; `hasFreeHand` now wired into casting (fixed, F7).

### Part 13 — Equipment

30. **Consumable prices (8 items).** Healing potion 100, bandage 5, bag of nails 4, rope 4,
    lantern 4, torch 1, rations 1, scroll of blessing 100 — all match the ledger.
    `src/rulesets/expanded/features.ts` `ITEM_INFO` (line 119). Alchemist prices (50/30)
    also present. Weapon/armor/firearm prices are absent — flagged §(c) #26.
    Torch "1/dozen" ambiguity noted — §(c) #27.

### Part 15 — Adventure structure

31. **Goal.** One dungeon = one adventure; the Final Boss ends it (victory card, XP assignment).
    `src/state/dungeonStore.ts`.
32. **Quests.** See #23–#24 (R155/R156 verified).
33. **Secrets economy (partial).** Clues are earned and spent on the 4 implemented secrets;
    Weakness consumption fixed (F12). 6 secrets missing — §(c) #12.
34. **Between-adventures (XP / level-up).** Four interchangeable XP systems implemented:
    Classical (default), Slow and Sure, Old School, Slower Advancement (R170–R174),
    with level-up via the victory card. `src/engine/xp.ts`. No session-length cap or timer
    mechanic exists in code; the ledger's session-length guidance is a play recommendation,
    not a mechanic, and no timers were added per the task constraints.

---

## (b) FIXED

**F1 — R150, `++` treasure shift was 1, not 2.** `modToShift('++')` returned 1 (same as `+`),
so Mummy treasure (+2) and any `++` roll could land on rows 0–2. Now returns 2.
`src/engine/treasure/loot.ts`. Test: `sectionC` "'++' never yields the empty row or the
d6-gold row" (+ fungal rations variant).

**F2 — R150, `none` treasure still rolled.** Rats, Vampire Bats, Skeletal Rats, Skeletons/Zombies,
Iron Eater (`treasure: 'none'`) could still receive treasure. `rollLoot` now returns
`{ gold: 0, text: 'No treasure — these Foes carry none.' }` for mod `'none'`.
`loot.ts`. Test: `sectionC` "'none' means no treasure at all, in any environment".

**F3 — R150, `no-magic` had no effect.** Orcs and Orc Brute (`treasure: 'no-magic'`) could still
receive magic items. A row-6 magic result is now replaced by d6×d6 gp (FADEE pp.168, 170).
`loot.ts`. Test: `sectionC` "'no-magic' replaces a magic result with d6×d6 gp".

**F4 — R049, scrolls always rolled the 6 wizard spells.** Druid bark scrolls and illusionist
prisms incorrectly drew from `RANDOM_SPELL_TABLE`. The scroll case now rolls d12
`DRUID_SPELLS` (fungal) / `ILLUSIONIST_SPELLS` (caverns); `LootResult.scroll` is now
`{ spell?: SpellId; list?: string; name?: string }` and the new exported helper
`scrollEquipmentName()` returns the stored name (bark scroll / prism) instead of
`scroll of undefined`. `loot.ts`. Tests: `sectionC` druid/illusionist/wizard scroll tests.
(`tests/unit/release05.test.ts` assertions `c.scroll?.list === 'illusionist'` /
`f.scroll?.list === 'druid'` are preserved.)

**F5 — R151, fungal row-6 magic could yield a Fireball Staff and never a Rare Mushroom.**
The ledger gives no odds, so the split is a documented interpretation: d6 1–3 magic item,
4–6 Fungal Rare Item; a magic roll of 6 in fungal now gives a Rare Mushroom roll instead of
the Fireball Staff. `loot.ts`. Test: `sectionC` "fungal magic never yields a Fireball Staff…".

**F6 — R046/R047, druid & illusionist spell data missing.** New file
`src/rulesets/expanded/extraSpells.ts`: `DRUID_SPELLS` and `ILLUSIONIST_SPELLS`, 12 entries
each, `{ roll, name, effect, source }` with one-line paraphrased effects (FADEE pp.70–72,
73–75). Header notes casting has NO engine support yet; bark/prism scrolls are inert
inventory until casting lands. Test: `sectionC` "extra spell lists".

**F7 — R041, free hand was never enforced for casting.** `canCast` now returns false when
`!hasFreeHand(pc)`; `castSpell` and `castScroll` throw without a free hand; `CombatPanel`
disables cast buttons when the caster's hand is busy (lantern/torch/Wand of Sleep/Fireball
Staff/Ring of Teleportation occupy the hand; wand/holy-symbol hands count as free).
`src/engine/combat/combat.ts` (+ `import { hasFreeHand } from '../light'`),
`src/features/dungeon/CombatPanel.tsx`. Test: `sectionC` "free hand to cast".
The two-handed-weapon busy-hand case is still NOT enforced — flagged §(c) #23.

**F8 — R044/R050, a memorized Blessing consumed the slot and did nothing.** `CastableSpell`
now includes `'blessing'`; `castSpell` handles memorized Blessing via `castBlessing` +
`endPcTurn` (previously it fell through `castSpellEffect`); the CombatPanel spell button
treats Blessing as targetless. This mattered because the wizard default loadout includes
Blessing. `combat.ts`; `CombatPanel.tsx`. Test: `sectionC` "memorized Blessing".

**F9 — R044, failed Fireball slew nothing.** The failure branch now still slays 1 Minor
("minimum 1 even on a failed roll"). `combat.ts` `castSpellEffect`. Test: `sectionC`
"a failed Fireball still slays 1 Minor".

**F10 — R044, Sleep worked on dragons and L11+ Foes.** Immunity extended to
`category === 'Dragon'` and `enemy.level >= 11` (in addition to Unliving/Artificial/
Elemental). `combat.ts` `castSpellEffect`. Test: `sectionC` "Sleep fails on dragons" /
"…on L11+ Foes even when the casting roll succeeds".

**F11 — Minotaur Charge (FADEE p.169).** The first Defense roll against a Minotaur attack is
now −1 on round 1, in `runFoesTurn`, with a log note. `combat.ts`. Test: `sectionC`
"Minotaur Charge".

**F12 — R051, Weakness secret lasted forever.** New exported `consumeWeaknessSecret(state)`,
called from `finishCombat`, the `rollReactions` won path, both `fleeCombat` exits, the
Escape branch, and the `useTeleportRing` all-left branch. `WEAKNESS_TARGETS` replaced:
was Minor species (Orcs, Trolls, Goblins, Hobgoblins, Mushroom Men, Skeletons or Zombies);
now the 11 dungeon Major species (Mummy, Orc Brute, Ogre, Medusa, Chaos Lord, Young Dragon,
Minotaur, Iron Eater, Chimera, Catoblepas, Giant Spider) — FADEE p.122: "a Major Foe
species, not Minors". `combat.ts`; `src/rulesets/expanded/secrets.ts`;
`src/database/db.ts` comment example `'weakness:Orcs'` → `'weakness:Ogre'`;
`tests/unit/secrets.test.ts` (Weakness tests now use an Ogre combat). Test: `sectionC`
"Weakness secret lasts one combat".

**F13 — R150, multi-roll treasure was single-roll.** Profiles now carry optional
`treasureRolls?: number`: Giant Spider `'++'` → `'0'` + `treasureRolls: 2`; Chaos Lord
`'++'` → `'+'` + `treasureRolls: 2` (ledger: "2 treasure rolls +1"); Young Dragon
`'++'` → `'+'` + `treasureRolls: 3` (ledger: "3 treasure rolls +1"). Mummy `'++'` left
as-is (ledger: treasure +2, correct with F1). `awardVictory` loops `rollLoot`
`profile.treasureRolls ?? 1` times, combines gold/text, and grants each extra roll's
scroll/item/rations via `scrollEquipmentName`; `bonusTreasure` scroll grants use it too.
`src/rulesets/expanded/monsters.ts`; `src/state/dungeonStore.ts`;
`src/engine/treasure/loot.ts`. Test: `sectionC` "multi-roll treasure" (data-level;
the store-level `awardVictory` loop is not unit-testable without the Dexie-backed store).

**F14 — R150, Life floors were dropped.** `lifeFromFormula(level, formula, flat, minLife?)`
now applies `Math.max(minLife, result)`; Cavern Wraith `lifeFloor: 4` (HCL+2, min 4);
Land Siren `lifeFloor: 3` (HCL, min 3). All 5 `lifeFromFormula` call sites in
`dungeonStore.ts` (beginAmbushCombat, rollWanderingAfterRest, finishEvent ambush, explore
env-trap wandering monsters, beginCombat) now pass `enc.monster.lifeFloor`.
`src/engine/combat/combat.ts`; `src/rulesets/expanded/environments.ts`;
`src/state/dungeonStore.ts`. Test: `sectionC` "life floors".

**F15 — R114, a full-Life/full-prayer cleric was listed as having a spent ability.**
`hasSpentAbility`'s cleric branch was `pc.spells.length < slots || healing < 3 || blessing < 3`
with `slots = 0 + (L−1)`, so a L3+ cleric with full prayers was wrongly pending rest.
Now `return healing < 3 || blessing < 3`. `src/engine/camp/rest.ts`.
Test: `sectionC` "cleric rest".

**F16 — R023, halfling duplicate trait reroll was a single retry.** `pickTraits` now loops
`do { rolls[1] = rng.d(6) } while (rolls[1] === rolls[0])`. `src/engine/characters/create.ts`.
Test: `sectionC` "halfling traits" (200 seeds, rolls always distinct).

**F17 — Part 3, the 12 non-core classes had no data.** New file
`src/rulesets/expanded/expandedClasses.ts` (13,980 bytes): Acrobat, Assassin, Bulwark,
Druid, Gnome, Illusionist, Kukla, Light Gladiator, Mushroom Monk, Paladin, Ranger,
Swashbuckler, with ledger Part 3 table values (attack/defense bonuses, Life formulas,
armor/weapon access, saves, stealth, starting wealth) + condensed paraphrased abilities.
Lighter row type `ExpandedClassRow` (no `traitTable` — book text unavailable; no
`startingEquipment` — ledger lists wealth only). `spellSlots` base convention matches
coreClasses (slots = base + (L−1)): Druid 3, Gnome 1, Illusionist 4, rest 0.
`maxPerParty: 1` on Bulwark and Mushroom Monk. Test: `sectionC` "20-class table".

---

## (c) FLAGGED — not fixed

1. **R048 — cleric scroll bonus ambiguous.** Code (and `phase5.test.ts`) gives a cleric +0 on
   non-Blessing scrolls; the ledger ("non-casters +1, casters +L, clerics +L only on
   Blessing") does not state the non-Blessing cleric rate unambiguously. Left at +0;
   do not change without a ledger ruling.
2. **Major-Foe multi-attack not implemented (Part 6 territory).** `profile.attacks` is NEVER
   read anywhere in `src/engine`/`src/state`; `runFoesTurn` hardcodes 1 attacker for Majors.
   Combat-balance impact. Not fixed here — belongs to the combat worker.
3. **Per-Foe damage not implemented.** Ogre Tier+1 damage etc. is not modeled; the engine
   always deals 1 damage per hit. Flagged alongside #2.
4. **Halfling Luck reroll — no engine support.** `luckPoints: true` flag only; Luck rerolls
   (R129/R123/R125/R127) are unwired, confirmed by comments in `src/engine/dungeon/doors.ts`
   and `DoorDialog.tsx`. Known gap, documented.
5. **Barbarian Rage — no engine support.** `ragePerAdventure` flag only.
6. **R042 — Magic Resistance.** No data and no engine support anywhere.
7. **R043 — preventive casting.** No engine support.
8. **Druid / illusionist spell casting.** Data added (F6); no casting engine. Bark scrolls and
   prisms are inert inventory until casting lands.
9. **R100 — reaction outcomes that fall through.** Quest (Medusa '2 Quest', Young Dragon
   '4 Quest'), Blood Offering (Vampire Frogs), Sleep (Young Dragon '1 Sleep') fall through
   `parseReaction` → 'unhandled' → fight.
10. **R100 — unhandled reaction kinds.** Food/rest, Magic Challenge, Trade Information, Capture,
    Trial of Champions, Puzzle have no engine handling; no dungeon profile uses them except
    as noted in #9.
11. **R100 — Ignore reaction incomplete.** Does not implement "steal 1 treasure item via
    Stealth Save".
12. **R051 — 6 of 10 Secrets unimplemented.** Only Weakness, Terrifying Secret, Treasure
    Location, Item Location exist in `secrets.ts`. Missing: Deal with a Foe, True name,
    New spell, Magical/spiritual power increase, Scroll location, Potion recipe.
13. **Fiendish Foes / R157 / R158 / R161 entirely absent.** No Fiendish Foes tables, no
    Fiendish treasure tables, no R161 usage (only a `flatLife` field hints at it).
14. **Cavern/fungal count formulas and Reactions are engine defaults, not book data.**
    Already flagged in the `environments.ts` header; carried forward.
15. **`QUEST_RETRIEVAL_ITEMS` is engine-invented.** Flagged in `environments.ts`; no book
    source for the retrieval-item list.
16. **Treasure-row OR alternatives resolved to a single fixed option.** Fungal row 2 (rations
    OR mushroom), row 3 (bark OR mushroom), row 4 (gem OR 2 mushroom rolls), row 5
    (cavern gem OR prism) — the player is never offered the choice.
17. **Skeletons/Zombies levelCap 6 applies to both.** The ledger caps only zombies.
18. **Myco-Mimic "d3+1 attacks" stored as fixed 3.** The attacks field is a number; the
    d3+1 variance is lost.
19. **Epic rewards with no engine hook.** Gold of Kerrak Dar (roll 2); Arrow of Slaying
    auto-3-damage (roll 5; destined species only logged); Shield of Warning's
    surprised/fleeing benefit (roll 4; treated as a normal shield, stripped while fleeing);
    Book of Skalitos dragon-breath destruction.
20. **Quest type 2 cavern-gems / fungal-mushrooms variants not implemented.**
21. **R026 — `savesAs` never read outside the data.** Save umbrella groups exist as data
    only; no save mechanic consumes them (Part 6 territory).
22. **`weaponsAllowed` / `armorAllowed` never enforced.** Class weapon/armor restrictions
    exist as data only.
23. **Two-handed-weapon busy hand NOT enforced for casting.** `hasFreeHand` does not treat a
    two-handed weapon as occupying the hand; enforcing it would break the elf's starting
    bow with no stow/swap mechanic in place. Deliberately left unenforced.
24. **R027 / R028 — two-handed/shield strapping and weapon swap.** No engine mechanic.
25. **R121 — Resurrection Ritual.** No engine (Part 8, out of section — noted for the
    coordinator).
26. **Part 13 — weapon/armor/firearm prices absent.** No shop for them; class kits only.
    Only the 8 consumables in `ITEM_INFO` are priced.
27. **Part 13 — torch price ambiguous.** Code charges 1 gp each; ledger reads "1/dozen".
    Noted only; not changed.

**Judgment calls (not discrepancies):** fungal row-6 50/50 split (F5) is a documented
interpretation — the ledger gives no odds. Sleep vs dragons (F10) applies the R044 general
rule ("most dragons") to all Dragon-category foes; the cavern/fungal dragon entries do not
restate the immunity.

---

## (d) Class-coverage note

**Playable (8):** Warrior, Barbarian, Elf, Dwarf, Cleric, Rogue, Wizard, Halfling —
full engine behavior in `coreClasses.ts` + combat/rest/creation. Foe-conditional attack/defense
bonuses for these classes (cleric +L vs Undead replacing +½L; elf no +L with two-handed
melee, +1 vs orcs; dwarf +L melee, +1 vs goblins; dwarf +1 defense; halfling +L defense vs
giant/troll/ogre) were implemented by the concurrent Part 6 worker in `combat.ts`
(`attackBonusFor` / `defenseBonusFor` / `isGiantTrollOgre`) during this session — verified
present, not re-implemented here.

**Data-only (12):** Acrobat, Assassin, Bulwark, Druid, Gnome, Illusionist, Kukla,
Light Gladiator, Mushroom Monk, Paladin, Ranger, Swashbuckler — present in
`src/rulesets/expanded/expandedClasses.ts` with ledger table values and paraphrased
abilities, but NOT wired into character creation, party UI, or the engine. No trait tables
(book text unavailable) and no starting equipment (ledger lists wealth only).

**Per-class special mechanics with no engine support:**
- Halfling Luck reroll — flag only (`luckPoints: true`); §(c) #4.
- Barbarian Rage — flag only (`ragePerAdventure`); §(c) #5.
- Druid spells / Illusionist spells — data only, no casting; §(c) #8.
- Gnome / Kukla / Assassin lockpicking specials — unexercisable (R129/R131); §(c) #4.
- All other data-only class specials (Acrobat, Bulwark, Light Gladiator, Mushroom Monk,
  Paladin, Ranger, Swashbuckler abilities) — data-only by definition; no engine hooks.
- Core-class specials verified working: cleric prayers, wizard/elf spell slots, rogue &
  halfling stealth tokens, dwarf/halfling defense bonuses (via the Part 6 worker's
  conditional-bonus code).

---

## Notes for the coordinator

- **Concurrent-worker hazard (observed 2026-11-13).** Another worker (presumably Part 6
  combat) was actively rewriting `src/engine/combat/combat.ts` during this session, and at
  least one other worker was writing `src/state/dungeonStore.ts` and
  `tests/unit/sectionB.test.ts` in the same tree at the same time. My planned
  attack/defense conditional-bonus fixes were already done by them — I did not redo them.
  Any `combat.ts` / `dungeonStore.ts` edit should be re-read fresh before and verified
  immediately after.
- **`dungeonStore.ts` truncation + restore (2026-11-13 ~18:58 UTC).** My own error: a Python
  one-liner opened the file for writing via exec (truncating it to 0 bytes) before the write
  raised EPERM. Restored from the sourcemap
  `dist/assets/index-DZMxqBhW.js.map` (`sourcesContent[74]`, 121,188 bytes, 2,799 lines,
  sha256 `a859b31d35eac68e97d0a544746f1ff0a45f1829875d538fc9308ee9fffe1a77`) and verified
  **byte-identical at 19:15:10 UTC**; my post-restore edits (F13/F14 store parts) were then
  applied on top and verified by grep (file 2,812 lines / 121,964 bytes at that point).
  **Assumption to confirm:** the lost working-tree file was identical to the 09:41 PST
  published version (line count matched exactly; no post-09:41 uncommitted dungeonStore.ts
  edits were known). Please confirm with the other workers.
- **Test-runner EPERM workaround.** `npx vitest` / direct `node vitest.mjs` fail at startup:
  Vite's config bundler writes a `<config>.timestamp-….mjs` temp file next to
  `vitest.config.ts` and that write fails with EPERM in this sandbox (while identical
  direct node/shell writes succeed — the EPERM flaps). The 73-test run above used a
  programmatic runner, `/tmp/run-vitest.mjs`, calling `startVitest` with `config: false`
  (config loading skipped; the repo config is trivial — node environment + include
  patterns — and the file list was passed explicitly). Vitest also logs
  `[DIAG] results-cache write skipped: EPERM` — non-fatal. The coordinator's full-suite
  run may hit the same startup EPERM; retry or use the programmatic runner.
- **Do not re-run a dungeonStore.ts restore.** It is complete; only small targeted
  `muse.edit` changes if needed, re-verified with sha/grep after any edit.
