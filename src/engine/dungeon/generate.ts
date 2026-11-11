import type { Cell, Edge, Exit, TileShape } from '../../rulesets/expanded/tiles'
import { STARTING_TILES, D66_TILES, shapeById } from '../../rulesets/expanded/tiles'
import {
  oppositeEdge,
  profileFor,
  type MonsterProfile,
  type TableKind,
} from '../../rulesets/expanded/monsters'
import type { Rng } from '../core/rng'

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
  /** True when the tile was reached through a secret door (peek rules apply). */
  viaSecretDoor?: boolean
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

export function newDungeon(campaignId: string, rng: Rng): DungeonState {
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
  }
  return {
    campaignId,
    gridW: GRID_W,
    gridH: GRID_H,
    tiles: [tile],
    currentTileId: tile.id,
    majorFoesMet: 0,
    pendingWanderingMonsters: null,
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
    state = moveThroughExplored(state, rng, exit.toTileId, events)
    return { state, events }
  }

  // FADEE p.104: roll d66 for a new tile shape.
  const roll = rng.d66()
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
  }
  // Link both sides.
  exit.toTileId = newTileId
  const back = newTile.exits.find(
    (e) => e.cell.row === placement.exitCell.row && e.cell.col === placement.exitCell.col,
  )
  if (back) back.toTileId = tile.id

  // FADEE p.104: roll content as the party enters the tile.
  const contentRoll = rng.roll(2, 6, 0, `tile content 2d6 (FADEE p.152)`)
  newTile.contentRoll = contentRoll
  newTile.content = rollContent(state, rng, newTile, contentRoll, hcl, events)

  state.tiles.push(newTile)
  state.currentTileId = newTileId
  events.push(`Rolled d66 = ${roll}: ${shape.corridor ? 'corridor' : 'room'} tile.`)
  return { state, events }
}

function moveThroughExplored(
  state: DungeonState,
  rng: Rng,
  tileId: string,
  events: string[],
): DungeonState {
  // FADEE p.104: retrace — 1-in-6 Wandering Monsters.
  const roll = rng.d(6)
  if (roll === 1) {
    state.pendingWanderingMonsters = Date.now()
    events.push('Retracing: 1-in-6 → Wandering Monsters attack! (resolution arrives with the combat engine)')
  }
  state.currentTileId = tileId
  return state
}

interface Placement {
  transform: number
  origin: Cell
  exitCell: Cell // absolute cell of the new tile's matching exit
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
      // Dungeon: Special Feature Table (p.153); fungal gives a passage (0.5).
      base.kind = 'specialFeature'
      base.specialFeatureRoll = rng.d(6)
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
      base.kind = 'empty' // searchable; 2 Clues could buy a passage (Phase 5)
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
    let profile = profileFor(table, tableRoll)
    if (base.kind === 'dragonLair') {
      // FADEE p.152: the lair holds the environment's dragon.
      profile = dragonForEnvironment('dungeon')
    }
    base.encounter = rollEncounter(state, rng, profile, hcl, events)
  }
  return base
}

export function dragonForEnvironment(env: 'dungeon'): MonsterProfile {
  // FADEE p.170 Young Dragon for dungeon lairs (cave/fungal dragons in 0.5).
  return profileFor('boss', 6)
}

export function rollEncounter(
  state: DungeonState,
  rng: Rng,
  profile: MonsterProfile,
  hcl: number,
  events: string[],
): EncounterRoll {
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
  enc.table = 'vermin'
  // Fix table kind by looking the profile up (gremlin/dragon handled by caller).
  enc.table = (['vermin', 'minions', 'weird', 'boss'] as TableKind[]).find(
    (k) => profileFor(k, profile.roll) === profile,
  ) ?? 'vermin'

  if (profile.major && !isEventProfile(profile)) {
    // FADEE p.105: Final Boss check — d6 + Major Foes met so far.
    const bossRoll = rng.d(6) + state.majorFoesMet
    state.majorFoesMet += 1
    enc.isFinalBoss = bossRoll >= 6
    if (enc.isFinalBoss) {
      events.push('THE FINAL BOSS has been revealed! (FADEE p.105)')
    }
  }
  events.push(`Encounter: ${count}× ${profile.name} (L${level}) — ${profile.source}`)
  return enc
}

function isEventProfile(p: MonsterProfile): boolean {
  return p.category === 'Event'
}

// ---------- searching (FADEE p.107) ----------

export function searchTile(
  state: DungeonState,
  rng: Rng,
  tileId: string,
): { state: DungeonState; result: string; detail?: string } {
  const tile = state.tiles.find((t) => t.id === tileId)
  if (!tile) throw new DungeonError('unknown tile')
  if (tile.searchRoll !== null) throw new DungeonError('tile already searched')
  const shape = D66_TILES.find((t) => t.id === tile.shapeId)
  const isCorridor = shape?.corridor ?? false
  const roll = rng.roll(1, 6, isCorridor ? -1 : 0, `search roll (FADEE p.107)`)
  tile.searchRoll = roll
  if (roll <= 1) {
    tile.searchResult = 'wandering-monsters'
    state.pendingWanderingMonsters = Date.now()
    return { state, result: 'Wandering Monsters attack! (resolution with the combat engine)' }
  }
  if (roll <= 4) {
    tile.searchResult = 'empty'
    return { state, result: 'The tile is truly empty.' }
  }
  // 5-6: found something — the PLAYER chooses (FADEE p.107). Phase 3 exposes
  // the options; choosing hidden treasure rolls its complication table.
  tile.searchResult = 'find'
  return { state, result: 'find', detail: 'hidden-treasure|secret-door|secret-passage|clue' }
}

/** Hidden treasure (FADEE p.108): (2d6+HCL)² gp + complication d6. */
export function rollHiddenTreasure(
  state: DungeonState,
  rng: Rng,
  hcl: number,
): { gold: number; complication: string } {
  const a = rng.roll(2, 6, hcl, 'hidden treasure (FADEE p.108)')
  const b = rng.roll(2, 6, hcl, 'hidden treasure (FADEE p.108)')
  const gold = a * b
  const comp = rng.d(6)
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

/** Secret door (FADEE p.108): d6 after finding — 6 = safe shortcut exit. */
export function rollSecretDoorBonus(rng: Rng): { safeExit: boolean } {
  return { safeExit: rng.d(6) === 6 }
}
