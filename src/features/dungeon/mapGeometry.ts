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

/**
 * Corner caps (Milestone 5 — C4): points where two wall segments meet at a
 * right angle, so the carved wall treatment gets a square cap at each
 * corner instead of a mitre gap. T-junctions (three segments) and straight
 * joins (two collinear segments) are not corners.
 */
export function wallCorners(walls: WallSeg[]): Array<{ x: number; y: number }> {
  const at = new Map<string, Array<{ dx: number; dy: number }>>()
  const add = (x: number, y: number, dx: number, dy: number) => {
    const k = `${x},${y}`
    const list = at.get(k) ?? []
    list.push({ dx, dy })
    at.set(k, list)
  }
  for (const w of walls) {
    const dx = Math.sign(w.x2 - w.x1)
    const dy = Math.sign(w.y2 - w.y1)
    add(w.x1, w.y1, dx, dy)
    add(w.x2, w.y2, -dx, -dy)
  }
  const corners: Array<{ x: number; y: number }> = []
  for (const [k, dirs] of at) {
    if (dirs.length !== 2) continue
    const [a, b] = dirs
    // Perpendicular: dot product zero (and neither is a zero vector, which
    // cannot happen for a wall segment).
    if (a.dx * b.dx + a.dy * b.dy === 0) {
      const [x, y] = k.split(',').map(Number)
      corners.push({ x, y })
    }
  }
  return corners
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
