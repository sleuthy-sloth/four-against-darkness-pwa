# Rules Verification

This document tracks the implementation status of all Four Against Darkness Expanded Edition mechanics.

**IMPORTANT**: All mechanics are marked UNVERIFIED. The Expanded Edition rulebook is not available on this host. No specific game data has been implemented or invented.

## Verification Database

| Rule ID | Rule Name | Source | Preconditions | Inputs | Resolution | Outputs | Exceptions | Test Cases | Status |
|---------|-----------|--------|---------------|--------|------------|---------|------------|------------|--------|
| CHAR-001 | Character Creation | Book p.? | New campaign | Class selection, name | Generate 4 characters with appropriate stats | Party of 4 characters | None known | Create party | UNVERIFIED |
| CHAR-002 | Character Classes | Book p.? | Character creation | Class type | Assign class-specific abilities/stats | Character with class features | Class restrictions | Create each class | UNVERIFIED |
| CHAR-003 | Character Statistics | Book p.? | Character creation | Dice rolls | Roll or generate stats | Character attributes | None known | Stat generation | UNVERIFIED |
| CHAR-004 | Hit Points | Book p.? | Class/level | Constitution, level | Calculate max HP | Character HP values | Race/class bonuses | HP calculation | UNVERIFIED |
| CHAR-005 | Character Advancement | Book p.? | Level up | XP total | Determine new level | Level + stat improvements | None known | Level progression | UNVERIFIED |
| DUNGEON-001 | Dungeon Generation | Book p.? | Adventure start | None | Generate dungeon layout | Dungeon map with rooms | None known | Dungeon generation | UNVERIFIED |
| DUNGEON-002 | Room Dimensions | Book p.? | Room generation | Environment | Determine room size | Room width/height | Environment rules | Room dimensions | UNVERIFIED |
| DUNGEON-003 | Door Generation | Book p.? | Room creation | Room size | Place doors on walls | Doors array | Secret/locked doors | Door placement | UNVERIFIED |
| DUNGEON-004 | Corridor Connections | Book p.? | Door adjacency | Door positions | Connect adjacent doors | Corridor paths | Dead ends | Map connectivity | UNVERIFIED |
| DUNGEON-005 | Room Classification | Book p.? | Room characteristics | Environment, contents | Assign room type | Room category | Special conditions | Room types | UNVERIFIED |
| ENCOUNTER-001 | Encounter Tables | Book p.? | Explored room | Environment | Roll on table | Monster list | Room type modifiers | Encounter rolls | UNVERIFIED |
| ENCOUNTER-002 | Monster Selection | Book p.? | Encounter result | Table entry | Select monster | Monster instance | Special rules | Monster spawn | UNVERIFIED |
| ENCOUNTER-003 | Monster Quantity | Book p.? | Monster selected | Monster type | Determine count | Monster instances | Equipment, conditions | Monster count | UNVERIFIED |
| COMBAT-001 | Combat Initiation | Book p.? | Encounter starts | Party/monster stats | Determine order | Turn order list | Surprise, etc. | Combat start | UNVERIFIED |
| COMBAT-002 | Attack Resolution | Book p.? | Attacker action | Weapon, target | Dice roll + modifiers | Hit/miss | Cover, range | Attack roll | UNVERIFIED |
| COMBAT-003 | Damage Calculation | Book p.? | Hit confirmed | Damage dice, mods | Roll and apply | Damage value | Armor, resistances | Damage roll | UNVERIFIED |
| COMBAT-004 | Monster AI | Book p.? | Monster turn | Monster stats | Determine action | Attack/spell/move | None known | AI decisions | UNVERIFIED |
| TREASURE-001 | Treasure Tables | Book p.? | Room cleared | Room/environment | Roll on treasure table | Items, gold | Room type | Treasure roll | UNVERIFIED |
| TRAP-001 | Trap Detection | Book p.? | Enter room | Perception, class | Check for traps | Trap found/missed | Class abilities | Trap detection | UNVERIFIED |
| TRAP-002 | Trap Triggering | Book p.? | Trap triggered | Movement, action | Check reflex/save | Damage, effect | Multiple saves | Trap resolution | UNVERIFIED |
| SPELL-001 | Spell Casting | Book p.? | Spell available | Spell, resources | Resolve spell | Effect applied | Range, targets | Spell cast | UNVERIFIED |
| EQUIPMENT-001 | Equipment Rules | Book p.? | Item use | Item type | Apply item effect | State change | Weight, slots | Item use | UNVERIFIED |
| EVENT-001 | Event Resolution | Book p.? | Event occurs | Event type | Apply event | State change | Special conditions | Event outcome | UNVERIFIED |

## Classes (UNVERIFIED - awaiting book)

All character classes from Expanded Edition are unverified:

| Class | Status |
|-------|--------|
| Fighter | UNVERIFIED |
| Wizard | UNVERIFIED |
| Rogue | UNVERIFIED |
| Cleric | UNVERIFIED |
| [Additional classes from Expanded Edition] | UNVERIFIED |

## Encounters (UNVERIFIED - awaiting book)

Per-environment encounter tables need verification:

| Environment | Status |
|-------------|--------|
| Cave | UNVERIFIED |
| Dungeon | UNVERIFIED |
| Temple | UNVERIFIED |
| Ruins | UNVERIFIED |
| [Other environments] | UNVERIFIED |

## Monsters (UNVERIFIED - awaiting book)

No monster data has been implemented. All monsters from Expanded Edition are unverified.

| Monster Category | Status |
|-----------------|--------|
| Humanoids | UNVERIFIED |
| Animals | UNVERIFIED |
| Constructs | UNVERIFIED |
| Undead | UNVERIFIED |
| [All specific monsters] | UNVERIFIED |

## Spells (UNVERIFIED - awaiting book)

Spell mechanics need verification:

| Spell System | Status |
|--------------|--------|
| Wizard Spells | UNVERIFIED |
| Cleric Spells | UNVERIFIED |
| Spell Levels | UNVERIFIED |
| Spell Effects | UNVERIFIED |

## Notes

- The Expanded Edition rulebook is not available on this host
- No game mechanics have been implemented or invented
- All data structures exist as empty schemas awaiting verified data
- Implementation will pause on rules until the book is accessible
- Focus remains on Phase 1 app shell structure until then