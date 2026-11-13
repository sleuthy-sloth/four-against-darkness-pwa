# Rules Verification — Four Against Darkness, Expanded Edition

**Source of record:** Four Against Darkness Expanded Edition (Ganesha Games, Andrea Sfiligoi et al.), owner's legitimately purchased copy (PDF, 214 pp). Local working text: `~/inbox/4ad/fad-expanded.txt` (NOT in the repo; never commit it).
**Page citation format:** `FADEE p.N`.
**Method:** mechanics read directly from the local text, paraphrased here in original language. Table values (dice formulas, numbers, probabilities) are transcribed as data.
**Last updated:** 2026-11-13 by the rules verification pass (Phase I). See "Verification pass (2026-11-13)" below for the per-entry status.

## Status legend

- UNVERIFIED — mechanic identified, not yet confirmed against the book
- RESEARCHED — read and documented from the source with page refs
- VERIFIED — independently cross-checked (second pass or owner spot-check)
- IMPLEMENTED — code exists in the engine
- TESTED — automated tests pass and match this document

All entries below were RESEARCHED when first written. The 2026-11-13 verification pass checked each entry against the implementation; per-entry status is in "Verification pass (2026-11-13)" below. Entries marked VERIFIED are implemented and confirmed; PARTIAL means the core is implemented but a sub-part is missing; UNVERIFIED means not implemented or not confirmable without the book.

## Verification pass (2026-11-13)

Three workers verified the ledger against `src/` (numbers checked, not vibes), fixed real discrepancies, and added tests. Full detail lives in `docs/RULES_VERIFICATION_SECTION_A.md` (Parts 1, 5, 6, 14), `docs/RULES_VERIFICATION_SECTION_B.md` (Parts 8, 9, 10, OQ-2, light), `docs/RULES_VERIFICATION_SECTION_C.md` (Parts 2, 3, 4, 7, 11, 12, 13, 15), and the consolidated `docs/RULES_VERIFICATION_REPORT.md`.

**Counts (per-section, with overlap where an entry is both verified-core and flagged-sub-part):** Section A — 33 verified (31 full + 2 partial), 9 fixed, 28 flagged. Section B — 26 rule entries + 18 trap-table entries verified, 34 fixed, 22 flagged. Section C — 34 verified, 17 fix groups, 27 flagged. New tests: `tests/unit/rulesSectionA.test.ts` (22), `tests/unit/sectionB.test.ts` (38) + `tests/integration/sectionBStore.test.ts` (6), `tests/unit/sectionC.test.ts` (31). Full unit suite: **443 tests green**; `tsc --noEmit` clean. Full `vite build` could not complete in this sandbox (EPERM on file writes — environment fault, not a code error; the build transforms all 183 modules before failing on the service-worker write).

**Headline fixes (60 total):** HCL no longer rescales as the party levels (R006); exploding-dice log records real dice (R009); natural-1 defense checks the die face, not the total (R076); surprise strips the shield bonus on turn 1 (R076); Major Foes weaken strictly below half Life (R081); situational attack/defense modifiers added — cleric +L vs Undead, dwarf +1 vs goblins, elf +1 vs orcs, 2H +1, dwarf/halfling vs giants/trolls/ogres (R075–R077); Reaction wins (Flee/Peaceful/Ignore) no longer award treasure (R100/R090); fled Final Boss earns no XP bonus (R171); no second XP roll to a just-levelled PC in the same batch (R170); treasure `++` shift is 2 not 1, `none`/`no-magic` modifiers now work, scrolls roll the correct list (druid bark / illusionist prism), fungal row-6 never yields a Fireball Staff (R150/R151/R049); memorized Blessing works, failed Fireball still slays 1 Minor, Sleep blocked on dragons/L11+ (R044); Weakness secret lasts one combat and targets dungeon Majors (R051); multi-roll treasure and Life floors wired (R150); free hand enforced for casting (R041); Final Boss treasure tripled-or-100gp + second magic item, +1 Life (R118); hidden-treasure complications resolved (R127); trap disarm flow via `answerTrapDisarm` (R132); treasure tiles claimable (R114); search-1 Wandering Monsters ambush consumed (R123); rest nails count doors only, rest WM rerolls and party strikes first behind nailed doors (R133); cavern openings have no doors (R141); trap tables corrected — dart vs HCL+1, spears vs HCL+4, shrieking mushroom inverted, sleep spores / spore cloud / cordyceps fixed (Part 10).

**Per-entry status.** V = VERIFIED, P = PARTIAL (core implemented, sub-part missing), U = UNVERIFIED (not implemented / needs book). Confirming note = code location or test name; flagged reason = why not fixed.

### Part 1 — Core resolution
| ID | Status | Note |
| --- | --- | --- |
| R001 | V | `combat.ts` runFoesTurn — only PC rolls |
| R002 | V | `rng.ts` d3/d6/d66; d100 is uniform 1–100 not 2×d10, no caller (flagged) |
| R003 | V | Attack ≥ L, Defense > L |
| R004 | V | `Math.floor(L/2)`; `rulesSectionA.test.ts` |
| R005 | U | No Luck/reroll economy exists |
| R006 | V | HCL stored by `newDungeon`, `dungeonHcl()`; fixed (was rescaling) |
| R007 | V | `tierOf` in `xp.ts`; tier boundaries L5/L10/L15/L20 |
| R008 | U | No tier dice — all rolls d6 regardless of level |
| R009 | V | Explosion on max, cumulative; fixed (log recorded fabricated dice; `Rng.record()`) |
| R010 | V | Saves ≥ target, only named modifiers; distinct from Defense |
| R011 | U | Group worst-modifier roll not implemented |

### Part 2 — Character creation & party
| ID | Status | Note |
| --- | --- | --- |
| R020 | V | `create.ts` — exactly 4 PCs, distinct classes |
| R021 | V | `Character` schema |
| R022 | V | L1, starting wealth per class |
| R023 | V | Traits; halfling 2, duplicates rerolled; fixed (single retry → loop) |
| R024 | V | Race = class (data) |
| R025 | V | Core 8 playable |
| R026 | V | `savesAs` data matches; engine never reads it (flagged) |
| R027 | U | Two-handed/shield strapping — no engine mechanic |
| R028 | U | Weapon swap — no engine mechanic |

### Part 3 — Classes
| ID | Status | Note |
| --- | --- | --- |
| Class table (20) | V | All 20 verified — attack/defense/Life/saves/stealth/wealth/slots; `sectionC.test.ts` |
| Core 8 playable | V | Full engine behavior |
| Non-core 12 | P | Data only (`expandedClasses.ts`); no trait tables (book text unavailable), not wired into creation/UI/engine |
| Per-class specials | P | Cleric prayers, wizard/elf slots, rogue/halfling stealth, dwarf/halfling defense work; Halfling Luck, Barbarian Rage are flags only; druid/illusionist casting data only; gnome/kukla/assassin lockpicking unexercisable |

### Part 4 — Magic & spells
| ID | Status | Note |
| --- | --- | --- |
| R040 | V | Casting d6+L vs L; fail wastes spell |
| R041 | V | Free hand enforced for casting; fixed (was never enforced); 2H busy hand NOT enforced (flagged) |
| R042 | U | Magic Resistance — no data/engine |
| R043 | U | Preventive casting — no engine |
| R044 | V | 6 basic spells; fixed (failed Fireball slays 1 Minor; Sleep blocked dragons/L11+; memorized Blessing works) |
| R045 | V | Random spell table order |
| R046 | V | Druid spells ×12 data (`extraSpells.ts`); casting has NO engine (flagged) |
| R047 | V | Illusionist spells ×12 data; casting has NO engine (flagged) |
| R048 | V | Scrolls; fixed (bark/prism roll correct lists); cleric non-Blessing +0 ambiguous (flagged) |
| R049 | V | Scroll media; fixed with R048 |
| R050 | V | Prayers — Healing d6+L, Blessing lifts curses, 3 each |
| R051 | P | 4 of 10 Secrets exist; Weakness fixed (one combat, 11 dungeon Majors); 6 missing (flagged) |

### Part 5 — Stealth
| ID | Status | Note |
| --- | --- | --- |
| R060–R064 | U | Stealth entirely absent — `stealthBonus` data exists, no Stealth Save function, no group roll, no outcomes |

### Part 6 — Combat
| ID | Status | Note |
| --- | --- | --- |
| R070 | P | First decision implemented; turn structure flagged (one PC acts per round) |
| R071 | V | Surprise forces Reactions / Foes strike first |
| R072 | P | Per-Foe surprise only for Goblins 1-in-6; others text only |
| R073 | P | Opening-choice structure exists; no ranged phase |
| R074 | V | Attack roll — tier die + class + situational + weapon, ≥ L |
| R075 | V | Attack modifiers; fixed (situational modifiers added) |
| R076 | V | Defense; fixed (natural-1 face, surprise shield strip, situational modifiers) |
| R077 | V | Defense modifier summary; fixed with R075/R076 |
| R078 | V | Failed defense = 1 damage; per-Foe damage text only (flagged) |
| R079 | V | Damage = floor(total ÷ L), min 1 |
| R080 | V | Minor morale — below half, d6 1–3 flee, once per encounter |
| R081 | V | Major weakens below half; fixed (was at exactly half) |
| R082 | U | Bosses with Minions — no split-party sub-fights |
| R083 | V | Fleeing-Foe treasure via normal loot; parting attack not offered (flagged) |
| R084 | P | Marching order exists; corridor positional rules not enforced |
| R085 | V | Assigning attacks — even split + hated-class extras; more-Foes branch dead code (flagged) |
| R086 | U | Withdraw — no action at all |
| R087 | V | Flee — each Foe attacks once, no shield; distribution order flagged |
| R088 | V | Combat end phases |
| R089 | V | Subdual — −1, subdued at 0 Life; immunity guarded |
| R090 | V | Loot once per cleared encounter; fixed (Reaction wins no longer award treasure) |
| R091 | U | Carrying limits not implemented |
| R092 | U | Masterwork — no items exist |
| R093 | V | Darkness −2 (see also Part 8 / Section B) |
| R094 | V | Lantern/torch (see also Part 8 / Section B) |
| R095 | U | Firearms — no items/rules |
| R096 | V | Morale (see R080) |

### Part 7 — Reactions
| ID | Status | Note |
| --- | --- | --- |
| R100 | P | Fight, Fight to the death, Flee, Flee if outnumbered, Bribe, Ignore, Peaceful implemented; Quest, Blood Offering, Sleep, Food/rest, Magic Challenge, Trade Information, Capture, Trial of Champions, Puzzle NOT handled; Ignore steal step not implemented |

### Part 8 — Dungeon generation
| ID | Status | Note |
| --- | --- | --- |
| R110 | V | Grid 20×28, corridors 1-wide, rooms 2+ |
| R111 | V | Starting room d6, no content |
| R112 | P | Rotate/mirror/truncate implemented; corridor stretch 1–2 squares not implemented |
| R113 | P | All 36 + 6 shapes exist; low-confidence 32/35 + starting 4/5 (see OQ-2) |
| R114 | V | Tile Content Table; fixed (treasure tiles claimable; buyPassage gated to Content-9) |
| R115 | V | Movement |
| R116 | P | Retrace 1-in-6 WM implemented; bribed tiles safe / gifts reclaim not implemented |
| R117 | V | Final Boss determination; fixed (WM false reveal; gremlin tally); base-count ambiguity flagged |
| R118 | P | +1 Life, fight-to-death, treasure tripled-or-100gp + second magic item; "+1 attack" ambiguous (flagged) |
| R119 | U | Exit adventure — no leave/complete flow |
| R120 | U | Split party not implemented |
| R121 | U | Fallen heroes — gear-grab, body-carrier, 5-in-6 stolen, Resurrection Ritual not implemented |
| R122 | U | Petrification — Medusa gaze not in combat |
| R123 | V | Search; fixed (4-counts-as-5 scoping; search-1 WM ambush consumed) |
| R124 | V | WM table; fixed (rest WM rerolls; surprise no-shield) |
| R125 | V | Secret doors; fixed (`viaSecretDoor` one-shot) |
| R126 | V | Secret passages |
| R127 | V | Hidden treasure; fixed (alarm/trap/ghost complications resolved) |
| R128 | V | Clues pool/persist |
| R129 | V | Door table; 600-seed proportions |
| R130 | V | Bash |
| R131 | V | Lockpick |
| R132 | V | Trap disarm; fixed (disarm flow via `answerTrapDisarm`) |
| R133 | V | Rest; fixed (nails count doors only; rest WM reroll + partyFirst) |
| R134 | P | Madness tracked as condition; enforcement gaps (paranoid, >L leaves, ghost 2-damage option, exit heal, Blessing heal) |

### Part 9 — Environments
| ID | Status | Note |
| --- | --- | --- |
| R140 | V | Three environments |
| R141 | V | Cavern features; fixed (cavern openings have no doors) |
| R142 | P | Stalagmites no-explosions, echo WM 2-in-6, water pools dip implemented; stalactites/boulders not in combat |
| R143 | V | Cavern search + Listen |
| R144 | V | Fungal search + slippery flee; mushroom doors L1 bash not implemented |
| R145 | U | Animal companions not implemented |

### Part 10 — Traps (all 18 entries)
| Table | Status | Note |
| --- | --- | --- |
| Dungeon (6) | V | Dart fixed vs HCL+1; spears fixed vs HCL+4; all verified numerically |
| Caverns (6) | V | Halfling rerolls added; all verified numerically |
| Fungal (6) | V | Sleep spores (cleric not immune, cloud stage), spore cloud (two saves), shrieking mushroom (inverted threshold fixed), cordyceps (bonus removed); all verified numerically |

### Part 11 — Treasure & items
| ID | Status | Note |
| --- | --- | --- |
| R150 | V | Treasure Table; fixed (`++` shift 2, `none` no treasure, `no-magic` d6×d6 gp, multi-roll) |
| R151 | V | Dungeon Magic Treasure; fixed (fungal row-6 never Fireball Staff) |
| R152 | V | Rare Mushroom (Purple Truffle fake/real) |
| R153 | V | Caverns Special Item |
| R154 | V | Fungal Rare Item |
| R155 | V | Quest Table types 1–6 |
| R156 | P | Epic Rewards; 4 rewards have no engine hook |
| R157 | U | Fiendish treasure — absent |
| R158 | U | Fiendish magic treasure — absent |
| R159 | V | Special Feature Table |
| R160 | V | Special Events |
| R161 | U | Fiendish Foes usage — absent |

### Part 12 — Monsters
| Table | Status | Note |
| --- | --- | --- |
| Dungeon Boss (6/6) | V | All verified — L offsets, Life formulas, attack counts, treasure modifiers |
| Dungeon Vermin/Minions/Weird | V | Sampled deeply (≥3 per table), matching |
| Caverns / Fungal | V | L and Life formulas verified, incl. Life floors (fixed) |
| Fiendish Foes | U | Entirely absent |

### Part 13 — Equipment
| ID | Status | Note |
| --- | --- | --- |
| Consumable prices (8) | V | Healing potion 100, bandage 5, bag of nails 4, rope 4, lantern 4, torch 1, rations 1, scroll of blessing 100 |
| Weapon/armor/firearm prices | U | Absent — no shop for them; class kits only |
| Torch "1/dozen" | U | Ambiguous — code charges 1 gp each; not changed |

### Part 14 — Experience & advancement
| ID | Status | Note |
| --- | --- | --- |
| R170 | V | XP roll; fixed (no second roll to just-levelled PC in same batch) |
| R171 | V | Classical; fixed (fled Final Boss earns no bonus) |
| R172 | V | Slow and Sure |
| R173 | V | Old School; tier basis ambiguity flagged (current vs target tier) |
| R174 | V | Slower Advancement; boosted-6 ambiguity flagged (natural 6 vs total ≥ 6) |
| R175 | U | Expert skills not implemented (documented out of scope) |

### Part 15 — Adventure structure
| Item | Status | Note |
| --- | --- | --- |
| Goal | V | One dungeon = one adventure; Final Boss ends it |
| Quests | V | See R155/R156 |
| Secrets economy | P | Clues earned/spent on 4 implemented secrets; 6 missing |
| Between-adventures | V | Four XP systems; no session-length cap (guidance, not mechanic) |

### Part 16 — Open questions
| ID | Status | Note |
| --- | --- | --- |
| OQ-1 | NEEDS BOOK | Search Table "0-1" on a d6 (p.107) — treated as 1 = Wandering Monsters; confirm against the printed page |
| OQ-2 | NEEDS BOOK | Tile shapes from page images (pp.149-151); low-confidence d66 32/35 + starting 4/5; ledger says 23/33/35/62/63 art-covered but `tiles.ts` marks 23/33/62 high (63 medium) — unresolved either way |
| OQ-3 | NOTED | "Backstabbing" rogue skill (p.147) — supplement content; ignore for core |
| OQ-4 | NOTED | Fiendish flat Life (7/8/12) — deliberate for L3+ parties; treat as data |
| OQ-5 | V | "Tier" = tier number (1-5); verified by p.94 ogre example |
| Darkvision | NEEDS BOOK | `DARKVISION_CLASSES` in `src/engine/light.ts` is `[]` by design — no ledger entry or class data names which classes have darkvision; do not invent a list |



## Part 1 — Core resolution system

| ID | Rule | Source | Mechanics (original paraphrase) |
| --- | --- | --- | --- |
| R001 | Foes never roll dice | p.2 | Only PCs roll. Attack: roll ≥ Foe's L. Defense: roll > Foe's L. Saves: roll ≥ target. |
| R002 | Dice codes | p.2 | d3 = d6 halved (1-2/3-4/5-6→1/2/3). d6, 2d6, d6+N, d66 (first die = tens). Higher tiers add d8/d10/d12/d20; d100 = 2×d10 (tens+units). Basic game (L1-4) uses d6 only. |
| R003 | Level (L) | p.3 | L = power rating of a Foe/hazard; target number for attack/defense/save/spellcasting rolls. |
| R004 | Level bonus notation | p.3 | +L, +½L (round down), +2×L attach to the acting PC's level. |
| R005 | Rerolls | p.3 | Reroll stands even if worse; no rerolling a reroll. |
| R006 | HCL system | p.3 | Foe/hazard L = HCL (highest PC level) + modifier. Some Foes have min/max L caps. HCL is fixed at first encounter; does NOT rescale if the party levels up and returns. |
| R007 | Tier number | p.5 | Tier 1 Basic: L1-4; T2 Expert: 5-9; T3 Heroic: 10-14; T4 Legendary: 15-19; T5 Epic: 20+. "Tier" in formulas = tier number (1-5). |
| R008 | Tier dice | p.5 | PCs roll a tier die for attack/defense/save: T1 d6, T2 d8, T3 d10, T4 d12, T5 d20. This book's rules assume T1 (d6) unless stated. |
| R009 | Explosion rule | p.5 | Rolling the die's max (d6: a 6) on any PC roll triggers an extra d6 added to the total, cumulatively. Explosion threshold per die: d8→7+, d10→8+, d12→9+, d20→10+. An explosion is NOT an automatic success. Masterwork weapons explode 1 step early (p.99). |
| R010 | Saves | p.77 | Save = d6 + only the modifiers named by that specific Save (and the PC sheet). No universal modifier table. Roll ≥ target = avoided. Immune classes don't roll. Saves are distinct from Defense rolls (which require rolling OVER the target). |
| R011 | Group rolls | p.78 | Stealth (and similar group checks): one roll using the WORST modifier in the group. |

## Part 2 — Character creation & party

| ID | Rule | Source | Mechanics |
| --- | --- | --- | --- |
| R020 | Party size | p.7 | Party of four PCs. Hirelings/NPCs may tag along occasionally. |
| R021 | PC definition | p.7 | Name, Level, Class + Attack value, Defense value, Life, Traits, class abilities (spells/tricks/prayers/luck/panache), equipment, gp. |
| R022 | Starting level & kit | pp.7-8 | All PCs start L1 with class starting equipment and starting wealth (per class, d6 to 5d6 gp). |
| R023 | Traits | p.7 | Each class has a d6 trait table; choose 1 (halflings: 2, reroll duplicates) or roll. Traits are optional. |
| R024 | Race = class | p.8 | Core ancestry classes (dwarf, elf, halfling, gnome) fuse race+class. Reskinning allowed; a "halfling wizard" = wizard class + a halfling trait. |
| R025 | Core 8 classes | pp.7-8 | Warrior, barbarian, elf, dwarf, cleric, rogue, wizard, halfling. Saves tables reference these; other classes "Save as …" one of them. |
| R026 | Save umbrella groups | p.7 | Fighters (+L attack classes: dwarf, warrior, barbarian…), Elves (elf, fire elf, wood elf…), Large, Unliving, Foresters (ranger, druid, wood elf…), Spellcasters, Small (fay, lutin). "All foresters add +Tier to the Save" applies to any member class. |
| R027 | Two hands | p.110 | Two-handed weapons/bow/musket occupy both hands (no shield or lantern). Spellcasters need 1 free hand (wand/holy-symbol hand counts as free). Shield can be strapped on the back (free hand, no defense bonus). Equipping a shield: 1 turn. |
| R028 | Weapon swap | pp.92,95 | 1 turn to draw/exchange weapons. A PC has a default weapon used when an encounter starts. |

## Part 3 — Classes (FADEE pp.19-66)

All classes roll d6 attack/defense/save at T1. "Atk"/"Def" = flat bonuses added to rolls. Life formulas give L1 value in parentheses.

| Class | p. | Atk | Def | Life | Armor | Weapons | Saves | Stealth | Start wealth |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Acrobat | 19-21 | +½L | +L | L+3 (4) | none | light, light ranged | rogue (swim/climb/fall +L; traps +½L) | +L | d6 |
| Assassin | 22-23 | +L | — | L+3 (4) | light | any | rogue (disguise +L) | +L (p.78) | 5d6 |
| Barbarian | 24-25 | +L | — | L+7 (8) | light+shield | any except firearms | barbarian | +½L | d6 |
| Bulwark | 26-27 | +½L melee, +Tier ranged | +½L | L+7 (8) | light/heavy+shield | any except firearms | warrior | — | d6 |
| Cleric | 28-29 | +½L (+L vs undead) | — | L+4 (5) | light/heavy+shield | light, 2H, hand, sling | cleric | +½L | d6 |
| Dwarf | 30-31 | +L melee only (+1 vs goblins) | +1 vs giant/troll/ogre | L+5 (6) | any | any incl firearms | dwarf | +½L | 3d6 |
| Druid | 32-33 | +½L | — | L+3 (4) | light/leafsteel+shield | light, javelin, short bow, sling | cleric | +½L | 2d6 |
| Elf | 34-35 | +L (not 2H melee; +1 vs orcs) | — | L+4 (5) | any+shield (casting: light/leafsteel/elven chain, no shield) | any except firearms | elf | +1 | 2d6 |
| Gnome | 36-39 | — | +½L | L+4 (5) | light/leafsteel/clockwork | light, sling, hand, bow, handgun, clockwork | rogue | +½L | 4d6 |
| Halfling | 40-41 | +L sling; +L def vs giant/troll/ogre/half-giant | (see left) | L+3 (4) | light only | light, sling | halfling | +L | 2d6 |
| Illusionist | 42-43 | — (spells +L) | — | L+2 (3) | none | light, light ranged | wizard | +½L | 3d6 |
| Kukla | 44-48 | +1 flat light slashing; unarmed -1 | +½L | L+5 (6) | none | light, light ranged | rogue | +½L | 3d6 |
| Light Gladiator | 49-50 | +½L (light hand weapons only) | +½L | L+5 (6) | light/leafsteel | light hand only | warrior or rogue, per case | — | d6 |
| Mushroom Monk | 51-54 | +L (nunchaku/bo/sai/stars/unarmed, else +½L) | +½L | L+4 (5) | none | any except firearms | (monk list) | +½L | d6 |
| Paladin | 55-56 | +L | — | L+6 (7) | light/heavy+shield | any except firearms | warrior (fear auto-pass) | — | d6 |
| Ranger | 57-59 | +L | — | L+6 (7) | light+shield | light, hand, bows, slings (no 2H/firearms) | warrior (climb/track/swim +L always) | +L out, +½L in | 2d6 |
| Rogue | 60 | +L vs outnumbered Minor Foes | +L | L+3 (4) | light | light, sling | rogue (traps/locks +L always) | +L | 3d6 |
| Swashbuckler | 61-62 | +½L; 2 attacks (hand+light) | +½L | L+4 (5) | none | light, hand, sling, firearms | rogue | +½L | 2d6 |
| Warrior | 63 | +L | — | L+6 (7) | any | any | warrior | — | 2d6 |
| Wizard | 64-65 | — (spells +L) | — | L+2 (3) | none | light, sling | wizard (puzzles/magic +L) | — | 4d6 |

### Per-class special mechanics (condensed, page-cited)

- **Acrobat (pp.19-21):** L+3 Trick points/adventure (1 pt per trick; rest recovers Tier points +1 Life). Tricks: reroll a failed non-magical Save; swap marching-order places; distract a Foe (-Tier L, not Weird/Vermin, not cumulative); unarmed kicks without the -2 (Flip Kick) or vs 2 Minors at -1 (Double Kick); escape melee unhit; knife throw (+Tier, ignores ranged light -1); street performance (d6 gp per point, Save vs L6, fail = fine or Tier damage); Vaulting Strike (once/combat, first turn, not surprised: +L attack, fail → -2 defense on Foes' first turn + must be attacked).
- **Assassin (pp.22-23):** Hide in Shadows (1 turn, Stealth Save +L vs Foes' L; fail = free Foe attack; success → next attack on the marked LIVING target does TRIPLE damage; one assassin hidden at a time; artificial/undead/oozes/spirits immune unless 1 XP spent at L4). Any weapons incl firearms; rogue-item access; disarm/picklocks WITHOUT the rogue +L.
- **Barbarian (pp.24-25):** Rage = 1 + floor(L/2) attacks per adventure; roll 3 take best; double damage. No magic items/scrolls/potions; holy water and divine healing OK; herbal remedies OK. Illiterate (no book-based clues; Literate trait allows reading but not scroll-casting).
- **Bulwark (pp.26-27):** Max 1 per party. Non-bandage healing only allowed if no other PC is wounded. Scroll-casts as L1 wizard. L5+ expert skills: Sacrifice Defense (take an ally's combat damage in full on a successful defense roll), Shield Sacrifice (destroy shield to let an ally reroll a failed Save vs trap/danger).
- **Cleric (pp.28-29):** Prayers (no free hand, 1 turn): Healing 3×/adventure (d6+L Life, self or ally), Blessing 3×/adventure (removes stone/curse conditions where allowed).
- **Dwarf (pp.30-31):** Gold Sense (Save vs L6 +L on meeting a Foe → roll its Treasure before deciding to fight). Miser: 2+ dwarves → party may not bribe. Greedy: every dwarf gets ≥1gp of any gold loot. +20% (round down) gem/jewelry resale & bribe value.
- **Druid (pp.32-33):** 2+L druid spell slots, +L casting; learns Expert druid spells at L5+ (quest reward instead of epic reward / 3 Clues or 1 XP roll / burning an Expert scroll). Non-druid scroll casting at +½L (min +1); may not LEARN non-druid spells. Free animal companion (1gp food offering; 1 Madness if it dies; replaced in wilderness).
- **Elf (pp.34-35):** L spell slots, +L casting (incl. scrolls/items). Casting requires light/leafsteel/elven-chain armor and NO shield (slinging shield to back + re-readying = 1 turn). All basic wizard spells except Blessing; extra wizard spells via XP roll per spell with a consumed scroll, chosen before the adventure.
- **Gnome (pp.36-39):** L spell slots but a single chosen illusionist spell, memorized daily via a contraption. Gadget points L+6 per adventure: one-shot ranged gadget (+L to one attack), open lock/disarm (1 turn, Save vs L + L + points spent), free an ally from bonds, portable door (create/remove/lock a door), grenade (points-1 damage, max 4; in melee allies each lose d6 capped by points), gadget-enhanced melee weapon (+L, disarm-immune), clockwork armor (light armor; 1 pt → Defense +3 for the encounter; 25gp to make; counts as 2 items for gremlin theft).
- **Halfling (pp.40-41):** L+1 Luck points (reroll attack/defense/save/search/treasure roll, or escape melee unhit). Nourishing Meal once/adventure while resting (1 ration/ally: heal 1 Life; halflings also recover 1 Madness). Picks 2 traits.
- **Illusionist (pp.42-43):** L+3 slots, illusionist list only (plus any spell with Illusion/Phantasm/Glamour/Mirage-type name from other lists). Distracting Lights (1 turn, spellcasting roll vs Foe L: -Tier L for the encounter; no undead/artificial/elemental; all Minor Foes in group; fails = no retry this encounter; uses no slot). Continual Light (hands-free lantern). Illusionary Knife Throw (1 slot: +Tier+L attack, no light-weapon penalty, optional subdual without the -1).
- **Kukla (pp.44-48):** Unique/artificial construct. Immune: poison, disease, petrification, mind control, vampirism, energy drain, paralysis, lycanthropy. Cannot eat/drink → no food magic, herbs, or potions (green ring's revive fluid excepted); healing has NO effect — repaired between adventures at 1gp/Life (or 10gp spare parts = 4 Life, carried by allies). Unarmed attacks count as magic weapons. Green ring: once-ever revival (1 turn, then d6 turns to full Life). Red ring: once-ever ingestive poison kill (vs anything that accepted a food bribe/bite). Secret torso compartment (knife, 5 rations, 10 small items, 100gp; unstealable while alive). Prehensile hair (+½L lockpicks via hair, rope use, extra hand for lantern/wand, not weapons). +L social saves with children; cannot woo/seduce. No smell/taste (auto-fail those saves). Madness > L = soul departs (lifeless doll). L5+ Doll Army skill (½L dolls of 1 Life).
- **Light Gladiator (pp.49-50):** Two-weapon fighting (2 attacks/turn with a light weapon in each hand) OR forgo 1 attack to parry (+1 defense vs melee). At L3: free Gladiator expert skill (+1 attack/defense in Trial of Champions). Explosive defense: add the overshoot to the next attack on that Foe (declare after rolling).
- **Mushroom Monk (pp.51-54):** Max 1/party. Flurry of Blows = Tier attacks/turn (unarmed/stars/nunchaku; other weapons 1/turn; not cumulative with other multi-attack effects). Martial-arts hands = light weapons (-1; 0 at L5+). Spores: Tier×/adventure, 1 turn, living Minor Foes get -1 L (not fungal/unliving). Dies → d6 food rations (eaten = no resurrection). Self-sustaining (no food/water where organic matter exists). L5+ expert skills: Parry&Disarm (explosive defense disarms weapon-user: -2 L), Butterfly Parry (+Tier defense vs next attack), Expert Spore Cloud (-Tier), Leap Away (pole-vault out, +L defense), Concentrated Force (+Tier door bashing), Stillness of Mind (+Tier saves vs magic), Stunning Blows (no -1 on subdual). Heroic tier: Whirlwind of Fury (attack ALL Minor Foes, split bonus), Parry&Counter (free attack on explosive defense), Heroic Stillness (+2×Tier), Parry&Throw (explosive defense throws Foe: allies +Tier next turn), Karmic Transferral (successor monk inherits 1 expert skill).
- **Paladin (pp.55-56):** L+1 prayer points: heal 1 Life each; reroll a failed Save; summon a steed for a day (outdoors only; mounted non-surprised paladin +1 vs unmounted foes). Tithe L×10gp (or all found gold/gems) after each adventure. Never breaks off combat or leaves before mission completion (withdraw allowed if all survivors <½ Life and no healing left). Auto-passes fear saves. L5+ Divine Smite (once/adventure: successful hit = 3 damage to a Major Foe or 3 Minor Foes auto-slain; magic-effective; explosions ignored for this).
- **Ranger (pp.57-59):** Two melee weapons: 1 attack each at +½L (no explosions). Bow outdoors: 2 shots/turn at +½L (no explosions; not stackable). One druid-restricted magic item allowed (choose on finding, permanent). Scroll-cast as L1; may learn ONE druid spell via XP roll. Sworn Enemy (chosen at L1; more via XP rolls; vs that Foe: higher tier die for stealth/attack/defense; must have actually fought it once). Tracking (hunting a Foe costs 1 fewer Clue). Boss tracking: once/adventure reroll the Final Boss determination. Survival(Terrain) skills via XP roll on entering a terrain; active there: higher tier die for saves/stealth/attack/defense; +1 foraged ration; sworn-enemy and terrain die bonuses stack, max 2 die steps.
- **Rogue (p.60):** +L trap saves and lockpicking always. (Trait #6 Backstabber extends the outnumbered bonus to Major Foes.)
- **Swashbuckler (pp.61-62):** Panache: +1 point per Foe killed, max held = L; spend 1 → +1 to next attack OR defense roll (max 1 per roll).
- **Warrior (p.63):** No special mechanics beyond full martial/armor access.
- **Wizard (pp.64-65):** L+2 slots. Slots assigned before each adventure (duplicates allowed), refresh between adventures; 1 spent slot recovers during a Rest. Knows all 6 basic spells; new spells via scroll copy (destroys scroll) or 3 Clues ("New Spell" secret). Spell Burning: no slots left → tear out a spellbook page and cast it as a scroll (spell gone from book until 1 XP relearn or scroll re-copy). +L scroll casting. +L saves vs puzzles and magic.

### Trait tables
Every class has a 6-entry d6 trait table (halflings pick 2, reroll duplicates). Full per-entry data goes into the class data pack in Phase 2 with page refs: Acrobat p.21, Assassin p.23, Barbarian p.25, Bulwark p.27, Cleric p.29, Dwarf p.31, Druid p.33, Elf p.35, Gnome p.39, Halfling p.41, Illusionist p.43, Kukla p.48, Light Gladiator p.50, Mushroom Monk p.54, Paladin p.56, Ranger p.59, Rogue p.60, Swashbuckler p.62, Warrior p.63, Wizard p.65. Common patterns: once-per-combat damage reduction by 1, +Tier stealth/trap bonuses, once-per-adventure rerolls, extra Life at creation, once-per-level-per-adventure rerolls.

## Part 4 — Magic & spells

| ID | Rule | Source | Mechanics |
| --- | --- | --- | --- |
| R040 | Casting | p.67 | Spellcasting roll = d6 + caster bonuses (usually +L) vs target's L; success = effect, failure = spell wasted. Casting takes a full turn: a caster attacks OR casts. |
| R041 | Hands & readiness | p.146 | A spell is ready if the caster has a free hand; hands holding lanterns/torches/magic items are NOT free. Wand/holy-symbol hands count as free. |
| R042 | Magic Resistance (MR) | p.67 | Foes/items/places may have MR: the caster first rolls vs the MR, then vs the target's L. Failure vs MR wastes the spell. MR applies even to automatic spells (e.g., Blessing). |
| R043 | Preventive casting | p.67 | A spell can be spent to negate an incoming hazard (e.g., Lightning vs a lightning storm). |
| R044 | Basic wizard spells ×6 | pp.68-69 | Blessing (auto; removes curse/petrification; elves forbidden), Escape (auto; teleport to the adventure's first tile; may replace a Defense roll), Lightning (roll vs L; 1 Minor slain or 2 damage to a Major; no effect on electricity-immune), Fireball (attack-style roll +L; Major: 1 damage; Minor group: slain = total − L, minimum 1 even on a failed roll; susceptible foes take bonuses/auto-kill), Protection (auto; +1 Defense for one encounter; may target an ally), Sleep (roll; 1 Major knocked out OR d6+caster L Minor Foes; not on most dragons, Unliving, or L11+; noted immunities). |
| R045 | Random spell table | p.69 | d6: 1 Blessing, 2 Escape, 3 Lightning, 4 Fireball, 5 Protection, 6 Sleep (for random scrolls). |
| R046 | Druid spells ×12 | pp.70-72 | 1 Disperse Vermin (melee-style roll +2×L vs Vermin; dispersed, not killed — no harvest/loot), 2 Summon Beast (L3-warrior-stat animal, 5 Life, 1 attack/1 damage, leaves at encounter end or master's death), 3 Water Jet (roll vs L, pick 1: 2 dmg to fire-creature/fire / 2 Vermin dispersed / 1 Minion KO / distract Major enabling escape; also daily water; +1 near water, -2 desert, 0 dungeon), 4 Bear Form (1 action; fights as warrior of druid's L min 3, 8 Life or current Life; no casting; on revert half of bear-form damage, round down), 5 Warp Wood (destroy wooden door/chest/object; auto 2 damage to wooden creatures), 6 Barkskin (self/ally: +2 Defense, -2 agility saves, -2 vs fire; castable on a Foe: +1 L, fire attacks +3 and minimum 2 damage), 7 Lightning Strike (Lightning but outdoors only), 8 Spiderweb (1 Major or d6 Minor auto-entangled; -1 L attacking+defending; fire spells burn it off; webbed foes failing Morale surrender), 9 Entangle (Spiderweb outdoors in forest/swamp/jungle only; fire creatures affected but break free after 2 turns), 10 Subdual (allies ignore the -1 subdual modifier this encounter), 11 Forest Pathway (party walks through woodland 10 min × L; druid in position 1-2), 12 Alter Weather (outdoors: bad weather 10 min = -1 to non-magical ranged attack rolls; +1 druid Lightning Strike; auto 2 dmg to fire/air elementals; douse fire/storms). |
| R047 | Illusionist spells ×12 | pp.73-75 | 1 Illusionary Armor (+Tier Defense; not vs illusion-immune), 2 Illusionary Mirror Image (Tier+1 copies, 1 Life each, each absorbs one hit automatically; destroyed by Disbelief/party leaving/area attacks), 3 Illusionary Servant (carries 200gp treasure, 4 weapons, armor, 2 shields, 10 rations; Life = Tier; +2 Defense; vanishes if trap triggered or 0 Life; one at a time; occupies a marching slot), 4 Disbelief (dispels all illusions; invisible gremlins become d6+1 L3 Minions; other invisible foes lose invisibility advantages or -2 L), 5 Phantasmal Binding (roll vs L; held Tier turns; attackers +2; subdual allowed; held foe failing Morale surrenders), 6 Illusionary Fog (suspends ranged/gaze attacks and Search rolls while it persists; +2 Defense when fleeing; free action before ranged/gaze), 7 Glamour Mask (Tier hours; disguise; reroll reaction/woo saves; pass as authority), 8 Shadow Strike (Tier subdual damage on hit; no illusion-immune targets), 9 Specter Swarm (Foes test Morale or cannot attack the illusionist this encounter), 10 Mirage of Fortune (successful roll = automatic Bribe reaction), 11 Illusionary Banquet (Tier+3 rations, max 7 days then 1 damage each), 12 Illusionary Sword (Tier+3 turns; +L attacks; counts as magic; subdual damage). |
| R048 | Scrolls | p.76 | Any PC except barbarians may cast from a scroll: 1 turn, non-casters +1, casters +L (even for foreign lists), clerics +L only on Blessing. Scroll destroyed on cast. Wizards may instead COPY a new spell into the spellbook. |
| R049 | Scroll media variants | pp.76,111 | Wizard spells on parchment, druid on bark, illusionist on prisms; adventures may use other media. Random scroll = roll the matching d6/d12 list. |
| R050 | Prayers | pp.28,67 | Cleric-only divine powers (Healing, Blessing); cast like spells but need no free hand. |
| R051 | Secrets (Clue spending) | pp.123-124 | 3 Clues → a PC reveals a Secret and gains 1 XP. List: Weakness of a Foe (+2 vs a chosen Major Foe for one combat, party-wide), Deal with a Foe (named Foe lets party pass, no treasure, not Vermin/Final Boss), Hidden treasure location (3d6×10 gp in an empty room), Magic item location (1 item from any magic table), True name of a spiritual entity (angel heal-full/rescue OR demon 4 dmg Major / kill 6 Minor — once per campaign), New spell (spellcaster; +1 temporary slot), Magical/spiritual power increase (cleric/caster; +1 permanent use of one named spell/prayer per adventure), Scroll location (choose any spell), Potion recipe (defeat 2 Major Foes + 50gp → buy healing potion 50gp before each adventure), Terrifying secret (forced Morale failure; once per secret; not vs no-morale foes/Final Boss). |

## Part 5 — Stealth

| ID | Rule | Source | Mechanics |
| --- | --- | --- | --- |
| R060 | Stealth Save | p.78 | Roll vs the Foe's L. Bonuses: rogue/assassin/acrobat +L; halfling/swashbuckler/kukla/elf +½L; ranger +L outdoors; shield -1; heavy armor -1. 1 or below always fails; explosions apply. |
| R061 | Group stealth | p.78 | One roll for the group using the WORST modifier. |
| R062 | Environment modifiers | p.78 | Plains/desert/barren hills -2; light forest/large ship/labyrinth/city streets +1; dense forest/sewers/swamps +2; jungle +3; tomb/catacomb/necromantic dungeon +1; valley/ruins/fortress/prison/temple/rocky hills 0; tower -1; sleeping Foe +3; Foe distracted by illusion +1. |
| R063 | Stealth outcomes | p.79 | Success on entering an unexplored area with Foes: (a) quietly exit (1-in-6 Wandering Monsters en route; no Defense rolls; no spells except teleportation), or (b) ambush: Foes' L -1 (min 1) on combat turn 1 and no Foe ranged attacks before melee — or reveal and check Reactions. Failure: Foes act first (attack first OR roll Reactions). |
| R064 | Stealth limits | p.79 | Not usable vs Wandering Monsters, Special Events, Traps, or event-type Foes (gremlins, merchants). Scout-ahead variant: lone scout with best modifier, but all attacks hit the scout for 1 turn on failure. Stealth Training expert skill: +½L (not if a better bonus exists). |

## Part 6 — Combat

| ID | Rule | Source | Mechanics |
| --- | --- | --- | --- |
| R070 | Turn structure | pp.90-91 | PCs and Foes alternate; a turn = one side acts. PCs act in any order the player chooses; declare each attack after seeing the previous result. |
| R071 | First decision | p.90 | Unless surprised, PCs choose: attack immediately, or wait for Foes' Reaction (if it's an attack reaction, Foes strike first). |
| R072 | Surprise | p.90 | Per-Foe X-in-6 chance; on surprise Foes act first and Reactions are rolled. |
| R073 | Ranged-first sequence | pp.91,146 | Order: Foes' ranged (if they surprised) → PCs' ranged/spells/thrown vials → Foes melee → PCs melee. Foes that ranged-attack spend their melee turn drawing melee weapons; natural attackers don't. |
| R074 | Attack roll | pp.91-92 | Tier die + class + situational + weapon modifiers; hit if ≥ Foe L; explode on the die max. |
| R075 | Attack modifier summary | p.147 | Class-based (+L: dwarf, warrior, assassin, barbarian, paladin, ranger; elf +L except 2H melee, +1 vs orcs; +½L: cleric, acrobat, bulwark, druid, swashbuckler; cleric +L vs undead; rogue +L vs outnumbered Minors; dwarf +1 vs goblins; bulwark ranged +Tier; light gladiator +½L light weapons; monk +L nunchaku/bo/sai/stars; halfling sling +L; kukla dagger 0, unarmed -1; gnome gadget weapons +L; ranger 2 weapons +½L each). Situational (mounted vs foot +1; darkness -2; panache +1). Weapons (unarmed -2; light -1; 2H +1; crossbow +1; handgun +2; rifle +3; crushing vs skeleton +1; gilded vs elemental +2; silver vs werecreature +1; torch vs flammable +2; subdual attack -1). Trait-based list per p.147. |
| R076 | Defense roll | p.96 | Roll HIGHER than Foe L. Modifiers: light armor +1, heavy armor +2, shield +1, rogue +L, dwarf +1 vs giant/troll/ogre, halfling +L vs giant/troll/ogre/half-giant. A natural 1 always fails; a 6 is not auto-success but explodes. Surprise (Wandering Monsters) negates shield bonus on turn 1; some attacks negate armor/shield. |
| R077 | Defense modifier summary | p.148 | Class-based (rogue/acrobat +L; bulwark/gnome/kukla/light gladiator/mushroom monk/swashbuckler +½L; dwarf +1 vs giants/trolls/ogres; halfling +L vs giants/trolls/ogres/half-giants). Situational (darkness -2; sleeping auto-fail; withdrawing +1; fleeing +0 no shield; flail-wielders negate shields; charge first turn -1 vs minotaur/cave orc; evil eye -1; morlock vs light source +2). Armor (light +1, heavy +2, shield +1, leafsteel +2, clockwork activated +3). Spell/trait-based list per p.148. |
| R078 | Failed defense | p.96 | 1 damage (or per-Foe damage); attached effects (poison etc.) trigger. |
| R079 | Damage | p.94 | Default 1 per successful attack; per-Foe profiles may add more; each L-multiple exceeded = +1 damage (total ÷ L rounded down = damage against a Major Foe; = Minors slain for a group). |
| R080 | Minor Foes | p.94 | Vermin + Minions; 1 Life each, met in groups. Group Morale when reduced below half its starting number: d6 (1-3 flee, 4-6 fight), once per encounter unless stated; Morale modifiers apply; "Fight to the Death"/never-morale Foes never test. |
| R081 | Major Foes | p.94 | Weird Monsters + Bosses; multiple Life; dropping below half Life reduces their L by 1 (unless stated). |
| R082 | Bosses with Minions/Vermin | p.180 | Split the party: simultaneous sub-fights, freed PCs join the other fight (no action needed); separate Morale; +2 XP rolls; NO treasure roll for the Minor group. |
| R083 | Fleeing Foes | p.95 | Fled Foes vanish; party takes their Treasure. One last attack at +1 each (or a spell) to cut down fleeing Foes; corridor: only positions 1-2 or spells/ranged. |
| R084 | Marching Order | p.95 | 4 positions (more with companions/NPCs). Corridors: positions 1-2 melee, 3-4 ranged/spells; ambush from the rear hits 3-4; narrow corridors: 1 front, 2H weapons net -1, light weapons unpenalized. Rearranged before entering a tile. Trap targeting references positions. |
| R085 | Assigning attacks | pp.95-97 | Rooms: all PCs melee; ranged weapons usable for 1 turn only, then close combat (draw melee weapon or -2). Corridors: max 2 Foes attack positions 1-2. Room distribution: fewer Foes than PCs → each Foe a different PC (player chooses who's unattacked); equal → 1 each; more → equal split, player assigns leftovers, EXCEPT hated-class Foes (trolls/goblins/kobolds→dwarves; orcs→elves; undead→clerics) always take the extras. |
| R086 | Withdraw | p.97 | Retreat through a door and shut it (Foes stay; they're there if you return). Each Foe strikes once; PCs +1 Defense, shields apply. Only toward visited tiles; 1-in-6 Wandering Monsters. Lever doors (roll 12) negate the strikes. Openings (no doors) can't be withdrawn through. |
| R087 | Flee | pp.97-98 | Each Foe attacks once during the flee. Distribution when insufficient Foes: lowest-Life PCs first, then hated classes, then random. Slain PCs' gear stays in the tile (must re-fight to recover; items left on the body: 5-in-6 stolen, p.105). Flee toward visited tile (1-in-6 WM) or unexplored tile (roll content; any Foes auto-surprise). |
| R088 | Combat end & actions | p.98 | Ends when Foes die/flee, PCs die, or the party flees. PC combat actions limited to: attack, defend, cast, flee, use a Trait, tile/Foe-defined actions. Free actions (e.g., drinking a potion) anytime. Dropping a hand-held item: free; picking one up: 1 turn. |
| R089 | Subdual | p.99 | Attack at -1 (or Sleep); at 0 Life the Foe is subdued (tie it, take treasure; it follows but does nothing). Damage spells can't subdue unless stated. Not possible vs Unliving, hordes, Vermin, pain-immune creatures. |
| R090 | Loot | p.99 | Treasure rolled when ALL Foes in a room are defeated — once per encounter, even if Foes flee. Treasure modifiers (+/- per profile). Barbarians refuse carried magic items. Slain humanoid Foes are assumed to carry a cheap hand weapon (breaks on an attack roll of 1). Wandering Monsters carry only weapons. |
| R091 | Carrying limits | p.99 | Per PC: 200gp, 2 shields, 3 weapons (2H = 2 weapons). Over limit: -1 Defense and -1 to climb/jump/swim saves. Gems/jewelry/scrolls/wands/holy water/potions uncounted. |
| R092 | Masterwork | p.99 | Non-magical; explode one step early. Worth d6+4 × base price. |
| R093 | Darkness | p.93 | No light source: -2 attack/defense/saves; no ranged weapons; no Search. Darkvision classes exempt. |
| R094 | Lantern rules | p.110 | A light must be carried in a hand (or lantern hook on a shield). Bearer killed/paralyzed/stoned → lantern drops; pickup costs 1 turn. Torch: 6 rooms/1 hour, melee-usable as light crushing weapon (extinguishes on a 1), +2 vs flammable. |
| R095 | Firearms | pp.86-87 | Handgun +2 (30gp), rifle +3 (90gp); roll 1 = explodes (1 damage, unusable; gnome can repair for gadget points); reload 2 turns; each firearm combat raises the next Wandering Monsters roll by 1. |
| R096 | Morale (Foes) | p.94 | d6: 1-3 flee, 4-6 keep fighting; once per encounter unless stated; modifiers per profile; never for Fight-to-Death profiles. |

## Part 7 — Reactions

| ID | Rule | Source | Mechanics |
| --- | --- | --- | --- |
| R100 | Reaction system | pp.101-102 | Every Foe profile lists a d6 Reactions table; one roll for a Minor group. Rolled only if the party waits (or is forced). Results: Offer food and rest (1 Food + 1 Life per PC, gone later), Peaceful (pass through, no treasure, persists), Ignore (pass; return → reroll; may steal 1 treasure item via Stealth Save on Ignore), Flee (vanish, no treasure; PCs get one +1 attack), Flee if Outnumbered, Bribe (pay or fight), Fight (test Morale below 50%), Fight to the Death (no Morale), Puzzle (Save vs L +L for wizards, one attempt, fail = they strike first), Quest (accept → Quest Table, complete → Epic Rewards), Magic Challenge (duel: spellcasting roll vs Foe L; win = walk away with treasure; lose = caster loses 1 Level, min 0 = can't cast; refusal = fight), Trade Information (25gp per Clue, clues kept; buy a Clue 100gp), Capture (non-lethal: 0-Life PC KO'd and dragged off; rescue via 3 Clues "Someone has been imprisoned" secret; ransom L×10gp if non-violent reaction), Blood Offering (bribe variant: pay 2 Life), Trial of Champions (d6-turn duel vs their Boss or a Minion at +2 levels; no allies/magic/ranged; winner decided by kill or most damage), Special (per-profile). |

## Part 8 — Dungeon generation

| ID | Rule | Source | Mechanics |
| --- | --- | --- | --- |
| R110 | Tiles | p.104 | Dungeon = tiles (rooms/corridors) on a ~20×28 grid. Corridor = 1 square wide; room = 2+. Content rolled as the party enters. |
| R111 | Starting room | p.104 | Roll d6 on the First Room list (6 shapes, p.149). No content roll for it. |
| R112 | Tile shapes d66 | pp.149-151 | 36 shapes: first die = tens. Shapes may be rotated/mirrored/truncated to fit; truncated tiles still count and still roll content; paper-edge connectors are dead ends; corridors may stretch 1-2 squares to connect. |
| R113 | Tile shape transcription | pp.149-151 | **DATA-FROM-DIAGRAMS**: shapes were transcribed visually from page images (no text layer). Corridor-marked (C) tiles: 11,12,13,14,26,32,33,42,45,51,53,55,62,63,65. All 36 + 6 starting tiles transcribed with footprints and door positions (to become `rulesets/expanded/tiles` in Phase 3). VALIDATION REQUIRED: re-render pages, verify each shape, and run generation-simulation tests (connectivity, door sanity) before IMPLEMENTED. |
| R114 | Tile Content Table (2d6) | p.152 | 2: Treasure (roll Treasure Table). 3: Treasure guarded by a Trap (Traps Table then Treasure). 4: corridor = empty/searchable; room = Special Events Table. 5: empty/searchable + Special Feature Table (dungeon) / Cavern Special Feature (caverns) / Secret Passage (fungal). 6: Vermin encounter (env table). 7: Minion encounter (env table). 8: corridor empty/searchable; room = Minions Table. 9: empty/searchable, or spend 2 Clues for a Secret Passage. 10: corridor empty; room = Weird Monsters Table. 11: Boss encounter (env table). 12: corridor empty; room = dragon's lair (Young/Cave/Fungal dragon per environment). |
| R115 | Movement between tiles | p.104 | Party enters via a door/opening of the current tile; new tile drawn connected to it. |
| R116 | Retracing steps | p.104 | Re-entering a visited tile: d6, 1 = Wandering Monsters (they strike first, rear targets; in a room the party spreads after a turn). Bribed Foes' tiles are safe. Gifts may be reclaimed by returning to fight. |
| R117 | Final Boss determination | p.105 | Each Major Foe encountered: d6 + 1 per Major Foe met so far this adventure (incl. gremlins); 6+ = Final Boss. Grid full → last tile holds the Final Boss. |
| R118 | Final Boss buff | p.105 | +1 Life, +1 attack, Reaction forced to Fight to the Death; gp treasure tripled or raised to 100gp (whichever is better); 1 magic item → 2. |
| R119 | Adventure completion | p.105 | Slaying the Final Boss is not enough: the party must exit the dungeon alive. Optional time/tile limits force the encounter. |
| R120 | Splitting the party | p.105 | Split groups each roll 1-in-6 Wandering Monsters when the main party does. |
| R121 | Fallen heroes | p.105 | 0 Life = dead. Allies may grab gear in combat (1 turn). Body-carrier: auto-hit by every attack, no Defense rolls, position 3-4. Items left on the body: 5-in-6 stolen. Resurrection Ritual (p.85): 1000gp at a temple between adventures; d6 ≤ dead PC's L succeeds (full health, afflictions cleared); L6+ auto; disintegration/acid/dimension-loss/devouring deaths prevent it. Replacement PC starts L1. |
| R122 | Petrification | p.106 | Petrified PC: equipment also stone (untouchable until restored); lantern drops. Restored by Blessing. All-party stone = adventure over. Carrying a petrified PC: 2 carriers, 2-in-6 Wandering Monsters. Rescue mission option: hire a L1 cleric (100gp + 100gp per Blessing) who fights/loots normally. |
| R123 | Searching | p.107 | Empty tile may be Searched once (mark S; corridors at -1). d6: [0-1→1, see OQ-1] Wandering Monsters; 2-4 nothing; 5-6 find hidden treasure / secret door / secret passage / 1 Clue. Halfling may spend 1 Luck to reroll. |
| R124 | Wandering Monsters | p.107 | d6: 1-2 Vermin table, 3-4 Minions table, 5 Weird table, 6 Boss table (reroll event-Foes and never-WM Foes like dragons). They strike first; no shield bonus on the party's first Defense roll. Corridor: attack positions 3-4. Room: standard distribution, hated classes first, then lowest-Life PCs. |
| R125 | Secret doors | p.108 | Draw a door; roll a connected tile; party may PEEK at its content before entering (and refuse). Treasure behind a secret door: gp value doubled. Entering: Foes are surprised; attacking immediately: their L -1 on turn 1 (min 1). d6 after finding: 6 = safe shortcut exit (no WM rolls through it). Halfling Luck may reroll. |
| R126 | Secret passages | pp.108,113,152 | Lead to a chosen other environment (dungeon ↔ caverns ↔ fungal grottoes). Found via Search 5-6, fungal Tile Content 5, or Tile Content 9 (2 Clues). |
| R127 | Hidden treasure | p.108 | (2d6+HCL) × (2d6+HCL) gp. Complication d6: 1-2 alarm (Wandering Monsters); 3-5 trap (rogue disarms: Save vs HCL+1; no rogue → random PC Save: fail 1 Life, roll 1 = 2 Life); 6 ghost (cleric Save vs HCL banishes; fail/no cleric → all lose 1 Life, ghost leaves). Halfling Luck reroll. |
| R128 | Clues | p.109 | 1 Clue per successful Search (5-6 option). Abstract, persists across adventures, transfers on the finder's death. 3 Clues → a Secret. |
| R129 | Doors (optional 2d6) | p.109 | 2 magically sealed (no bash; spellcaster roll vs door L, one attempt; a roll of 1 → caster takes 2 damage OR WM; +1 treasure behind); 3 iron (L = HCL+d6; no bash; lockpick or Lightning/Fireball; +1 treasure); 4 illusionary (3 Clues, or illusionist spellcasting roll vs HCL; one attempt per illusionist); 5-6 locked (L = HCL+d6); 7-10 unlocked; 11 trapped (unlocked; opening triggers HCL+d6 trap; rogue disarm attempt, fail → Save vs trap L or 1 damage); 12 lever door (no bash/pick; opens by spending 1 Clue or 1 gnome gadget point; withdrawal through it = no Foe strikes). Halfling Luck reroll. |
| R130 | Bashing | p.110 | PC Saves vs door L (+L for barbarians/warriors); repeatable, but a natural 1 on any attempt attracts WM. Lightning/Fireball destroys a door automatically (a destroyed door can't be nailed shut). |
| R131 | Lockpicking | p.110 | Rogue/assassin/kukla/gnome: Save vs door L; success opens; failure → must bash. |
| R132 | Traps trigger & disarm | pp.110,164 | Roll the environment's Traps Table. Rogue in position 1-2 may attempt disarm BEFORE it fires: Save vs trap L +L; success = neutralized; fail = fires (and the targeted rogue still gets its own Save/Defense vs the effect). |
| R133 | Resting | p.114 | Once per adventure, in a cleared room with cleared adjacent tiles and nail-able doors (bag of nails 4gp/door). Each PC recovers 1 Life OR 1 spent ability (spell slot, prayer, Trick/Luck point, rage attack…). 1-in-6 WM during rest, appearing behind a random door AFTER recovery (rest isn't cancelled): nailed door → party strikes first (even vs natural surprise); un-nailed → WM strike first. |
| R134 | Madness | pp.113-114 | Gained from specified sources (usually with a Save to avoid). 1+ Madness = paranoid (no equipment exchange with that PC). Madness > L (wizards: L+1) = insane, leaves forever. L1-4 PCs may take 2 damage instead of 1 Madness. Exiting a dungeon heals 1 Madness (once; requires ≥1 Major Foe defeated this adventure). Blessing heals 1. |

## Part 9 — Environments

| ID | Rule | Source | Mechanics |
| --- | --- | --- | --- |
| R140 | Environments | p.111 | Three: dungeons, caverns, fungal grottoes. Adventures start in a dungeon; secret passages switch environments. Same tile shapes/content table; environment-specific Foe/special/treasure tables. |
| R141 | Cavern entry | p.112 | Cavern openings have NO doors (resting impossible). On entering a cavern tile, d6: 1-2 = Special Feature (1 stalactites, 2 stalagmites, 3 boulders, 4 echo, 5-6 water pools). |
| R142 | Cavern features | p.112 | Stalactites: explosive 2H attack in this tile → 3-in-6 a stalactite falls (d6: 1-3 random PC — Defense vs HCL or 1 Life; 4-6 random Foe — attack at +HCL, 1 damage, may explode). Stalagmites: no explosions for PCs here. Boulders: +1 Defense vs ranged, -1 ranged attacks, Foe surprise +1, +1 Stealth. Echo: -1 Stealth, WM chance 2-in-6, explosive spell cast (d6=6) → free recast. Water pools: dip → d6 (1 contaminated: -1 Saves until Healing/Blessing; 2-4 nothing; 5-6 heal 1 Life, once per PC per adventure). |
| R143 | Searching in caverns | p.113 | d6: 1 WM, 2-4 empty, 5-6 = 1 Clue or Listen (pre-roll the tile beyond a chosen opening; rogue-type classes/halflings/shadows count 4 as 5). |
| R144 | Fungal grottoes | p.113 | Slippery: -1 Defense while fleeing (except ranger/rogue/acrobat/halfling/mushroom monk). "Doors" are giant mushrooms (L1 bash). Own tables for events/foes/traps. Search: 1 WM, 2-4 empty, 5-6 = 1 Clue or Rare Mushroom Table (mushroom monks/halflings count 4 as 5). |
| R145 | Animal companions | p.115 | Max 1 per PC, never higher L than master, can't open doors/read scrolls/use items, never gain Madness, only mounts carry gear. Roster: Hawk (L1, 1 Life, atk -1, def +2, +1 orientation, -1 surprise outdoors, 20gp), Owl (same stats; or +1 master spellcasting; kills d6 rat-Vermin; 20gp), Peacock (L0, atk -2, def 0, morale -2, +1 wooing; 10gp), Warhound (L1, 2 Life, atk +1, morale +1, takes master's hit on 5-6; party -1 surprise; 20gp; dog armor 50gp), Wildcat (L1, 2 Life, atk 0, def +1, kills d6 rats, refuses to fight on 1; 20gp), Warhorse (L2, 3 Life, atk +1, def +1, mount; rider pos 1 +1 attack; 30gp), Crow (L1, 1 Life, atk 0, def 0, +1 trap-disarm/puzzle saves; 15gp). |

## Part 10 — Traps (all tables are d6)

- **Dungeon traps (p.164):** 1 Dart (random PC Defense vs HCL+1, 1 Life; halfling reroll). 2 Poison gas (all Save vs HCL+2 poison, 1 Life; barbarians/halflings +L). 3 Trapdoor (leader Save vs HCL+3; -1 light armor, -2 heavy, +1 halfling/elf, rogue +L; fail = 1 Life, needs help out, alone = death). 4 Bear trap (leader Save vs HCL+3, +1 halfling/elf, rogue +L; fail = 1 Life, -2 vs further traps/trapdoors, -1 attack/defense until healed). 5 Wall spears (2 random PCs, Defense vs HCL+4, 1 Life). 6 Falling stone (position 4 PC, Defense vs HCL+4, 2 Life; armor yes, shield no).
- **Caverns traps (p.165):** 1 Stalactite (random PC Save vs HCL+2, 1 Life; all +½L, rogue +L, halfling +½L+reroll). 2 Rockslide (all Save vs HCL+2, 1 Life each; same bonuses, gnome/dwarf +L). 3 Hidden pit (leader Save vs HCL+1, 1 Life, needs help; 1 Clue → secret passage at the bottom). 4 Swinging log (all Save vs HCL in marching order; +½L, rogue +L, halfling +½L+reroll; stops at first failure = 2 Life, or all pass). 5 Toxic spores (random PC Save vs HCL+1 poison → -1 Saves for 6 rooms; monk immune, foresters/rogues +L; monk leading = ignored). 6 Rolling boulder (from front or back; d3 PCs Save vs HCL+1, 2 Life each; ends blocking one opening of the tile).
- **Fungal traps (p.166):** 1 Sleep spores (random PC Save vs HCL trap; released cloud: all Save vs HCL poison or fall asleep; all asleep = party dies; immune: mushroom/artificial/undead/elemental; halfling +L, others +½L). 2 Spore cloud (random PC Save vs HCL+1 then Save vs HCL+3 poison: 1 Life + coughing → 1-in-6 WM; immune as above; halfling/barbarian +L). 3 Slime patch (leader Save vs HCL → falls; 1-in-6 WM; if they come the fallen PC skips a turn). 4 Mycelium snare (random PC Save vs HCL+3; fail = one held object snatched forever). 5 Shrieking mushroom (leader: 4-in-6 WM; -2 halfling/forester, -1 rogue). 6 Cordyceps (random PC Save vs HCL+3 poison → mind-controlled: attacks the lowest-Life ally for 6 turns or until Blessing/Healing; victim defends vs the controlled PC's L; ally killed rises as an undead Boss: Tier+1 Life, L = dead PC's L).

## Part 11 — Treasure & items

| ID | Rule | Source | Data |
| --- | --- | --- | --- |
| R150 | Treasure Table (d6) | p.157 | 0(-): nothing. 1: d6gp. 2: dungeon/cavern 2d6gp; fungal: 2d6 rations OR 1 Rare Mushroom roll. 3: dungeon: random wizard scroll; fungal: bark (random druid spell) OR Rare Mushroom roll; cavern: prism (random illusionist spell). 4: dungeon: jewel 2d6×5gp; fungal: gem 2d6×5gp OR 2 Rare Mushroom rolls; cavern: gem 3d6×5gp. 5: dungeon: chest 3d6×10gp; fungal: gem 2d6×10gp OR 3 rolls; cavern: gem 3d6×10gp OR prism. 6+: dungeon: Dungeon Magic Treasure; caverns: Caverns Special Item; fungal: Dungeon Magic Treasure OR Rare Item. |
| R151 | Dungeon Magic Treasure (d6) | p.158 | 1 Wand of Sleep (3 charges; wizards/illusionists/elves; +L; resale 30gp/charge). 2 Ring of Teleportation (auto-pass one Defense roll by leaving combat; one use; resale 50gp unused / d6+1gp used). 3 Fools' Gold (auto-succeed next bribe; one use; 20gp). 4 Magic Weapon (+1 attack; type d6; permanent; resale 100gp + 2× cost). 5 Potion of Healing (full heal, free action; 1/adventure/PC; 100gp). 6 dungeon/cavern: Fireball Staff (2 charges; wizard-only; +L; 60gp/charge) — fungal: Rare Mushroom roll instead. |
| R152 | Rare Mushroom Table (d6) | p.159 | 1 Slumber Amanita (10gp; +Tier Sleep casting). 2 Puffball Smokebomb (5gp; free-action drop; party flees unattacked; mushroom/artificial foes unaffected). 3 Brown Cap Delight (15gp; 1 ration / 3 as bribe). 4 Phoenix Mushroom (15gp; +1 Defense+Saves 30 min/3 tiles, then 1 Life). 5 Purple Truffle (3-in-6 fake (d6gp); halfling reroll; real: 6d6gp). 6 Healer's Chanterelle (full heal; expires end of adventure). Non-magical; any PC; ingested ones not usable in combat. |
| R153 | Caverns Special Item Table (d6) | p.160 | 1 gem 3d6+3gp. 2 Glittering Crystal (lantern-glow pendant, hands-free, non-magic, 25gp). 3 Map Fragment (pre-roll next tile once; 30gp bribe value in caverns). 4 Adventurer's body (d6 gems ×10gp + 1 choice of: heavy armor, lantern, 2H weapon, bow, crossbow, Blessing scroll, random spell scroll, chicken-blood jar). 5 Miners' Ointment (once: ignore WM arrival or gremlins; non-magic; 20gp). 6 Miners' Amulet (position-1 wearer ignores 1 trap once/adventure; magic; 30gp). |
| R154 | Fungal Rare Item Table (d6) | p.161 | 1 choice: gem 2d6+2gp OR leafsteel armor (+2 Defense, counts as light, non-magical, lasts 3 adventures). 2 Xicthul's Cap (60gp; thrown d3 damage auto; thrower 1 damage). 3 Red Death (thrown: 1 damage OR -1 L, living foes; 1 turn). 4 Adventurer's body (rope + 2d6 rations + 2d6gp + 1 choice item). 5 Mushroom Gatherer's Basket (d6 white angels: ration + 2 Life heal each; 10gp after). 6 Morel Crusher (40gp; Morale roll at -1 once). |
| R155 | Quest Table (d6) | p.162 | 1 Bring me its head (kill a specific rolled Boss; deliver to giver's tile). 2 Bring me gold (d6×50gp treasure; gems in caverns; rare mushrooms in fungal; already owning doubles it). 3 I want it alive (subdue a Boss; rope needed; reroll subdual-immune). 4 Bring me that (fetch a rolled rare item; 1-in-6 per Major Foe slain; unused). 5 Let peace be your way (3 non-violent encounters; no return needed). 6 Slay all the Foes (fill the 20×28 grid, kill everything but the giver; no return needed). Completion → Epic Rewards roll; Lady in White (Event 3): return to her tile for 1 XP + Epic Reward. |
| R156 | Epic Rewards Table (d6) | p.163 | 1 Book of Skalitos (6 basic-spell scrolls in one book; destroyed if carrier dies of dragon breath; 650gp). 2 Gold of Kerrak Dar (1 Clue during a Search → 500gp chest). 3 Enchanted weapon (roll 2 dice take best until adventure end; magic-effective). 4 Shield of Warning (defense applies while surprised/fleeing/shield-ignoring foes; permanent; 200gp). 5 Arrow of slaying (auto 3 damage to a rolled Major Foe type; bow users; breaks after use; 3d6×15gp). 6 Holy symbol of healing (+2 cleric Healing; death + temple delivery = church-funded resurrection attempt). |
| R157 | Fiendish Foes Treasure (d6) | p.185 | 0(-): none. 1: 2d6×2gp. 2: 2d6×5gp. 3: random-spell scroll/bark/prism OR any non-magic weapon (2-in-6 silvered: +20gp, 2H +40gp). 4: gem 2d6×10gp. 5: jewelry 2d6×20gp. 6+: Fiendish Magic Treasure. |
| R158 | Fiendish Magic Treasure (d6) | p.186 | 1 Magic weapon (+1 on 1-4, +2 on 5-6; type d6). 2 Magic armor (+1 on 1-4, +2 on 5-6; type: 1-2 shield, 3 light, 4-5 heavy, 6 ring of protection). 3 d3+1 vials (each d6: 1-3 healing potion; 4-5 acid (thrown 1 damage, 1-in-6 splash back; no undead/golems; stops troll regen); 6 holy water). 4 Wand of Power (wizard-only, 2d3 charges, +1 spellcasting per charge, stackable; 20gp/charge). 5 Enchanted paint (draw real doors/equipment ≤15gp/8 rations; 1-in-6 per use to run out; 80gp). 6 Prayer beads (d6; cleric; each roll 1-3 nothing, 4-6 prayer not spent; bead destroyed each roll; 15gp each). |
| R159 | Special Feature Table (dungeon, d6) | p.153 | 1 Fountain/Pool (first one per adventure: all living PCs heal 1 Life). 2 Blessed Temple/Shrine (+1 attack vs undead/demons to a chosen PC until they kill one). 3 Armory (re-arm within class limits; re-weapon lost arms). 4 Cursed Altar (random PC -1 Defense until: solo-slaying a Major Foe / shrine visit / Blessing). 5 Statue (touch: 1-3 = awakens, fights to death as HCL+3 Artificial Boss, Tier+5 Life, Tier damage, spell/poison-immune, 3d6×10gp inside, may be Final Boss, 1 XP roll; 4-6 = breaks open 3d6×10gp, no XP). 6 Puzzle box (L = d6; Save vs L +L wizard/rogue per attempt, fail = 1 damage; success → Treasure roll). |
| R160 | Special Events (per environment, d6) | pp.154-156 | Dungeon (p.154): 1 Ghost (Save vs L4 fear: 1 Life lost OR 1 Madness, player choice; paladins immune, clerics +L). 2 WM raid (d6: 1-3 Vermin, 4 Minions, 5 Weird, 6 Boss; no Final Boss possible). 3 Lady in White (Quest offer; accept → Quest Table; complete → 1 XP + Epic Reward at her tile; one offer only). 4 Trap (dungeon table). 5 Wandering healer (10gp per Life, one meeting/adventure). 6 Wandering alchemist (healing potion 50gp, blade poison 30gp; once/adventure; reroll = trap instead). Caverns (p.155): 1 cave goblin scout (10gp → no surprise + +1 Saves until leaving caverns). 2 d6 cavemen explorers (HCL+3 Minions; 2 rations or fight). 3 Morlock spy (5gp → no morlock surprise). 4 trap (cavern table). 5 dwarf-only gem (d6×10gp; 1-in-6 WM risk). 6 dwarf miner (buy/sell gems 25gp; trade reveals next tile's content). Fungal (p.156): 1 halfling scout (10gp → no surprise +1 Saves in grottoes). 2 d6+2 mushroom-hunting cavemen (4 rations or 1 rare mushroom or fight; fed → they reveal a passage). 3 Spore cloud (all living Save vs HCL poison or 2 Life; halflings/barbarians +L; monks exempt). 4 trap + rare item roll. 5 monk-only danger sense (skip next trap/WM in grottoes). 6 merchant (equipment list +20% markup; buy/sell gems & rare mushrooms at resale; once/adventure, reroll = 4). |
| R161 | Fiendish Foes usage | p.180 | Recommended once 2+ heroes are L3. Replace the standard tables entirely or 50% of the time (d6: 1-3 standard, 4-6 Fiendish). Only Fiendish Foes roll on Fiendish treasure tables. |

## Part 12 — Monsters

**Stat format:** every entry = name, L formula (usually HCL+x, sometimes capped), category tag (Animal/Undead/Chaos/Elemental/Slime/Dragon/Were/Mushroom/Artificial), Life formula (Tier+y or HCL+y or flat for Fiendish), attack count, treasure modifier, special abilities, and a d6 Reactions table.

**Dungeon (pp.167-170):**
- Vermin (p.167): 1 3d6 Rats (HCL, max L4; wounded PCs 1-in-6 infection). 2 3d6 Vampire Bats (HCL, max L3; spellcasting -1). 3 2d6 Goblin Swarmlings (HCL+1, max L4; treasure -1, morale -1; dwarf +1). 4 d6 Giant Centipedes (HCL+1, max L3; hit → Save vs L2 poison or +1 Life). 5 d6 Vampire Frogs (HCL+3, max L5; treasure -1). 6 2d6 Skeletal Rats (HCL+2, max L5; immune sleep/disease/poison; non-firearm ranged immune; crushing +1; holy water kills 2).
- Minions (p.168): 1 d6+2 Skeletons or d6 Zombies (HCL+2, zombies max L6; never morale; holy water kills 1; crushing +1 vs skeletons; arrows -1 both). 2 d6+3 Goblins (HCL+2 max L6; treasure -1; dwarf +1; 1-in-6 surprise). 3 d6 Hobgoblins (HCL+3; treasure +1). 4 d6+1 Orcs (HCL+3 max L10; elf +1; fear-magic Morale each turn a spell kills one; no magic loot — d6×d6gp instead). 5 d3 Trolls (HCL+4 max L7; regenerate unless magic/fire/acid death or corpse hacked; dwarf present → fight to death). 6 2d6 Mushroom Men (HCL+2 max L10; hit → Save vs L3 poison +1 Life).
- Weird (p.169): 1 Minotaur (HCL+4; Tier+3 Life; 2 attacks; first defense vs it at -1; halfling Luck banned). 2 Iron Eater (HCL+2; Tier+3; 3 attacks; destroys metal items in order armor→shield→weapon→3d6gp; heavy armor gives no defense). 3 Chimera (HCL+4; Tier+5; 3 attacks; 2-in-6 per turn fire breath: all Save vs L4 fire, 1 Life). 4 Catoblepas (HCL+3; Tier+3; treasure +1; encounter-start Save vs L4 gaze, 1 Life). 5 Giant Spider (HCL+4; Tier+2; 2 attacks; 2 treasure rolls; hit → Save vs L3 poison, 1 Life; no fleeing until web burned). 6 Invisible Gremlins (event, no stats; steal d6+3 items in order magic→scrolls→potions→weapons→gems→gold 10gp; gremlin-repellant protects; steal-all → leave 1 Clue).
- Boss (p.170): 1 Mummy (HCL+4; Tier+3; 2 attacks; treasure +2; never morale; sleep/poison immune; slain PC rises as mummy next turn; flammable: fire/torch +2, oil +2 more). 2 Orc Brute (HCL+4; Tier+4; 2 attacks; treasure +1; elf +1; no magic loot). 3 Ogre (HCL+4; Tier+4; attacks inflict Tier+1 damage). 4 Medusa (HCL+3; Tier+3; treasure +1; encounter-start Save vs L4 gaze → stone; rogue +½L; Blessing restores 1). 5 Chaos Lord (HCL+5; Tier+3; 3 attacks; 2 treasure rolls +1; 2-in-6 of 1 Clue; d6 power: 1-3 none, 4 evil eye (Save vs L4 magic → -1 Defense until slain), 5 energy drain (Save vs L4 magic → -1 L), 6 hellfire (Save vs L6 magic → 2 Life, clerics +½L)). 6 Young Dragon (HCL+5; Tier+4; 2 attacks; 3 treasure rolls +1; sleep-immune; per turn d6: 1-2 fire breath (Save vs L6 breath, 2 Life, all +½L) else 2 random-target attacks; never WM; reactions include Sleep (party +2 first attack), Bribe (all gp min 100 or a magic item), Quest).

**Caverns (pp.171-174):** Vermin: Echo Bats (HCL+1 max L4, +1 L in echo tiles), Mud Centipede (HCL max L4; ignore unless pool inspected), Vengeance Cockroaches (HCL+1 max L3; escaped ones rejoin later), Stalactomimics (HCL+2; each auto-surprises once), Screaming Toads (HCL+3; spellcasting -1; 2-in-6 WM if not slain in one turn), Red Cave Spiders (HCL+2; 2+ damage → paralyzed limb d6 arm/leg). Minions: Morlocks (HCL+3; light-bearer +2 defense vs them), Cave Goblins (HCL+2 max L5; 2-in-6 surprise; heavy armor +1 defense vs their clubs), Cave Skeletons (HCL+2; 1-in-6 surprise; crushing +1; holy water kills 2), Rat Men of the Deep (HCL+2; pre-melee HCL+3 crossbow each; flails negate shields), Cave Orcs (HCL+3; first-turn defense -1; heavy armor +1 from turn 2), Cavemen (HCL+2 max 5; 2H clubs; fire-kill morale). Bosses: Manataur (HCL+4, HCL+3 Life, 3 attacks; every spell/prayer cast near it heals it +1), Caveman Champion (HCL+4, HCL+3 Life, 4 attacks, morale +1), Hoary Ogre (HCL+4, HCL+3 Life, 4 attacks; battle cry: Save vs L4 fear or lose explosions; paladins immune), Cavern Werebear (HCL+3, HCL+4 Life; regen 1/3 turns; silver +Tier), Land Siren (HCL+5, HCL Life min 3; Save vs HCL+2 magic → sleep; she gains +1 attack per sleeper; sleepers auto-hit; wake costs 1 turn, revived fight at -1), Fire Bear (HCL+2, HCL+4 Life, 2 attacks; opening fire breath: Defense vs HCL+3, 2 Life; re-breathes after any fire attack). Weird: Drillworm (HCL+4, HCL+3 Life; Tier damage; defense-1 → lose an item), Cavern Wraith (HCL+3, HCL+2 Life min 4; unhurt end-of-round → all lose 1 Life; holy water 2 dmg), Cavern Sludge (HCL+2, Tier+3 Life; 1 attack per PC; 4-in-6 surprise; Lightning → -2 L), Minosaur (HCL+4, HCL+4 Life, 3 attacks; +1 L first turn unless hit by ranged first; defense-1 → knocked down), Cornucopia of Chaos (HCL+6, Tier+2 Life; spawns d6 L2 Azure Gremlins per turn; untargetable in melee while gremlins live), Cave Dragon (HCL+5, HCL+4 Life, 2 attacks; tar spit first turn: Defense vs HCL+3 or tarred (eyes on 1: -1 all rolls); fire breath Save vs HCL+3, 1 Life).

**Fungal grottoes (pp.175-178):** Vermin: Spore Mites (HCL max L3; coughing -1 attack), Glowmaggots (HCL max L2; tile needs no lantern; food w/ L1 poison save), Fungus Leeches (HCL+1 max L4; hit → Save vs L4 poison +1 Life), Myco-Gnats (HCL max L4; spellcasting/ranged -1; Fireball kills all), Spore Toads (HCL+2 max L4; 1-in-6 per turn hallucinogenic belch), Boneworms (HCL+2 max L5; slain by them = no resurrection; holy water → Morale). Minions: Spore Men (HCL+2 max L8; poison save on hit), Halfling Mushroom Pickers (HCL+1 max L5; trade reaction), Moldspawn (HCL+3; disease save → -1 Life at encounter end), Myceliarchs (HCL+3; sleep-spore cloud at combat start: Save vs L3 magic or skip a turn), Cave Locusts (HCL max L5; armor defense doubled vs them; eat d6 rations), Toadstool Knights (HCL+4; cap-shield absorbs first hit; Warp Wood destroys caps). Bosses: Myco-Tyrant (HCL+4, Tier+3, 3 attacks; combat-start poison save vs L4, 1 Life), Fungus Hag (HCL+3, Tier+2, 2 attacks; hit → Tier damage + Save vs L3 magic → -1 attack), Spore Lord (HCL+5, Tier+3, 3 attacks; spore storm first turn: Save vs L5 poison → blinded -1/-1), Rot Ogre (HCL+4, Tier+4, 2 attacks; hit → Save vs L3 disease: 1 Life at combat end; halfling +L defense), Caplord Knight (HCL+4, Tier+4, 4 attacks; 2-in-6 non-magic hits bounce; Warp Wood → -2 L), Fungal Dragon (HCL+5, Tier+3, 4 attacks; 1-2 per turn spore breath: Save vs L5 poison, 1 Life). Weird: Shroom Colossus (HCL+5, Tier+5, 3 attacks × Tier damage; not in corridors; 0-Life PCs digested), Spore Swarm (HCL+3, Tier+3; fire +Tier vs it), Myco-Mimic (HCL+4, Tier+2, d3+1 attacks; auto-surprise; hit → Save vs L3 poison → paralyzed 1 turn), Hallucinogenic Horror (HCL+3, Tier+4; per turn 1 random PC Save vs L3 magic → attacks an ally), Fungus-infected Hydra (HCL+4, Tier+4 Life, Tier+4 attacks; -1 attack per Life lost; heads regrow in 2 turns unless fire), Spore Phantom (HCL+3, Tier+3, 2 attacks; hit → Save vs L3 magic: 1 Life at turn end; holy water 2 dmg; druids +L).

**Fiendish Foes (pp.181-184):** Vermin: Fiendish Spiders (HCL; no withdrawal without Fireball; end-of-combat poison save), Stirges (HCL+3; hit → 1 Life per turn until cleared), Giant Snakes (HCL+2; poison save +1 Life), Giant Toads (HCL+2; killer Save vs HCL poison unless ranged), Armored Skeletons (HCL+3; no crushing bonus, arrows -1), Goatmen (HCL+3; HCL+5 turn 1). Minions: Orc Looters (HCL+2; 3 treasure rolls -1), Cockatrices (HCL+3; hit → Save vs L2 petrification), Possessed Dwarves (HCL+3; 3+ on d6 rise again once), Gnolls (HCL+3; +1 L vs wounded PCs), Hobgoblin Blademasters (HCL+3; PC melee-1 → immediate counter), Chaos Slavers (HCL+4; pre-set L4 bear trap). Bosses: Chaos Lord (HCL+3, 7 Life, 3 attacks; d6 power: 1-4 evil eye, 5 energy drain, 6 hellfire (Save vs L5 magic, 2 Life, clerics +½L)), Skeletal Demon (HCL+4, 8 Life, 2 attacks; each PC damage → 1 armored skeleton joins), Hobgoblin Leader (HCL+4, 8 Life, 2 attacks; per attack 3-in-6 blademaster arrival), Wraith (HCL+4, 6 Life; 2-in-6 lanterns out; hit → Save vs L4 magic: -1 L; only magic/silvered/spells/holy water/2+-damage hits affect it), Large Troll (HCL+5, 7 Life, 2 attacks; crushing -1 vs it; regen 1/turn unless fire/acid/hacked), Young Red Dragon (HCL+6, 8 Life, 2 attacks, 4 treasure +1; first-turn breath: Save vs L7 breath → d3 damage; never WM). Weird: Doppelganger (HCL+2, 5 Life; mimics a random PC; per turn others Save vs L4 confusion), Scimitar Monster (HCL+5, 12 Life, 2 attacks, 2 treasure +1; sleep-immune), Green Slime (HCL+3, 8 Life, 3 attacks; hit → Save vs L4 disease: future damage +1; slain PCs become slimes), Acid Cube (HCL+3, 6 Life; 3-in-6 surprise; per-turn Save vs L2 engulf (L4 if melee'd it); engulfed can't attack), Flesh Golem (HCL+4, 8 Life, 2 attacks; crushing/spells immune except fire; fists 2 damage on defense-1), Lurking Mantlebeast (HCL+3, 5 Life; ceiling drop: 2-in-6 spot (4 with rogue); failed Save vs L3 → helpless, 1 Life per turn until slain).

## Part 13 — Equipment (pp.81-88)

Base prices (resale = half unless stated): Bow 15 (2H-style use; 1 pre-melee shot; ranger/elf outdoors 2), Hand weapon 6, Light weapon 5 (-1), Sling 4 (2H-style; crushing), Crossbow 15 (+1, reload 1 turn), Two-handed weapon 15 (+1; net -1 in narrow corridors), Shield 5 (+1 Defense, -1 Stealth), Light armor 10 (+1 Defense, -1 swim), Heavy armor 30 (+2 Defense, -1 Stealth, -2 swim/climb), Lantern 4, Torch 1/dozen (6 rooms/1 hour), Holy Water 30/vial (max 1/PC/adventure), Rope 4 (+1 climb, binds), Bandage 5 (1 Life, 1/PC/adventure, not in combat), Healing potion 100 (full heal, 1/PC/adventure), Food ration 1 (max 10; 1 Life lost per day without food), Lantern hook 2, 10' pole 2 (+1 trap saves except area/random traps; reroll search 2-4), Flask of oil 10 (flammable target: fire +2), Scroll of Blessing 100, Resurrection Ritual 1000 (service), Bag of nails 4 (resting), Silvering 20/40 (werecreatures +1), Gilding 50 (elementals +2), Amulet 15 (1 Luck, one use), Talisman 10 (+1 one Save, declared before rolling), Herbal tonic 20 (removes paralysis), Scroll tube 4 (protects 1 scroll), Handgun 30 (+2), Black-powder rifle 90 (+3), Gremlin repellant 5/dose, Wolfsbane 10/bunch (Morale roll, thrown), Good lock-picks 25 (+1), Throwing star 2 (-1; 2 per turn), Stake 6 (vampire: counts as hand weapon; holy-water-dipped = +1 damage vs vampire), Crowbar 10 (+1 bash), Berserker's mushroom 15 (+1 melee attack, 1 Life after).
Ammo (optional): 12 arrows/shot per quiver/bag; replacement 6gp/20gp; 1 ammo per Foe slain; max 4 carried.

## Part 14 — Experience & advancement

| ID | Rule | Source | Mechanics |
| --- | --- | --- | --- |
| R170 | XP roll | p.117 | d6 > current L (6 always succeeds) → +1 Level. Level-up: +1 current and max Life, immediate during the adventure, all level-derived bonuses update (spell slots etc.). No XP roll to a PC that just leveled (unless they're the only survivor). XP rolls are normally spent immediately; stored only for tier switches. |
| R171 | Classical system | p.117 | 1 XP per 10 Minor-Foe ENCOUNTERS; 1 per Secret revealed; 1 per Major Foe; +1 for the Final Boss. |
| R172 | Slow and Sure | p.117 | No rolls: 1 Level to one surviving PC per successful adventure. |
| R173 | Old School | p.118 | Tally XP: Minor Foes = sum of their L ×10 (Vermin halved); Major Foes = L×10 + 5 per Life; +1 XP per gp collected. Level-up/skill costs (Tier+2)×100. No same PC twice in a row (unless sole survivor). Non-combat XP rolls → Tier×100. |
| R174 | Slower Advancement | p.118 | Classical earning; store XP; spending XP = target level + XP roll (+1 per extra XP); tier training costs 500/1000/2500/5000gp (T2-5); skills cost current L XP + 100×L gp. |
| R175 | Expert skills | pp.22,57,117 | Available L5+; learned via XP roll; class lists live in supplements (out of core scope); several in-book expert skills are captured in Part 3. |

## Part 15 — Adventure structure

- Goal: enter, generate, survive, slay the Final Boss, exit alive (p.105).
- Quests via Lady in White / Quest-reaction Foes → Quest Table → Epic Rewards (pp.162-163).
- Secrets economy: Clues → Secrets (pp.123-124).
- Session length ~45 min (p.2).
- Between adventures: pay tithes (paladin), repair kuklas, shop, resurrect, heal Madness, druid/elf/wizard re-prepare spells, refresh Trick/Luck/Panache/rage/prayers.

## Part 16 — Open questions & transcription risks

| ID | Question | Where | Risk handling |
| --- | --- | --- | --- |
| OQ-1 | Search Table shows "0-1" on a d6 (p.107) — almost certainly a misprint for "1". | p.107 | Treat 1 = Wandering Monsters; confirm against the printed page with the owner. |
| OQ-2 | Tile shapes transcribed from page IMAGES (pp.149-151); a few diagrams partly covered by decorative art (23, 33, 35, 62, 63 door positions). | pp.149-151 | Re-render + verify visually before IMPLEMENTED; validate with generation-simulation tests. |
| OQ-3 | p.147 references a "Backstabbing" rogue skill not defined in this book (supplement content). | p.147 | Ignore for core build; note in data pack. |
| OQ-4 | Fiendish Foes use flat Life values (7/8/12) rather than Tier formulas — deliberate for L3+ parties; treat as data. | pp.183-184 | None. |
| OQ-5 | "Tier" in Life formulas means the tier NUMBER (1-5); verified by the p.94 ogre example. | p.94 | None. |

## Part 17 — Release 0.1 (playable prototype) scope mapping

Required for the first playable dungeon loop — all RESEARCHED, ready to implement:
- Core resolution R001-R011; character R020-R028; the 8 core classes (Warrior, Barbarian, Elf, Dwarf, Cleric, Rogue, Wizard, Halfling); XP R170-R171.
- Generation R110-R116, R123-R124, R129-R133; Final Boss R117-R119.
- Encounters: tile content R114; Dungeon monster tables (Part 12); Reactions (Part 7).
- Combat R070-R096; treasure R150 (dungeon rows).
- Magic: basic 6 spells (R044) + cleric prayers (R050); scrolls R048.
Deferred to Release 0.5: caverns/fungal environments, druid/illusionist lists, expert skills, quests, fiendish foes, animal companions, stealth edge cases beyond R060-R062.
