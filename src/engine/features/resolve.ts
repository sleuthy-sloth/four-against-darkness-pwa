import type { Character } from '../../rulesets/schema/character'
import type { Rng } from '../core/rng'
import {
  type DungeonEvent,
  type DungeonFeature,
  type DungeonTrap,
  DUNGEON_EVENTS,
  DUNGEON_FEATURES,
  DUNGEON_TRAPS,
} from '../../rulesets/expanded/features'
import {
  CAVERN_TRAPS,
  FUNGAL_TRAPS,
  CAVERN_EVENTS,
  FUNGAL_EVENTS,
  type CavernTrap,
  type FungalTrap,
  type CavernEvent,
  type FungalEvent,
  type EnvironmentId,
} from '../../rulesets/expanded/environments'
import { profileFor } from '../../rulesets/expanded/monsters'
import { rollLoot } from '../treasure/loot'

/**
 * Resolution for dungeon special features, events and traps.
 * FADEE Expanded Edition pp.152-153, 163. Pure functions: they take the
 * relevant state fragments and return messages plus mutations.
 */

export interface FeatureResult {
  messages: string[]
  /** Combat that must start immediately (living statue / trap ambush). */
  combat?: {
    enemies: ReturnType<typeof makeEnemies>
    isFinalBoss?: boolean
  }
  /** A player choice the UI must present before the feature resolves. */
  choice?: PendingChoice
  /** Gold found, added to the party pool by the caller. */
  gold?: number
}

export type PendingChoice =
  | { kind: 'temple'; source: string } // pick which PC gains the undead bonus
  | { kind: 'quest'; source: string } // accept or decline the Lady's Quest
  | { kind: 'questPc'; source: string } // who gains the quest-completion XP
  | { kind: 'statue'; source: string; hcl: number; tier: number } // touch or leave
  | { kind: 'puzzle'; source: string; level: number } // solve attempt or leave
  | { kind: 'ghost'; pcIds: string[]; source: string } // per-PC Life or Madness
  | { kind: 'healer'; source: string } // healers sell Life at 10gp
  | { kind: 'alchemist'; source: string } // buy potion/poison

/** Standalone enemies helper (mirrors combat.makeEnemy without importing combat). */
function makeEnemies(
  tableRoll: number,
  level: number,
  count: number,
  tier: number,
  life: number,
  name: string,
  treasure: string,
): Array<{ profile: { name: string; major: boolean; category?: string; lifeFormula: string; flatLife?: number; treasure: string }; level: number; count: number; life: number }> {
  return [
    {
      profile: {
        name,
        major: true,
        category: 'Artificial',
        lifeFormula: 'FLAT',
        flatLife: life,
        treasure,
      },
      level,
      count,
      life,
      ...{ tier },
    },
  ]
}

// ---------- Special Features (FADEE p.152) ----------

export function resolveFeature(
  rng: Rng,
  party: Character[],
  feature: DungeonFeature,
  fountainsSeen: number,
  hcl: number,
  tier: number,
): FeatureResult {
  const messages: string[] = []
  switch (feature) {
    case 'fountain': {
      if (fountainsSeen > 0) {
        return { messages: ['Further fountains have no effect this adventure. (FADEE p.152)'] }
      }
      const healed: string[] = []
      for (const pc of party) {
        if (pc.status !== 'dead' && pc.currentLife < pc.maxLife) {
          pc.currentLife += 1
          healed.push(pc.name)
        }
      }
      messages.push(
        healed.length
          ? `Fountain: ${healed.join(', ')} recover 1 Life. (FADEE p.152)`
          : 'Fountain: all PCs are already at full Life. (FADEE p.152)',
      )
      return { messages }
    }
    case 'temple':
      return {
        messages: ['Blessed Temple: choose a PC to receive +1 Attack vs. undead and demons.'],
        choice: { kind: 'temple', source: 'FADEE p.152' },
      }
    case 'armory':
      return {
        messages: [
          'Armory: the party may swap weapons within class limits; PCs who lost weapons pick up new ones. (FADEE p.152 — weapon exchange lands with the equipment screen)',
        ],
      }
    case 'cursedAltar': {
      const living = party.filter((p) => p.status !== 'dead')
      const victim = living[Math.floor((rng.d(1000) - 1) / 1000 * living.length)]
      if (victim) {
        victim.conditions.push('cursed')
        messages.push(`Cursed Altar: ${victim.name} is cursed (-1 Defense) until a Major Foe falls to them alone, they enter a Blessed Temple, or receive a Blessing. (FADEE p.152)`)
      }
      return { messages }
    }
    case 'statue':
      return {
        messages: ['A statue stands here. Touch it or leave it alone?'],
        choice: { kind: 'statue', source: 'FADEE p.152', hcl, tier },
      }
    case 'puzzleBox': {
      const level = rng.d(6)
      return {
        messages: [`A puzzle box (L${level}) sits here. Try to solve it or leave it alone?`],
        choice: { kind: 'puzzle', source: 'FADEE p.152', level },
      }
    }
    default:
      return { messages: ['(unknown feature)'] }
  }
}

/** Statue: touch result (FADEE p.152). */
export function touchStatue(
  rng: Rng,
  hcl: number,
  tier: number,
  majorTally: number,
): FeatureResult {
  const roll = rng.roll(1, 6, 0, 'statue d6 (FADEE p.152)')
  if (roll >= 4) {
    const gold = rng.roll(3, 6, 0, 'statue gold 3d6 (FADEE p.152)') * 10
    return {
      messages: [`The statue breaks open: ${gold} gp inside, no XP for the encounter. (FADEE p.152)`],
      gold,
    }
  }
  const life = tier + 5
  const level = hcl + 3
  // Final Boss roll as usual: d6 + +1 per Major Foe so far, 6+ (FADEE p.104).
  const bossRoll = rng.roll(1, 6, majorTally, 'Final Boss check (FADEE p.104)')
  const isFinalBoss = bossRoll >= 6
  return {
    messages: [
      `The statue awakens: a L${level} Artificial Boss with ${life} Life fights to the death!${isFinalBoss ? ' It is the dungeon\u2019s FINAL BOSS!' : ''} (FADEE p.152)`,
    ],
    combat: {
      enemies: [
        {
          profile: {
            name: 'Living Statue',
            major: true,
            category: 'Artificial',
            lifeFormula: 'FLAT',
            flatLife: life,
            treasure: isFinalBoss ? '100gp' : '0',
          },
          level,
          count: 1,
          life,
        },
      ],
      isFinalBoss,
    },
  }
}

/** Puzzle box attempt (FADEE p.152). */
export function attemptPuzzle(
  rng: Rng,
  pc: Character,
  level: number,
): { messages: string[]; gold?: number } {
  const bonus =
    pc.classId === 'wizard' || pc.classId === 'rogue' ? pc.level : 0
  const roll = rng.roll(1, 6, bonus, `Save vs. puzzle box L${level} (FADEE p.152)`)
  if (roll >= level) {
    const loot = rollLoot(rng, '0')
    return {
      messages: [`${pc.name} solves the puzzle box! ${loot.text} (FADEE p.152)`],
      gold: loot.gold,
    }
  }
  pc.currentLife = Math.max(0, pc.currentLife - 1)
  const dead = pc.currentLife === 0
  if (dead) pc.status = 'dead'
  return {
    messages: [
      `${pc.name} fumbles the puzzle: the box blasts them for 1 damage (${pc.currentLife}/${pc.maxLife}). (FADEE p.152)`,
    ],
  }
}

// ---------- Special Events (FADEE p.153) ----------

export interface EventResult {
  messages: string[]
  choice?: PendingChoice
  /** 1-in-6 style ambush: enemies to start a forced-surprise combat with. */
  ambush?: {
    table: 'vermin' | 'minions' | 'weird' | 'boss'
    tableRoll: number
    hcl: number
  }
  trap?: DungeonTrap
}

export function rollDungeonEvent(rng: Rng): DungeonEvent {
  return DUNGEON_EVENTS[rng.d(6) - 1]
}

export function resolveEvent(
  rng: Rng,
  party: Character[],
  event: DungeonEvent,
  hcl: number,
  healerMet: boolean,
  alchemistMet: boolean,
  questActive = false,
  ladyRefused = false,
): EventResult {
  const messages: string[] = []
  switch (event) {
    case 'ghost': {
      // Save vs L4 fear; clerics add +L (FADEE p.153).
      const failing: string[] = []
      for (const pc of party) {
        if (pc.status === 'dead') continue
        const bonus = pc.classId === 'cleric' ? pc.level : 0
        const roll = rng.roll(1, 6, bonus, `${pc.name} Save vs. L4 fear (FADEE p.153)`)
        if (roll < 4) failing.push(pc.name)
      }
      return failing.length
        ? {
            messages: [`A ghost passes through! Failed the Save vs. L4 fear: ${failing.join(', ')}.`],
            choice: { kind: 'ghost', pcIds: failing, source: 'FADEE p.153' },
          }
        : { messages: ['A ghost passes through the party — every PC Saves vs. L4 fear. (FADEE p.153)'] }
    }
    case 'wanderingMonsters': {
      // WM table d6: 1-3 vermin, 4 minions, 5 weird, 6 boss (FADEE p.153).
      const tableRoll = rng.d(6)
      const table = tableRoll <= 3 ? 'vermin' : tableRoll === 4 ? 'minions' : tableRoll === 5 ? 'weird' : 'boss'
      return {
        messages: ['Wandering Monsters attack! (FADEE p.153)'],
        ambush: { table, tableRoll, hcl },
      }
    }
    case 'ladyInWhite':
      // Quest system (FADEE pp.153, 161-162): the Lady offers a Quest once;
      // refusing makes her ignore future appearances, and an active Quest
      // means no second Lady.
      if (questActive || ladyRefused) {
        return { messages: [] }
      }
      return {
        messages: ['A Lady in White appears and asks you to complete a Quest.'],
        choice: { kind: 'quest', source: 'FADEE pp.153, 161' },
      }
    case 'trap': {
      const trap = DUNGEON_TRAPS[rng.d(6) - 1]
      return { messages: [], trap }
    }
    case 'healer':
      if (healerMet) {
        // Reroll this result on a repeat meeting (FADEE p.153).
        return resolveEvent(rng, party, 'trap', hcl, healerMet, alchemistMet)
      }
      return {
        messages: ['A wandering healer offers healing at 10gp per Life point.'],
        choice: { kind: 'healer', source: 'FADEE p.153' },
      }
    case 'alchemist':
      if (alchemistMet) {
        return resolveEvent(rng, party, 'trap', hcl, healerMet, alchemistMet)
      }
      return {
        messages: ['A wandering alchemist offers healing potions (50gp) and blade poison (30gp).'],
        choice: { kind: 'alchemist', source: 'FADEE p.153' },
      }
    default:
      return { messages: ['(unknown event)'] }
  }
}

// ---------- Traps (FADEE p.163) ----------

export interface TrapResult {
  messages: string[]
  /** Dead PCs after the trap. */
}

export function resolveTrap(
  rng: Rng,
  party: Character[],
  trap: DungeonTrap,
  hcl: number,
  leaderIndex: number,
): TrapResult {
  const messages: string[] = []
  const living = party.filter((p) => p.status !== 'dead')
  const leader = living[leaderIndex % Math.max(1, living.length)]
  const hurt = (pc: Character, dmg: number) => {
    pc.currentLife = Math.max(0, pc.currentLife - dmg)
    if (pc.currentLife === 0) pc.status = 'dead'
  }
  switch (trap) {
    case 'dart': {
      const victim = living[Math.floor((rng.d(1000) - 1) / 1000 * living.length)]
      if (!victim) break
      const defense = rng.roll(1, 6, 0, `${victim.name} Defense vs. dart HCL+${hcl + 1} (FADEE p.163)`)
      // Halflings reroll a failed Defense roll (FADEE p.163).
      const rolled = defense <= hcl && victim.classId === 'halfling'
        ? rng.roll(1, 6, 0, `${victim.name} halfling reroll (FADEE p.163)`)
        : defense
      if (rolled > hcl) messages.push(`Dart! ${victim.name} dodges. (FADEE p.163)`)
      else {
        hurt(victim, 1)
        messages.push(`Dart! ${victim.name} is hit for 1 Life (${victim.currentLife}/${victim.maxLife}). (FADEE p.163)`)
      }
      break
    }
    case 'poisonGas': {
      const hit: string[] = []
      for (const pc of living) {
        const bonus = pc.classId === 'barbarian' || pc.classId === 'halfling' ? pc.level : 0
        const roll = rng.roll(1, 6, bonus, `${pc.name} Save vs. HCL+${hcl + 2} poison (FADEE p.163)`)
        if (roll < hcl + 2) {
          hurt(pc, 1)
          hit.push(pc.name)
        }
      }
      messages.push(
        hit.length
          ? `Poison gas! ${hit.join(', ')} lose 1 Life each. (FADEE p.163)`
          : 'Poison gas! Everyone holds their breath. (FADEE p.163)',
      )
      break
    }
    case 'trapdoor': {
      if (!leader) break
      let mod = 0
      if (leader.equipment.some((e) => e.includes('light armor'))) mod -= 1
      if (leader.equipment.some((e) => e.includes('heavy armor'))) mod -= 2
      if (leader.classId === 'halfling' || leader.classId === 'elf') mod += 1
      if (leader.classId === 'rogue') mod += leader.level
      const roll = rng.roll(1, 6, mod, `${leader.name} Save vs. trapdoor HCL+${hcl + 3} (FADEE p.163)`)
      if (roll >= hcl + 3) messages.push(`A trapdoor yawns open — ${leader.name} avoids it. (FADEE p.163)`)
      else {
        hurt(leader, 1)
        messages.push(`${leader.name} falls into the trapdoor: 1 Life lost (${leader.currentLife}/${victimMax(leader)}), and an ally must help them out. (FADEE p.163)`)
      }
      break
    }
    case 'bearTrap': {
      if (!leader) break
      let mod = 0
      if (leader.classId === 'halfling' || leader.classId === 'elf') mod += 1
      if (leader.classId === 'rogue') mod += leader.level
      const roll = rng.roll(1, 6, mod, `${leader.name} Save vs. bear trap HCL+${hcl + 3} (FADEE p.163)`)
      if (roll >= hcl + 3) messages.push(`${leader.name} sidesteps the bear trap. (FADEE p.163)`)
      else {
        hurt(leader, 1)
        leader.conditions.push('bear-trapped')
        messages.push(`${leader.name} steps into the bear trap: 1 Life lost, -1 Attack and Defense until the Life is recovered. (FADEE p.163)`)
      }
      break
    }
    case 'spears': {
      const targets: Character[] = []
      const pool = [...living]
      for (let i = 0; i < 2 && pool.length; i++) {
        targets.push(pool.splice(Math.floor((rng.d(1000) - 1) / 1000 * pool.length), 1)[0])
      }
      const hit: string[] = []
      for (const pc of targets) {
        const defense = rng.roll(1, 6, 0, `${pc.name} Defense vs. spears HCL+${hcl + 4} (FADEE p.163)`)
        if (defense <= hcl + 4) {
          hurt(pc, 1)
          hit.push(pc.name)
        }
      }
      messages.push(
        hit.length
          ? `Spears! ${hit.join(', ')} are struck for 1 Life. (FADEE p.163)`
          : 'Spears! Both targets dodge. (FADEE p.163)',
      )
      break
    }
    case 'fallingStone': {
      // Position 4 of the Marching Order — marching order UI pending; use the
      // 4th living PC (flagged in IMPLEMENTATION_STATUS).
      const victim = living[3] ?? living[living.length - 1]
      if (!victim) break
      // Armor bonus applies, shield does not (FADEE p.163).
      let mod = 0
      if (victim.equipment.some((e) => e.includes('heavy armor'))) mod += 2
      else if (victim.equipment.some((e) => e.includes('light armor'))) mod += 1
      const defense = rng.roll(1, 6, mod, `${victim.name} Defense vs. falling stone HCL+${hcl + 4} (FADEE p.163)`)
      if (defense > hcl + 4) messages.push(`The stone crashes down — ${victim.name} leaps clear. (FADEE p.163)`)
      else {
        hurt(victim, 2)
        messages.push(`The stone hits ${victim.name} for 2 Life (${victim.currentLife}/${victim.maxLife}). (FADEE p.163)`)
      }
      break
    }
  }
  return { messages }
}

function victimMax(pc: Character): number {
  return pc.maxLife
}

// ---------- Environment events & traps (Release 0.5, R160, Part 10) ----------

export function rollEnvEvent(rng: Rng, env: EnvironmentId): string {
  if (env === 'caverns') return CAVERN_EVENTS[rng.d(6) - 1]
  if (env === 'fungal') return FUNGAL_EVENTS[rng.d(6) - 1]
  return DUNGEON_EVENTS[rng.d(6) - 1]
}

export interface EnvEventResult {
  messages: string[]
  trap?: CavernTrap | FungalTrap
  gold?: number
}

/** Cavern/fungal special events (R160, pp.155-156). Merchant/scout trades
 * are offered as log text with the price; the actual purchase is a
 * player decision made at the outfitter — no silent substitution. */
export function resolveEnvEvent(
  rng: Rng,
  party: Character[],
  event: string,
  env: EnvironmentId,
  hcl: number,
): EnvEventResult {
  const messages: string[] = []
  const living = party.filter((p) => p.status !== 'dead')
  const hurt = (pc: Character, dmg: number) => {
    pc.currentLife = Math.max(0, pc.currentLife - dmg)
    if (pc.currentLife === 0) pc.status = 'dead'
  }
  if (env === 'caverns') {
    switch (event as CavernEvent) {
      case 'goblinScout':
        return { messages: ['A cave goblin scout offers its services for 10gp: no surprise and +1 Saves until the party leaves the caverns. (Paying is a player choice — the scout waits.)'] }
      case 'cavemenExplorers': {
        const n = rng.d(6)
        return { messages: [`${n} cavemen explorers block the way, demanding 2 rations — pay them, or fight them as Minions.`] }
      }
      case 'morlockSpy':
        return { messages: ['A morlock spy offers to keep its kin off the party for 5gp: no morlock surprise.'] }
      case 'trap': {
        const trap = CAVERN_TRAPS[rng.d(6) - 1]
        return { messages: [`A cavern trap!`], trap }
      }
      case 'dwarfGem': {
        const hasDwarf = living.some((p) => p.classId === 'dwarf')
        if (!hasDwarf) return { messages: ['A gem glints in the rock — but only a dwarf would know it is there.'] }
        const gold = rng.d(6) * 10
        const wm = rng.d(6) === 1
        return {
          messages: [`A dwarf spots a gem worth ${gold}gp!${wm ? ' The digging attracts Wandering Monsters!' : ''}`],
          gold,
        }
      }
      case 'dwarfMiner':
        return { messages: ['A dwarf miner offers to buy and sell gems for 25gp; a trade reveals the next tile\u2019s content.'] }
      default:
        return { messages: ['(unknown cavern event)'] }
    }
  }
  if (env === 'fungal') {
    switch (event as FungalEvent) {
      case 'halflingScout':
        return { messages: ['A halfling scout offers its services for 10gp: no surprise and +1 Saves in the grottoes.'] }
      case 'mushroomHunters': {
        const n = rng.roll(1, 6, 2, 'mushroom hunters d6+2')
        return { messages: [`${n} mushroom-hunting cavemen: 4 rations, or 1 rare mushroom, or fight. Fed, they reveal a passage.`] }
      }
      case 'sporeCloudEvent': {
        const hit: string[] = []
        for (const pc of living) {
          if (pc.classId === 'mushroomMonk' || pc.classId === 'mushroom-monk') continue
          const bonus = pc.classId === 'halfling' || pc.classId === 'barbarian' ? pc.level : 0
          const roll = rng.roll(1, 6, bonus, `${pc.name} Save vs HCL poison (spore cloud)`)
          if (roll < hcl) {
            hurt(pc, 2)
            hit.push(pc.name)
          }
        }
        return { messages: [hit.length ? `A spore cloud rolls through! ${hit.join(', ')} lose 2 Life each.` : 'A spore cloud rolls through — everyone holds their breath.'] }
      }
      case 'trapAndItem': {
        const trap = FUNGAL_TRAPS[rng.d(6) - 1]
        return { messages: ['A fungal trap — and a rare item roll follows.'], trap }
      }
      case 'monkSense':
        return { messages: ['A mushroom monk\u2019s danger sense tingles: the next trap or Wandering Monsters in the grottoes will be skipped. (Only a mushroom monk in the party can use it.)'] }
      case 'merchant':
        return { messages: ['A merchant sells equipment at +20% and buys gems and rare mushrooms at resale. Once per adventure.'] }
      default:
        return { messages: ['(unknown fungal event)'] }
    }
  }
  return { messages: ['(unknown event)'] }
}

export interface EnvTrapResult {
  messages: string[]
  /** Wandering Monsters triggered by the trap (1-in-6 etc.). */
  wanderingMonsters?: boolean
}

/** Cavern (p.165) and fungal (p.166) traps, resolved with the same Save /
 * Defense shape as the dungeon traps. A few book effects have no engine
 * yet (cordyceps mind-control, mycelium item-snatch choice) — those are
 * logged as the trap's text with the mechanical part applied. */
export function resolveEnvTrap(
  rng: Rng,
  party: Character[],
  trap: CavernTrap | FungalTrap,
  env: EnvironmentId,
  hcl: number,
  leaderIndex: number,
): EnvTrapResult {
  const messages: string[] = []
  const living = party.filter((p) => p.status !== 'dead')
  const leader = living[leaderIndex % Math.max(1, living.length)]
  const hurt = (pc: Character, dmg: number) => {
    pc.currentLife = Math.max(0, pc.currentLife - dmg)
    if (pc.currentLife === 0) pc.status = 'dead'
  }
  const randomPc = (): Character | undefined =>
    living[Math.floor((rng.d(1000) - 1) / 1000 * living.length)]
  const halfL = (pc: Character) => Math.floor(pc.level / 2)

  switch (trap) {
    case 'stalactite': {
      const v = randomPc()
      if (!v) break
      const bonus = halfL(v) + (v.classId === 'rogue' ? v.level : 0)
      const roll = rng.roll(1, 6, bonus, `${v.name} Save vs stalactite HCL+${hcl + 2}`)
      if (roll >= hcl + 2) messages.push(`A stalactite crashes down — ${v.name} leaps clear.`)
      else {
        hurt(v, 1)
        messages.push(`A stalactite hits ${v.name} for 1 Life (${v.currentLife}/${v.maxLife}).`)
      }
      break
    }
    case 'rockslide': {
      const hit: string[] = []
      for (const pc of living) {
        const bonus = halfL(pc) + (pc.classId === 'gnome' || pc.classId === 'dwarf' ? pc.level : 0)
        if (rng.roll(1, 6, bonus, `${pc.name} Save vs rockslide HCL+${hcl + 2}`) < hcl + 2) {
          hurt(pc, 1)
          hit.push(pc.name)
        }
      }
      messages.push(hit.length ? `Rockslide! ${hit.join(', ')} lose 1 Life each.` : 'Rockslide! Everyone shelters in time.')
      break
    }
    case 'hiddenPit': {
      if (!leader) break
      if (rng.roll(1, 6, 0, `${leader.name} Save vs hidden pit HCL+${hcl + 1}`) >= hcl + 1) {
        messages.push(`${leader.name} spots the hidden pit in time. (1 Clue finds a secret passage at the bottom.)`)
      } else {
        hurt(leader, 1)
        messages.push(`${leader.name} falls into a hidden pit: 1 Life lost, and an ally must help them out.`)
      }
      break
    }
    case 'swingingLog': {
      let stopped = false
      for (const pc of living) {
        if (stopped) break
        const bonus = halfL(pc) + (pc.classId === 'rogue' ? pc.level : 0)
        if (rng.roll(1, 6, bonus, `${pc.name} Save vs swinging log HCL+${hcl}`) < hcl) {
          hurt(pc, 2)
          messages.push(`The swinging log catches ${pc.name} for 2 Life (${pc.currentLife}/${pc.maxLife}).`)
          stopped = true
        }
      }
      if (!stopped) messages.push('The swinging log sweeps past — everyone ducks in time.')
      break
    }
    case 'toxicSpores': {
      const v = randomPc()
      if (!v) break
      if (v.classId === 'mushroomMonk' || v.classId === 'mushroom-monk') {
        messages.push(`Toxic spores drift past ${v.name} — a mushroom monk breathes them in harmlessly.`)
        break
      }
      const bonus = (v.classId === 'rogue' ? v.level : 0) + (['ranger', 'druid'].includes(v.classId) ? v.level : 0)
      if (rng.roll(1, 6, bonus, `${v.name} Save vs toxic spores HCL+${hcl + 1}`) >= hcl + 1) {
        messages.push(`Toxic spores — ${v.name} holds their breath.`)
      } else {
        v.conditions.push('spore-cough:6')
        messages.push(`${v.name} breathes toxic spores: -1 to Saves for 6 rooms.`)
      }
      break
    }
    case 'rollingBoulder': {
      const n = rng.d3()
      const pool = [...living]
      const hit: string[] = []
      for (let i = 0; i < n && pool.length; i++) {
        const v = pool.splice(Math.floor((rng.d(1000) - 1) / 1000 * pool.length), 1)[0]
        if (rng.roll(1, 6, 0, `${v.name} Save vs rolling boulder HCL+${hcl + 1}`) < hcl + 1) {
          hurt(v, 2)
          hit.push(v.name)
        }
      }
      messages.push(hit.length ? `A rolling boulder crushes ${hit.join(', ')} for 2 Life each, then blocks one opening.` : 'A rolling boulder thunders past and blocks one opening.')
      break
    }
    case 'sleepSpores': {
      const v = randomPc()
      if (!v) break
      const immune = ['mushroomMonk', 'mushroom-monk', 'kukla'].includes(v.classId) || v.classId === 'cleric'
      const bonus = v.classId === 'halfling' ? v.level : halfL(v)
      if (immune || rng.roll(1, 6, bonus, `${v.name} Save vs sleep spores`) >= hcl) {
        messages.push(`Sleep spores drift past — ${v.name} stays awake.`)
      } else {
        v.conditions.push('asleep-spores')
        messages.push(`${v.name} falls asleep in a cloud of spores! (Wake them before the whole party sleeps.)`)
      }
      break
    }
    case 'sporeCloud': {
      const v = randomPc()
      if (!v) break
      const bonus = v.classId === 'halfling' || v.classId === 'barbarian' ? v.level : 0
      if (rng.roll(1, 6, bonus, `${v.name} Save vs spore cloud HCL+${hcl + 1}`) < hcl + 1) {
        hurt(v, 1)
        v.conditions.push('coughing')
        messages.push(`${v.name} chokes on a spore cloud: 1 Life, and coughing (1-in-6 Wandering Monsters).`)
      } else {
        messages.push(`A spore cloud bursts — ${v.name} holds their breath.`)
      }
      break
    }
    case 'slimePatch': {
      if (!leader) break
      if (rng.roll(1, 6, 0, `${leader.name} Save vs slime patch HCL+${hcl}`) >= hcl) {
        messages.push(`${leader.name} steps around the slime patch.`)
      } else {
        leader.conditions.push('slimed')
        messages.push(`${leader.name} slips in slime and falls! (1-in-6 Wandering Monsters; if they come, the fallen PC skips a turn.)`)
      }
      break
    }
    case 'myceliumSnare': {
      const v = randomPc()
      if (!v) break
      if (rng.roll(1, 6, 0, `${v.name} Save vs mycelium snare HCL+${hcl + 3}`) >= hcl + 3) {
        messages.push(`${v.name} tears free of the mycelium snare.`)
      } else {
        const item = v.equipment.find((e) => !/armor|shield|weapon/.test(e)) ?? v.equipment[0]
        if (item) v.equipment.splice(v.equipment.indexOf(item), 1)
        messages.push(`A mycelium snare snatches ${item ?? 'an item'} from ${v.name} — gone forever.`)
      }
      break
    }
    case 'shriekingMushroom': {
      if (!leader) break
      const mod = leader.classId === 'halfling' || ['ranger', 'druid'].includes(leader.classId) ? -2 : leader.classId === 'rogue' ? -1 : 0
      const roll = rng.d(6) + mod
      if (roll <= 4) {
        messages.push('A shrieking mushroom screams — Wandering Monsters are coming!')
        return { messages, wanderingMonsters: true }
      }
      messages.push('A shrieking mushroom screams — but nothing answers.')
      break
    }
    case 'cordyceps': {
      const v = randomPc()
      if (!v) break
      const bonus = v.classId === 'halfling' || v.classId === 'barbarian' ? v.level : 0
      if (rng.roll(1, 6, bonus, `${v.name} Save vs cordyceps HCL+${hcl + 3}`) >= hcl + 3) {
        messages.push(`${v.name} shakes off the cordyceps spores.`)
      } else {
        v.conditions.push('cordyceps:6')
        messages.push(`${v.name} is mind-controlled by cordyceps: they attack the lowest-Life ally for 6 turns, or until Blessing or Healing. (Control is tracked as a condition; the next combat resolves it.)`)
      }
      break
    }
    default:
      messages.push('(unknown environment trap)')
  }
  void env
  return { messages }
}
