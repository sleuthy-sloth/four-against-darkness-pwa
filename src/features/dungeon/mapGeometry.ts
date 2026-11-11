import type { PlacedTile, DungeonState } from '../../engine/dungeon/generate'
import type { Edge } from '../../rulesets/expanded/tiles'

/**
 * SVG geometry helpers for the dungeon map renderer. Walls are computed from
 * cell unions: an edge is a wall unless a neighboring cell of the same tile
 * shares it, or it is an exit (drawn as door/opening).
 */

export interface WallSeg {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface DoorMark {
  x: number
  y: number
  edge: Edge
  door: boolean
}

const WALL_SHARED_EDGE = 'shared' as const
void WALL_SHARED_EDGE

function neighborOf(c: { row: number; col: number }, e: Edge) {
  switch (e) {
    case 'N': return { row: c.row - 1, col: c.col }
    case 'S': return { row: c.row + 1, col: c.col }
    case 'E': return { row: c.row, col: c.col + 1 }
    case 'W': return { row: c.row, col: c.col - 1 }
  }
}

export interface TileGeometry {
  walls: WallSeg[]
  doors: DoorMark[]
}

/** Compute wall segments and door marks for one placed tile. */
export function tileGeometry(tile: PlacedTile): TileGeometry {
  const cellSet = new Set(tile.cells.map((c) => `${c.row},${c.col}`))
  const exitKeys = new Set(tile.exits.map((e) => `${e.cell.row},${e.cell.col}:${e.edge}`))
  const walls: WallSeg[] = []
  const doors: DoorMark[] = []

  for (const c of tile.cells) {
    for (const edge of ['N', 'S', 'E', 'W'] as Edge[]) {
      const n = neighborOf(c, edge)
      if (cellSet.has(`${n.row},${n.col}`)) continue // internal shared edge
      const k = `${c.row},${c.col}:${edge}`
      if (exitKeys.has(k)) {
        const exit = tile.exits.find(
          (e) => e.cell.row === c.row && e.cell.col === c.col && e.edge === edge,
        )!
        doors.push({ ...edgeMidpoint(c, edge), edge, door: exit.door })
        continue
      }
      walls.push(wallSegment(c, edge))
    }
  }
  return { walls, doors }
}

export function edgeMidpoint(c: { row: number; col: number }, e: Edge): { x: number; y: number } {
  const x = c.col
  const y = c.row
  switch (e) {
    case 'N': return { x: x + 0.5, y }
    case 'S': return { x: x + 0.5, y: y + 1 }
    case 'E': return { x: x + 1, y: y + 0.5 }
    case 'W': return { x, y: y + 0.5 }
  }
}

function wallSegment(c: { row: number; col: number }, e: Edge): WallSeg {
  const x = c.col
  const y = c.row
  switch (e) {
    case 'N': return { x1: x, y1: y, x2: x + 1, y2: y }
    case 'S': return { x1: x, y1: y + 1, x2: x + 1, y2: y + 1 }
    case 'E': return { x1: x + 1, y1: y, x2: x + 1, y2: y + 1 }
    case 'W': return { x1: x, y1: y, x2: x, y2: y + 1 }
  }
}

/** Bounding box of all explored tiles, for the default viewport. */
export function dungeonBounds(state: DungeonState): {
  minRow: number
  maxRow: number
  minCol: number
  maxCol: number
} {
  const rows = state.tiles.flatMap((t) => t.cells.map((c) => c.row))
  const cols = state.tiles.flatMap((t) => t.cells.map((c) => c.col))
  return {
    minRow: Math.min(...rows),
    maxRow: Math.max(...rows),
    minCol: Math.min(...cols),
    maxCol: Math.max(...cols),
  }
}
