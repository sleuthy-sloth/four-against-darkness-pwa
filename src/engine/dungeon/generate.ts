import type { Cell, Edge, Exit, TileShape } from '../../rulesets/expanded/tiles'
import { STARTING_TILES, D66_TILES, shapeById } from '../../rulesets/expanded/tiles'
import {
  oppositeEdge,
  profileFor,
  profileForEnv,
  tableKindFor,
  type MonsterProfile,
  type TableKind,
} from '../../rulesets/expanded/monsters'
import {
  RARE_MUSHROOMS,
  cavernFeatureForRoll,
  type CavernFeature,
  type CavernTrap,
  type EnvironmentId,
  type FungalTrap,
} from '../../rulesets/expanded/environments'
import type { DungeonTrap } from '../../rulesets/expanded/features'
import type { Rng } from '../core/rng'
import type { CombatState } from '../combat/combat'
import {
  doorGrantsBonusTreasure,
  lockpickBonus,
  rollDoorsForTile,
  type DoorInfo,
} from './doors'
import type { Character } from '../../rulesets/schema/character'

/**
 * Dungeon generation engine (FADEE pp.104, 149-152; PROJECT_SPEC Part V §10).
 * Pure functions, React-free, browser-free. Deterministic under a seeded Rng.
 *
 * Grid: 20×28 squares (FADEE p.104). Tiles are placed by transforming a
 * canonical shape (rotate 0/90/180/270 × mirror), aligning one of the new
 * tile's exits against the chosen exit of the current tile.
 */

export const GRID_W = 20
export const GRID_H = 28

export interface PlacedExit {
  id: string
  /** Absolute grid cell the exit sits on. */
  cell: Cell
  edge: Edge
  /** true = printed door symbol; false = plain opening (FADEE pp.109, 150). */
  door: boolean
  /** Tile beyond this exit, once generated. */
  toTileId: string | null
  /**
   * Rolled door state (R129-R131), set at tile generation for door
   * exits. Absent on older saves — those exits default to unlocked.
   */
  doorInfo?: DoorInfo
}

export type ContentKind =
  | 'empty'
  | 'treasure'
  | 'treasureTrapped'
  | 'specialEvents'
  | 'specialFeature'
  | 'secretPassage'
  | 'vermin'
  | 'minions'
  | 'weird'
  | 'boss'
  | 'dragonLair'

export interface EncounterRoll {
  table: TableKind
  monster: MonsterProfile
  count: number
  level: number
  isFinalBoss?: boolean
}

export interface TileContent {
  roll: number // 2d6 result, FADEE p.152
  kind: ContentKind
  encounter?: EncounterRoll
  /** Monster table roll (d6) for encounter kinds. */
  tableRoll?: number
  specialFeatureRoll?: number
  /** d6 result of the room's Special Events roll (resolved once, p.153). */
  eventRoll?: number
  /** Encounter defeated here (Resting prerequisite, FADEE p.114). */
  cleared?: boolean
  /** Trap guarding a treasureTrapped tile (R114 roll 3): rolled when the
   * treasure is first taken, then kept so disarm/firing resolve the
   * same trap. */
  trap?: DungeonTrap | CavernTrap | FungalTrap
  /** The tile's trap was disarmed (R132) — the treasure is free to take. */
  trapDisarmed?: boolean
}

export interface PlacedTile {
  id: string
  shapeId: number
  transform: number // 0-7: rotation (0/90/180/270) + mirror flag via +4
  origin: Cell // absolute min-row/min-col of the shape's bounding box
  cells: Cell[] // absolute
  exits: PlacedExit[]
  explored: boolean
  contentRoll: number | null // null = starting tile (never rolled, FADEE p.104)
  content: TileContent | null
  searchRoll: number | null // FADEE p.107: one search per tile
  searchResult: string | null
  /**
   * A secret door was found by searching this tile (FADEE p.108, Milestone
   * 5 — C4). Display only: the map shows a secret-door badge on the tile.
   * The found door has no edge in the engine, so it is a tile badge, not a
   * door state.
   */
  secretDoorFound?: boolean
  /** True when the tile was reached through a secret door (peek rules apply). */
  viaSecretDoor?: boolean
  /** Environment this tile was generated in (R140; default dungeon). */
  environment?: EnvironmentId
  /** Cavern terrain feature rolled on entry (R141/R142). */
  cavernFeature?: CavernFeature
  /**
   * Entered through a sealed or iron door (R129): encounters here grant
   * +1 treasure. Set at generation from the traversed exit's door.
   */
  bonusTreasure?: boolean
}

export interface DungeonState {
  campaignId: string
  gridW: number
  gridH: number
  tiles: PlacedTile[]
  currentTileId: string
  /** Tally of Major Foes encountered, for the Final Boss roll (FADEE p.105). */
  majorFoesMet: number
  /** Pending Wandering Monsters (rolled but unresolved until Phase 4). */
  pendingWanderingMonsters: number | null
  /** Active combat, if any (engine/combat). */
  combat?: CombatState | null
  /** Wandering Monster ambush rolled while retracing (resolves as combat). */
  pendingAmbush?: EncounterRoll | null
  /** HCL for this adventure (FADEE p.3, R006): the highest PC level when
      the party first entered the dungeon. Fixed for the whole adventure —
      it does NOT rescale if the party levels up mid-delve. Older saves
      without it fall back to the current party max. */
  hcl?: number
  /** Minor encounters defeated toward the next XP roll (FADEE p.117). */
  minorEncountersTally?: number
  /** XP rolls earned by the current victory, awaiting assignment (FADEE
      p.117). Lives on the dungeon so a reload mid-victory keeps the roll;
      the store mirrors it for the UI. Null when no roll is due. */
  pendingXp?: { major: number; minor: boolean; boss: boolean } | null
  /** Fountains seen this adventure (first one heals, FADEE p.152). */
  fountainsSeen?: number
  /** Healer/alchemist met this adventure (once only, FADEE p.153). */
  healerMet?: boolean
  alchemistMet?: boolean
  /** A feature/event choice the player must answer before play continues. */
  pendingChoice?: PendingChoicePayload | null
  /** The party already rested this adventure (once only, FADEE p.114). */
  rested?: boolean
  /** Active Quest from the Lady in White (FADEE pp.153, 161-162). */
  quest?: QuestState | null
  /** Non-violent encounters completed toward a "peace" Quest (type 5). */
  nonViolentTally?: number
  /** The Lady was refused — ignore further appearances (FADEE p.153). */
  ladyRefused?: boolean
  /** Current environment (R140): adventures start in a dungeon; secret
      passages switch it. Defaults to 'dungeon' for older saves. */
  environment?: EnvironmentId
  /** Light state (R093/R094): is a torch lit, rooms burned, lantern dropped. */
  torchLit?: boolean
  torchRooms?: number
  lanternDropped?: boolean
  /** A found secret door (R125): the real tile beyond it, peeked or not. */
  secretDoor?: { fromTileId: string; toTileId: string; peeked?: boolean; safeExit?: boolean } | null
  /** Listen (cavern Search, R143): pre-rolled next tile shape (d66). */
  listenShape?: number | null
  /** Map Fragment (R153): pre-rolled next tile shape (d66). */
  nextTileShape?: number | null
  /** Old School XP tally (R173). */
  oldSchoolXp?: number
  /** Slower Advancement stored XP points (R174). */
  storedXp?: number
  /** Last PC levelled by a Classical XP roll in the current pending batch
      (R170): no XP roll goes to a PC that just levelled, unless they are
      the only survivor. Cleared when the batch is spent / a new one starts. */
  lastXpLevelUpPcId?: string | null
  /** Last PC levelled under Old School (no same PC twice in a row, R173). */
  lastLevelUpPcId?: string | null
  /** Slow and Sure level-ups awaiting assignment (R172). */
  pendingLevelUps?: number
  /** Miners' Ointment armed: ignore the next Wandering Monsters arrival (R153). */
  ointmentArmed?: boolean
  /** Water pools dipped in this adventure, per PC id (R142, once each). */
  poolDippedPcIds?: string[]
  /** Phoenix Mushroom: tiles remaining per PC id (R152, 3 tiles). */
  phoenixTiles?: Record<string, number>
}

/** Serialized quest state (Quest Table roll + completion tracking). */
export interface QuestState {
  roll: number
  target: string
  /** Gold amount for type 2; 0 otherwise. */
  amount: number
  giverTileId: string
  /** Bosses slain (type 1), peaceful encounters (type 5). */
  progress: number
  complete: boolean
  /** Type 4: the rolled rare item to fetch (R155). */
  itemName?: string
  /** Type 4: the item was found on a slain Major Foe (1-in-6, R155). */
  itemFound?: boolean
  /** Type 3: the target was subdued (R089/R155). */
  subdued?: boolean
}

/** Serialized player choice from the features engine. */
export interface PendingChoicePayload {
  kind:
    | 'temple' | 'statue' | 'puzzle' | 'ghost' | 'healer' | 'alchemist'
    | 'secret' | 'secretPc' | 'secretWeakness' | 'secretItem' | 'rest'
    | 'quest' | 'questPc' | 'passage' | 'trap'
  source: string
  /** Statue: difficulty info. */
  hcl?: number
  tier?: number
  /** Puzzle box: its level. */
  level?: number
  /** Ghost: PCs who must choose Life or Madness. */
  pcIds?: string[]
  /** Temple: PCs eligible for the undead bonus. */
  eligible?: string[]
  /** Trap disarm (R132): the trap that fired, its environment, the
   * leader index for its Save, and where it came from — 'treasure' traps
   * leave the loot claimable after a successful disarm, 'event' traps do
   * not. */
  trap?: DungeonTrap | CavernTrap | FungalTrap
  env?: EnvironmentId
  leaderIndex?: number
  origin?: 'treasure' | 'event'
  /** Statement shown in the dialog. */
  prompt: string
}

export class DungeonError extends Error {}

// ---------- transforms ----------

interface Transformed {
  cells: Cell[]
  exits: Exit[]
  w: number
  h: number
}

/** transform 0-3 = rotate 0/90/180/270; 4-7 = mirrored + same rotations. */
export function transformShape(shape: TileShape, transform: number): Transformed {
  const mirror = transform >= 4
  const rot = transform % 4
  let cells = shape.cells.map((c) => ({ ...c }))
  let exits = shape.exits.map((e) => ({ ...e, cell: { ...e.cell } }))
  if (mirror) {
    const maxCol = Math.max(...cells.map((c) => c.col))
    cells = cells.map((c) => ({ ...c, col: maxCol + 1 - c.col }))
    exits = exits.map((e) => ({
      ...e,
      cell: { ...e.cell, col: maxCol + 1 - e.cell.col },
      edge: flipHorizontalEdge(e.edge),
    }))
  }
  for (let i = 0; i < rot; i++) {
    const maxRow = Math.max(...cells.map((c) => c.row))
    cells = cells.map((c) => ({ row: c.col, col: maxRow + 1 - c.row }))
    exits = exits.map((e) => ({
      cell: { row: e.cell.col, col: maxRow + 1 - e.cell.row },
      edge: rotateEdgeCW(e.edge),
      door: e.door,
    }))
  }
  const w = Math.max(...cells.map((c) => c.col))
  const h = Math.max(...cells.map((c) => c.row))
  return { cells, exits, w, h }
}

function rotateEdgeCW(e: Edge): Edge {
  return e === 'N' ? 'E' : e === 'E' ? 'S' : e === 'S' ? 'W' : 'N'
}
function flipHorizontalEdge(e: Edge): Edge {
  return e === 'E' ? 'W' : e === 'W' ? 'E' : e
}

function offsetCell(c: Cell, dr: number, dc: number): Cell {
  return { row: c.row + dr, col: c.col + dc }
}

function transformExitEdge(edge: Edge, transform: number): Edge {
  let e = edge
  if (transform >= 4) e = flipHorizontalEdge(e)
  for (let i = 0; i < transform % 4; i++) e = rotateEdgeCW(e)
  return e
}

// ---------- state ----------

export function newDungeon(campaignId: string, rng: Rng, hcl = 1): DungeonState {
  // FADEE p.104: roll d6 for the first room; do NOT roll content for it.
  const startRoll = rng.d(6)
  const shape = STARTING_TILES[startRoll - 1]
  const placed = placeAtOrigin(shape, 0, { row: GRID_H - shapeBBoxH(shape), col: 1 })
  const tile: PlacedTile = {
    id: `${campaignId}-t1`,
    shapeId: shape.id,
    transform: 0,
    origin: placed.origin,
    cells: placed.cells,
    exits: placed.exits,
    explored: true,
    contentRoll: null,
    content: null,
    searchRoll: null,
    searchResult: null,
    environment: 'dungeon',
  }
  // Roll the door table (R129) for the starting tile's door exits.
  rollDoorsForTile(tile, rng, hcl)
  return {
    campaignId,
    hcl,
    gridW: GRID_W,
    gridH: GRID_H,
    tiles: [tile],
    currentTileId: tile.id,
    majorFoesMet: 0,
    pendingWanderingMonsters: null,
    environment: 'dungeon',
    torchLit: false,
    torchRooms: 0,
    lanternDropped: false,
  }
}

function shapeBBoxH(shape: TileShape): number {
  return Math.max(...shape.cells.map((c) => c.row))
}

function placeAtOrigin(
  shape: TileShape,
  transform: number,
  origin: Cell,
): { origin: Cell; cells: Cell[]; exits: PlacedExit[] } {
  const t = transformShape(shape, transform)
  const cells = t.cells.map((c) => offsetCell(c, origin.row - 1, origin.col - 1))
  const exits: PlacedExit[] = t.exits.map((e, i) => ({
    id: `x${i}`,
    cell: offsetCell(e.cell, origin.row - 1, origin.col - 1),
    edge: transformExitEdge(e.edge, transform),
    door: e.door,
    toTileId: null,
  }))
  return { origin, cells, exits }
}

// ---------- exploration ----------

export function currentTile(state: DungeonState): PlacedTile {
  const tile = state.tiles.find((t) => t.id === state.currentTileId)
  if (!tile) throw new DungeonError('current tile missing')
  return tile
}

export function openExits(state: DungeonState, tile: PlacedTile): PlacedExit[] {
  return tile.exits.filter((e) => !e.toTileId)
}

/**
 * Move through an already-generated exit (retracing), or generate the next
 * tile beyond an unexplored one (FADEE pp.104, 116).
 */
export function exploreThrough(
  state: DungeonState,
  rng: Rng,
  exitId: string,
  hcl: number,
): { state: DungeonState; events: string[] } {
  const tile = currentTile(state)
  const exit = tile.exits.find((e) => e.id === exitId)
  if (!exit) throw new DungeonError(`exit ${exitId} not on current tile`)
  const events: string[] = []

  // Already generated beyond this exit → just walk through (FADEE p.104).
  if (exit.toTileId) {
    state = moveThroughExplored(state, rng, exit.toTileId, events, hcl)
    return { state, events }
  }

  // FADEE p.104: roll d66 for a new tile shape — unless a Map Fragment
  // (R153) or a cavern Listen (R143) already pre-rolled it.
  const roll = state.nextTileShape ?? state.listenShape ?? rng.d66()
  if (state.nextTileShape) {
    events.push(`The Map Fragment showed this tile coming: shape ${roll}.`)
    state.nextTileShape = null
  } else if (state.listenShape) {
    events.push(`Listen paid off: beyond the opening lies tile shape ${roll}, as heard.`)
    state.listenShape = null
  }
  const shape = shapeById(roll)
  if (!shape) throw new DungeonError(`d66 roll ${roll} has no shape`)

  const placement = findPlacement(state, shape, exit)
  if (!placement) {
    // No orientation fits: this exit is a dead end (FADEE p.104 truncation
    // cases all reduce to "cannot extend here" at grid granularity).
    events.push(`Rolled tile ${roll} — it does not fit beyond this ${exit.door ? 'door' : 'opening'}. Dead end.`)
    return { state, events }
  }

  const placed = placeAtOrigin(shape, placement.transform, placement.origin)
  if (placement.truncated) {
    // FADEE p.104: truncated tiles keep only the clipped squares.
    placed.cells = placement.truncated
    placed.exits = placed.exits.filter(
      (e) => placement.truncated!.some((c) => c.row === e.cell.row && c.col === e.cell.col),
    )
    events.push(`Rolled tile ${roll} — truncated to fit (FADEE p.104).`)
  }
  const newTileId = `${state.campaignId}-t${state.tiles.length + 1}`
  const newTile: PlacedTile = {
    id: newTileId,
    shapeId: shape.id,
    transform: placement.transform,
    origin: placement.origin,
    cells: placed.cells,
    exits: placed.exits,
    explored: true,
    contentRoll: null,
    content: null,
    searchRoll: null,
    searchResult: null,
    viaSecretDoor: false,
    environment: state.environment ?? 'dungeon',
    // +1 treasure behind a sealed or iron door (R129).
    bonusTreasure: doorGrantsBonusTreasure(exit.doorInfo) ? true : undefined,
  }
  // Link both sides.
  exit.toTileId = newTileId
  const back = newTile.exits.find(
    (e) => e.cell.row === placement.exitCell.row && e.cell.col === placement.exitCell.col,
  )
  if (back) {
    back.toTileId = tile.id
    // The back exit is the same physical door as the one just crossed.
    if (exit.doorInfo) back.doorInfo = { ...exit.doorInfo }
  }
  // R141: cavern openings have NO doors — a cavern tile's exits are plain
  // openings (which is also why resting is impossible there). Strip the
  // printed-door flags before rolling doors, so no door table is rolled
  // for them; the back exit keeps its (already opened) shared door state
  // but reads as an opening from the cavern side.
  if (newTile.environment === 'caverns') {
    for (const e of newTile.exits) {
      if (e !== back) {
        e.door = false
        delete e.doorInfo
      } else {
        e.door = false
      }
    }
  }
  // Roll the door table (R129) for the new tile's other door exits.
  rollDoorsForTile(newTile, rng, hcl, back?.id)

  // FADEE p.104: roll content as the party enters the tile.
  const contentRoll = rng.roll(2, 6, 0, `tile content 2d6 (FADEE p.152)`)
  newTile.contentRoll = contentRoll
  newTile.content = rollContent(state, rng, newTile, contentRoll, hcl, events)
  // Cavern entry (R141/R142): on entering a cavern tile, roll its feature.
  if (newTile.environment === 'caverns') {
    const feature = cavernFeatureForRoll(rng.d(6))
    newTile.cavernFeature = feature
    events.push(`Cavern feature: ${feature} — ${cavernFeatureText(feature)}`)
  }

  state.tiles.push(newTile)
  state.currentTileId = newTileId
  events.push(`Rolled d66 = ${roll}: ${shape.corridor ? 'corridor' : 'room'} tile.`)
  return { state, events }
}

function cavernFeatureText(feature: CavernFeature): string {
  switch (feature) {
    case 'stalactites': return 'explosive two-handed attacks may bring one down (3-in-6).'
    case 'stalagmites': return 'no attack dice explode here.'
    case 'boulders': return '+1 Defense vs ranged, -1 ranged attacks, +1 Stealth.'
    case 'echo': return '-1 Stealth; Wandering Monsters on 2-in-6.'
    case 'waterPools': return 'still pools — dip in to test the water.'
  }
}

function moveThroughExplored(
  state: DungeonState,
  rng: Rng,
  tileId: string,
  events: string[],
  hcl: number,
): DungeonState {
  // A safe shortcut exit (R125, d6 = 6 after finding a secret door) has no
  // Wandering Monsters rolls through it.
  const sd = state.secretDoor
  const isShortcut =
    sd?.safeExit &&
    ((sd.fromTileId === state.currentTileId && sd.toTileId === tileId) ||
      (sd.toTileId === state.currentTileId && sd.fromTileId === tileId))
  // Echo tiles (R142): Wandering Monsters on 2-in-6 instead of 1-in-6.
  const target = state.tiles.find((t) => t.id === tileId)
  const wmChance = target?.cavernFeature === 'echo' ? 2 : 1
  // FADEE p.104: retrace — 1-in-6 Wandering Monsters.
  const roll = rng.d(6)
  if (roll <= wmChance && !isShortcut) {
    if (state.ointmentArmed) {
      // Miners' Ointment (R153): ignore one Wandering Monsters arrival.
      state.ointmentArmed = false
      events.push("Miners' Ointment: the Wandering Monsters pass by without noticing the party.")
    } else {
      // FADEE p.107: d6 → Vermin/Minions/Weird/Boss (reroll event-Foes & dragons).
      const tableRoll = rng.d(6)
      const table: TableKind =
        tableRoll <= 2 ? 'vermin' : tableRoll <= 4 ? 'minions' : tableRoll === 5 ? 'weird' : 'boss'
      const env = state.environment ?? 'dungeon'
      let profile = profileForTable(env, table, tableRoll)
      while (profile.category === 'Event' || profile.category === 'Dragon') {
        profile = profileForTable(env, table, rng.d(6))
      }
      const enc = rollEncounter(state, rng, profile, hcl, events, { canBeFinalBoss: false })
      state.pendingAmbush = enc
      events.push('Retracing: 1-in-6 → Wandering Monsters attack! They strike first. (FADEE pp.104, 107)')
    }
  }
  state.currentTileId = tileId
  return state
}

/** Environment-aware profile lookup (dungeon tables are the default). */
export function profileForTable(env: EnvironmentId, table: TableKind, roll: number): MonsterProfile {
  return env === 'dungeon' ? profileFor(table, roll) : profileForEnv(env, table, roll)
}

interface Placement {
  transform: number
  origin: Cell
  exitCell: Cell // absolute cell of the new tile's matching exit
  /** Clipped cells when the tile was truncated (FADEE p.104). */
  truncated?: Cell[]
}

function findPlacement(
  state: DungeonState,
  shape: TileShape,
  exit: PlacedExit,
): Placement | null {
  const occupied = new Set(state.tiles.flatMap((t) => t.cells.map((c) => key(c))))
  // The new tile's matching exit must sit adjacent on the OUTSIDE of the old
  // exit edge (beyond the wall), with its body extending away.
  const outward = outwardDelta(exit.edge)
  const targetCell = offsetCell(exit.cell, outward.dr, outward.dc)

  for (let transform = 0; transform < 8; transform++) {
    const t = transformShape(shape, transform)
    const needEdge = oppositeEdge(exit.edge)
    for (const ex of t.exits) {
      if (ex.edge !== needEdge) continue
      // origin offset so that transformed ex.cell lands on targetCell
      const dr = targetCell.row - ex.cell.row
      const dc = targetCell.col - ex.cell.col
      const origin = { row: 1 + dr, col: 1 + dc }
      const cells = t.cells.map((c) => offsetCell(c, dr, dc))
      if (!cells.every((c) => c.row >= 1 && c.row <= GRID_H && c.col >= 1 && c.col <= GRID_W)) {
        continue
      }
      if (cells.some((c) => occupied.has(key(c)))) continue
      return { transform, origin, exitCell: targetCell }
    }
  }
  // FADEE p.104 truncation: a shape that won't fit intact is truncated —
  // clip to the grid, drop overlapping squares; it still counts as a tile
  // and still rolls content, even down to one square.
  for (let transform = 0; transform < 8; transform++) {
    const t = transformShape(shape, transform)
    const needEdge = oppositeEdge(exit.edge)
    for (const ex of t.exits) {
      if (ex.edge !== needEdge) continue
      const dr = targetCell.row - ex.cell.row
      const dc = targetCell.col - ex.cell.col
      const origin = { row: 1 + dr, col: 1 + dc }
      const clipped = t.cells
        .map((c) => offsetCell(c, dr, dc))
        .filter((c) => c.row >= 1 && c.row <= GRID_H && c.col >= 1 && c.col <= GRID_W)
        .filter((c) => !occupied.has(key(c)))
      const exitCell = offsetCell(ex.cell, dr, dc)
      // The connection square must survive truncation, or there is no way in.
      if (clipped.length >= 1 && clipped.some((c) => c.row === exitCell.row && c.col === exitCell.col)) {
        return { transform, origin, exitCell, truncated: clipped }
      }
    }
  }
  return null
}

function outwardDelta(e: Edge): { dr: number; dc: number } {
  // Direction from an exit cell toward the space BEYOND that edge.
  switch (e) {
    case 'N': return { dr: -1, dc: 0 }
    case 'S': return { dr: 1, dc: 0 }
    case 'E': return { dr: 0, dc: 1 }
    case 'W': return { dr: 0, dc: -1 }
  }
}

function key(c: Cell): string {
  return `${c.row},${c.col}`
}

// ---------- tile content (FADEE p.152) ----------

export function rollContent(
  state: DungeonState,
  rng: Rng,
  tile: PlacedTile,
  roll: number,
  hcl: number,
  events: string[],
): TileContent {
  const isCorridor = D66_TILES.find((t) => t.id === tile.shapeId)?.corridor ?? false
  const base: TileContent = { roll, kind: 'empty' }
  const env = tile.environment ?? state.environment ?? 'dungeon'

  switch (roll) {
    case 2:
      base.kind = 'treasure'
      break
    case 3:
      base.kind = 'treasureTrapped'
      break
    case 4:
      base.kind = isCorridor ? 'empty' : 'specialEvents'
      break
    case 5:
      // Dungeon: Special Feature Table (p.153); caverns: a Cavern Special
      // Feature; fungal: a secret passage (R114/R126).
      if (env === 'fungal') {
        base.kind = 'secretPassage'
      } else if (env === 'caverns') {
        base.kind = 'specialFeature'
        base.specialFeatureRoll = rng.d(6)
      } else {
        base.kind = 'specialFeature'
        base.specialFeatureRoll = rng.d(6)
      }
      break
    case 6:
      base.kind = 'vermin'
      break
    case 7:
      base.kind = 'minions'
      break
    case 8:
      base.kind = isCorridor ? 'empty' : 'minions'
      break
    case 9:
      base.kind = 'empty' // searchable; 2 Clues could buy a passage (R126)
      break
    case 10:
      base.kind = isCorridor ? 'empty' : 'weird'
      break
    case 11:
      base.kind = 'boss'
      break
    case 12:
      base.kind = isCorridor ? 'empty' : 'dragonLair'
      break
    default:
      throw new DungeonError(`bad content roll ${roll}`)
  }

  if (base.kind === 'vermin' || base.kind === 'minions' || base.kind === 'weird' || base.kind === 'boss' || base.kind === 'dragonLair') {
    const table: TableKind =
      base.kind === 'vermin' ? 'vermin'
      : base.kind === 'minions' ? 'minions'
      : base.kind === 'weird' ? 'weird'
      : 'boss' // dragon lair rolls the Boss table for the dragon (p.152/170)
    const tableRoll = rng.d(6)
    base.tableRoll = tableRoll
    let profile = profileForTable(env, table, tableRoll)
    if (base.kind === 'dragonLair') {
      // FADEE p.152: the lair holds the environment's dragon.
      profile = dragonForEnvironment(env)
    }
    base.encounter = rollEncounter(state, rng, profile, hcl, events)
  }
  return base
}

export function dragonForEnvironment(env: EnvironmentId): MonsterProfile {
  // Young Dragon (dungeon, p.170), Cave Dragon (caverns, p.174),
  // Fungal Dragon (fungal, p.178).
  if (env === 'caverns') return profileForEnv('caverns', 'weird', 6)
  if (env === 'fungal') return profileForEnv('fungal', 'boss', 6)
  return profileFor('boss', 6)
}

export function rollEncounter(
  state: DungeonState,
  rng: Rng,
  profile: MonsterProfile,
  hcl: number,
  events: string[],
  opts: { canBeFinalBoss?: boolean } = {},
): EncounterRoll {
  const canBeFinalBoss = opts.canBeFinalBoss ?? true
  // Quantity (FADEE profile count formulas; 'alt:a|b' = d6 1-3/4-6 alternates).
  let count: number
  if (profile.countFormula.startsWith('alt:')) {
    const [a, b] = profile.countFormula.slice(4).split('|')
    count = rng.d(6) <= 3 ? rng.formula(a) : rng.formula(b)
  } else {
    count = rng.formula(profile.countFormula)
  }

  // Level = HCL + offset, respecting caps (FADEE p.3).
  let level = hcl + profile.levelOffset
  if (profile.levelCap !== undefined) level = Math.min(level, profile.levelCap)
  if (profile.levelFloor !== undefined) level = Math.max(level, profile.levelFloor)

  const enc: EncounterRoll = { table: 'vermin', monster: profile, count, level }
  enc.table = tableKindFor(profile)

  if (profile.major && !isEventProfile(profile)) {
    // FADEE p.105: Final Boss check — d6 + Major Foes met so far.
    // Wandering Monsters can never BE the Final Boss (R160 event raid;
    // p.104 for retracing WM): they still count toward the tally, but no
    // boss roll is made for them — otherwise a WM Major could log a false
    // "FINAL BOSS revealed" while isFinalBoss is cleared afterwards.
    state.majorFoesMet += 1
    if (canBeFinalBoss) {
      const bossRoll = rng.d(6) + (state.majorFoesMet - 1)
      enc.isFinalBoss = bossRoll >= 6
      if (enc.isFinalBoss) {
        events.push('THE FINAL BOSS has been revealed! (FADEE p.105)')
      }
    }
  } else if (profile.name === 'Invisible Gremlins') {
    // R117 "(incl. gremlins)": a gremlin meeting counts toward the Final
    // Boss tally even though gremlins are an event, not a fight.
    state.majorFoesMet += 1
    events.push('Invisible Gremlins! They count toward the Final Boss tally. (FADEE p.105)')
  }
  events.push(`Encounter: ${count}× ${profile.name} (L${level}) — ${profile.source}`)
  return enc
}

function isEventProfile(p: MonsterProfile): boolean {
  return p.category === 'Event'
}

// ---------- searching (FADEE p.107) ----------

/**
 * Search a tile (R123 dungeon, R143 caverns, R144 fungal).
 * Rogue-type classes, halflings and shadows count a 4 as a 5 in caverns
 * and fungal grottoes; in the dungeon the Search table is unchanged.
 * `partyClassIds` drives the 4-counts-as-5 rule.
 */
export function searchTile(
  state: DungeonState,
  rng: Rng,
  tileId: string,
  partyClassIds: string[] = [],
): { state: DungeonState; result: string; detail?: string } {
  const tile = state.tiles.find((t) => t.id === tileId)
  if (!tile) throw new DungeonError('unknown tile')
  if (tile.searchRoll !== null) throw new DungeonError('tile already searched')
  const shape = D66_TILES.find((t) => t.id === tile.shapeId)
  const isCorridor = shape?.corridor ?? false
  const env = tile.environment ?? state.environment ?? 'dungeon'
  const roll = rng.roll(1, 6, env === 'dungeon' && isCorridor ? -1 : 0, `search roll (FADEE p.107)`)
  tile.searchRoll = roll
  // 4 counts as 5 — but ONLY outside the dungeon (R123's dungeon table
  // has no such rule): caverns grant it to rogue-type classes and
  // halflings (R143), fungal grottoes to mushroom monks and halflings
  // (R144). A rogue searching a dungeon tile with a 4 finds nothing.
  const countsFourAsFive =
    env === 'caverns'
      ? partyClassIds.some((c) => ['rogue', 'assassin', 'halfling'].includes(c))
      : env === 'fungal'
        ? partyClassIds.some((c) => ['halfling', 'mushroomMonk', 'mushroom-monk'].includes(c))
        : false
  if (roll <= 1) {
    tile.searchResult = 'wandering-monsters'
    state.pendingWanderingMonsters = Date.now()
    return { state, result: 'Wandering Monsters attack! (resolution with the combat engine)' }
  }
  const effective = countsFourAsFive && roll === 4 ? 5 : roll
  if (effective <= 4) {
    tile.searchResult = 'empty'
    return { state, result: 'The tile is truly empty.' }
  }
  // 5-6: found something — the PLAYER chooses (FADEE p.107). Phase 3 exposes
  // the options; choosing hidden treasure rolls its complication table.
  tile.searchResult = 'find'
  const detail =
    env === 'caverns'
      ? 'clue|listen'
      : env === 'fungal'
        ? 'clue|rare-mushroom'
        : 'hidden-treasure|secret-door|secret-passage|clue'
  return { state, result: 'find', detail }
}

/** Roll a Rare Mushroom (R152) — used by fungal Search and treasure. */
export function rollRareMushroomName(rng: Rng): string {
  return RARE_MUSHROOMS[rng.d(6) - 1].name
}

/**
 * Generate the real tile beyond a found secret door (R125): draw a door,
 * roll a connected tile through the current tile's first open exit. The
 * party may PEEK at its content before entering, and refuse.
 */
export function generateSecretDoorTile(
  state: DungeonState,
  rng: Rng,
  hcl: number,
): { state: DungeonState; toTileId: string | null; events: string[] } {
  const events: string[] = []
  const tile = currentTile(state)
  const exit = tile.exits.find((e) => !e.toTileId)
  if (!exit) {
    events.push('No wall is left for a secret door here — the door is drawn on the map, but it leads nowhere.')
    return { state, toTileId: null, events }
  }
  const before = state.tiles.length
  const fromTileId = tile.id
  const result = exploreThrough(state, rng, exit.id, hcl)
  // Peeking is not entering: the party stays where it is until it chooses
  // to step through (store.enterSecretDoor moves them, WM-free).
  result.state.currentTileId = fromTileId
  const newTile = result.state.tiles[before]
  if (newTile) {
    newTile.viaSecretDoor = true
    // True fog of war: the tile beyond a secret door is placed but NOT
    // entered, so it stays unexplored — its contents are hidden from the
    // map, the log and the journal until the party peeks or steps through.
    newTile.explored = false
    const bonus = rollSecretDoorBonus(rng)
    result.state.secretDoor = {
      fromTileId: tile.id,
      toTileId: newTile.id,
      peeked: false,
      safeExit: bonus.safeExit,
    }
    events.push(
      'A secret door! Peek before you enter, or step through blind.',
      bonus.safeExit
        ? 'The door also hides a SAFE SHORTCUT OUT of the dungeon — no Wandering Monsters through it.'
        : 'Peek first, then decide whether to step through.',
    )
  }
  // The explore events describe the new tile's contents (encounter, boss
  // reveal, cavern feature) — all leaks while the tile is unexplored.
  // Only the shape/placement lines may reach the log before a peek.
  const safe = result.events.filter(
    (e) => !e.startsWith('Encounter:') && !e.startsWith('THE FINAL BOSS') && !e.startsWith('Cavern feature:'),
  )
  return { state: result.state, toTileId: newTile?.id ?? null, events: [...safe, ...events] }
}

/**
 * Hidden treasure complication (R127, p.108): resolve the d6 complication
 * mechanically instead of leaving it as pending log text.
 * - 1-2 alarm: Wandering Monsters (the caller starts the ambush).
 * - 3-5 trap: a living rogue disarms with a Save vs HCL+1 (+L, R131);
 *   if there is no rogue — or the disarm fails — a random PC Saves vs
 *   HCL+1: fail = 1 Life, natural 1 = 2 Life.
 * - 6 ghost: a living cleric Saves vs HCL to banish it; fail, or no
 *   cleric, and every living PC loses 1 Life and the ghost leaves.
 * No bonus is named for the random-PC trap Save or the cleric's ghost
 * Save, so both are plain d6.
 */
export function resolveHiddenTreasureComplication(
  rng: Rng,
  party: Character[],
  hcl: number,
  comp: number,
): { text: string; wanderingMonsters: boolean } {
  const living = party.filter((p) => p.status !== 'dead')
  const hurt = (pc: Character, dmg: number) => {
    pc.currentLife = Math.max(0, pc.currentLife - dmg)
    if (pc.currentLife === 0) pc.status = 'dead'
  }
  if (comp <= 2) {
    return { text: 'An alarm attracts Wandering Monsters!', wanderingMonsters: true }
  }
  if (comp <= 5) {
    const rogue = living.find((p) => p.classId === 'rogue')
    let disarmNote = ''
    if (rogue) {
      const bonus = lockpickBonus(rogue)
      const die = rng.d(6)
      if (die + bonus >= hcl + 1) {
        return {
          text: `${rogue.name} disarms the trap guarding the loot (d6 ${die} +${bonus} = ${die + bonus} vs L${hcl + 1}).`,
          wanderingMonsters: false,
        }
      }
      // Disarm failed: the trap fires on a random PC (see below).
      disarmNote = `${rogue.name} fails to disarm the trap (d6 ${die} +${bonus} = ${die + bonus} vs L${hcl + 1}). `
    }
    const victim = living[Math.floor(((rng.d(1000) - 1) / 1000) * living.length)]
    if (!victim) return { text: 'The trap guarding the loot finds no one.', wanderingMonsters: false }
    const die = rng.d(6)
    if (die >= hcl + 1) {
      return {
        text: `${disarmNote}The loot is trapped — ${victim.name} Saves (d6 ${die} vs L${hcl + 1}) and avoids it.`,
        wanderingMonsters: false,
      }
    }
    const dmg = die === 1 ? 2 : 1
    hurt(victim, dmg)
    return {
      text: `${disarmNote}The loot is trapped — ${victim.name} fails the Save (d6 ${die} vs L${hcl + 1}) and loses ${dmg} Life (${victim.currentLife}/${victim.maxLife}).`,
      wanderingMonsters: false,
    }
  }
  const cleric = living.find((p) => p.classId === 'cleric')
  if (cleric) {
    const die = rng.d(6)
    if (die >= hcl) {
      return {
        text: `A ghost guards the loot — ${cleric.name} Saves (d6 ${die} vs L${hcl}) and banishes it.`,
        wanderingMonsters: false,
      }
    }
  }
  for (const pc of living) hurt(pc, 1)
  return {
    text: cleric
      ? `A ghost guards the loot — ${cleric.name} fails to banish it, and every PC loses 1 Life.`
      : 'A ghost guards the loot — with no cleric to banish it, every PC loses 1 Life.',
    wanderingMonsters: false,
  }
}

/** Hidden treasure (FADEE p.108): (2d6+HCL)² gp + complication d6. */
export function rollHiddenTreasure(
  state: DungeonState,
  rng: Rng,
  hcl: number,
  party?: Character[],
): { gold: number; complication: string; wanderingMonsters?: boolean } {
  const a = rng.roll(2, 6, hcl, 'hidden treasure (FADEE p.108)')
  const b = rng.roll(2, 6, hcl, 'hidden treasure (FADEE p.108)')
  const gold = a * b
  const comp = rng.d(6)
  if (!party) {
    // Legacy callers without a party (simulation tests) get the old
    // descriptive text; the store always passes the party.
    let complication: string
    if (comp <= 2) {
      state.pendingWanderingMonsters = Date.now()
      complication = 'An alarm attracts Wandering Monsters! (combat engine pending)'
    } else if (comp <= 5) {
      complication = 'The loot is protected by a Trap: a rogue may disarm with a Save vs HCL+1, otherwise a random PC Saves (fail = 1 Life, natural 1 = 2 Life). (trap engine pending)'
    } else {
      complication = 'A ghost guards it: a cleric Saves vs HCL to banish it, else all PCs lose 1 Life and it fades. (pending)'
    }
    return { gold, complication }
  }
  const resolved = resolveHiddenTreasureComplication(rng, party, hcl, comp)
  if (resolved.wanderingMonsters) state.pendingWanderingMonsters = Date.now()
  return { gold, complication: resolved.text, wanderingMonsters: resolved.wanderingMonsters || undefined }
}

/** Secret door (FADEE p.108): d6 after finding — 6 = safe shortcut exit. */
export function rollSecretDoorBonus(rng: Rng): { safeExit: boolean } {
  return { safeExit: rng.d(6) === 6 }
}
