/**
 * FADEE tile shapes (FADEE pp.149-151) — transcribed from the printed tile
 * diagrams. Diagrams are artwork (no text layer), so every entry carries a
 * confidence flag and was cross-checked with zoomed page-crop reads.
 *
 * Coordinate convention: cells are (row, col), 1-based, row 1 = top of the
 * tile, col 1 = leftmost column, BEFORE any transform. Exits list every
 * external connection point: `door: true` = printed door symbol,
 * `door: false` = plain opening (no door symbol drawn).
 *
 * Corridor tiles are the ones the book marks "C" (FADEE p.149); rooms are
 * everything else. C-marked set verified: 11,12,13,14,26,32,33,42,45,
 * 51,53,55,62,63,65.
 *
 * VALIDATION (OQ-2): shapes marked 'low' (approximated diagonals or
 * art-obscured walls) must be re-checked against the book before trusting
 * generated maps. Simulation tests validate structural sanity for all.
 */

export type Edge = 'N' | 'S' | 'E' | 'W'
export interface Cell {
  row: number
  col: number
}
export interface Exit {
  cell: Cell
  edge: Edge
  door: boolean
}
export type Confidence = 'high' | 'medium' | 'low'

export interface TileShape {
  id: number
  corridor: boolean
  cells: Cell[]
  exits: Exit[]
  confidence: Confidence
}

const c = (row: number, col: number): Cell => ({ row, col })

/** Six starting tiles, rolled with d6 (FADEE pp.104, 149). All rooms. */
export const STARTING_TILES: TileShape[] = [
  {
    id: 1,
    corridor: false,
    confidence: 'medium',
    cells: [c(1, 1), c(1, 2), c(1, 3), c(1, 4), c(1, 5), c(1, 6), c(2, 1), c(2, 2), c(2, 3), c(2, 4), c(2, 5), c(2, 6)],
    // Decorative V-alcove on the bottom wall is omitted (non-rectangular).
    exits: [
      { cell: c(1, 1), edge: 'N', door: true },
      { cell: c(1, 3), edge: 'N', door: true },
      { cell: c(1, 6), edge: 'N', door: true },
      { cell: c(2, 4), edge: 'S', door: true },
    ],
  },
  {
    id: 2,
    corridor: false,
    confidence: 'medium',
    cells: [c(1, 3), c(2, 3), c(3, 2), c(3, 3), c(3, 4), c(4, 2), c(4, 3), c(4, 4), c(5, 2), c(5, 3), c(5, 4)],
    exits: [
      { cell: c(3, 2), edge: 'W', door: true },
      { cell: c(4, 4), edge: 'E', door: true },
      { cell: c(5, 3), edge: 'S', door: true },
    ],
  },
  {
    id: 3,
    corridor: false,
    confidence: 'medium',
    cells: [c(1, 1), c(2, 1), c(3, 1), c(1, 5), c(2, 5), c(3, 5), c(3, 2), c(3, 3), c(3, 4), c(2, 3)],
    exits: [
      { cell: c(1, 1), edge: 'N', door: true },
      { cell: c(1, 5), edge: 'N', door: true },
      { cell: c(2, 3), edge: 'N', door: false }, // center tooth top: plain opening
    ],
  },
  {
    id: 4,
    corridor: false,
    confidence: 'low', // diagonal pinch walls approximated on the grid
    cells: [c(1, 1), c(2, 1), c(3, 1), c(4, 1), c(1, 4), c(2, 4), c(3, 4), c(4, 4), c(4, 2), c(4, 3), c(2, 2), c(3, 3)],
    exits: [
      { cell: c(1, 1), edge: 'N', door: false },
      { cell: c(1, 4), edge: 'N', door: false },
    ],
  },
  {
    id: 5,
    corridor: false,
    confidence: 'low', // Y-diagonals approximated as stepped cells
    cells: [c(1, 1), c(2, 2), c(3, 3), c(4, 3), c(5, 2), c(5, 3), c(5, 4), c(6, 3)],
    exits: [
      { cell: c(1, 1), edge: 'N', door: false },
      { cell: c(5, 2), edge: 'W', door: false },
      { cell: c(5, 4), edge: 'E', door: false },
      { cell: c(6, 3), edge: 'S', door: false },
    ],
  },
  {
    id: 6,
    corridor: false,
    confidence: 'medium',
    cells: [
      c(1, 1), c(1, 2), c(1, 3), c(1, 4), c(1, 5), c(1, 6),
      c(2, 3), c(2, 4), c(2, 5), c(3, 3), c(3, 4), c(3, 5), c(4, 3), c(4, 4), c(4, 5),
    ],
    exits: [
      { cell: c(4, 4), edge: 'S', door: true },
      { cell: c(4, 5), edge: 'S', door: true },
      { cell: c(1, 6), edge: 'E', door: false },
    ],
  },
]

/** 36 exploration tiles, rolled with d66 (FADEE pp.149-151). */
export const D66_TILES: TileShape[] = [
  // --- Row 1x (p.149) ---
  {
    id: 11, corridor: true, confidence: 'medium',
    cells: [c(1, 1), c(1, 2), c(1, 3), c(1, 4)],
    exits: [
      { cell: c(1, 1), edge: 'N', door: true },
      { cell: c(1, 3), edge: 'S', door: true },
    ],
  },
  {
    id: 12, corridor: true, confidence: 'medium',
    cells: [c(1, 1), c(1, 2), c(1, 3)],
    exits: [
      { cell: c(1, 1), edge: 'W', door: true },
      { cell: c(1, 3), edge: 'E', door: true },
    ],
  },
  {
    id: 13, corridor: true, confidence: 'medium', // C-shape winding corridor
    cells: [c(1, 1), c(1, 2), c(1, 3), c(2, 1), c(2, 3), c(3, 1), c(3, 2), c(3, 3)],
    exits: [
      { cell: c(2, 1), edge: 'W', door: true },
      { cell: c(3, 1), edge: 'S', door: true },
    ],
  },
  {
    id: 14, corridor: true, confidence: 'medium', // H-shape
    cells: [c(1, 1), c(2, 1), c(3, 1), c(1, 4), c(2, 4), c(3, 4), c(2, 2), c(2, 3)],
    exits: [
      { cell: c(1, 1), edge: 'N', door: true },
      { cell: c(3, 4), edge: 'S', door: true },
    ],
  },
  {
    id: 15, corridor: false, confidence: 'medium', // stepped room
    cells: [c(1, 1), c(1, 2), c(2, 1), c(2, 2), c(2, 3), c(3, 3)],
    exits: [
      { cell: c(1, 1), edge: 'N', door: true },
      { cell: c(3, 3), edge: 'S', door: true },
    ],
  },
  {
    id: 16, corridor: false, confidence: 'medium', // 2×2 chamber + walled stub
    cells: [c(1, 1), c(1, 2), c(2, 1), c(2, 2), c(2, 3), c(2, 4), c(2, 5)],
    exits: [{ cell: c(2, 1), edge: 'W', door: true }],
  },
  // --- Row 2x (p.149/150) ---
  {
    id: 21, corridor: false, confidence: 'medium',
    cells: [c(1, 1), c(1, 2), c(1, 3), c(2, 1), c(2, 2), c(2, 3), c(3, 1), c(3, 2), c(3, 3)],
    exits: [{ cell: c(3, 2), edge: 'S', door: true }],
  },
  {
    id: 22, corridor: false, confidence: 'medium',
    cells: [c(1, 1), c(1, 2), c(1, 3), c(2, 1), c(2, 2), c(2, 3), c(3, 1), c(3, 2), c(3, 3), c(2, 4), c(2, 5)],
    exits: [
      { cell: c(2, 1), edge: 'W', door: true },
      { cell: c(3, 2), edge: 'S', door: true },
      { cell: c(2, 5), edge: 'E', door: false }, // stub end open
    ],
  },
  {
    id: 23, corridor: false, confidence: 'high',
    cells: [
      c(1, 1), c(1, 2), c(1, 3),
      c(1, 4), c(1, 5), c(1, 6), c(2, 4), c(2, 5), c(2, 6), c(3, 4), c(3, 5), c(3, 6),
    ],
    exits: [
      { cell: c(1, 1), edge: 'W', door: true },
      { cell: c(2, 6), edge: 'E', door: true },
    ],
  },
  {
    id: 24, corridor: false, confidence: 'high', // plus room
    cells: [c(1, 2), c(2, 1), c(2, 2), c(2, 3), c(3, 2)],
    exits: [
      { cell: c(2, 1), edge: 'W', door: true },
      { cell: c(2, 3), edge: 'E', door: true },
      { cell: c(3, 2), edge: 'S', door: true },
    ],
  },
  {
    id: 25, corridor: false, confidence: 'high', // round room + east corridor
    cells: [c(1, 1), c(1, 2), c(1, 3), c(2, 1), c(2, 2), c(2, 3), c(3, 1), c(3, 2), c(3, 3), c(2, 4), c(2, 5), c(2, 6)],
    exits: [
      { cell: c(2, 1), edge: 'W', door: true },
      { cell: c(2, 6), edge: 'E', door: false }, // corridor end open
    ],
  },
  {
    id: 26, corridor: true, confidence: 'high',
    cells: [c(1, 1), c(1, 2)],
    exits: [
      { cell: c(1, 2), edge: 'N', door: true },
      { cell: c(1, 1), edge: 'S', door: true },
    ],
  },
  // --- Row 3x (p.150) ---
  {
    id: 31, corridor: false, confidence: 'high', // 3×2 block + bottom stub
    cells: [c(1, 1), c(1, 2), c(1, 3), c(2, 1), c(2, 2), c(2, 3), c(3, 3), c(3, 4)],
    exits: [
      { cell: c(1, 1), edge: 'W', door: true },
      { cell: c(3, 4), edge: 'E', door: true },
    ],
  },
  {
    id: 32, corridor: true, confidence: 'low', // partial reads only; L-corridor per first pass
    cells: [c(1, 3), c(2, 3), c(3, 1), c(3, 2), c(3, 3)],
    exits: [
      { cell: c(1, 3), edge: 'N', door: true },
      { cell: c(3, 1), edge: 'W', door: true },
      { cell: c(3, 3), edge: 'E', door: true },
    ],
  },
  {
    id: 33, corridor: true, confidence: 'high',
    cells: [c(1, 1), c(1, 2), c(1, 3)],
    exits: [
      { cell: c(1, 1), edge: 'W', door: true },
      { cell: c(1, 2), edge: 'S', door: true },
    ],
  },
  {
    id: 34, corridor: false, confidence: 'high', // round room + W/E stubs
    cells: [c(1, 2), c(1, 3), c(1, 4), c(2, 2), c(2, 3), c(2, 4), c(3, 2), c(3, 3), c(3, 4), c(2, 1), c(2, 5)],
    exits: [
      { cell: c(2, 1), edge: 'W', door: true },
      { cell: c(2, 5), edge: 'E', door: true },
    ],
  },
  {
    id: 35, corridor: false, confidence: 'low', // nook/room junction obscured by art
    cells: [c(1, 1), c(2, 1), c(2, 2), c(2, 3), c(3, 1), c(3, 2), c(3, 3), c(4, 1), c(4, 2), c(4, 3)],
    exits: [{ cell: c(1, 1), edge: 'N', door: false }],
  },
  {
    id: 36, corridor: false, confidence: 'medium', // H/plus complex room
    cells: [
      c(1, 1), c(1, 3), c(1, 4),
      c(2, 1), c(2, 2), c(2, 3), c(2, 4), c(2, 5),
      c(3, 2), c(3, 3), c(3, 5),
    ],
    exits: [
      { cell: c(3, 3), edge: 'S', door: true },
      { cell: c(3, 5), edge: 'S', door: true },
    ],
  },
  // --- Row 4x (p.150) ---
  {
    id: 41, corridor: false, confidence: 'high', // 3×3 + west stub
    cells: [c(2, 3), c(2, 4), c(2, 5), c(3, 3), c(3, 4), c(3, 5), c(4, 3), c(4, 4), c(4, 5), c(3, 2)],
    exits: [
      { cell: c(3, 2), edge: 'W', door: true },
      { cell: c(2, 5), edge: 'E', door: true },
    ],
  },
  {
    id: 42, corridor: true, confidence: 'high', // S/Z corridor
    cells: [c(1, 3), c(2, 1), c(2, 2), c(2, 3), c(3, 1)],
    exits: [
      { cell: c(1, 3), edge: 'N', door: false },
      { cell: c(2, 1), edge: 'W', door: false },
      { cell: c(3, 1), edge: 'S', door: false },
    ],
  },
  {
    id: 43, corridor: false, confidence: 'medium', // 3×3 + east stub
    cells: [c(1, 1), c(1, 2), c(1, 3), c(2, 1), c(2, 2), c(2, 3), c(3, 1), c(3, 2), c(3, 3), c(2, 4), c(2, 5)],
    exits: [
      { cell: c(2, 1), edge: 'W', door: true },
      { cell: c(2, 5), edge: 'E', door: false },
    ],
  },
  {
    id: 44, corridor: false, confidence: 'medium', // big T/cross room
    cells: [c(1, 3), c(1, 4), c(2, 3), c(2, 4), c(3, 2), c(3, 3), c(3, 4), c(4, 2), c(4, 3), c(4, 4), c(5, 3)],
    exits: [
      { cell: c(1, 4), edge: 'E', door: true },
      { cell: c(5, 3), edge: 'S', door: true },
    ],
  },
  {
    id: 45, corridor: true, confidence: 'high', // plus corridor
    cells: [c(1, 2), c(2, 2), c(3, 1), c(3, 2), c(3, 3), c(3, 4), c(3, 5), c(4, 2)],
    exits: [
      { cell: c(3, 1), edge: 'W', door: false },
      { cell: c(3, 5), edge: 'E', door: false },
      { cell: c(4, 2), edge: 'S', door: false },
    ],
  },
  {
    id: 46, corridor: false, confidence: 'medium', // 3×3 + east stub
    cells: [c(1, 1), c(1, 2), c(1, 3), c(2, 1), c(2, 2), c(2, 3), c(3, 1), c(3, 2), c(3, 3), c(2, 4), c(2, 5)],
    exits: [
      { cell: c(2, 1), edge: 'W', door: true },
      { cell: c(2, 5), edge: 'E', door: false },
    ],
  },
  // --- Row 5x (p.151) ---
  {
    id: 51, corridor: true, confidence: 'high', // zigzag corridor, verified high-res
    cells: [c(1, 1), c(1, 2), c(2, 2), c(3, 2), c(3, 3)],
    exits: [
      { cell: c(1, 1), edge: 'N', door: true },
      { cell: c(1, 2), edge: 'N', door: true },
      { cell: c(3, 3), edge: 'S', door: true },
    ],
  },
  {
    id: 52, corridor: false, confidence: 'high', // cross room + east stub
    cells: [c(1, 2), c(2, 1), c(2, 2), c(2, 3), c(2, 4), c(3, 2)],
    exits: [
      { cell: c(1, 2), edge: 'N', door: true },
      { cell: c(2, 1), edge: 'W', door: true },
      { cell: c(3, 2), edge: 'S', door: true },
      { cell: c(2, 4), edge: 'E', door: false },
    ],
  },
  {
    id: 53, corridor: true, confidence: 'high', // T corridor, verified high-res
    cells: [c(1, 1), c(1, 2), c(1, 3), c(2, 2)],
    exits: [
      { cell: c(1, 1), edge: 'W', door: true },
      { cell: c(1, 3), edge: 'E', door: false },
    ],
  },
  {
    id: 54, corridor: false, confidence: 'medium', // 2×3 room + east stub
    cells: [c(1, 1), c(1, 2), c(1, 3), c(2, 1), c(2, 2), c(2, 3), c(2, 4)],
    exits: [
      { cell: c(2, 2), edge: 'S', door: true },
      { cell: c(2, 4), edge: 'E', door: false },
    ],
  },
  {
    id: 55, corridor: true, confidence: 'medium', // L corridor
    cells: [c(1, 1), c(1, 2), c(1, 3), c(1, 4), c(2, 1)],
    exits: [
      { cell: c(1, 3), edge: 'N', door: true },
      { cell: c(2, 1), edge: 'S', door: false },
    ],
  },
  {
    id: 56, corridor: false, confidence: 'medium', // 3×3 room minus NW corner
    cells: [c(1, 2), c(1, 3), c(2, 1), c(2, 2), c(2, 3), c(3, 1), c(3, 2), c(3, 3)],
    exits: [
      { cell: c(1, 3), edge: 'N', door: true },
      { cell: c(2, 1), edge: 'W', door: true },
      { cell: c(3, 2), edge: 'S', door: true },
    ],
  },
  // --- Row 6x (p.151) ---
  {
    id: 61, corridor: false, confidence: 'medium', // 2×4 room
    cells: [c(1, 1), c(1, 2), c(1, 3), c(1, 4), c(2, 1), c(2, 2), c(2, 3), c(2, 4)],
    exits: [
      { cell: c(1, 2), edge: 'N', door: true },
      { cell: c(2, 1), edge: 'W', door: true },
      { cell: c(2, 4), edge: 'E', door: true },
    ],
  },
  {
    id: 62, corridor: true, confidence: 'high', // plus corridor, 4 open ends
    cells: [c(1, 2), c(2, 1), c(2, 2), c(2, 3), c(3, 2)],
    exits: [
      { cell: c(1, 2), edge: 'N', door: false },
      { cell: c(2, 1), edge: 'W', door: false },
      { cell: c(2, 3), edge: 'E', door: false },
      { cell: c(3, 2), edge: 'S', door: false },
    ],
  },
  {
    id: 63, corridor: true, confidence: 'medium',
    cells: [c(1, 1), c(1, 2), c(1, 3), c(1, 4)],
    exits: [
      { cell: c(1, 2), edge: 'N', door: true },
      { cell: c(1, 3), edge: 'N', door: true },
    ],
  },
  {
    id: 64, corridor: false, confidence: 'medium', // sideways-T room, 1 exit
    cells: [c(1, 1), c(2, 1), c(2, 2), c(2, 3), c(2, 4)],
    exits: [{ cell: c(1, 1), edge: 'W', door: true }],
  },
  {
    id: 65, corridor: true, confidence: 'high', // stepped diagonal corridor
    cells: [c(1, 3), c(2, 2), c(3, 1), c(3, 2)],
    exits: [
      { cell: c(1, 3), edge: 'E', door: true },
      { cell: c(3, 1), edge: 'W', door: true },
    ],
  },
  {
    id: 66, corridor: false, confidence: 'medium', // cross room
    cells: [c(1, 3), c(2, 1), c(2, 2), c(2, 3), c(3, 3)],
    exits: [
      { cell: c(1, 3), edge: 'N', door: true },
      { cell: c(2, 1), edge: 'W', door: true },
      { cell: c(3, 3), edge: 'S', door: true },
    ],
  },
]

export function shapeById(id: number): TileShape | undefined {
  return (
    D66_TILES.find((t) => t.id === id) ??
    STARTING_TILES.find((t) => t.id === id)
  )
}
