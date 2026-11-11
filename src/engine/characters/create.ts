import type { Character, TraitDef } from '../../rulesets/schema/character'
import { Character as CharacterSchema, SpellId } from '../../rulesets/schema/character'
import {
  BASIC_SPELLS,
  ELF_SPELLS,
  CORE_CLASSES,
  parseClassDef,
} from '../../rulesets/expanded/coreClasses'
import type { ClassDefInput } from '../../rulesets/schema/character'
import type { Rng } from '../core/rng'

/**
 * Character creation (PROJECT_SPEC Part V §9; FADEE pp.7-8, 19-66).
 * Pure functions — no React, no browser APIs (PROJECT_SPEC Part IV §7).
 */

export interface CreateCharacterRequest {
  name: string
  classId: string
  /** Chosen trait rolls (count validated per class); omitted = roll randomly. */
  traitRolls?: number[]
  /** Wizard/elf spell slot assignment (validated against the class list). */
  spells?: string[]
}

export class CreationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CreationError'
  }
}

/** "L+6"/"5+L" at L1 → 7/6; "L+3" → 4; bare "L" → level (FADEE Life formulas use both orders). */
export function lifeAt(level: number, formula: string): number {
  const f = formula.trim()
  const m = /^(?:L)?([+-]\d+)?$/.exec(f)
  if (m) return level + (m[1] ? parseInt(m[1], 10) : 0)
  const rev = /^(\d+)\+L$/.exec(f)
  if (rev) return level + parseInt(rev[1], 10)
  throw new CreationError(`bad life formula: ${formula}`)
}

function spellPool(def: ReturnType<typeof parseClassDef>): readonly SpellId[] {
  if (def.id === 'elf') return ELF_SPELLS
  return Object.keys(BASIC_SPELLS) as SpellId[]
}

function pickTraits(
  def: ReturnType<typeof parseClassDef>,
  requested: number[] | undefined,
  rng: Rng,
): TraitDef[] {
  const count = def.traitsToPick
  if (count === 0) return []
  let rolls: number[]
  if (requested && requested.length > 0) {
    if (requested.length !== count) {
      throw new CreationError(
        `${def.name} picks ${count} trait${count > 1 ? 's' : ''}, got ${requested.length}`,
      )
    }
    rolls = requested
  } else {
    rolls = Array.from({ length: count }, () => rng.d(6))
    if (count === 2 && rolls[0] === rolls[1]) {
      rolls[1] = rng.d(6) // halflings reroll duplicates (FADEE p.40)
    }
  }
  return rolls.map((roll) => {
    const trait = def.traitTable.find((t) => t.roll === roll)
    if (!trait) throw new CreationError(`trait roll ${roll} missing for ${def.name}`)
    return trait
  })
}

function assignSpells(
  def: ReturnType<typeof parseClassDef>,
  requested: string[] | undefined,
): string[] {
  if (def.spellSlots === 0) return []
  const pool = spellPool(def)
  if (!requested || requested.length === 0) {
    // Deterministic default loadout; players re-assign before each adventure
    // (FADEE p.64), so this is a starting point, not a lock-in.
    return pool.slice(0, def.spellSlots)
  }
  if (requested.length > def.spellSlots) {
    throw new CreationError(
      `${def.name} has ${def.spellSlots} spell slot(s), got ${requested.length}`,
    )
  }
  for (const s of requested) {
    if (!pool.includes(s as SpellId)) {
      throw new CreationError(`${def.name} cannot learn spell: ${s}`)
    }
  }
  return requested.map((s) => SpellId.parse(s))
}

export function createCharacter(
  req: CreateCharacterRequest,
  rng: Rng,
  campaignId: string,
): Character {
  const input: ClassDefInput | undefined = CORE_CLASSES.find((c) => c.id === req.classId)
  if (!input) throw new CreationError(`unknown class: ${req.classId}`)
  const def = parseClassDef(input)

  const maxLife = lifeAt(1, def.lifeFormula)
  const traits = pickTraits(def, req.traitRolls, rng)
  const spells = assignSpells(def, req.spells) as Character['spells']
  const wealth = rng.formula(def.startingWealth, `starting wealth (${def.name})`)

  const equipment = [...def.startingEquipment]
  if (def.id === 'halfling') {
    // FADEE p.40: halflings start with d6+3 rations instead of armor
    equipment.length = 0
    equipment.push('sling', 'light weapon')
    const rations = rng.formula('d6+3', 'starting rations (halfling)')
    equipment.push(`${rations} food rations`)
  }

  const character: Character = {
    id: `${campaignId}-${req.classId}-${rng.d(1000000)}`,
    name: req.name.trim(),
    classId: def.id,
    level: 1,
    currentLife: maxLife,
    maxLife,
    experience: 0,
    gold: wealth,
    traits,
    spells,
    equipment,
    conditions: [],
    status: 'active',
    createdAt: Date.now(),
  }
  return CharacterSchema.parse(character)
}

export function createParty(
  requests: CreateCharacterRequest[],
  rng: Rng,
  campaignId: string,
): Character[] {
  if (requests.length !== 4) {
    throw new CreationError('a party has exactly four adventurers (FADEE p.7)')
  }
  const ids = new Set(requests.map((r) => r.classId))
  if (ids.size !== requests.length) {
    throw new CreationError('each adventurer must be a different class')
  }
  return requests.map((r) => createCharacter(r, rng, campaignId))
}
