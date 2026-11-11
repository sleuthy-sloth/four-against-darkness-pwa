import { z } from 'zod'

/**
 * Ruleset data schemas (Zod) — PROJECT_SPEC Part IV: rules data validated
 * separately from UI. Shapes follow FADEE as documented in
 * docs/RULES_VERIFICATION.md; IDs cite pages.
 */

export const DiceFormula = z.string().regex(/^\d*d\d+([+-]\d+)?$/, 'dice formula')

export const TraitDef = z.object({
  roll: z.number().int().min(1).max(6),
  name: z.string(),
  /** Original-language effect description; hooks added when the mechanic lands. */
  effect: z.string(),
  source: z.string(),
})
export type TraitDef = z.infer<typeof TraitDef>

export const WeaponCategory = z.enum([
  'light',
  'hand',
  'twoHanded',
  'lightRanged',
  'ranged',
  'unarmed',
])
export type WeaponCategory = z.infer<typeof WeaponCategory>

export const SpellId = z.enum([
  'blessing',
  'escape',
  'lightning',
  'fireball',
  'protection',
  'sleep',
])
export type SpellId = z.infer<typeof SpellId>

export const ClassDef = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  /** Attack roll bonus at level L; e.g. 'L', 'halfL', '0', 'flat:1'. */
  attackBonus: z.string(),
  /** Defense roll bonus at level L. */
  defenseBonus: z.string(),
  /** Life formula at level L, e.g. 'L+7' → L1 = 8 (FADEE p.63). */
  lifeFormula: DiceFormula.or(z.string()),
  armorAllowed: z.array(z.enum(['none', 'light', 'heavy', 'shield', 'leafsteel', 'clockwork'])),
  weaponsAllowed: z.array(WeaponCategory),
  savesAs: z.string(),
  stealthBonus: z.string(),
  startingWealth: DiceFormula,
  startingEquipment: z.array(z.string()),
  spellSlots: z.number().int().min(0),
  /** Spell lists this class may memorize from. */
  spellList: z.enum(['wizardBasic', 'none']).default('none'),
  /** Cleric prayer uses per adventure (FADEE p.28). */
  prayers: z
    .object({ healing: z.number(), blessing: z.number() })
    .optional(),
  /** Barbarian rage attacks per adventure = 1 + floor(L/2) (FADEE p.24). */
  ragePerAdventure: z.boolean().default(false),
  /** Halfling Luck points = L+1 (FADEE p.40). */
  luckPoints: z.boolean().default(false),
  /** Traits chosen at creation: 1 for most classes, 2 for halfling (FADEE p.40). */
  traitsToPick: z.number().int().min(0).max(2).default(1),
  traitTable: z.array(TraitDef).length(6),
  /** Original-language special mechanics summary, page-cited. */
  abilities: z.array(z.string()),
})
export type ClassDef = z.infer<typeof ClassDef>

export const CharacterStatus = z.enum(['active', 'incapacitated', 'dead'])
export type CharacterStatus = z.infer<typeof CharacterStatus>

export const Character = z.object({
  id: z.string(),
  name: z.string().min(1).max(40),
  classId: z.string(),
  level: z.number().int().min(1),
  /** Current/maximum Life (FADEE "Life", not HP — R079). */
  currentLife: z.number().int().min(0),
  maxLife: z.number().int().min(1),
  experience: z.number().int().min(0),
  gold: z.number().int().min(0),
  traits: z.array(TraitDef),
  spells: z.array(SpellId),
  equipment: z.array(z.string()),
  conditions: z.array(z.string()),
  status: CharacterStatus,
  createdAt: z.number(),
})
export type Character = z.infer<typeof Character>

export const Party = z.object({
  id: z.string(),
  campaignId: z.string(),
  characters: z.array(Character).max(4),
})
export type Party = z.infer<typeof Party>

/**
 * Class data packs are authored against the INPUT shape (defaults optional);
 * parse() applies defaults when the engine consumes a ClassDef.
 */
export type ClassDefInput = z.input<typeof ClassDef>

