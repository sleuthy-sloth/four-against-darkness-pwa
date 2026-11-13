/**
 * The 12 non-core classes — FADEE pp.19-62, transcribed to data from
 * docs/RULES_VERIFICATION.md Part 3 (table + per-class mechanics).
 * All descriptions are original paraphrases; numbers are game data.
 *
 * DATA-ONLY: these classes are NOT playable in the current build. Only the
 * core 8 in coreClasses.ts (Warrior, Barbarian, Elf, Dwarf, Cleric, Rogue,
 * Wizard, Halfling) have engine behavior. Nothing here is read by the
 * engine yet; this pack exists so the full 20-class table is verified and
 * available when a class is promoted to playable.
 *
 * The row type is deliberately lighter than ClassDef: it has NO traitTable
 * (the 6-entry d6 trait tables live only in the book — see the "Trait
 * tables" note at the end of Part 3 — and the book text is not available
 * here) and NO startingEquipment (the ledger table lists starting wealth
 * only). `spellSlots` is the same base as in coreClasses: total slots =
 * base + (L - 1), so Druid 2+L -> 3, Gnome L -> 1, Illusionist L+3 -> 4.
 * Armor/weapon tokens reuse the core vocabulary ('light', 'heavy',
 * 'shield', 'hand', 'twoHanded', 'lightRanged', 'ranged'); 'leafsteel',
 * 'clockwork', and 'firearms' are book terms kept verbatim — the engine
 * has no vocabulary for them yet. Conditional bonuses that a single token
 * cannot express live in `notes` and `abilities`.
 */

export interface ExpandedClassRow {
  id: string
  name: string
  source: string
  attackBonus: string
  defenseBonus: string
  lifeFormula: string
  armorAllowed: string[]
  weaponsAllowed: string[]
  savesAs: string
  stealthBonus: string
  startingWealth: string
  /** Base spell slots; total slots = base + (L - 1), as in coreClasses. */
  spellSlots: number
  traitsToPick: number
  /** Max copies per party, where the book caps it. */
  maxPerParty?: number
  abilities: string[]
  /** Conditional bonuses a single token cannot express. */
  notes?: string
}

export const EXPANDED_CLASSES: ExpandedClassRow[] = [
  {
    id: 'acrobat',
    name: 'Acrobat',
    source: 'FADEE pp.19-21',
    attackBonus: 'halfL',
    defenseBonus: 'L',
    lifeFormula: 'L+3',
    armorAllowed: [],
    weaponsAllowed: ['light', 'lightRanged'],
    savesAs: 'rogue',
    stealthBonus: 'L',
    startingWealth: 'd6',
    spellSlots: 0,
    traitsToPick: 1,
    abilities: [
      'Trick points: L+3 per adventure (1 pt per trick; rest recovers Tier points + 1 Life). (FADEE pp.19-21)',
      'Tricks: reroll a failed non-magical Save; swap marching-order places; distract a Foe (-Tier L, not Weird/Vermin, not cumulative); unarmed kicks without the -2 (Flip Kick) or vs 2 Minors at -1 (Double Kick); escape melee unhit; knife throw (+Tier, ignores ranged light -1); street performance (d6 gp per point, Save vs L6, fail = fine or Tier damage); Vaulting Strike (once/combat, first turn, not surprised: +L attack, fail → -2 defense on Foes\' first turn + must be attacked). (FADEE pp.19-21)',
    ],
    notes: 'Saves: rogue, with swim/climb/fall +L and traps +½L.',
  },
  {
    id: 'assassin',
    name: 'Assassin',
    source: 'FADEE pp.22-23',
    attackBonus: 'L',
    defenseBonus: '0',
    lifeFormula: 'L+3',
    armorAllowed: ['light'],
    weaponsAllowed: ['light', 'hand', 'twoHanded', 'lightRanged', 'ranged', 'firearms'],
    savesAs: 'rogue',
    stealthBonus: 'L',
    startingWealth: '5d6',
    spellSlots: 0,
    traitsToPick: 1,
    abilities: [
      'Hide in Shadows (1 turn, Stealth Save +L vs Foes\' L; fail = free Foe attack; success → next attack on the marked LIVING target does TRIPLE damage; one assassin hidden at a time; artificial/undead/oozes/spirits immune unless 1 XP spent at L4). (FADEE pp.22-23)',
      'Any weapons incl firearms; rogue-item access; disarm/picklocks WITHOUT the rogue +L. (FADEE pp.22-23)',
    ],
    notes: 'Saves: rogue, with disguise +L.',
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    source: 'FADEE pp.26-27',
    attackBonus: 'halfL',
    defenseBonus: 'halfL',
    lifeFormula: 'L+7',
    armorAllowed: ['light', 'heavy', 'shield'],
    weaponsAllowed: ['light', 'hand', 'twoHanded', 'lightRanged', 'ranged'],
    savesAs: 'warrior',
    stealthBonus: '0',
    startingWealth: 'd6',
    spellSlots: 0,
    traitsToPick: 1,
    maxPerParty: 1,
    abilities: [
      'Max 1 per party. Non-bandage healing only allowed if no other PC is wounded. Scroll-casts as L1 wizard. (FADEE pp.26-27)',
      'L5+ expert skills: Sacrifice Defense (take an ally\'s combat damage in full on a successful defense roll), Shield Sacrifice (destroy shield to let an ally reroll a failed Save vs trap/danger). (FADEE pp.26-27)',
    ],
    notes: 'Attack: +½L melee, +Tier ranged.',
  },
  {
    id: 'druid',
    name: 'Druid',
    source: 'FADEE pp.32-33',
    attackBonus: 'halfL',
    defenseBonus: '0',
    lifeFormula: 'L+3',
    armorAllowed: ['light', 'leafsteel', 'shield'],
    weaponsAllowed: ['light', 'lightRanged'],
    savesAs: 'cleric',
    stealthBonus: 'halfL',
    startingWealth: '2d6',
    spellSlots: 3,
    traitsToPick: 1,
    abilities: [
      '2+L druid spell slots, +L casting; learns Expert druid spells at L5+ (quest reward instead of epic reward / 3 Clues or 1 XP roll / burning an Expert scroll). (FADEE pp.32-33)',
      'Non-druid scroll casting at +½L (min +1); may not LEARN non-druid spells. Free animal companion (1gp food offering; 1 Madness if it dies; replaced in wilderness). (FADEE pp.32-33)',
    ],
    notes: 'Weapons: light, javelin, short bow, sling.',
  },
  {
    id: 'gnome',
    name: 'Gnome',
    source: 'FADEE pp.36-39',
    attackBonus: '0',
    defenseBonus: 'halfL',
    lifeFormula: 'L+4',
    armorAllowed: ['light', 'leafsteel', 'clockwork'],
    weaponsAllowed: ['light', 'hand', 'lightRanged', 'ranged'],
    savesAs: 'rogue',
    stealthBonus: 'halfL',
    startingWealth: '4d6',
    spellSlots: 1,
    traitsToPick: 1,
    abilities: [
      'L spell slots but a single chosen illusionist spell, memorized daily via a contraption. (FADEE pp.36-39)',
      'Gadget points L+6 per adventure: one-shot ranged gadget (+L to one attack), open lock/disarm (1 turn, Save vs L + L + points spent), free an ally from bonds, portable door (create/remove/lock a door), grenade (points-1 damage, max 4; in melee allies each lose d6 capped by points), gadget-enhanced melee weapon (+L, disarm-immune), clockwork armor (light armor; 1 pt → Defense +3 for the encounter; 25gp to make; counts as 2 items for gremlin theft). (FADEE pp.36-39)',
    ],
    notes: 'Weapons include handgun and clockwork weapons.',
  },
  {
    id: 'illusionist',
    name: 'Illusionist',
    source: 'FADEE pp.42-43',
    attackBonus: '0',
    defenseBonus: '0',
    lifeFormula: 'L+2',
    armorAllowed: [],
    weaponsAllowed: ['light', 'lightRanged'],
    savesAs: 'wizard',
    stealthBonus: 'halfL',
    startingWealth: '3d6',
    spellSlots: 4,
    traitsToPick: 1,
    abilities: [
      'L+3 slots, illusionist list only (plus any spell with Illusion/Phantasm/Glamour/Mirage-type name from other lists). (FADEE pp.42-43)',
      'Distracting Lights (1 turn, spellcasting roll vs Foe L: -Tier L for the encounter; no undead/artificial/elemental; all Minor Foes in group; fails = no retry this encounter; uses no slot). Continual Light (hands-free lantern). Illusionary Knife Throw (1 slot: +Tier+L attack, no light-weapon penalty, optional subdual without the -1). (FADEE pp.42-43)',
    ],
    notes: 'Attacks: spells at +L.',
  },
  {
    id: 'kukla',
    name: 'Kukla',
    source: 'FADEE pp.44-48',
    attackBonus: '0',
    defenseBonus: 'halfL',
    lifeFormula: 'L+5',
    armorAllowed: [],
    weaponsAllowed: ['light', 'lightRanged'],
    savesAs: 'rogue',
    stealthBonus: 'halfL',
    startingWealth: '3d6',
    spellSlots: 0,
    traitsToPick: 1,
    abilities: [
      'Unique/artificial construct. Immune: poison, disease, petrification, mind control, vampirism, energy drain, paralysis, lycanthropy. Cannot eat/drink → no food magic, herbs, or potions (green ring\'s revive fluid excepted); healing has NO effect — repaired between adventures at 1gp/Life (or 10gp spare parts = 4 Life, carried by allies). Unarmed attacks count as magic weapons. (FADEE pp.44-48)',
      'Green ring: once-ever revival (1 turn, then d6 turns to full Life). Red ring: once-ever ingestive poison kill (vs anything that accepted a food bribe/bite). Secret torso compartment (knife, 5 rations, 10 small items, 100gp; unstealable while alive). Prehensile hair (+½L lockpicks via hair, rope use, extra hand for lantern/wand, not weapons). +L social saves with children; cannot woo/seduce. No smell/taste (auto-fail those saves). Madness > L = soul departs (lifeless doll). L5+ Doll Army skill (½L dolls of 1 Life). (FADEE pp.44-48)',
    ],
    notes: 'Attack: +1 flat with light slashing weapons; unarmed -1.',
  },
  {
    id: 'lightGladiator',
    name: 'Light Gladiator',
    source: 'FADEE pp.49-50',
    attackBonus: 'halfL',
    defenseBonus: 'halfL',
    lifeFormula: 'L+5',
    armorAllowed: ['light', 'leafsteel'],
    weaponsAllowed: ['light'],
    savesAs: 'warrior',
    stealthBonus: '0',
    startingWealth: 'd6',
    spellSlots: 0,
    traitsToPick: 1,
    abilities: [
      'Two-weapon fighting (2 attacks/turn with a light weapon in each hand) OR forgo 1 attack to parry (+1 defense vs melee). (FADEE pp.49-50)',
      'At L3: free Gladiator expert skill (+1 attack/defense in Trial of Champions). Explosive defense: add the overshoot to the next attack on that Foe (declare after rolling). (FADEE pp.49-50)',
    ],
    notes: 'Attack: +½L with light hand weapons only. Saves: warrior or rogue, per case.',
  },
  {
    id: 'mushroomMonk',
    name: 'Mushroom Monk',
    source: 'FADEE pp.51-54',
    attackBonus: 'L',
    defenseBonus: 'halfL',
    lifeFormula: 'L+4',
    armorAllowed: [],
    weaponsAllowed: ['light', 'hand', 'twoHanded', 'lightRanged', 'ranged'],
    savesAs: 'monk',
    stealthBonus: 'halfL',
    startingWealth: 'd6',
    spellSlots: 0,
    traitsToPick: 1,
    maxPerParty: 1,
    abilities: [
      'Max 1/party. Flurry of Blows = Tier attacks/turn (unarmed/stars/nunchaku; other weapons 1/turn; not cumulative with other multi-attack effects). Martial-arts hands = light weapons (-1; 0 at L5+). Spores: Tier×/adventure, 1 turn, living Minor Foes get -1 L (not fungal/unliving). (FADEE pp.51-54)',
      'Dies → d6 food rations (eaten = no resurrection). Self-sustaining (no food/water where organic matter exists). L5+ expert skills: Parry&Disarm, Butterfly Parry (+Tier defense vs next attack), Expert Spore Cloud (-Tier), Leap Away (+L defense), Concentrated Force (+Tier door bashing), Stillness of Mind (+Tier saves vs magic), Stunning Blows (no -1 on subdual). Heroic tier: Whirlwind of Fury, Parry&Counter, Heroic Stillness (+2×Tier), Parry&Throw, Karmic Transferral. (FADEE pp.51-54)',
    ],
    notes: 'Attack: +L with nunchaku/bo/sai/stars/unarmed, else +½L. Saves: monk list.',
  },
  {
    id: 'paladin',
    name: 'Paladin',
    source: 'FADEE pp.55-56',
    attackBonus: 'L',
    defenseBonus: '0',
    lifeFormula: 'L+6',
    armorAllowed: ['light', 'heavy', 'shield'],
    weaponsAllowed: ['light', 'hand', 'twoHanded', 'lightRanged', 'ranged'],
    savesAs: 'warrior',
    stealthBonus: '0',
    startingWealth: 'd6',
    spellSlots: 0,
    traitsToPick: 1,
    abilities: [
      'L+1 prayer points: heal 1 Life each; reroll a failed Save; summon a steed for a day (outdoors only; mounted non-surprised paladin +1 vs unmounted foes). (FADEE pp.55-56)',
      'Tithe L×10gp (or all found gold/gems) after each adventure. Never breaks off combat or leaves before mission completion (withdraw allowed if all survivors <½ Life and no healing left). Auto-passes fear saves. L5+ Divine Smite (once/adventure: successful hit = 3 damage to a Major Foe or 3 Minor Foes auto-slain; magic-effective; explosions ignored for this). (FADEE pp.55-56)',
    ],
    notes: 'Saves: warrior, with fear auto-pass.',
  },
  {
    id: 'ranger',
    name: 'Ranger',
    source: 'FADEE pp.57-59',
    attackBonus: 'L',
    defenseBonus: '0',
    lifeFormula: 'L+6',
    armorAllowed: ['light', 'shield'],
    weaponsAllowed: ['light', 'hand', 'lightRanged', 'ranged'],
    savesAs: 'warrior',
    stealthBonus: 'L',
    startingWealth: '2d6',
    spellSlots: 0,
    traitsToPick: 1,
    abilities: [
      'Two melee weapons: 1 attack each at +½L (no explosions). Bow outdoors: 2 shots/turn at +½L (no explosions; not stackable). (FADEE pp.57-59)',
      'One druid-restricted magic item allowed (choose on finding, permanent). Scroll-cast as L1; may learn ONE druid spell via XP roll. Sworn Enemy (chosen at L1; more via XP rolls; vs that Foe: higher tier die for stealth/attack/defense; must have actually fought it once). Tracking (hunting a Foe costs 1 fewer Clue). Boss tracking: once/adventure reroll the Final Boss determination. Survival(Terrain) skills via XP roll on entering a terrain; active there: higher tier die for saves/stealth/attack/defense; +1 foraged ration; sworn-enemy and terrain die bonuses stack, max 2 die steps. (FADEE pp.57-59)',
    ],
    notes: 'Stealth: +L outdoors, +½L indoors. Weapons: light, hand, bows, slings (no 2H/firearms). Saves: warrior, with climb/track/swim +L always.',
  },
  {
    id: 'swashbuckler',
    name: 'Swashbuckler',
    source: 'FADEE pp.61-62',
    attackBonus: 'halfL',
    defenseBonus: 'halfL',
    lifeFormula: 'L+4',
    armorAllowed: [],
    weaponsAllowed: ['light', 'hand', 'lightRanged', 'ranged', 'firearms'],
    savesAs: 'rogue',
    stealthBonus: 'halfL',
    startingWealth: '2d6',
    spellSlots: 0,
    traitsToPick: 1,
    abilities: [
      'Panache: +1 point per Foe killed, max held = L; spend 1 → +1 to next attack OR defense roll (max 1 per roll). (FADEE pp.61-62)',
      '2 attacks per turn (hand + light weapon). (FADEE pp.61-62)',
    ],
    notes: 'Weapons: light, hand, sling, firearms.',
  },
]
