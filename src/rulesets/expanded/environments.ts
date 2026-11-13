/**
 * Environment data — caverns & fungal grottoes (Release 0.5).
 *
 * Transcribed from docs/RULES_VERIFICATION.md Part 12 (caverns pp.171-174,
 * fungal pp.175-178), Part 10 (traps pp.165-166), Part 11 (R150-R154) and
 * Part 9 (R141-R144). Same MonsterProfile shape as the dungeon tables in
 * monsters.ts; numbers are data, descriptions are original paraphrases.
 *
 * TWO HONEST GAPS in the ledger (flagged, not filled silently):
 * - Group sizes: the cavern/fungal entries in Part 12 give L formulas and
 *   Life formulas but no count formulas. Counts below are category
 *   defaults (Vermin 2d6/d6, Minions d6, Weird/Boss 1) — verify against the
 *   book before calling them VERIFIED.
 * - Reactions: no per-profile d6 Reactions tables are transcribed for these
 *   environments. The generic rows below (flee/fight for Vermin, bribe for
 *   Minions, bribe/fight for Weird/Bosses) are engine defaults so Reactions
 *   still roll; they are NOT book data.
 */
import type { MonsterProfile, TableKind } from './monsters'

export type EnvironmentId = 'dungeon' | 'caverns' | 'fungal'

export const ENVIRONMENT_LABELS: Record<EnvironmentId, string> = {
  dungeon: 'Dungeon',
  caverns: 'Caverns',
  fungal: 'Fungal grottoes',
}

type EnvTables = Record<TableKind, MonsterProfile[]>

function prof(
  roll: number,
  name: string,
  family: MonsterProfile['family'],
  category: string,
  levelOffset: number,
  countFormula: string,
  extra: Partial<MonsterProfile> & { special: string[]; reactions: string[] },
): MonsterProfile {
  return {
    roll,
    name,
    family,
    category,
    levelOffset,
    countFormula,
    attacks: 1,
    treasure: '0',
    ...extra,
    source: extra.source ?? '',
  }
}

export const CAVERN_TABLES: EnvTables = {
  vermin: [
    prof(1, 'Echo Bats', 'vermin', 'Animal', 1, '2d6', {
      levelCap: 4,
      special: ['+1 L in echo tiles.'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.171',
    }),
    prof(2, 'Mud Centipedes', 'vermin', 'Animal', 0, 'd6', {
      levelCap: 4,
      special: ['They ignore the party unless a pool is inspected.'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.171',
    }),
    prof(3, 'Vengeance Cockroaches', 'vermin', 'Animal', 1, '2d6', {
      levelCap: 3,
      special: ['Ones that escape rejoin a later encounter.'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.171',
    }),
    prof(4, 'Stalactomimics', 'vermin', 'Animal', 2, 'd6', {
      special: ['Each one auto-surprises the party once.'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.172',
    }),
    prof(5, 'Screaming Toads', 'vermin', 'Animal', 3, 'd6', {
      special: ['Spellcasting rolls are at -1 near them. 2-in-6 Wandering Monsters if not slain in one turn.'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.172',
    }),
    prof(6, 'Red Cave Spiders', 'vermin', 'Animal', 2, 'd6', {
      special: ['A hit dealing 2+ damage paralyzes a limb (d6: arm or leg).'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.172',
    }),
  ],
  minions: [
    prof(1, 'Morlocks', 'goblinoid', '', 3, 'd6', {
      special: ['The light-bearer defends at +2 against them.'],
      reactions: ['1 Flee if outnumbered', '2-3 Bribe (5gp each)', '4-6 Fight'],
      source: 'FADEE p.172',
    }),
    prof(2, 'Cave Goblins', 'goblinoid', '', 2, 'd6', {
      levelCap: 5,
      special: ['2-in-6 surprise. Heavy armor gives +1 Defense against their clubs.'],
      reactions: ['1 Flee if outnumbered', '2-3 Bribe (5gp each)', '4-6 Fight'],
      source: 'FADEE p.172',
    }),
    prof(3, 'Cave Skeletons', 'undead', 'Undead', 2, 'd6', {
      special: ['1-in-6 surprise. Crushing weapons attack at +1; a vial of holy water destroys 2.'],
      reactions: ['Always Fight to the death'],
      neverMorale: true,
      source: 'FADEE p.172',
    }),
    prof(4, 'Rat Men of the Deep', 'goblinoid', '', 2, 'd6', {
      special: ['Each fires a crossbow at HCL+3 before melee. Their flails negate shields.'],
      reactions: ['1 Flee if outnumbered', '2-3 Bribe (5gp each)', '4-6 Fight'],
      source: 'FADEE p.173',
    }),
    prof(5, 'Cave Orcs', 'goblinoid', '', 3, 'd6', {
      special: ['First-turn Defense rolls against them are at -1; heavy armor gives +1 from turn 2.'],
      reactions: ['1-2 Bribe (10gp each)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.173',
    }),
    prof(6, 'Cavemen', 'goblinoid', '', 2, 'd6', {
      levelCap: 5,
      special: ['Two-handed clubs. A fire kill forces a Morale test.'],
      reactions: ['1 Flee if outnumbered', '2-3 Bribe (5gp each)', '4-6 Fight'],
      source: 'FADEE p.173',
    }),
  ],
  weird: [
    prof(1, 'Drillworm', 'vermin', 'Animal', 4, '1', {
      lifeFormula: 'HCL+3', attacks: 1, major: true,
      special: ['Tier damage. A Defense roll failed by 1 loses the defender an item.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.173',
    }),
    prof(2, 'Cavern Wraith', 'undead', 'Undead', 3, '1', {
      lifeFormula: 'HCL+2', lifeFloor: 4, attacks: 1, major: true,
      special: ['If it ends a round unhurt, all PCs lose 1 Life. Holy water deals 2 damage to it.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.173',
    }),
    prof(3, 'Cavern Sludge', 'beast', 'Slime', 2, '1', {
      lifeFormula: 'T+3', attacks: 1, major: true,
      special: ['It makes 1 attack per PC. Lightning drops its L by 2. 4-in-6 surprise.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.174',
    }),
    prof(4, 'Minosaur', 'beast', '', 4, '1', {
      lifeFormula: 'HCL+4', attacks: 3, major: true,
      special: ['+1 L on its first turn unless hit by ranged fire first. A Defense roll failed by 1 knocks the defender down.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.174',
    }),
    prof(5, 'Cornucopia of Chaos', 'demon', 'Chaos', 6, '1', {
      lifeFormula: 'T+2', attacks: 1, major: true,
      special: ['Spawns d6 L2 Azure Gremlins each turn; untargetable in melee while any gremlin lives.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.174',
    }),
    prof(6, 'Cave Dragon', 'boss', 'Dragon', 5, '1', {
      lifeFormula: 'HCL+4', attacks: 2, major: true, treasure: '++',
      special: ['Tar spit on the first turn: Defense vs HCL+3 or tarred (eyes on a 1: -1 to all rolls). Fire breath: Save vs HCL+3 or 1 Life.'],
      reactions: ['1 Sleep', '2-3 Bribe (all gp min 100 or 1 magic item)', '4 Quest', '5-6 Fight'],
      source: 'FADEE p.174',
    }),
  ],
  boss: [
    prof(1, 'Manataur', 'beast', '', 4, '1', {
      lifeFormula: 'HCL+3', attacks: 3, major: true,
      special: ['Every spell or prayer cast near it heals it 1 Life.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.173',
    }),
    prof(2, 'Caveman Champion', 'goblinoid', '', 4, '1', {
      lifeFormula: 'HCL+3', attacks: 4, major: true,
      special: ['Morale +1.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.173',
    }),
    prof(3, 'Hoary Ogre', 'goblinoid', '', 4, '1', {
      lifeFormula: 'HCL+3', attacks: 4, major: true,
      special: ['Battle cry: Save vs L4 fear or lose explosions. Paladins are immune.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.174',
    }),
    prof(4, 'Cavern Werebear', 'beast', 'Were', 3, '1', {
      lifeFormula: 'HCL+4', attacks: 2, major: true,
      special: ['Regenerates 1 Life every 3 turns. Silver weapons attack at +Tier.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.174',
    }),
    prof(5, 'Land Siren', 'demon', '', 5, '1', {
      lifeFormula: 'HCL+0', lifeFloor: 3, attacks: 1, major: true,
      special: ['Save vs HCL+2 magic or fall asleep; she gains +1 attack per sleeper. Sleepers are auto-hit; waking one costs 1 turn and they fight at -1.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.174',
    }),
    prof(6, 'Fire Bear', 'beast', '', 2, '1', {
      lifeFormula: 'HCL+4', attacks: 2, major: true,
      special: ['Opening fire breath: Defense vs HCL+3 or 2 Life. It breathes again after any fire attack.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.174',
    }),
  ],
}

export const FUNGAL_TABLES: EnvTables = {
  vermin: [
    prof(1, 'Spore Mites', 'vermin', 'Mushroom', 0, '2d6', {
      levelCap: 3,
      special: ['Coughing: -1 to attack rolls.'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.175',
    }),
    prof(2, 'Glowmaggots', 'vermin', 'Mushroom', 0, '2d6', {
      levelCap: 2,
      special: ['Their glow lights the tile — no lantern needed here. Edible with an L1 poison Save.'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.175',
    }),
    prof(3, 'Fungus Leeches', 'vermin', 'Mushroom', 1, 'd6', {
      levelCap: 4,
      special: ['A PC hit must Save vs L4 poison or lose 1 additional Life.'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.175',
    }),
    prof(4, 'Myco-Gnats', 'vermin', 'Mushroom', 0, '2d6', {
      levelCap: 4,
      special: ['Spellcasting and ranged attacks are at -1. A Fireball kills them all.'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.176',
    }),
    prof(5, 'Spore Toads', 'vermin', 'Mushroom', 2, 'd6', {
      levelCap: 4,
      special: ['1-in-6 per turn: a hallucinogenic belch.'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.176',
    }),
    prof(6, 'Boneworms', 'vermin', 'Mushroom', 2, 'd6', {
      levelCap: 5,
      special: ['A PC slain by them cannot be resurrected. Holy water forces a Morale test.'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.176',
    }),
  ],
  minions: [
    prof(1, 'Spore Men', 'goblinoid', 'Mushroom', 2, 'd6', {
      levelCap: 8,
      special: ['A PC hit must Save vs poison or lose 1 additional Life.'],
      reactions: ['1 Flee if outnumbered', '2-3 Bribe (5gp each)', '4-6 Fight'],
      source: 'FADEE p.176',
    }),
    prof(2, 'Halfling Mushroom Pickers', 'goblinoid', 'Mushroom', 1, 'd6', {
      levelCap: 5,
      special: ['They would rather trade than fight.'],
      reactions: ['1-2 Trade', '3-4 Bribe (5gp each)', '5-6 Fight'],
      source: 'FADEE p.176',
    }),
    prof(3, 'Moldspawn', 'beast', 'Mushroom', 3, 'd6', {
      special: ['Disease Save on a hit: fail and lose 1 Life at the end of the encounter.'],
      reactions: ['1 Flee if outnumbered', '2-3 Bribe (5gp each)', '4-6 Fight'],
      source: 'FADEE p.176',
    }),
    prof(4, 'Myceliarchs', 'beast', 'Mushroom', 3, 'd6', {
      special: ['Sleep-spore cloud at combat start: Save vs L3 magic or skip a turn.'],
      reactions: ['1 Flee if outnumbered', '2-3 Bribe (5gp each)', '4-6 Fight'],
      source: 'FADEE p.177',
    }),
    prof(5, 'Cave Locusts', 'vermin', 'Animal', 0, '2d6', {
      levelCap: 5,
      special: ['Armor Defense is doubled against them. They eat d6 rations.'],
      reactions: ['1-3 Flee', '4-6 Fight'],
      source: 'FADEE p.177',
    }),
    prof(6, 'Toadstool Knights', 'goblinoid', 'Mushroom', 4, 'd6', {
      special: ['The cap-shield absorbs the first hit. Warp Wood destroys their caps.'],
      reactions: ['1 Flee if outnumbered', '2-3 Bribe (5gp each)', '4-6 Fight'],
      source: 'FADEE p.177',
    }),
  ],
  weird: [
    prof(1, 'Shroom Colossus', 'beast', 'Mushroom', 5, '1', {
      lifeFormula: 'T+5', attacks: 3, major: true,
      special: ['3 attacks at Tier damage. Never found in corridors. A PC at 0 Life is digested.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.177',
    }),
    prof(2, 'Spore Swarm', 'vermin', 'Mushroom', 3, '1', {
      lifeFormula: 'T+3', attacks: 1, major: true,
      special: ['Fire attacks add +Tier against it.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.177',
    }),
    prof(3, 'Myco-Mimic', 'beast', 'Mushroom', 4, '1', {
      lifeFormula: 'T+2', attacks: 3, major: true,
      special: ['Auto-surprise. A PC hit must Save vs L3 poison or be paralyzed 1 turn.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.177',
    }),
    prof(4, 'Hallucinogenic Horror', 'demon', 'Mushroom', 3, '1', {
      lifeFormula: 'T+4', attacks: 1, major: true,
      special: ['Each turn a random PC Saves vs L3 magic or attacks an ally.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.178',
    }),
    prof(5, 'Fungus-infected Hydra', 'beast', 'Mushroom', 4, '1', {
      lifeFormula: 'T+4', attacks: 5, major: true,
      special: ['Tier+4 attacks (5 at Tier 1); -1 attack per Life lost. Heads regrow in 2 turns unless burned with fire.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.178',
    }),
    prof(6, 'Spore Phantom', 'undead', 'Mushroom', 3, '1', {
      lifeFormula: 'T+3', attacks: 2, major: true,
      special: ['A PC hit must Save vs L3 magic or lose 1 Life at the end of the turn. Holy water deals 2 damage; druids add +L.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.178',
    }),
  ],
  boss: [
    prof(1, 'Myco-Tyrant', 'beast', 'Mushroom', 4, '1', {
      lifeFormula: 'T+3', attacks: 3, major: true,
      special: ['Combat-start poison Save vs L4 or 1 Life.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.177',
    }),
    prof(2, 'Fungus Hag', 'demon', 'Mushroom', 3, '1', {
      lifeFormula: 'T+2', attacks: 2, major: true,
      special: ['A hit deals Tier damage and the victim Saves vs L3 magic or -1 attack.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.177',
    }),
    prof(3, 'Spore Lord', 'beast', 'Mushroom', 5, '1', {
      lifeFormula: 'T+3', attacks: 3, major: true,
      special: ['Spore storm on the first turn: Save vs L5 poison or blinded (-1 attack, -1 Defense).'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.178',
    }),
    prof(4, 'Rot Ogre', 'goblinoid', 'Mushroom', 4, '1', {
      lifeFormula: 'T+4', attacks: 2, major: true,
      special: ['A hit forces a Save vs L3 disease: 1 Life at the end of combat. Halflings defend at +L.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.178',
    }),
    prof(5, 'Caplord Knight', 'goblinoid', 'Mushroom', 4, '1', {
      lifeFormula: 'T+4', attacks: 4, major: true,
      special: ['2-in-6 non-magic hits bounce off. Warp Wood drops its L by 2.'],
      reactions: ['1-2 Bribe (50gp)', '3-5 Fight', '6 Fight to the death'],
      source: 'FADEE p.178',
    }),
    prof(6, 'Fungal Dragon', 'boss', 'Dragon', 5, '1', {
      lifeFormula: 'T+3', attacks: 4, major: true, treasure: '++',
      special: ['1-2 per turn spore breath: Save vs L5 poison or 1 Life.'],
      reactions: ['1 Sleep', '2-3 Bribe (all gp min 100 or 1 magic item)', '4 Quest', '5-6 Fight'],
      source: 'FADEE p.178',
    }),
  ],
}

export function tablesFor(env: EnvironmentId): EnvTables {
  return env === 'caverns' ? CAVERN_TABLES : env === 'fungal' ? FUNGAL_TABLES : (null as never)
}

// ---------- Traps (Part 10, pp.165-166) ----------

export const CAVERN_TRAPS = ['stalactite', 'rockslide', 'hiddenPit', 'swingingLog', 'toxicSpores', 'rollingBoulder'] as const
export type CavernTrap = (typeof CAVERN_TRAPS)[number]

export const FUNGAL_TRAPS = ['sleepSpores', 'sporeCloud', 'slimePatch', 'myceliumSnare', 'shriekingMushroom', 'cordyceps'] as const
export type FungalTrap = (typeof FUNGAL_TRAPS)[number]

export const CAVERN_TRAP_INFO: Record<CavernTrap, { text: string; source: string }> = {
  stalactite: { text: 'Stalactite! A random PC Saves vs HCL+2 or loses 1 Life. All add +½L, rogues +L, halflings +½L and may reroll.', source: 'FADEE p.165' },
  rockslide: { text: 'Rockslide! All PCs Save vs HCL+2 or lose 1 Life each. Gnomes and dwarves add +L.', source: 'FADEE p.165' },
  hiddenPit: { text: 'Hidden pit! The leader Saves vs HCL+1 or loses 1 Life and needs help out. 1 Clue finds a secret passage at the bottom.', source: 'FADEE p.165' },
  swingingLog: { text: 'Swinging log! All PCs Save vs HCL in marching order; it stops at the first failure for 2 Life.', source: 'FADEE p.165' },
  toxicSpores: { text: 'Toxic spores! A random PC Saves vs HCL+1 poison or -1 to Saves for 6 rooms. Mushroom monks are immune; foresters and rogues add +L.', source: 'FADEE p.165' },
  rollingBoulder: { text: 'Rolling boulder! d3 PCs Save vs HCL+1 or lose 2 Life each. It ends blocking one opening of the tile.', source: 'FADEE p.165' },
}

export const FUNGAL_TRAP_INFO: Record<FungalTrap, { text: string; source: string }> = {
  sleepSpores: { text: 'Sleep spores! A random PC Saves vs the trap or falls asleep and releases a cloud: all Save vs HCL poison or fall asleep. All asleep and the party dies. Mushroom, artificial, undead and elemental PCs are immune; halflings add +L, others +½L.', source: 'FADEE p.166' },
  sporeCloud: { text: 'Spore cloud! A random PC Saves vs HCL+1, then vs HCL+3 poison: 1 Life and coughing (1-in-6 Wandering Monsters). Halflings and barbarians add +L.', source: 'FADEE p.166' },
  slimePatch: { text: 'Slime patch! The leader Saves vs HCL or falls; 1-in-6 Wandering Monsters — if they come, the fallen PC skips a turn.', source: 'FADEE p.166' },
  myceliumSnare: { text: 'Mycelium snare! A random PC Saves vs HCL+3 or one held object is snatched forever.', source: 'FADEE p.166' },
  shriekingMushroom: { text: 'Shrieking mushroom! The leader draws Wandering Monsters on 4-in-6. Halflings and foresters -2, rogues -1.', source: 'FADEE p.166' },
  cordyceps: { text: 'Cordyceps! A random PC Saves vs HCL+3 poison or is mind-controlled: attacks the lowest-Life ally for 6 turns or until Blessing or Healing.', source: 'FADEE p.166' },
}

// ---------- Cavern features (R141/R142, p.112) ----------

export const CAVERN_FEATURES = ['stalactites', 'stalagmites', 'boulders', 'echo', 'waterPools'] as const
export type CavernFeature = (typeof CAVERN_FEATURES)[number]

export const CAVERN_FEATURE_INFO: Record<CavernFeature, { text: string; source: string }> = {
  stalactites: { text: 'Stalactites hang overhead: an explosive two-handed attack here has a 3-in-6 chance of bringing one down.', source: 'FADEE p.112' },
  stalagmites: { text: 'Stalagmites crowd the floor: no attack dice explode here.', source: 'FADEE p.112' },
  boulders: { text: 'Boulders give cover: +1 Defense against ranged attacks, -1 to ranged attacks, +1 to Foe surprise and Stealth.', source: 'FADEE p.112' },
  echo: { text: 'Every sound echoes: -1 Stealth, and Wandering Monsters come on 2-in-6 instead of 1-in-6.', source: 'FADEE p.112' },
  waterPools: { text: 'Still water pools here. Dip in: 1 is contaminated (-1 Saves until Healing or Blessing), 2-4 nothing, 5-6 heal 1 Life (once per PC per adventure).', source: 'FADEE p.112' },
}

/** d6 roll (1 stalactites, 2 stalagmites, 3 boulders, 4 echo, 5-6 water pools). */
export function cavernFeatureForRoll(roll: number): CavernFeature {
  if (roll <= 1) return 'stalactites'
  if (roll === 2) return 'stalagmites'
  if (roll === 3) return 'boulders'
  if (roll === 4) return 'echo'
  return 'waterPools'
}

// ---------- Special events per environment (R160, pp.155-156) ----------

export const CAVERN_EVENTS = ['goblinScout', 'cavemenExplorers', 'morlockSpy', 'trap', 'dwarfGem', 'dwarfMiner'] as const
export type CavernEvent = (typeof CAVERN_EVENTS)[number]

export const FUNGAL_EVENTS = ['halflingScout', 'mushroomHunters', 'sporeCloudEvent', 'trapAndItem', 'monkSense', 'merchant'] as const
export type FungalEvent = (typeof FUNGAL_EVENTS)[number]

export const CAVERN_EVENT_INFO: Record<CavernEvent, { text: string; source: string }> = {
  goblinScout: { text: 'A cave goblin scout offers its services for 10gp: no surprise and +1 Saves until the party leaves the caverns.', source: 'FADEE p.155' },
  cavemenExplorers: { text: 'd6 cavemen explorers demand 2 rations — pay, or fight them.', source: 'FADEE p.155' },
  morlockSpy: { text: 'A morlock spy offers to keep its kin off the party for 5gp: no morlock surprise.', source: 'FADEE p.155' },
  trap: { text: 'Roll on the Caverns Traps Table.', source: 'FADEE p.155' },
  dwarfGem: { text: 'A dwarf-only gem worth d6×10gp — with a 1-in-6 chance of Wandering Monsters.', source: 'FADEE p.155' },
  dwarfMiner: { text: 'A dwarf miner buys and sells gems for 25gp; a trade reveals the next tile\u2019s content.', source: 'FADEE p.155' },
}

export const FUNGAL_EVENT_INFO: Record<FungalEvent, { text: string; source: string }> = {
  halflingScout: { text: 'A halfling scout offers its services for 10gp: no surprise and +1 Saves in the grottoes.', source: 'FADEE p.156' },
  mushroomHunters: { text: 'd6+2 mushroom-hunting cavemen: 4 rations, or 1 rare mushroom, or fight. Fed, they reveal a passage.', source: 'FADEE p.156' },
  sporeCloudEvent: { text: 'A spore cloud rolls through: all living PCs Save vs HCL poison or lose 2 Life. Halflings and barbarians add +L; mushroom monks are exempt.', source: 'FADEE p.156' },
  trapAndItem: { text: 'A trap — and a rare item roll.', source: 'FADEE p.156' },
  monkSense: { text: 'A mushroom monk\u2019s danger sense: skip the next trap or Wandering Monsters in the grottoes.', source: 'FADEE p.156' },
  merchant: { text: 'A merchant sells equipment at +20% and buys gems and rare mushrooms at resale. Once per adventure; a repeat is a trap instead.', source: 'FADEE p.156' },
}

// ---------- Special-item tables (R152-R154) ----------

export interface SpecialItemDef {
  roll: number
  name: string
  effect: string
  resale: string
  source: string
}

/** Rare Mushroom Table (R152, p.159). Non-magical; any PC; ingested ones not usable in combat. */
export const RARE_MUSHROOMS: SpecialItemDef[] = [
  { roll: 1, name: 'Slumber Amanita', effect: '+Tier to a Sleep casting. 10gp.', resale: '10gp', source: 'FADEE p.159' },
  { roll: 2, name: 'Puffball Smokebomb', effect: 'Free-action drop: the party flees unattacked. Mushroom and artificial Foes are unaffected. 5gp.', resale: '5gp', source: 'FADEE p.159' },
  { roll: 3, name: 'Brown Cap Delight', effect: 'Counts as 1 ration, or 3 as a bribe. 15gp.', resale: '15gp', source: 'FADEE p.159' },
  { roll: 4, name: 'Phoenix Mushroom', effect: '+1 Defense and Saves for 30 minutes / 3 tiles, then lose 1 Life. 15gp.', resale: '15gp', source: 'FADEE p.159' },
  { roll: 5, name: 'Purple Truffle', effect: '3-in-6 fake (worth d6gp); a real one is worth 6d6gp. Halflings may reroll.', resale: 'd6gp or 6d6gp', source: 'FADEE p.159' },
  { roll: 6, name: "Healer's Chanterelle", effect: 'Full heal when eaten. Expires at the end of the adventure.', resale: '—', source: 'FADEE p.159' },
]

/** Caverns Special Item Table (R153, p.160). */
export const CAVERN_SPECIAL_ITEMS: SpecialItemDef[] = [
  { roll: 1, name: 'Cavern gem', effect: 'A gem worth 3d6+3gp.', resale: '3d6+3gp', source: 'FADEE p.160' },
  { roll: 2, name: 'Glittering Crystal', effect: 'A lantern-glow pendant: a hands-free light source. Non-magic. 25gp.', resale: '25gp', source: 'FADEE p.160' },
  { roll: 3, name: 'Map Fragment', effect: 'Pre-roll the next tile once. Worth 30gp as a bribe in the caverns.', resale: '30gp', source: 'FADEE p.160' },
  { roll: 4, name: "Adventurer's body", effect: 'd6 gems worth 10gp each, plus one choice of: heavy armor, lantern, two-handed weapon, bow, crossbow, Blessing scroll, random spell scroll, or a chicken-blood jar.', resale: '—', source: 'FADEE p.160' },
  { roll: 5, name: "Miners' Ointment", effect: 'Once: ignore a Wandering Monsters arrival or gremlins. Non-magic. 20gp.', resale: '20gp', source: 'FADEE p.160' },
  { roll: 6, name: "Miners' Amulet", effect: 'The position-1 wearer ignores 1 trap once per adventure. Magic. 30gp.', resale: '30gp', source: 'FADEE p.160' },
]

/** Fungal Rare Item Table (R154, p.161). */
export const FUNGAL_RARE_ITEMS: SpecialItemDef[] = [
  { roll: 1, name: 'Fungal gem or leafsteel armor', effect: 'A gem worth 2d6+2gp, or leafsteel armor (+2 Defense, counts as light, non-magical, lasts 3 adventures).', resale: '2d6+2gp', source: 'FADEE p.161' },
  { roll: 2, name: "Xicthul's Cap", effect: 'Thrown: d3 damage automatically; the thrower takes 1 damage. 60gp.', resale: '60gp', source: 'FADEE p.161' },
  { roll: 3, name: 'Red Death', effect: 'Thrown: 1 damage, or -1 L, to living Foes. Lasts 1 turn.', resale: '—', source: 'FADEE p.161' },
  { roll: 4, name: "Adventurer's body", effect: 'A rope, 2d6 rations, 2d6gp, and one choice item.', resale: '—', source: 'FADEE p.161' },
  { roll: 5, name: "Mushroom Gatherer's Basket", effect: 'd6 white angels: each is a ration that also heals 2 Life. Worth 10gp after.', resale: '10gp', source: 'FADEE p.161' },
  { roll: 6, name: 'Morel Crusher', effect: 'Forces a Morale roll at -1, once.', resale: '40gp', source: 'FADEE p.161' },
]

// ---------- Quest type 4 retrieval items (R155) ----------

/**
 * The ledger (R155) says type 4 fetches "a rolled rare item" but transcribes
 * no item list. These six are the engine's own list, rolled d6 at quest
 * acceptance — verify against the book before calling them VERIFIED.
 */
export const QUEST_RETRIEVAL_ITEMS = [
  'a silvered dagger',
  'a jeweled chalice',
  "a dragon's tooth",
  'an ancient scroll',
  'a moonstone idol',
  'a golden harp',
] as const
