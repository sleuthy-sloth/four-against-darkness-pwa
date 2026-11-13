/**
 * Release 0.5 e2e fixtures — generator (committed).
 *
 * Builds the 10 campaign archives the e2e-05 specs import
 * (tests/e2e-05/fixtures/*.json) from the repo's own engine, so the suite
 * passes from a clean checkout with no /tmp dependency.
 *
 * Every RNG-critical outcome is verified by SIMULATING the exact engine
 * call sequence the app will run after import, and brute-forcing the
 * fixture's rngState seed until the simulation passes:
 *  - search / search-caverns / search-fungal: the first Search d6 lands a find.
 *  - dark: the first Reaction d6 makes the Rats flee (1-3).
 *  - scroll: the first Fireball d6 slays both Skeletons.
 *  - trinket: the opening attack leaves Rats standing (no Morale flight).
 *  - quest3: the whole Sleep + subdual fight succeeds within 12 subdues.
 *  - slow: Anya solos the Ogre Final Boss within 40 attacks, nobody dies.
 *
 * Run: `npm run make-fixtures` (also runs as part of `npm test`, so the
 * fixtures stay in sync with the engine). The archives are plain
 * CampaignArchive JSON — the app imports them through Settings → Import
 * JSON, which mints a fresh campaign id.
 */
import { describe, expect, it } from 'vitest'
// @ts-ignore: this project has no @types/node; vitest runs in node, so the
// node: builtins resolve at runtime — tsc just can't see their types.
import fs from 'node:fs'
// @ts-ignore: see above.
import path from 'node:path'
// @ts-ignore: see above.
import { fileURLToPath } from 'node:url'
import { Rng } from '../../src/engine/core/rng'
import {
  newDungeon,
  exploreThrough,
  searchTile,
  generateSecretDoorTile,
  type DungeonState,
  type PlacedTile,
} from '../../src/engine/dungeon/generate'
import { D66_TILES } from '../../src/rulesets/expanded/tiles'
import {
  attemptBash,
  attemptDisarm,
  attemptLockpick,
  attemptSealed,
} from '../../src/engine/dungeon/doors'
import { DUNGEON_TABLES, type MonsterProfile, type TableKind } from '../../src/rulesets/expanded/monsters'
import { createParty, lifeAt } from '../../src/engine/characters/create'
import { CORE_CLASSES } from '../../src/rulesets/expanded/coreClasses'
import {
  startCombat,
  pcAttack,
  castSpell,
  castScroll,
  castItemSpell,
  rollReactions,
  makeEnemy,
  lifeFromFormula,
  xpDue,
  type CombatState,
} from '../../src/engine/combat/combat'
import type { Character } from '../../src/rulesets/schema/character'
import type { CampaignArchive } from '../../src/database/repositories/backupRepo'
import type { CampaignMeta } from '../../src/database/db'
import type { EnvironmentId } from '../../src/rulesets/expanded/environments'

const FIXTURES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

/** Creation seed for every fixture party (the tutorial delve's seed). */
const PARTY_SEED = 1481

function byName(party: Character[], name: string): Character {
  const pc = party.find((p) => p.name === name)
  if (!pc) throw new Error(`no ${name} in party`)
  return pc
}

/** The tutorial party: Torsten (warrior), Anya (cleric), Fen (wizard), Joss (rogue). */
function buildParty(campaignId: string): Character[] {
  return createParty(
    [
      {
        classId: 'warrior',
        name: 'Torsten',
        extraEquipment: ['bag of nails', 'bag of nails', 'bag of nails', 'bag of nails'],
      },
      { classId: 'cleric', name: 'Anya' },
      { classId: 'wizard', name: 'Fen', spells: ['sleep', 'fireball', 'lightning'] },
      { classId: 'rogue', name: 'Joss' },
    ],
    new Rng(PARTY_SEED),
    campaignId,
  )
}

function setLevel(party: Character[], name: string, level: number): void {
  const pc = byName(party, name)
  const def = CORE_CLASSES.find((c) => c.id === pc.classId)
  if (!def) throw new Error(`unknown class ${pc.classId}`)
  pc.level = level
  pc.maxLife = lifeAt(level, def.lifeFormula)
  pc.currentLife = pc.maxLife
}

function give(party: Character[], name: string, item: string): void {
  byName(party, name).equipment.push(item)
}

/** Party order the app loads from Dexie: alphabetical by class id. */
function dexieOrder(party: Character[]): Character[] {
  return ['Anya', 'Joss', 'Torsten', 'Fen'].map((n) => byName(party, n))
}

/**
 * Dungeon with a second tile that is a ROOM with 'empty' content (the only
 * searchable kind) — brute-forced over dungeon seeds. The returned tile is
 * the current tile.
 */
function buildDungeon(campaignId: string, env: EnvironmentId): { dungeon: DungeonState; tile: PlacedTile } {
  for (let seed = 1; seed <= 500; seed++) {
    const rng = new Rng(seed)
    const dungeon = newDungeon(campaignId, rng)
    dungeon.environment = env
    const t1 = dungeon.tiles[0]
    exploreThrough(dungeon, rng, t1.exits[0].id, 1)
    if (dungeon.tiles.length < 2) continue
    const t2 = dungeon.tiles[1]
    const shape = D66_TILES.find((t) => t.id === t2.shapeId)
    if (shape?.corridor) continue
    if (t2.content?.kind !== 'empty') continue
    // The secret-door test needs a wall left to draw a door on: the tile
    // must keep at least one open exit (a 1-exit room has none).
    if (!t2.exits.some((e) => !e.toTileId)) continue
    // ... and the door beyond it must be able to lead somewhere: the
    // first open exit's outward cell must admit at least one d66 shape
    // (an exit facing off-grid can never place a tile, whatever is
    // rolled). Probe the real generation call across seeds.
    let doorLeadsSomewhere = false
    for (let probeSeed = 1; probeSeed <= 200; probeSeed++) {
      const probeRng = new Rng(probeSeed)
      probeRng.d(6) // the Search roll that precedes the generation
      const probe = structuredClone(dungeon)
      if (generateSecretDoorTile(probe, probeRng, 1).toTileId !== null) {
        doorLeadsSomewhere = true
        break
      }
    }
    if (!doorLeadsSomewhere) continue
    dungeon.currentTileId = t2.id
    return { dungeon, tile: t2 }
  }
  throw new Error(`no empty-room dungeon seed for env ${env}`)
}

/**
 * Doors fixture dungeon: a chain of four pre-generated tiles. A tile has
 * at most 2-3 open exits, so no single tile can host every door kind —
 * each tile's onward link IS one of the test doors, plus one extra door:
 * t2: link locked L2 (picked open, then travelled), extra locked L7
 * (pick fails, then bashed); t3: link trapped L2 (disarmed), extra lever
 * (1 Clue); t4: link sealed L2 (spellcaster roll), extra iron
 * (Lightning); t5: extra illusionary (3 Clues). The way back on each
 * tile is forced to a door kind that tile never tests, so the spec can
 * tell it apart from the link and the extra by the dialog it opens —
 * clicking it only ever opens the dialog, never walks the party back.
 * New tiles are forced empty so stepping into them resolves no feature,
 * event, or combat.
 */
function buildDoorsDungeon(
  campaignId: string,
): { dungeon: DungeonState; t2: PlacedTile; t3: PlacedTile; t4: PlacedTile; t5: PlacedTile } {
  for (let seed = 1; seed <= 20000; seed++) {
    const rng = new Rng(seed)
    const dungeon = newDungeon(campaignId, rng)
    dungeon.environment = 'dungeon'
    const t1 = dungeon.tiles[0]
    exploreThrough(dungeon, rng, t1.exits[0].id, 1)
    if (dungeon.tiles.length < 2) continue
    const t2 = dungeon.tiles[1]
    // t2's content never resolves: the fixture loads with the party
    // already standing on it, and resolution only runs on entry through
    // explore(). Only the onward tiles (entered later, in play) are
    // forced empty below.
    if (t2.exits.filter((e) => !e.toTileId).length < 2) continue
    const link2 = t2.exits.find((e) => !e.toTileId)!
    exploreThrough(dungeon, rng, link2.id, 1)
    if (dungeon.tiles.length < 3) continue
    const t3 = dungeon.tiles[2]
    if (t3.exits.filter((e) => !e.toTileId).length < 2) continue
    const link3 = t3.exits.find((e) => !e.toTileId)!
    exploreThrough(dungeon, rng, link3.id, 1)
    if (dungeon.tiles.length < 4) continue
    const t4 = dungeon.tiles[3]
    if (t4.exits.filter((e) => !e.toTileId).length < 2) continue
    const link4 = t4.exits.find((e) => !e.toTileId)!
    exploreThrough(dungeon, rng, link4.id, 1)
    if (dungeon.tiles.length < 5) continue
    const t5 = dungeon.tiles[4]
    if (t5.exits.filter((e) => !e.toTileId).length < 1) continue
    for (const t of [t3, t4, t5]) {
      t.contentRoll = 9
      t.content = { roll: 9, kind: 'empty' }
    }
    dungeon.currentTileId = t2.id
    return { dungeon, t2, t3, t4, t5 }
  }
  throw new Error('no doors dungeon seed')
}

/**
 * Simulate the exact dice sequence the doors spec performs, and require
 * every step to land as the spec asserts: the L2 pick succeeds, the L7
 * pick fails, the bash succeeds within 12 attempts with no natural 1
 * (which would draw Wandering Monsters), the L2 disarm succeeds, each
 * retrace roll is not a 1 (no Wandering Monsters between tiles), and the
 * L2 sealed roll succeeds. Iron, lever and illusionary spend no dice.
 */
function doorsSeedFor(
  dungeon: DungeonState,
  tiles: { t2: PlacedTile; t3: PlacedTile; t4: PlacedTile; t5: PlacedTile },
  party: Character[],
): number {
  return findSeed((seed) => {
    const rng = new Rng(seed)
    const d = structuredClone(dungeon)
    const p = structuredClone(party)
    const rogue = byName(p, 'Joss')
    const warrior = byName(p, 'Torsten')
    const wizard = byName(p, 'Fen')
    const cur = (t: PlacedTile) => d.tiles.find((x) => x.id === t.id)!
    const t2 = cur(tiles.t2)
    const t3 = cur(tiles.t3)
    const t4 = cur(tiles.t4)
    const link2 = t2.exits.find((e) => e.toTileId === tiles.t3.id)!
    const locked7 = t2.exits.find((e) => e.doorInfo?.kind === 'locked' && e.doorInfo.level === 7)!
    const link3 = t3.exits.find((e) => e.toTileId === tiles.t4.id)!
    const link4 = t4.exits.find((e) => e.toTileId === tiles.t5.id)!
    if (!attemptLockpick(rng, rogue, link2).success) return false
    if (attemptLockpick(rng, rogue, locked7).success) return false
    let bashed = false
    for (let i = 0; i < 12; i++) {
      const b = attemptBash(rng, warrior, locked7)
      if (b.die === 1) return false
      if (b.success) {
        bashed = true
        break
      }
    }
    if (!bashed) return false
    if (rng.d(6) === 1) return false // retrace t2 -> t3
    if (!attemptDisarm(rng, rogue, link3).success) return false
    if (rng.d(6) === 1) return false // retrace t3 -> t4
    if (!attemptSealed(rng, wizard, link4).success) return false
    if (rng.d(6) === 1) return false // retrace t4 -> t5
    return true
  })
}

function setEncounter(
  tile: PlacedTile,
  kind: 'vermin' | 'minions' | 'boss',
  table: TableKind,
  monster: MonsterProfile,
  count: number,
  level: number,
  opts: { contentRoll: number; tableRoll: number; isFinalBoss?: boolean },
): void {
  tile.contentRoll = opts.contentRoll
  tile.content = {
    roll: opts.contentRoll,
    kind,
    encounter: { table, monster, count, level, isFinalBoss: opts.isFinalBoss ?? false },
    tableRoll: opts.tableRoll,
  }
  tile.searchRoll = null
  tile.searchResult = null
}

function toArchive(
  campaignId: string,
  name: string,
  seed: number,
  party: Character[],
  dungeon: DungeonState,
  clues = 0,
): CampaignArchive {
  const now = Date.now()
  const campaign: CampaignMeta = {
    id: campaignId,
    name,
    ruleset: 'fadee-expanded',
    seed,
    rngState: JSON.stringify(new Rng(seed).serialize()),
    clues,
    createdAt: now,
    lastModified: now,
    saveVersion: 2,
  }
  return { kind: '4ad-campaign', version: 1, campaign, characters: party, dungeon, journal: [] }
}

function writeFixture(name: string, archive: CampaignArchive): void {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true })
  fs.writeFileSync(path.join(FIXTURES_DIR, `${name}.json`), `${JSON.stringify(archive, null, 2)}\n`)
}

/** First d6 of a seed, used where the asserted roll is the first consumption. */
function firstD6(seed: number): number {
  return new Rng(seed).d(6)
}

function findSeed(want: (seed: number) => boolean, max = 2000): number {
  for (let seed = 1; seed <= max; seed++) if (want(seed)) return seed
  throw new Error('no fixture seed found')
}

// ---------- search fixtures ----------

function searchSeedFor(dungeon: DungeonState, tileId: string, classIds: string[]): number {
  return findSeed((seed) => {
    const rng = new Rng(seed)
    const clone = structuredClone(dungeon)
    return searchTile(clone, rng, tileId, classIds).result === 'find'
  })
}

// ---------- combat simulations (cloned parties; the real engine) ----------

interface FightOpts {
  darknessPenalty: number
  questTargetName: string | null
}

function fightOpts(penalty: number, questTargetName: string | null): FightOpts {
  return { darknessPenalty: penalty, questTargetName }
}

function combatOptsFor(party: Character[], o: FightOpts) {
  return {
    darknessPenalty: o.darknessPenalty,
    noExplosions: false,
    foeLevelPenaltyTurn1: 0,
    fungalSlippery: false,
    questTargetName: o.questTargetName,
    marchingOrder: party.map((p) => p.id),
  }
}

/** Read the phase through a function so tsc can't narrow it after the
 * `combat.phase = 'pcTurn'` assignments below (it would otherwise reject
 * the later `=== 'won'` checks as impossible). */
function phaseOf(combat: CombatState): CombatState['phase'] {
  return combat.phase
}

/** Quest 3: Sleep the Brute, then subdue it within 12 subdual attacks. */
function quest3Seed(party: Character[], tileId: string): number {
  const brute = DUNGEON_TABLES.boss[1] // Orc Brute
  return findSeed((seed) => {
    const rng = new Rng(seed)
    const clones = structuredClone(party)
    const [anya, , , fen] = dexieOrder(clones)
    const enemy = makeEnemy(brute, 'boss', 5, 1, lifeFromFormula(5, brute.lifeFormula, brute.flatLife))
    const combat = startCombat(tileId, dexieOrder(clones), [enemy], rng, combatOptsFor(clones, fightOpts(0, 'Orc Brute')))
    try {
      if (combat.phase === 'opening') combat.phase = 'pcTurn'
      pcAttack(combat, rng, anya, enemy.id)
      if (combat.phase !== 'pcTurn') return false
      castSpell(combat, rng, fen, 'sleep', enemy.id)
      if (!enemy.asleep || !enemy.subduedBySleep) return false
      let clicks = 0
      while (phaseOf(combat) !== 'won' && clicks < 12) {
        pcAttack(combat, rng, anya, enemy.id, { subdual: true })
        clicks++
      }
      return (
        phaseOf(combat) === 'won' &&
        enemy.subdued === true &&
        enemy.life === 0 &&
        clicks <= 12 &&
        clones.every((p) => p.status !== 'dead') &&
        xpDue(combat).majorSlain === 1
      )
    } catch {
      return false
    }
  })
}

/** Slow: Anya solos the Ogre Final Boss within 40 attacks, nobody dies. */
function slowSeed(party: Character[], tileId: string): number {
  const ogre = DUNGEON_TABLES.boss[2] // Ogre
  return findSeed((seed) => {
    const rng = new Rng(seed)
    const clones = structuredClone(party)
    const [anya] = dexieOrder(clones)
    const enemy = makeEnemy(ogre, 'boss', 3, 1, lifeFromFormula(3, ogre.lifeFormula, ogre.flatLife))
    const combat = startCombat(tileId, dexieOrder(clones), [enemy], rng, combatOptsFor(clones, fightOpts(0, null)))
    try {
      let attacks = 0
      while (combat.phase !== 'won' && attacks < 40) {
        if (combat.phase === 'opening') combat.phase = 'pcTurn'
        pcAttack(combat, rng, anya, enemy.id)
        attacks++
      }
      return combat.phase === 'won' && attacks <= 40 && clones.every((p) => p.status !== 'dead')
    } catch {
      return false
    }
  })
}

/** Scroll: the Fireball slays both Skeletons outright. */
function scrollSeed(party: Character[], tileId: string): number {
  const skels = DUNGEON_TABLES.minions[0] // Skeletons or Zombies
  return findSeed((seed) => {
    const rng = new Rng(seed)
    const clones = structuredClone(party)
    const [, , , fen] = dexieOrder(clones)
    const enemy = makeEnemy(skels, 'minions', 3, 2, lifeFromFormula(3, skels.lifeFormula, skels.flatLife))
    const combat = startCombat(tileId, dexieOrder(clones), [enemy], rng, combatOptsFor(clones, fightOpts(0, null)))
    try {
      rollReactions(combat, rng) // 'Always Fight' — no roll, phase pcTurn
      if (phaseOf(combat) !== 'pcTurn') return false
      castScroll(combat, rng, fen, 'fireball', enemy.id)
      return phaseOf(combat) === 'won' && enemy.count === 0
    } catch {
      return false
    }
  })
}

/** Dark: the Rats flee on the first Reaction roll (1-3). */
function darkSeed(party: Character[], tileId: string): number {
  const rats = DUNGEON_TABLES.vermin[0]
  return findSeed((seed) => {
    const rng = new Rng(seed)
    const clones = structuredClone(party)
    const enemy = makeEnemy(rats, 'vermin', 1, 6, lifeFromFormula(1, rats.lifeFormula, rats.flatLife))
    const combat = startCombat(tileId, dexieOrder(clones), [enemy], rng, combatOptsFor(clones, fightOpts(-2, null)))
    try {
      rollReactions(combat, rng)
      return combat.phase === 'won' && enemy.fled === true
    } catch {
      return false
    }
  })
}

/** Trinket: the opening attack leaves Rats standing, then the Wand puts them to sleep. */
function trinketSeed(party: Character[], tileId: string): number {
  const rats = DUNGEON_TABLES.vermin[0]
  return findSeed((seed) => {
    const rng = new Rng(seed)
    const clones = structuredClone(party)
    const [anya, , , fen] = dexieOrder(clones)
    const enemy = makeEnemy(rats, 'vermin', 1, 6, lifeFromFormula(1, rats.lifeFormula, rats.flatLife))
    const combat = startCombat(tileId, dexieOrder(clones), [enemy], rng, combatOptsFor(clones, fightOpts(0, null)))
    try {
      if (combat.phase === 'opening') combat.phase = 'pcTurn'
      pcAttack(combat, rng, anya, enemy.id)
      if (combat.phase !== 'pcTurn') return false
      if (enemy.count < 3) return false
      if (!clones.every((p) => p.status !== 'dead')) return false
      castItemSpell(combat, rng, fen, 'sleep', enemy.id, fen.level)
      return (enemy.asleepCount ?? 0) > 0
    } catch {
      return false
    }
  })
}

describe('Release 0.5 e2e fixtures', () => {
  it('search: empty dungeon room, first Search finds something', () => {
    const campaignId = 'fixture-search'
    const party = buildParty(campaignId)
    give(party, 'Torsten', 'lantern')
    const { dungeon, tile } = buildDungeon(campaignId, 'dungeon')
    // The seed must satisfy BOTH halves of the spec's flow: the first
    // Search finds something, AND the secret door beyond leads somewhere
    // (simulated on clones with the exact engine call sequence the app
    // runs after import — Search roll, then secret-door generation).
    const classIds = party.map((p) => p.classId)
    const seed = findSeed((s) => {
      const rng = new Rng(s)
      const searchClone = structuredClone(dungeon)
      if (searchTile(searchClone, rng, tile.id, classIds).result !== 'find') return false
      const probe = structuredClone(dungeon)
      return generateSecretDoorTile(probe, rng, 1).toTileId !== null
    })
    // The secret door beyond must lead somewhere (simulated on a clone).
    const rng = new Rng(seed)
    rng.d(6) // the Search roll itself
    const probe = structuredClone(dungeon)
    const gen = generateSecretDoorTile(probe, rng, 1)
    expect(gen.toTileId).not.toBeNull()
    writeFixture('search', toArchive(campaignId, 'Search Find Fixture', seed, party, dungeon))
  })

  it('doors: every door kind forced on a four-tile chain, dice brute-forced', () => {
    const campaignId = 'fixture-doors'
    const party = buildParty(campaignId)
    give(party, 'Torsten', 'lantern')
    // Pin the rogue's lockpick bonus to exactly +L: no Delicate Touch, so
    // the simulated pick/bash totals are level-only and deterministic.
    byName(party, 'Joss').traits = []
    const { dungeon, t2, t3, t4, t5 } = buildDoorsDungeon(campaignId)
    const force = (
      tile: PlacedTile,
      toTileId: string | null,
      kind: 'locked' | 'trapped' | 'lever' | 'sealed' | 'iron' | 'illusionary',
      level: number,
    ) => {
      const e = tile.exits.find((x) => x.toTileId === toTileId)
      if (!e) throw new Error(`no exit to ${toTileId} on ${tile.id}`)
      e.door = true
      e.doorInfo = { kind, level }
    }
    // t2: link locked L2, extra locked L7, way back trapped L9.
    force(t2, t3.id, 'locked', 2)
    const extra2 = t2.exits.find((x) => !x.toTileId)!
    extra2.door = true
    extra2.doorInfo = { kind: 'locked', level: 7 }
    force(t2, dungeon.tiles[0].id, 'trapped', 9)
    // t3: link trapped L2, extra lever, way back locked L9.
    force(t3, t4.id, 'trapped', 2)
    const extra3 = t3.exits.find((x) => !x.toTileId)!
    extra3.door = true
    extra3.doorInfo = { kind: 'lever', level: 0 }
    force(t3, t2.id, 'locked', 9)
    // t4: link sealed L2, extra iron, way back trapped L9.
    force(t4, t5.id, 'sealed', 2)
    const extra4 = t4.exits.find((x) => !x.toTileId)!
    extra4.door = true
    extra4.doorInfo = { kind: 'iron', level: 3 }
    force(t4, t3.id, 'trapped', 9)
    // t5: extra illusionary, way back locked L9.
    const extra5 = t5.exits.find((x) => !x.toTileId)!
    extra5.door = true
    extra5.doorInfo = { kind: 'illusionary', level: 1 }
    force(t5, t4.id, 'locked', 9)
    // Any further open exit is a locked L9 decoy: the spec opens its
    // dialog, sees it is not a door under test, and closes it — never a
    // plain opening the spec could tap into by accident.
    for (const t of [t2, t3, t4, t5]) {
      for (const e of t.exits.filter((x) => !x.toTileId && !x.doorInfo)) {
        e.door = true
        e.doorInfo = { kind: 'locked', level: 9 }
      }
    }
    const seed = doorsSeedFor(dungeon, { t2, t3, t4, t5 }, party)
    writeFixture('doors', toArchive(campaignId, 'Doors & Fog Fixture', seed, party, dungeon, 4))
  })

  it('search-caverns: cavern room, Search offers Listen', () => {
    const campaignId = 'fixture-search-caverns'
    const party = buildParty(campaignId)
    give(party, 'Torsten', 'lantern')
    const { dungeon, tile } = buildDungeon(campaignId, 'caverns')
    const seed = searchSeedFor(dungeon, tile.id, party.map((p) => p.classId))
    writeFixture('search-caverns', toArchive(campaignId, 'Cavern Search Fixture', seed, party, dungeon))
  })

  it('search-fungal: fungal room, Search offers Rare Mushroom', () => {
    const campaignId = 'fixture-search-fungal'
    const party = buildParty(campaignId)
    give(party, 'Torsten', 'lantern')
    const { dungeon, tile } = buildDungeon(campaignId, 'fungal')
    const seed = searchSeedFor(dungeon, tile.id, party.map((p) => p.classId))
    writeFixture('search-fungal', toArchive(campaignId, 'Fungal Search Fixture', seed, party, dungeon))
  })

  it('quest3: Sleep, then subdue the Orc Brute alive', () => {
    const campaignId = 'fixture-quest3'
    const party = buildParty(campaignId)
    setLevel(party, 'Torsten', 5)
    give(party, 'Torsten', 'lantern')
    const { dungeon, tile } = buildDungeon(campaignId, 'dungeon')
    setEncounter(tile, 'boss', 'boss', DUNGEON_TABLES.boss[1], 1, 5, { contentRoll: 11, tableRoll: 2 })
    dungeon.quest = {
      roll: 3,
      target: 'Orc Brute',
      amount: 0,
      giverTileId: tile.id,
      progress: 0,
      complete: false,
    }
    const seed = quest3Seed(party, tile.id)
    writeFixture('quest3', toArchive(campaignId, 'Quest 3 Fixture', seed, party, dungeon))
  })

  it('quest4: the silvered dagger, already found, to deliver unused', () => {
    const campaignId = 'fixture-quest4'
    const party = buildParty(campaignId)
    give(party, 'Torsten', 'lantern')
    give(party, 'Torsten', 'quest item: silvered dagger')
    const { dungeon, tile } = buildDungeon(campaignId, 'dungeon')
    dungeon.quest = {
      roll: 4,
      target: '',
      amount: 0,
      giverTileId: tile.id,
      progress: 0,
      complete: false,
      itemName: 'silvered dagger',
      itemFound: true,
    }
    writeFixture('quest4', toArchive(campaignId, 'Quest 4 Fixture', 1481, party, dungeon))
  })

  it('trinket: Wand of Sleep + Ring of Teleportation vs Rats', () => {
    const campaignId = 'fixture-trinket'
    const party = buildParty(campaignId)
    give(party, 'Torsten', 'lantern')
    give(party, 'Fen', 'Wand of Sleep (3 charges)')
    give(party, 'Joss', 'Ring of Teleportation')
    const { dungeon, tile } = buildDungeon(campaignId, 'dungeon')
    setEncounter(tile, 'vermin', 'vermin', DUNGEON_TABLES.vermin[0], 6, 1, { contentRoll: 6, tableRoll: 1 })
    const seed = trinketSeed(party, tile.id)
    writeFixture('trinket', toArchive(campaignId, 'Trinket Fixture', seed, party, dungeon))
  })

  it('dark: no light, Rats that flee, 9/10 minor tally', () => {
    const campaignId = 'fixture-dark'
    const party = buildParty(campaignId)
    setLevel(party, 'Anya', 3)
    const { dungeon, tile } = buildDungeon(campaignId, 'dungeon')
    setEncounter(tile, 'vermin', 'vermin', DUNGEON_TABLES.vermin[0], 6, 1, { contentRoll: 6, tableRoll: 1 })
    dungeon.minorEncountersTally = 9
    const seed = darkSeed(party, tile.id)
    // The first d6 must also be the flee roll — darkSeed simulates exactly that.
    expect(firstD6(seed)).toBeGreaterThanOrEqual(1)
    expect(firstD6(seed)).toBeLessThanOrEqual(3)
    writeFixture('dark', toArchive(campaignId, 'Dark Fixture', seed, party, dungeon))
  })

  it('torch: lit torch, 6 rooms left', () => {
    const campaignId = 'fixture-torch'
    const party = buildParty(campaignId)
    give(party, 'Torsten', 'torch')
    const { dungeon, tile } = buildDungeon(campaignId, 'dungeon')
    setEncounter(tile, 'vermin', 'vermin', DUNGEON_TABLES.vermin[0], 6, 1, { contentRoll: 6, tableRoll: 1 })
    dungeon.torchLit = true
    dungeon.torchRooms = 0
    writeFixture('torch', toArchive(campaignId, 'Torch Fixture', 1481, party, dungeon))
  })

  it('scroll: scroll of fireball vs two Skeletons, 9/10 minor tally', () => {
    const campaignId = 'fixture-scroll'
    const party = buildParty(campaignId)
    setLevel(party, 'Anya', 3)
    give(party, 'Torsten', 'lantern')
    give(party, 'Fen', 'scroll of fireball')
    const { dungeon, tile } = buildDungeon(campaignId, 'dungeon')
    setEncounter(tile, 'minions', 'minions', DUNGEON_TABLES.minions[0], 2, 3, { contentRoll: 7, tableRoll: 1 })
    dungeon.minorEncountersTally = 9
    const seed = scrollSeed(party, tile.id)
    expect(firstD6(seed)).toBeGreaterThanOrEqual(4)
    writeFixture('scroll', toArchive(campaignId, 'Scroll Fixture', seed, party, dungeon))
  })

  it('slow: Ogre Final Boss for the Slow and Sure picker', () => {
    const campaignId = 'fixture-slow'
    const party = buildParty(campaignId)
    setLevel(party, 'Anya', 3)
    give(party, 'Torsten', 'lantern')
    const { dungeon, tile } = buildDungeon(campaignId, 'dungeon')
    setEncounter(tile, 'boss', 'boss', DUNGEON_TABLES.boss[2], 1, 3, {
      contentRoll: 11,
      tableRoll: 3,
      isFinalBoss: true,
    })
    const seed = slowSeed(party, tile.id)
    writeFixture('slow', toArchive(campaignId, 'Slow Fixture', seed, party, dungeon))
  })

  it('all ten fixtures exist and parse as campaign archives', () => {
    for (const name of [
      'search',
      'search-caverns',
      'search-fungal',
      'quest3',
      'quest4',
      'trinket',
      'dark',
      'torch',
      'scroll',
      'slow',
    ]) {
      const raw = fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf-8')
      const archive = JSON.parse(raw) as CampaignArchive
      expect(archive.kind).toBe('4ad-campaign')
      expect(archive.version).toBe(1)
      expect(archive.characters).toHaveLength(4)
      expect(archive.dungeon).not.toBeNull()
      expect(archive.dungeon!.currentTileId).toBeTruthy()
    }
  })
})
