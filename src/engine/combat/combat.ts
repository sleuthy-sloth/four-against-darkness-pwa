import type { MonsterProfile, TableKind } from '../../rulesets/expanded/monsters'
import type { Character } from '../../rulesets/schema/character'
import type { Rng } from '../core/rng'

/**
 * Combat engine (FADEE pp.90-99, 146-148; PROJECT_SPEC Part V §13).
 * Pure functions over an explicit CombatState; every roll lands in the log
 * with its modifiers spelled out. Foes never roll dice (FADEE p.2).
 */

export interface EnemyInstance {
  id: string
  profile: MonsterProfile
  table: TableKind
  level: number
  /** Minor Foes: 1 Life each (FADEE p.94); Major: per profile formula. */
  life: number
  maxLife: number
  initialCount: number
  count: number // remaining for Minor groups
  fled: boolean
  moraleTested: boolean
  /** Major Foe drops 1 L below half Life (FADEE p.94). */
  weakened?: boolean
  asleep?: boolean
  /** Set when the Final Boss roll revealed this foe (FADEE p.105). */
  isFinalBossFlag?: boolean
  /** Sleeping Minor Foes (Sleep spell, FADEE p.68). */
  asleepCount?: number
  /** Subdued, not slain (R089): bound, follows the party, does nothing. */
  subdued?: boolean
  /** Put to Sleep while a type-3 Quest target (R089: Sleep subdues). */
  subduedBySleep?: boolean
  /** Red Death weaken: level penalty until this round (inclusive). */
  levelPenaltyUntilRound?: number
}

export interface CombatLogEntry {
  ts: number
  text: string
}

export type CombatPhase =
  | 'opening' // party chooses: attack now or wait for Reactions
  | 'foesTurn' // foes attack; engine resolves PC defense rolls
  | 'pcTurn' // player picks PC actions
  | 'won'
  | 'lost'
  | 'fled'

/**
 * A concluded combat (won or lost) can be left behind: the fight is over,
 * the tile is cleared on victory, and the player returns to the room's
 * actions (Rest, Search, exits). A live combat (opening / pcTurn /
 * foesTurn) cannot be dismissed — the only way out mid-fight is Flee
 * (FADEE p.97) or an exit. Without this, a victory left the combat panel
 * up with no dismiss and the tile actions unreachable (the victory-screen
 * trap: Rest is gated on !dungeon.combat, and the panel replaces the tile
 * panel whenever dungeon.combat exists).
 */
export function canLeaveCombat(phase: CombatPhase): boolean {
  return phase === 'won' || phase === 'lost'
}

export interface CombatState {
  tileId: string
  enemies: EnemyInstance[]
  phase: CombatPhase
  round: number
  /** PCs present (living at combat start). */
  participants: Character[]
  log: CombatLogEntry[]
  /** Set when foes surprised the party (FADEE p.90): they act first. */
  surprised: boolean
  /** Reaction outcome pending player payment etc. */
  pendingBribe?: { enemyGroupId: string; amount: number; each: boolean } | null
  /** Protection spell: +1 Defense per protected PC (FADEE p.68). */
  protections?: Record<string, number>
  /** Rewards accrued at victory (resolved into party in Phase 5/loot). */
  minorEncounterCounted?: boolean
  /** Marching order (PC ids, first = leader) — FADEE pp.97, 104, 163. */
  marchingOrder?: string[]
  /** Party Secrets in play, mutated when consumed (FADEE pp.122-123). */
  secrets?: string[]
  /** Weakness of a Foe applied this combat (FADEE p.122). */
  weaknessActive?: boolean
  /** Darkness penalty (R093): -2 when the party has no working light. */
  darknessPenalty?: number
  /** Stalagmite tile (R142): attack dice do not explode here. */
  noExplosions?: boolean
  /** Secret-door entry (R125): Foes' L -1 on combat turn 1 (min 1). */
  foeLevelPenaltyTurn1?: number
  /** Fungal grottoes (R144): -1 Defense while fleeing (exempt classes skip it). */
  fungalSlippery?: boolean
  /** Morel Crusher (R154): next Morale test at -1 (consumed on use). */
  moraleMod?: number
  /** The lantern-bearer fell: the lantern dropped (R094). */
  lanternDropped?: boolean
  /** A torch attack rolled a natural 1: the torch went out (R094). */
  torchExtinguished?: boolean
  /** Type-3 Quest target name (R155): Sleep/subdual on this Foe captures it. */
  questTargetName?: string | null
}

export class CombatError extends Error {}

// ---------- helpers ----------

export function attackBonusFor(pc: Character): { bonus: number; note: string } {
  // Class attack bonuses (FADEE pp.24-65; summary p.147).
  const L = pc.level
  switch (pc.classId) {
    case 'warrior':
    case 'barbarian':
      return { bonus: L, note: `+${L} class` }
    case 'cleric':
      return { bonus: Math.floor(L / 2), note: `+${Math.floor(L / 2)} class (½L)` }
    case 'rogue':
      return { bonus: 0, note: 'no class attack bonus' }
    case 'wizard':
      return { bonus: 0, note: 'no class attack bonus' }
    case 'elf':
      return { bonus: L, note: `+${L} class` }
    case 'dwarf':
      return { bonus: L, note: `+${L} class (melee)` }
    case 'halfling':
      return { bonus: 0, note: 'no class attack bonus (sling: +L)' }
    default:
      return { bonus: 0, note: 'unknown class: 0' }
  }
}

export function defenseBonusFor(pc: Character): { bonus: number; note: string } {
  const eq = pc.equipment.join(' ')
  let bonus = 0
  const notes: string[] = []
  if (/heavy armor/.test(eq)) {
    bonus += 2
    notes.push('+2 heavy armor')
  } else if (/leafsteel armor/.test(eq)) {
    bonus += 2
    notes.push('+2 leafsteel armor')
  } else if (/light armor/.test(eq)) {
    bonus += 1
    notes.push('+1 light armor')
  }
  if (/shield/.test(eq)) {
    bonus += 1
    notes.push('+1 shield')
  }
  if (pc.classId === 'rogue') {
    bonus += pc.level
    notes.push(`+${pc.level} rogue`)
  }
  if (pc.classId === 'halfling') notes.push('halfling: +L vs giant/troll/ogre only')
  return { bonus, note: notes.join(', ') || 'no modifiers' }
}

/** Weapon modifier for the PC's default melee weapon (FADEE pp.81, 147). */
export function meleeWeaponFor(pc: Character): { mod: number; name: string } {
  const lightClasses = ['rogue', 'wizard', 'halfling']
  if (lightClasses.includes(pc.classId)) return { mod: -1, name: 'light weapon (-1)' }
  if (pc.classId === 'barbarian' && /two-handed/.test(pc.equipment.join(' '))) {
    return { mod: 1, name: 'two-handed weapon (+1)' }
  }
  return { mod: 0, name: 'hand weapon (+0)' }
}

/** Exploding tier die (FADEE p.5): a 6 adds another d6, cumulative. */
export function rollExplodingD6(rng: Rng, reason: string): { rolls: number[]; total: number } {
  const rolls: number[] = [rng.d(6)]
  while (rolls[rolls.length - 1] === 6) {
    rolls.push(rng.d(6))
    if (rolls.length > 20) break // hard cap against pathological logs
  }
  const total = rolls.reduce((a, b) => a + b, 0)
  rng.roll(rolls.length, 6, 0, reason) // log entry for the whole chain
  return { rolls, total }
}

/** Combat die: exploding unless a stalagmite tile forbids it (R142). */
export function rollCombatDie(state: CombatState, rng: Rng, reason: string): { rolls: number[]; total: number } {
  if (state.noExplosions) {
    const roll = rng.d(6)
    rng.roll(1, 6, 0, reason)
    return { rolls: [roll], total: roll }
  }
  return rollExplodingD6(rng, reason)
}

/** A Foe's effective L right now: Red Death weaken + secret-door turn-1 surprise. */
export function effectiveLevel(state: CombatState, enemy: EnemyInstance): number {
  let level = enemy.level
  if (enemy.levelPenaltyUntilRound !== undefined && state.round <= enemy.levelPenaltyUntilRound) level -= 1
  if ((state.foeLevelPenaltyTurn1 ?? 0) > 0 && state.round === 0) level -= state.foeLevelPenaltyTurn1!
  return Math.max(1, level)
}

/** Spend a turn with no attack (e.g. picking up a dropped lantern, R094). */
export function spendTurn(state: CombatState, rng: Rng): void {
  if (state.phase !== 'pcTurn') throw new CombatError('not the party\u2019s turn')
  log(state, 'A turn is spent.')
  endPcTurn(state, rng)
}

/** Life from a FADEE formula: 'T+y' (tier number), 'HCL+y', 'L+y', 'N+L', flat. */
export function lifeFromFormula(level: number, formula: string | undefined, flat: number | undefined): number {
  if (flat !== undefined) return flat
  if (!formula) return 1 // Minor Foes: 1 Life
  const tier = level >= 20 ? 5 : level >= 15 ? 4 : level >= 10 ? 3 : level >= 5 ? 2 : 1
  const t = /^T([+-]\d+)$/.exec(formula)
  if (t) return Math.max(1, tier + parseInt(t[1], 10))
  const hclF = /^HCL([+-]\d+)$/.exec(formula)
  if (hclF) return Math.max(1, level + parseInt(hclF[1], 10))
  const m = /^(?:L)?([+-]\d+)?$/.exec(formula)
  if (m) return Math.max(1, level + (m[1] ? parseInt(m[1], 10) : 0))
  const rev = /^(\d+)\+L$/.exec(formula)
  if (rev) return level + parseInt(rev[1], 10)
  throw new CombatError(`bad life formula: ${formula}`)
}

export function makeEnemy(
  profile: MonsterProfile,
  table: TableKind,
  level: number,
  count: number,
  life: number,
): EnemyInstance {
  return {
    id: `${profile.name}-${Math.random().toString(36).slice(2, 7)}`,
    profile,
    table,
    level,
    life,
    maxLife: life,
    initialCount: count,
    count,
    fled: false,
    moraleTested: false,
  }
}

export function startCombat(
  tileId: string,
  participants: Character[],
  enemies: EnemyInstance[],
  rng: Rng,
  opts: { partyWaits?: boolean; forceSurprise?: boolean; marchingOrder?: string[]; secrets?: string[]; darknessPenalty?: number; noExplosions?: boolean; foeLevelPenaltyTurn1?: number; fungalSlippery?: boolean; questTargetName?: string | null } = {},
): CombatState {
  // FADEE p.90: surprise check (per-Foe X-in-6). Core dungeon set: goblins 1-in-6.
  let surprised = opts.forceSurprise === true
  if (!surprised && enemies.some((e) => e.profile.name === 'Goblins')) {
    const roll = rng.d(6)
    surprised = roll === 1
  }
  const state: CombatState = {
    tileId,
    enemies,
    phase: 'opening',
    round: 0,
    participants,
    log: [],
    surprised,
    pendingBribe: null,
    marchingOrder: opts.marchingOrder ?? participants.map((p) => p.id),
    secrets: opts.secrets ? [...opts.secrets] : [],
    darknessPenalty: opts.darknessPenalty ?? 0,
    noExplosions: opts.noExplosions ?? false,
    foeLevelPenaltyTurn1: opts.foeLevelPenaltyTurn1 ?? 0,
    fungalSlippery: opts.fungalSlippery ?? false,
    questTargetName: opts.questTargetName ?? null,
  }
  // Weakness of a Foe secret (FADEE p.122): +2 attack for everyone.
  for (const s of state.secrets ?? []) {
    const [id, arg] = s.split(':')
    if (id === 'weakness' && arg === enemies[0]?.profile.name) {
      log(state, `Secret — Weakness of a Foe: all PCs attack ${enemies[0].profile.name} at +2.`)
      state.weaknessActive = true
    }
  }
  log(state, `Combat begins: ${describeEnemies(enemies)}`)
  if (surprised) log(state, 'The Foes surprise the party! They act first.')
  if (!surprised && !opts.partyWaits) {
    log(state, 'The party may attack immediately, or wait to check the Foes\u2019 Reactions.')
  }
  if (surprised || opts.partyWaits) {
    return rollReactions(state, rng)
  }
  // Opening phase is the choice point (Release 0.5, A6): the party attacks
  // immediately (combatAttack moves to pcTurn) or waits for Reactions
  // (combatWait). Before 0.5 this fell straight through to pcTurn, so the
  // panel's "Wait for Reactions" choice was unreachable in normal play —
  // reactions only ever rolled on a Goblin surprise.
  return state
}

export function describeEnemies(enemies: EnemyInstance[]): string {
  return enemies
    .filter((e) => !e.fled && e.count > 0)
    .map((e) => `${e.count}× ${e.profile.name} (L${e.level})`)
    .join(', ')
}

function log(state: CombatState, text: string): void {
  state.log.push({ ts: Date.now(), text })
}

// ---------- reactions (FADEE pp.101-102) ----------

interface ReactionOutcome {
  kind: 'fight' | 'fight-to-death' | 'flee' | 'bribe' | 'peaceful' | 'ignore' | 'unhandled'
  bribeAmount?: number
  bribeEach?: boolean
  note?: string
}

export function parseReaction(entry: string): ReactionOutcome {
  const s = entry.toLowerCase()
  if (s.includes('fight to the death')) return { kind: 'fight-to-death' }
  if (s.includes('flee if outnumbered')) return { kind: 'flee', note: 'if-outnumbered' }
  if (s.includes('flee')) return { kind: 'flee' }
  const bribe = s.includes('bribe')
  if (bribe) {
    const gp = /(\d+)gp/.exec(s)
    const food = s.includes('food')
    if (gp) return { kind: 'bribe', bribeAmount: parseInt(gp[1], 10), bribeEach: s.includes('each') }
    if (food) return { kind: 'unhandled', note: 'bribe requires food rations' }
    return { kind: 'unhandled', note: entry }
  }
  if (s.includes('fight')) return { kind: 'fight' }
  if (s.includes('ignore')) return { kind: 'ignore' }
  if (s.includes('peaceful')) return { kind: 'peaceful' }
  return { kind: 'unhandled', note: entry }
}

/**
 * Roll Reactions for the encounter (one roll for a Minor group,
 * FADEE p.101). Only groups whose profiles have non-fixed reactions roll.
 */
export function rollReactions(state: CombatState, rng: Rng): CombatState {
  for (const enemy of state.enemies) {
    if (enemy.fled || enemy.count === 0) continue
    if (enemy.profile.reactions[0].startsWith('Always')) {
      log(state, `${enemy.profile.name}: ${enemy.profile.reactions[0]}.`)
      continue
    }
    const roll = rng.d(6)
    const entry =
      enemy.profile.reactions.find((r) => matchReactionRoll(r, roll)) ??
      enemy.profile.reactions[enemy.profile.reactions.length - 1]
    const outcome = parseReaction(entry)
    log(state, `${enemy.profile.name} Reaction (d6=${roll}): ${entry}`)
    switch (outcome.kind) {
      case 'fight':
      case 'fight-to-death':
        break // combat proceeds
      case 'flee':
        if (outcome.note === 'if-outnumbered') {
          const foes = enemy.count
          const party = state.participants.filter((p) => p.status !== 'dead').length
          if (foes < party) {
            enemy.fled = true
            log(state, `The ${enemy.profile.name} are outnumbered and flee!`)
          }
        } else {
          enemy.fled = true
          log(state, `The ${enemy.profile.name} flee!`)
        }
        break
      case 'bribe': {
        const total = outcome.bribeEach ? outcome.bribeAmount! * enemy.count : outcome.bribeAmount!
        state.pendingBribe = { enemyGroupId: enemy.id, amount: total, each: !!outcome.bribeEach }
        log(state, `The ${enemy.profile.name} demand a bribe of ${total} gp.`)
        state.phase = 'opening'
        return state
      }
      case 'ignore':
        log(state, `The ${enemy.profile.name} ignore the party — you may pass. (treasure: Phase 5)`)
        enemy.fled = true
        break
      case 'peaceful':
        log(state, `The ${enemy.profile.name} are peaceful — you may pass.`)
        enemy.fled = true
        break
      case 'unhandled':
        log(state, `Reaction "${entry}" is not automated yet — treating as a fight. (${enemy.profile.source})`)
        break
    }
  }
  if (state.enemies.every((e) => e.fled || e.count === 0)) {
    state.phase = 'won'
    log(state, 'No fight: the encounter resolves without combat.')
    return state
  }
  state.phase = state.surprised ? 'foesTurn' : 'pcTurn'
  if (state.phase === 'foesTurn') runFoesTurn(state, rng)
  return state
}

function matchReactionRoll(entry: string, roll: number): boolean {
  const m = /^(\d+)(?:-(\d+))?/.exec(entry.trim())
  if (!m) return false
  const lo = parseInt(m[1], 10)
  const hi = m[2] ? parseInt(m[2], 10) : lo
  return roll >= lo && roll <= hi
}

// ---------- PC actions ----------

export interface AttackResult {
  state: CombatState
  slain: number
  damage: number
}

/** PC attacks one enemy group (Minor) or one Major Foe (FADEE pp.91-94). */
export function pcAttack(
  state: CombatState,
  rng: Rng,
  pc: Character,
  enemyId: string,
  opts: { subdual?: boolean } = {},
): AttackResult {
  if (state.phase !== 'pcTurn') throw new CombatError('not the party\u2019s turn')
  const enemy = enemyId ? state.enemies.find((e) => e.id === enemyId && !e.fled && e.count > 0) : null
  if (!enemy) throw new CombatError('target not available')
  const cls = attackBonusFor(pc)
  const weapon = meleeWeaponFor(pc)
  // Epic reward — Enchanted weapon (FADEE p.162): roll 2, keep the best.
  const enchanted = pc.conditions.includes('enchanted-weapon')
  const rollA = rollCombatDie(state, rng, `attack roll (${pc.name})`)
  const rollB = enchanted ? rollCombatDie(state, rng, `enchanted attack roll (${pc.name}, best of 2)`) : null
  const { rolls, total } =
    rollB && rollB.total > rollA.total ? rollB : rollA
  // Torch (R094): a natural 1 on a melee attack extinguishes it.
  if (pc.equipment.includes('torch') && rolls[0] === 1) {
    state.torchExtinguished = true
    log(state, `${pc.name}'s torch sputters out on a roll of 1!`)
  }
  let bonus = cls.bonus + weapon.mod + (state.darknessPenalty ?? 0)
  // Magic Weapon (R151): +1 Attack while carried.
  if (pc.equipment.some((e) => e.startsWith('Magic Weapon'))) bonus += 1
  // Subdual (R089): attack at -1; at 0 Life the Foe is subdued, not slain.
  if (opts.subdual) bonus -= 1
  // FADEE p.60/p.147: rogue +L vs OUTNUMBERED Minor Foes.
  if (pc.classId === 'rogue' && enemy.table !== 'weird' && enemy.table !== 'boss' && enemy.count < livingPartySize(state)) {
    bonus += pc.level
  }
  // Secret — Weakness of a Foe (FADEE p.122): +2 for the whole combat.
  if (state.weaknessActive) bonus += 2
  const finalTotal = total + bonus
  const effLevel = effectiveLevel(state, enemy)
  log(
    state,
    `${pc.name} attacks ${enemy.profile.name}${opts.subdual ? ' (subdual, -1)' : ''}: d6[${rolls.join('+')}] ${bonus >= 0 ? '+' : ''}${bonus} (${cls.note}; ${weapon.name}${(state.darknessPenalty ?? 0) < 0 ? '; darkness -2' : ''}) = ${finalTotal} vs L${effLevel}${enchanted ? ' (enchanted weapon: best of 2 dice)' : ''}`,
  )
  let slain = 0
  let damage = 0
  if (enemy.asleep) {
    // Asleep Major Foe: attacks strike without a defense roll (FADEE p.68).
    // A subdual strike that brings it to 0 Life binds it, same as awake.
    damage = 1
    applyMajorDamage(state, enemy, damage)
    if (opts.subdual && enemy.life === 0) {
      enemy.subdued = true
      log(state, `${enemy.profile.name} is subdued at 0 Life — tie it up and take its treasure. It follows the party but does nothing.`)
    }
  } else if (finalTotal >= effLevel) {
    if (enemy.profile.major) {
      damage = Math.max(1, Math.floor(finalTotal / effLevel))
      applyMajorDamage(state, enemy, damage)
      if (opts.subdual && enemy.life === 0) {
        enemy.subdued = true
        log(state, `${enemy.profile.name} is subdued at 0 Life — tie it up and take its treasure. It follows the party but does nothing.`)
      }
    } else {
      // Sleeping Minors are slain at will (FADEE p.68): 1 per attack, free.
      let freeKills = 0
      if ((enemy.asleepCount ?? 0) > 0) {
        freeKills = Math.min(enemy.asleepCount!, 1)
        enemy.asleepCount = enemy.asleepCount! - freeKills
        slain += freeKills
        log(state, `${freeKills} sleeping ${enemy.profile.name} dispatched where they lie.`)
      }
      slain += Math.max(1, Math.floor(finalTotal / effLevel))
      slain = Math.min(slain, enemy.count)
      enemy.count -= slain
      log(state, `Hit! ${slain} ${enemy.profile.name} slain (${finalTotal} ÷ L${effLevel}).`)
      checkMorale(state, enemy, rng)
    }
  } else {
    log(state, `Miss (${finalTotal} < L${effLevel}).`)
  }
  endPcTurn(state, rng)
  return { state, slain, damage }
}

function livingPartySize(state: CombatState): number {
  return state.participants.filter((p) => p.status !== 'dead').length
}

function applyMajorDamage(state: CombatState, enemy: EnemyInstance, damage: number): void {
  enemy.life = Math.max(0, enemy.life - damage)
  log(state, `${enemy.profile.name} takes ${damage} damage → ${enemy.life}/${enemy.maxLife} Life.`)
  if (!enemy.weakened && enemy.life > 0 && enemy.life <= enemy.maxLife / 2) {
    enemy.level = Math.max(1, enemy.level - 1)
    enemy.weakened = true
    log(state, `${enemy.profile.name} is below half Life: its L drops to ${enemy.level}!`)
  }
}

/** Group Morale when Minors fall below half strength (FADEE p.94). */
function checkMorale(state: CombatState, enemy: EnemyInstance, rng: Rng): void {
  if (enemy.profile.major || enemy.profile.neverMorale) return
  if (enemy.moraleTested || enemy.count === 0) return
  if (enemy.count * 2 >= enemy.initialCount) return
  enemy.moraleTested = true
  // Secret — Terrifying (FADEE p.123): the Foes automatically fail Morale.
  const terrIdx = (state.secrets ?? []).findIndex((s) => s.startsWith('terrifying'))
  if (terrIdx >= 0) {
    state.secrets!.splice(terrIdx, 1)
    enemy.fled = true
    log(state, `${enemy.profile.name} hear an unspeakable secret and automatically fail their Morale!`)
    return
  }
  let roll = rng.d(6)
  let modNote = ''
  if (enemy.profile.name === 'Goblin Swarmlings') {
    roll -= 1
    modNote = ' (Morale -1)'
  }
  // Morel Crusher (R154): the next Morale roll is at -1; consumed on use.
  if (state.moraleMod) {
    roll += state.moraleMod
    modNote += ' (Morel Crusher -1)'
    state.moraleMod = 0
  }
  log(state, `${enemy.profile.name} test Morale (below half): d6=${roll}${modNote}.`)
  if (roll <= 3) {
    enemy.fled = true
    log(state, `The remaining ${enemy.profile.name} flee! (Their treasure: Phase 5.)`)
  } else {
    log(state, `The ${enemy.profile.name} keep fighting.`)
  }
}

/** After each PC action: if every living PC acted → foes' turn (FADEE p.96). */
function endPcTurn(state: CombatState, rng: Rng): void {
  if (combatOver(state)) {
    finishCombat(state, rng)
    return
  }
  state.phase = 'foesTurn'
  runFoesTurn(state, rng)
}

// ---------- foes' turn (FADEE p.96-97) ----------

function runFoesTurn(state: CombatState, rng: Rng): void {
  state.round += 1
  log(state, `— Foes' turn (round ${state.round}) —`)
  const living = state.participants.filter((p) => p.status !== 'dead')
  if (living.length === 0) {
    state.phase = 'lost'
    log(state, 'The whole party has fallen.')
    return
  }
  for (const enemy of state.enemies) {
    if (enemy.fled || enemy.count === 0 || enemy.life === 0) continue
    // Sleeping Major Foes lose their turn (FADEE p.68).
    if (enemy.asleep) {
      log(state, `The ${enemy.profile.name} sleeps through the round.`)
      continue
    }
    const awakeMinors = enemy.count - (enemy.asleepCount ?? 0)
    if (!enemy.profile.major && awakeMinors <= 0) continue
    // FADEE p.96: Foes don't roll — each PC targeted rolls Defense.
    const attackers = enemy.profile.major ? 1 : Math.min(awakeMinors, living.length)
    // FADEE p.104: Wandering Monsters strike first at the REAR of the Marching
    // Order; after one turn (in a room) the party spreads out as normal.
    const rearRound = state.surprised && state.round === 1 && (state.marchingOrder?.length ?? 0) > 0
    let targets: Character[] = living
    if (rearRound) {
      // The rearmost living PC in the marching order.
      const rearId = state.marchingOrder!.slice().reverse().find((id) => living.some((p) => p.id === id))
      const rear = rearId ? living.find((p) => p.id === rearId) : undefined
      targets = rear ? [rear] : living
    }
    const assignments = assignTargets(state, enemy, attackers, targets)
    for (const [pcIdx, attackerLabel] of assignments) {
      const pc = targets[pcIdx]
      const def = defenseBonusFor(pc)
      const protection = state.protections?.[pc.id] ?? 0
      if (protection > 0) def.bonus += protection
      def.bonus += state.darknessPenalty ?? 0
      const effLevel = effectiveLevel(state, enemy)
      const { rolls, total } = rollCombatDie(state, rng, `defense roll (${pc.name})`)
      const finalTotal = total + def.bonus
      log(
        state,
        `${attackerLabel} attacks ${pc.name}: defense d6[${rolls.join('+')}] ${def.bonus >= 0 ? '+' : ''}${def.bonus} (${def.note}${protection ? `, +${protection} Protection` : ''}${(state.darknessPenalty ?? 0) < 0 ? ', darkness -2' : ''}) = ${finalTotal}; needs > L${effLevel}`,
      )
      if (finalTotal <= effLevel && finalTotal !== 1) {
        // hit — failed defense
        pc.currentLife = Math.max(0, pc.currentLife - 1)
        log(state, `${pc.name} fails the defense: 1 damage → ${pc.currentLife}/${pc.maxLife} Life.`)
        if (pc.currentLife === 0) {
          pc.status = 'dead'
          log(state, `${pc.name} has fallen!`)
          if (pc.equipment.includes('lantern')) {
            state.lanternDropped = true
            log(state, `${pc.name}'s lantern drops to the floor.`)
          }
        }
      } else if (finalTotal === 1) {
        log(state, 'A natural 1 always fails: 1 damage.')
        pc.currentLife = Math.max(0, pc.currentLife - 1)
        if (pc.currentLife === 0) {
          pc.status = 'dead'
          log(state, `${pc.name} has fallen!`)
          if (pc.equipment.includes('lantern')) {
            state.lanternDropped = true
            log(state, `${pc.name}'s lantern drops to the floor.`)
          }
        }
      } else {
        log(state, `${pc.name} avoids the attack.`)
      }
    }
  }
  if (combatOver(state)) {
    finishCombat(state, rng)
    return
  }
  state.phase = 'pcTurn'
}

/**
 * FADEE p.97 attack distribution: rooms — spread evenly, extras to hated
 * classes (trolls/goblins→dwarf, orcs→elf, undead→cleric) then lowest Life.
 * Corridor refinement (rear positions) arrives with marching-order UI.
 */
function assignTargets(
  state: CombatState,
  enemy: EnemyInstance,
  attackerCount: number,
  living: Character[],
): Array<[number, string]> {
  const out: Array<[number, string]> = []
  const label = (i: number) => `${enemy.profile.name} #${i + 1}`
  const hated = (pc: Character): boolean => {
    const n = enemy.profile.name.toLowerCase()
    if (/(troll|goblin)/.test(n) && pc.classId === 'dwarf') return true
    if (/orc/.test(n) && pc.classId === 'elf') return true
    if (enemy.profile.category === 'Undead' && pc.classId === 'cleric') return true
    return false
  }
  if (attackerCount <= living.length) {
    // each attack on a different PC
    for (let i = 0; i < attackerCount; i++) out.push([i, label(i)])
    return out
  }
  // more Foes than PCs: even split + extras to hated, then lowest Life
  const per = Math.floor(attackerCount / living.length)
  let extra = attackerCount - per * living.length
  living.forEach((_, idx) => {
    for (let k = 0; k < per; k++) out.push([idx, label(out.length)])
  })
  const hatedIdx = living.map((p, i) => ({ p, i })).filter((x) => hated(x.p))
  for (const h of hatedIdx) {
    if (extra <= 0) break
    out.push([h.i, label(out.length)])
    extra--
  }
  const sorted = living
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p.currentLife - b.p.currentLife)
  for (const s of sorted) {
    if (extra <= 0) break
    out.push([s.i, label(out.length)])
    extra--
  }
  return out
}

// ---------- end conditions & fleeing ----------

export function combatOver(state: CombatState): boolean {
  const foesLeft = state.enemies.some((e) => !e.fled && e.count > 0 && e.life > 0)
  const partyAlive = state.participants.some((p) => p.status !== 'dead')
  return !foesLeft || !partyAlive
}

function finishCombat(state: CombatState, _rng: Rng): void {
  const foesLeft = state.enemies.some((e) => !e.fled && e.count > 0 && e.life > 0)
  const partyAlive = state.participants.some((p) => p.status !== 'dead')
  if (!partyAlive) {
    state.phase = 'lost'
    log(state, 'The party has been wiped out. Adventure over.')
  } else if (!foesLeft) {
    state.phase = 'won'
    const slainAll = state.enemies.every((e) => e.fled || e.count === 0 || e.life === 0)
    log(
      state,
      slainAll
        ? 'Victory! All Foes defeated or fled. Loot roll comes with the treasure engine.'
        : 'The way is clear.',
    )
  }
}

/**
 * Flee the melee (FADEE pp.97-98): each Foe attacks once (no shield bonus
 * while fleeing). Returns with phase 'fled'; caller moves the party.
 * Fungal grottoes (R144): -1 Defense while fleeing except ranger, rogue,
 * acrobat, halfling and mushroom monk. A Puffball Smokebomb (R152) lets
 * the party flee unattacked.
 */
export function fleeCombat(state: CombatState, rng: Rng, opts: { unattacked?: boolean } = {}): CombatState {
  log(state, 'The party flees!')
  const living = state.participants.filter((p) => p.status !== 'dead')
  if (opts.unattacked) {
    log(state, 'A Puffball Smokebomb bursts — the party slips away unattacked.')
    state.phase = 'fled'
    log(state, 'The party escapes to a visited tile.')
    return state
  }
  for (const enemy of state.enemies) {
    if (enemy.fled || enemy.count === 0 || enemy.life === 0) continue
    const attacks = enemy.profile.major ? 1 : Math.min(enemy.count, living.length)
    for (let i = 0; i < attacks; i++) {
      const pc = living[i % living.length]
      const def = defenseBonusFor(pc)
      const shieldless = def.bonus - (/shield/.test(pc.equipment.join(' ')) ? 1 : 0)
      let fleeMod = shieldless + (state.darknessPenalty ?? 0)
      const slipperyExempt = ['ranger', 'rogue', 'acrobat', 'halfling', 'mushroomMonk', 'mushroom-monk']
      if (state.fungalSlippery && !slipperyExempt.includes(pc.classId)) fleeMod -= 1
      const { rolls, total } = rollCombatDie(state, rng, `defense while fleeing (${pc.name})`)
      const finalTotal = total + fleeMod
      log(
        state,
        `${enemy.profile.name} strikes at fleeing ${pc.name}: defense ${finalTotal} vs L${enemy.level} (no shield bonus${(state.darknessPenalty ?? 0) < 0 ? ', darkness -2' : ''}${state.fungalSlippery && !slipperyExempt.includes(pc.classId) ? ', slippery -1' : ''})`,
      )
      if (finalTotal <= enemy.level) {
        pc.currentLife = Math.max(0, pc.currentLife - 1)
        log(state, `${pc.name} takes 1 damage → ${pc.currentLife}/${pc.maxLife}.`)
        if (pc.currentLife === 0) {
          pc.status = 'dead'
          log(state, `${pc.name} has fallen!`)
          if (pc.equipment.includes('lantern')) {
            state.lanternDropped = true
            log(state, `${pc.name}'s lantern drops to the floor.`)
          }
        }
      }
    }
  }
  state.phase = 'fled'
  log(state, 'The party escapes to a visited tile.')
  return state
}

/** Pay a demanded bribe (FADEE p.101): deduct gp across the party. */
export function payBribe(state: CombatState, party: Character[]): boolean {
  const bribe = state.pendingBribe
  if (!bribe) return false
  const pooled = party.reduce((a, p) => a + p.gold, 0)
  if (pooled < bribe.amount) {
    log(state, `The party cannot afford the ${bribe.amount} gp bribe — the Foes attack!`)
    state.pendingBribe = null
    state.phase = 'foesTurn'
    return false
  }
  let remaining = bribe.amount
  for (const p of party) {
    const take = Math.min(p.gold, remaining)
    p.gold -= take
    remaining -= take
    if (remaining === 0) break
  }
  const enemy = state.enemies.find((e) => e.id === bribe.enemyGroupId)
  if (enemy) {
    enemy.fled = true
    log(state, `The bribe is paid: the ${enemy.profile.name} let the party pass (treated as Peaceful).`)
  }
  state.pendingBribe = null
  if (combatOver(state)) finishCombat(state, { d: () => 1 } as unknown as Rng)
  else state.phase = 'pcTurn'
  return true
}

/** XP award check (FADEE pp.94, 117): engine tracks; UI spends the roll. */
export function xpDue(state: CombatState): { majorSlain: number; minorEncounter: boolean; finalBoss: boolean } {
  // A resolved encounter (slain OR fled — they broke off) defeats the group.
  const majorSlain = state.enemies.filter((e) => e.profile.major && !e.fled && e.life === 0).length
  const minorEncounter = state.enemies.some(
    (e) => !e.profile.major && (e.fled || e.count === 0),
  )
  const finalBoss = state.enemies.some((e) => e.isFinalBossFlag)
  return { majorSlain, minorEncounter, finalBoss }
}

// ---------- spells & prayers in combat (FADEE pp.28, 67-69, 146) ----------

export type CastableSpell = 'sleep' | 'fireball' | 'lightning' | 'protection' | 'escape'

export function canCast(pc: Character, spell: CastableSpell): boolean {
  if (pc.status === 'dead') return false
  if (pc.classId === 'wizard') return pc.spells.includes(spell)
  if (pc.classId === 'elf') return pc.spells.includes(spell) // no Blessing for elves
  return false
}

export function clericPrayersLeft(pc: Character): { healing: number; blessing: number } {
  // Conditions carry 'prayer:healing:<remaining>' markers (FADEE p.28: 3 each).
  let healing = 3
  let blessing = 3
  for (const c of pc.conditions) {
    const m = /^prayer:(healing|blessing):(\d+)$/.exec(c)
    if (m) {
      if (m[1] === 'healing') healing = parseInt(m[2], 10)
      if (m[1] === 'blessing') blessing = parseInt(m[2], 10)
    }
  }
  return { healing, blessing }
}

function spendPrayer(pc: Character, kind: 'healing' | 'blessing'): void {
  const left = clericPrayersLeft(pc)
  const remaining = kind === 'healing' ? left.healing - 1 : left.blessing - 1
  pc.conditions = pc.conditions.filter((c) => !c.startsWith(`prayer:${kind}:`))
  pc.conditions.push(`prayer:${kind}:${remaining}`)
}

/**
 * Cast a spell (FADEE pp.67-68): spellcasting roll d6 + L vs target L;
 * failure wastes the spell. Sleep KOs 1 Major or d6+L Minors; Fireball slays
 * (total − L) Minors (min 1) or 1 damage to a Major; Lightning slays 1 Minor
 * or 2 damage to a Major; Protection gives +1 Defense for the encounter.
 */
export function castSpell(
  state: CombatState,
  rng: Rng,
  pc: Character,
  spell: CastableSpell,
  enemyId: string | null,
): void {
  if (state.phase !== 'pcTurn') throw new CombatError('not the party\u2019s turn')
  const L = pc.level
  // Casting from memory spends the slot — success or waste (FADEE p.64).
  const slotIdx = pc.spells.indexOf(spell)
  if (slotIdx >= 0) pc.spells.splice(slotIdx, 1)
  castSpellEffect(state, rng, pc, spell, enemyId, L)
}

/** Spell effect body shared by memorized casts (bonus +L) and scrolls (p.75). */
function castSpellEffect(
  state: CombatState,
  rng: Rng,
  pc: Character,
  spell: CastableSpell,
  enemyId: string | null,
  bonus: number,
): void {
  if (spell === 'escape') {
    // FADEE p.68: caster reappears in the first tile — party retreats.
    log(state, `${pc.name} casts Escape! The party teleports to the dungeon entrance.`)
    for (const e of state.enemies) e.fled = true
    state.phase = 'fled'
    return
  }
  if (spell === 'protection') {
    state.protections = state.protections ?? {}
    state.protections[pc.id] = (state.protections[pc.id] ?? 0) + 1
    log(state, `${pc.name} casts Protection: +1 to Defense rolls until the encounter ends.`)
    endPcTurn(state, rng)
    return
  }
  const enemy = enemyId ? state.enemies.find((e) => e.id === enemyId) : null
  if (!enemy || enemy.fled || (enemy.count === 0 && !enemy.profile.major)) {
    throw new CombatError('spell needs a target')
  }
  const { rolls, total } = rollCombatDie(state, rng, `spellcasting roll (${pc.name}, ${spell})`)
  const castTotal = total + bonus + (state.darknessPenalty ?? 0)
  log(state, `${pc.name} casts ${spell}: d6[${rolls.join('+')}] +${bonus}${(state.darknessPenalty ?? 0) < 0 ? ' -2 darkness' : ''} = ${castTotal} vs L${effectiveLevel(state, enemy)}`)
  if (castTotal < effectiveLevel(state, enemy)) {
    log(state, 'The spell fails and is wasted.')
    endPcTurn(state, rng)
    return
  }
  const undead = enemy.profile.category === 'Undead'
  if (spell === 'sleep') {
    if (undead || /Artificial|Elemental/.test(enemy.profile.category)) {
      log(state, `${enemy.profile.name} is immune to Sleep.`)
    } else if (enemy.profile.major) {
      enemy.asleep = true
      // Sleep subdues a type-3 Quest target (R089/R155).
      if (state.questTargetName && enemy.profile.name === state.questTargetName) {
        enemy.subduedBySleep = true
        log(state, `The ${enemy.profile.name} falls asleep — subdued, not slain. Tie it up!`)
      } else {
        log(state, `The ${enemy.profile.name} falls asleep! Attacks against it need no Defense roll.`)
      }
    } else {
      const affected = Math.min(enemy.count, rng.formula(`d6+${bonus}`, 'Sleep Minor count'))
      enemy.asleepCount = (enemy.asleepCount ?? 0) + affected
      log(state, `${affected} ${enemy.profile.name} fall asleep.`)
    }
  } else if (spell === 'fireball') {
    if (enemy.profile.major) {
      applyMajorDamage(state, enemy, 1)
    } else {
      const slain = Math.max(1, castTotal - effectiveLevel(state, enemy))
      const killed = Math.min(slain, enemy.count - (enemy.asleepCount ?? 0))
      enemy.count -= killed
      log(state, `Fireball slays ${killed} ${enemy.profile.name} (${castTotal} − L${effectiveLevel(state, enemy)}).`)
      checkMorale(state, enemy, rng)
    }
  } else if (spell === 'lightning') {
    if (enemy.profile.major) {
      applyMajorDamage(state, enemy, 2)
    } else {
      enemy.count -= 1
      log(state, `Lightning slays 1 ${enemy.profile.name}.`)
      checkMorale(state, enemy, rng)
    }
  }
  endPcTurn(state, rng)
}

/** Cleric prayer: heal d6+L Life on any living PC (FADEE p.28). */
export function castHealing(state: CombatState, rng: Rng, pc: Character, target: Character): void {
  if (state.phase !== 'pcTurn') throw new CombatError('not the party\u2019s turn')
  const left = clericPrayersLeft(pc)
  if (left.healing <= 0) throw new CombatError('no Healing prayers left this adventure')
  const amount = rng.formula(`d6+${pc.level}`, `Healing prayer (${pc.name})`)
  // Epic reward — Holy symbol of healing (FADEE p.163): +2 Life healed.
  const symbol = pc.conditions.includes('holy-symbol') ? 2 : 0
  const healed = Math.min(amount + symbol, target.maxLife - target.currentLife)
  target.currentLife += healed
  spendPrayer(pc, 'healing')
  log(state, `${pc.name} prays for Healing: ${target.name} recovers ${healed} Life → ${target.currentLife}/${target.maxLife}.`)
  endPcTurn(state, rng)
}

/** Blessing scroll slot name in equipment ('scroll of blessing', FADEE p.84). */
export type ScrollSpell = CastableSpell | 'blessing'

/**
 * Cast a spell from a scroll (FADEE p.75): any PC except barbarians may spend
 * 1 turn reading it. Spellcasting roll bonus: actual spellcasters +L; PCs who
 * are not spellcasters +1; clerics add +L only when casting Blessing.
 * Casting destroys the scroll.
 */
export function castScroll(
  state: CombatState,
  rng: Rng,
  pc: Character,
  spell: ScrollSpell,
  enemyId: string | null,
): void {
  if (state.phase !== 'pcTurn') throw new CombatError('not the party\u2019s turn')
  if (pc.classId === 'barbarian') {
    throw new CombatError('barbarians may not use scrolls')
  }
  const idx = pc.equipment.indexOf(`scroll of ${spell}`)
  if (idx < 0) throw new CombatError(`no scroll of ${spell}`)
  pc.equipment.splice(idx, 1)
  if (spell === 'blessing') {
    // Blessing is automatic (FADEE p.67); automate the target: a cursed PC
    // (Cursed Altar, p.152) if any, else the reader.
    const cursed = state.participants.find((p) => p.conditions.includes('cursed'))
    castBlessing(state, pc, cursed ?? pc)
    endPcTurn(state, rng)
    return
  }
  const casterClasses = new Set(['wizard', 'elf', 'illusionist', 'druid'])
  let bonus: number
  if (pc.classId === 'cleric') bonus = 0
  else if (casterClasses.has(pc.classId)) bonus = pc.level
  else bonus = 1
  castSpellEffect(state, rng, pc, spell, enemyId, bonus)
}

/**
 * Blessing works automatically: it removes a curse (or petrification later)
 * (FADEE p.67; cursed altar, p.152).
 */
export function castBlessing(state: CombatState, pc: Character, target?: Character): void {
  const t = target ?? pc
  const before = t.conditions.length
  t.conditions = t.conditions.filter((c) => c !== 'cursed')
  const removed = before !== t.conditions.length
  log(
    state,
    removed
      ? `${pc.name} casts Blessing on ${t.name}: the curse is lifted.`
      : `${pc.name} casts Blessing on ${t.name}: nothing to remove, it still counts against their prayers.`,
  )
}

/**
 * Magic-item casts (R151): a Wand of Sleep or Fireball Staff spends one
 * charge to cast as the wielder's own spell (+L), without spending a
 * memorized slot. The charge bookkeeping lives in magicItems.ts; the
 * caller spends the charge after this returns without throwing.
 */
export function castItemSpell(
  state: CombatState,
  rng: Rng,
  pc: Character,
  spell: 'sleep' | 'fireball',
  enemyId: string | null,
  bonus: number,
): void {
  if (state.phase !== 'pcTurn') throw new CombatError('not the party\u2019s turn')
  castSpellEffect(state, rng, pc, spell, enemyId, bonus)
}

/** Ring of Teleportation (R151): auto-pass a Defense roll by leaving combat. */
export function useTeleportRing(state: CombatState, pc: Character): void {
  const idx = pc.equipment.indexOf('Ring of Teleportation')
  if (idx < 0) throw new CombatError('no Ring of Teleportation')
  pc.equipment.splice(idx, 1)
  state.participants = state.participants.filter((p) => p.id !== pc.id)
  log(state, `${pc.name} twists the Ring of Teleportation and vanishes from the fight — the ring loses its powers.`)
  if (!state.participants.some((p) => p.status !== 'dead')) {
    state.phase = 'fled'
    log(state, 'The whole party has left the fight.')
  }
}

/** Fools' Gold (R151): automatically satisfies the next Bribe demand. */
export function payBribeWithFoolsGold(state: CombatState, party: Character[]): boolean {
  const bribe = state.pendingBribe
  if (!bribe) return false
  const holder = party.find((p) => p.equipment.includes("Fools' Gold"))
  if (!holder) return false
  holder.equipment.splice(holder.equipment.indexOf("Fools' Gold"), 1)
  const enemy = state.enemies.find((e) => e.id === bribe.enemyGroupId)
  if (enemy) {
    enemy.fled = true
    log(state, `Fools' Gold! The ${enemy.profile.name} accept the pouch and let the party pass.`)
  }
  state.pendingBribe = null
  if (combatOver(state)) finishCombat(state, { d: () => 1 } as unknown as Rng)
  else state.phase = 'pcTurn'
  return true
}

/** Xicthul's Cap (R154): thrown, d3 damage automatically; thrower takes 1. */
export function throwXicthulCap(state: CombatState, rng: Rng, pc: Character, enemyId: string): void {
  if (state.phase !== 'pcTurn') throw new CombatError('not the party\u2019s turn')
  const enemy = state.enemies.find((e) => e.id === enemyId && !e.fled && e.count > 0)
  if (!enemy) throw new CombatError('target not available')
  const dmg = rng.d3()
  if (enemy.profile.major) {
    applyMajorDamage(state, enemy, dmg)
  } else {
    const slain = Math.min(dmg, enemy.count)
    enemy.count -= slain
    log(state, `Xicthul's Cap bursts: ${slain} ${enemy.profile.name} slain.`)
    checkMorale(state, enemy, rng)
  }
  pc.currentLife = Math.max(0, pc.currentLife - 1)
  log(state, `${pc.name} takes 1 damage from the cap's bite → ${pc.currentLife}/${pc.maxLife}.`)
  if (pc.currentLife === 0) {
    pc.status = 'dead'
    log(state, `${pc.name} has fallen!`)
  }
  endPcTurn(state, rng)
}

/** Red Death (R154): thrown, 1 damage or -1 L to living Foes for 1 turn. */
export function throwRedDeath(
  state: CombatState,
  rng: Rng,
  pc: Character,
  enemyId: string,
  mode: 'damage' | 'weaken',
): void {
  if (state.phase !== 'pcTurn') throw new CombatError('not the party\u2019s turn')
  const enemy = state.enemies.find((e) => e.id === enemyId && !e.fled && e.count > 0)
  if (!enemy) throw new CombatError('target not available')
  if (mode === 'damage') {
    if (enemy.profile.major) applyMajorDamage(state, enemy, 1)
    else {
      enemy.count -= 1
      log(state, `Red Death slays 1 ${enemy.profile.name}.`)
      checkMorale(state, enemy, rng)
    }
  } else {
    enemy.levelPenaltyUntilRound = state.round + 1
    log(state, `Red Death weakens the ${enemy.profile.name}: -1 L until the end of next round.`)
  }
  endPcTurn(state, rng)
}

/**
 * Healing potion: heals ALL damage; max 1 per PC per adventure; free action,
 * usable during combat (FADEE p.83).
 */
export function drinkHealingPotion(state: CombatState | null, pc: Character): string {
  if (pc.conditions.includes('potion-drunk')) {
    throw new CombatError('a PC may drink only 1 healing potion per adventure')
  }
  const idx = pc.equipment.indexOf('healing potion')
  if (idx >= 0) pc.equipment.splice(idx, 1)
  const healed = pc.maxLife - pc.currentLife
  pc.currentLife = pc.maxLife
  pc.conditions.push('potion-drunk')
  const msg =
    healed > 0
      ? `${pc.name} drinks a healing potion and recovers ALL ${healed} lost Life → ${pc.currentLife}/${pc.maxLife}.`
      : `${pc.name} drinks a healing potion at full Life — it is wasted.`
  if (state) log(state, msg)
  return msg
}

/**
 * Bandage: heals 1 Life; 1 per PC per adventure; may NOT be applied in combat
 * (FADEE p.83).
 */
export function applyBandage(pc: Character): string {
  if (pc.conditions.includes('bandage-used')) {
    throw new CombatError('each PC may use only 1 bandage per adventure')
  }
  const idx = pc.equipment.indexOf('bandage')
  if (idx < 0) throw new CombatError('no bandage')
  pc.equipment.splice(idx, 1)
  if (pc.currentLife < pc.maxLife) {
    pc.currentLife += 1
    pc.conditions.push('bandage-used')
    return `${pc.name} applies a bandage: +1 Life → ${pc.currentLife}/${pc.maxLife}.`
  }
  pc.conditions.push('bandage-used')
  return `${pc.name} applies a bandage at full Life — it is wasted.`
}
