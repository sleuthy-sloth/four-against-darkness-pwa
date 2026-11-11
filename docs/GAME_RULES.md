# Game Rules — Implementation Reference (FADEE)

Original-language summary of how a Four Against Darkness (Expanded Edition) adventure runs, written for the engine team. Every claim is page-cited; full detail lives in RULES_VERIFICATION.md. No book prose is reproduced here.

## The loop

1. **Assemble** a party of four L1 adventurers (one class each; FADEE pp.7-8, 19-66).
2. **Generate** the dungeon one tile at a time: d6 starting room, then d66 tile shapes connected through doors/openings (pp.104, 149-151). Roll 2d6 for tile content as the party steps in (p.152).
3. **Resolve** whatever the tile holds: Foe encounters, events, traps, special features, treasure (pp.152-166).
4. **Fight** Foes: PCs roll everything; Foes have a Level (L) the rolls are made against (pp.2, 90-99).
5. **Level up** with XP rolls, collect loot, manage Life, spells, Madness (pp.113-118).
6. **Find and slay the Final Boss** (d6 + one per Major Foe met so far, on 6+; p.105), then **walk out alive**. That ends the adventure (p.105).

## Resolution primitives

- Everything is a d6 roll plus modifiers against a target (d8/d10/d12/d20 appear only at higher tiers, pp.2, 5).
- **Attack**: roll ≥ target (Foe's L). **Defense**: roll > Foe's L. **Save**: roll ≥ the Save's stated target (p.77). Foes never roll (p.2).
- **Explosion**: rolling the die's highest face adds another die, cumulatively (p.5).
- **HCL** = highest character level; Foe/hazard L = HCL + modifier, locked at first meeting (p.3).
- **Tier** (1-5) keys die type and several +Tier bonuses (p.5).

## Characters

- Each PC has: class, level, Attack/Defense bonuses, Life (class formula, e.g. L+7), traits, class abilities, equipment, gold (pp.7, 19-66).
- 20 classes in this book; the 8 core ones (warrior, barbarian, elf, dwarf, cleric, rogue, wizard, halfling) anchor the Saves tables; others "Save as" one of them (pp.7-8). Class data table: RULES_VERIFICATION Part 3.
- Hands matter: two-handed weapons and bows occupy both; casters need one free hand; shields take a turn to equip (p.110).
- Level-ups are instant during play: +1 max and current Life plus every L-derived bonus (p.117). Four interchangeable XP systems exist; the Classical one is default (pp.117-118).

## Combat flow

1. On meeting Foes the party may strike immediately or watch their Reaction (pp.90, 101-102).
2. Surprise rolls (X-in-6 per Foe) can hand the first turn to the Foes (p.90).
3. Ranged attacks and spells always go before melee — Foes' first if they surprised the party (pp.91, 146).
4. PCs act in any order, one action each; then surviving Foes attack — the PCs make Defense rolls against the Foes' L (p.96).
5. Damage: 1 per hit by default; every L-multiple the roll exceeds adds damage (p.94). Minor Foes (Vermin/Minions) have 1 Life and die in numbers; Major Foes (Weird/Bosses) have Life pools and weaken below half Life (p.94).
6. Groups of Minors test Morale under half strength (d6: 1-3 flee); "fight to the death" profiles never do (p.94).
7. End combat by killing all, fleeing, or withdrawing through a door (pp.97-98).

## Dungeon generation pipeline (engine order)

1. Roll first room (d6, p.149), no content.
2. Party picks an exit → roll d66 tile shape (pp.104, 149-151), draw it connected, roll 2d6 content (p.152).
3. Content routes to: treasure, trap+treasure, special events (rooms only), special features (empty rooms), Vermin/Minion/Weird/Boss encounter per environment table, dragon lair, or empty-searchable (p.152).
4. Doors: optional 2d6 table with seven special door types (p.109); bashing/lockpicking rules p.110.
5. Empty tiles may be Searched once (d6, p.107). Wandering Monsters appear on retraces, restings, bashing noise, hidden-treasure alarms, and some events (pp.104, 107, 108, 110, 114).
6. Every Major Foe rolls for Final Boss status (p.105).

## Environments

Dungeons, caverns, fungal grottoes share tile shapes and the content table but have their own Foe tables (Vermin/Minion/Weird/Boss × each), traps, events, and special rules — caverns have terrain features and no doors; grottoes are slippery and doorless (mushroom walls) (pp.111-113). Secret passages move between them (pp.108, 152).

## Magic

- Spellcasting roll d6 + L vs target L; failure wastes the spell; Magic Resistance demands a second roll first (p.67).
- Spellcasters memorize into slots before each adventure (wizard L+2, elf L, druid 2+L, illusionist L+3, gnome's single daily spell) (pp.32-34, 42, 64).
- Lists: 6 basic wizard spells (pp.68-69), 12 druid (pp.70-72), 12 illusionist (pp.73-75). Scrolls (parchment/bark/prism) are cast by anyone but barbarians (p.76). Clerics pray instead of casting (pp.28, 67).
- 3 Clues reveal a Secret from a ten-entry list (pp.123-124).

## Death & recovery

- 0 Life = dead; a Major Foe at 0 Life can instead be subdued via -1 attacks (pp.99, 105).
- Bodies can be carried (the carrier is defenseless), looted (5-in-6 items left behind are stolen), blessed back from stone, or resurrected with a 1000gp ritual (d6 ≤ level) (pp.85, 105-106).
- Resting once per adventure heals 1 Life or renews 1 spent ability, behind nailed doors, with a 1-in-6 Wandering Monster roll (p.114).
- Madness above Level (wizards: L+1) removes a PC permanently (pp.113-114).

## Engine implementation notes

- All randomness through the seeded PRNG; every table above is data, not code.
- Encounter selection = environment → tier table (vermin/minion/weird/boss) → d6 entry → quantity formula (e.g. "d6+1", "2d6") from the profile.
- Foe profile shape: L formula, Life formula, attack count, treasure modifier, special abilities, d6 reactions table (pp.167-186).
- Reactions drive the "wait" decision; Bribe amounts are per-profile gp (pp.101-102).
- The initiative flowchart and the attack/defense modifier summaries on pp.146-148 are the canonical resolution order — implement from those pages first.
