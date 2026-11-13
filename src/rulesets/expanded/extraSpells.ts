/**
 * Druid & illusionist spell lists (FADEE pp.70-75).
 *
 * Data transcribed from docs/RULES_VERIFICATION.md Part 4 (R046/R047).
 * Names and one-line effects are original paraphrases; numbers are data.
 *
 * ENGINE STATUS: these lists exist as data so random scrolls (R049) roll
 * from the right list. Casting a druid/illusionist spell has NO engine
 * support yet — neither class is playable in the current build, and the
 * combat spell engine only implements the 6 basic wizard spells. A bark
 * scroll / prism granted by loot is inert inventory until casting lands.
 */

export interface ExtraSpellDef {
  /** d12 table roll (1-12). */
  roll: number
  name: string
  effect: string
  source: string
}

/** Druid spells (R046, FADEE pp.70-72), d12. */
export const DRUID_SPELLS: ExtraSpellDef[] = [
  { roll: 1, name: 'Disperse Vermin', effect: 'Melee-style roll +2×L vs Vermin; they disperse, not killed — no harvest or loot.', source: 'FADEE p.70' },
  { roll: 2, name: 'Summon Beast', effect: 'A L3-warrior-stat animal (5 Life, 1 attack, 1 damage) fights until the encounter ends or its master dies.', source: 'FADEE p.70' },
  { roll: 3, name: 'Water Jet', effect: 'Roll vs L, pick one: 2 damage to a fire creature or fire, 2 Vermin dispersed, 1 Minion knocked out, or distract a Major so the party can escape. Also a day of water; +1 near water, -2 in desert, 0 in a dungeon.', source: 'FADEE p.70' },
  { roll: 4, name: 'Bear Form', effect: 'One action: fight as a warrior of the druid\u2019s L (min 3) with 8 Life or current Life; no casting in bear form; on reverting, take half the bear-form damage, rounded down.', source: 'FADEE p.71' },
  { roll: 5, name: 'Warp Wood', effect: 'Destroy a wooden door, chest or object; 2 damage automatically to wooden creatures.', source: 'FADEE p.71' },
  { roll: 6, name: 'Barkskin', effect: 'Self or ally: +2 Defense, -2 agility saves, -2 vs fire. Cast on a Foe: +1 L, and fire attacks against it get +3 with minimum 2 damage.', source: 'FADEE p.71' },
  { roll: 7, name: 'Lightning Strike', effect: 'As Lightning, outdoors only.', source: 'FADEE p.71' },
  { roll: 8, name: 'Spiderweb', effect: '1 Major or d6 Minor Foes are entangled automatically; -1 L attacking and defending; fire spells burn it off; webbed Foes failing Morale surrender.', source: 'FADEE p.72' },
  { roll: 9, name: 'Entangle', effect: 'As Spiderweb, outdoors in forest, swamp or jungle only; fire creatures are affected but break free after 2 turns.', source: 'FADEE p.72' },
  { roll: 10, name: 'Subdual', effect: 'Allies ignore the -1 subdual modifier for this encounter.', source: 'FADEE p.72' },
  { roll: 11, name: 'Forest Pathway', effect: 'The party walks through woodland for 10 minutes × L; the druid must be in marching position 1 or 2.', source: 'FADEE p.72' },
  { roll: 12, name: 'Alter Weather', effect: 'Outdoors: bad weather for 10 minutes gives -1 to non-magical ranged attacks and +1 to druid Lightning Strike; 2 damage automatically to fire and air elementals; douses fires and storms.', source: 'FADEE p.72' },
]

/** Illusionist spells (R047, FADEE pp.73-75), d12. */
export const ILLUSIONIST_SPELLS: ExtraSpellDef[] = [
  { roll: 1, name: 'Illusionary Armor', effect: '+Tier Defense; no effect vs illusion-immune Foes.', source: 'FADEE p.73' },
  { roll: 2, name: 'Illusionary Mirror Image', effect: 'Tier+1 copies, 1 Life each; each absorbs one hit automatically. Destroyed by Disbelief, by the party leaving, or by area attacks.', source: 'FADEE p.73' },
  { roll: 3, name: 'Illusionary Servant', effect: 'Carries 200gp of treasure, 4 weapons, armor, 2 shields and 10 rations. Life = Tier, +2 Defense; vanishes if a trap triggers or at 0 Life; one at a time; occupies a marching slot.', source: 'FADEE p.73' },
  { roll: 4, name: 'Disbelief', effect: 'Dispels all illusions; invisible gremlins become d6+1 L3 Minions; other invisible Foes lose their invisibility advantages or take -2 L.', source: 'FADEE p.74' },
  { roll: 5, name: 'Phantasmal Binding', effect: 'Roll vs L; the Foe is held for Tier turns; attackers get +2; subdual allowed; a held Foe failing Morale surrenders.', source: 'FADEE p.74' },
  { roll: 6, name: 'Illusionary Fog', effect: 'Suspends ranged and gaze attacks and Search rolls while it persists; +2 Defense when fleeing; a free action before ranged or gaze attacks.', source: 'FADEE p.74' },
  { roll: 7, name: 'Glamour Mask', effect: 'Tier hours of disguise; reroll reaction and wooing saves; pass as an authority figure.', source: 'FADEE p.74' },
  { roll: 8, name: 'Shadow Strike', effect: 'Tier subdual damage on a hit; no effect on illusion-immune targets.', source: 'FADEE p.74' },
  { roll: 9, name: 'Specter Swarm', effect: 'Foes test Morale or cannot attack the illusionist this encounter.', source: 'FADEE p.75' },
  { roll: 10, name: 'Mirage of Fortune', effect: 'On a successful roll, the reaction is automatically a Bribe.', source: 'FADEE p.75' },
  { roll: 11, name: 'Illusionary Banquet', effect: 'Tier+3 rations, lasting at most 7 days, then each eater takes 1 damage.', source: 'FADEE p.75' },
  { roll: 12, name: 'Illusionary Sword', effect: 'Tier+3 turns; +L attacks; counts as magic; deals subdual damage.', source: 'FADEE p.75' },
]
