import { describe, expect, it } from 'vitest'
import { D66_TILES, STARTING_TILES, shapeById } from '../../src/rulesets/expanded/tiles'
import { transformShape, GRID_H, GRID_W } from '../../src/engine/dungeon/generate'

const CORRIDOR_IDS = new Set([11, 12, 13, 14, 26, 32, 33, 42, 45, 51, 53, 55, 62, 63, 65])

describe('tile shape data (FADEE pp.149-151)', () => {
  it('has 6 starting tiles and 36 d66 tiles with unique ids', () => {
    expect(STARTING_TILES).toHaveLength(6)
    expect(D66_TILES).toHaveLength(36)
    const ids = [...STARTING_TILES, ...D66_TILES].map((t) => t.id)
    expect(new Set(ids).size).toBe(42)
  })

  it('C-marked corridor set matches the book', () => {
    const marked = D66_TILES.filter((t) => t.corridor).map((t) => t.id).sort()
    expect(marked).toEqual([...CORRIDOR_IDS].sort())
  })

  it('corridor tiles have no 2×2 solid block (1-square-wide path, FADEE p.104)', () => {
    for (const t of D66_TILES.filter((x) => x.corridor)) {
      const cells = new Set(t.cells.map((c) => `${c.row},${c.col}`))
      const maxRow = Math.max(...t.cells.map((c) => c.row))
      const maxCol = Math.max(...t.cells.map((c) => c.col))
      for (let r = 1; r < maxRow; r++) {
        for (let c = 1; c < maxCol; c++) {
          const block =
            cells.has(`${r},${c}`) &&
            cells.has(`${r},${c + 1}`) &&
            cells.has(`${r + 1},${c}`) &&
            cells.has(`${r + 1},${c + 1}`)
          expect(block, `corridor ${t.id} has a 2×2 block at ${r},${c}`).toBe(false)
        }
      }
    }
  })

  it('rooms are 2+ squares wide (FADEE p.104)', () => {
    for (const t of D66_TILES.filter((x) => !x.corridor)) {
      const w = Math.max(...t.cells.map((c) => c.col)) - Math.min(...t.cells.map((c) => c.col))
      const h = Math.max(...t.cells.map((c) => c.row)) - Math.min(...t.cells.map((c) => c.row))
      expect(Math.max(w, h)).toBeGreaterThanOrEqual(1) // bbox ≥ 2 in one axis
      // A room must span 2 columns or 2 rows somewhere (cells in >1 col or row)
      const cols = new Set(t.cells.map((c) => c.col)).size
      const rows = new Set(t.cells.map((c) => c.row)).size
      expect(Math.max(cols, rows)).toBeGreaterThanOrEqual(2)
    }
  })

  it('every tile has at least one exit; start tile 16 may have one', () => {
    for (const t of [...STARTING_TILES, ...D66_TILES]) {
      expect(t.exits.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('every exit sits on the outer perimeter of its own cell', () => {
    for (const t of [...STARTING_TILES, ...D66_TILES]) {
      const cellSet = new Set(t.cells.map((c) => `${c.row},${c.col}`))
      for (const e of t.exits) {
        const k = `${e.cell.row},${e.cell.col}`
        expect(cellSet.has(k)).toBe(true)
        // The neighbor beyond the exit edge must NOT belong to the tile.
        const n = neighbor(e.cell, e.edge)
        expect(cellSet.has(`${n.row},${n.col}`)).toBe(false)
      }
    }
  })

  it('all 8 transforms of every shape are internally consistent', () => {
    for (const t of D66_TILES) {
      for (let tr = 0; tr < 8; tr++) {
        const x = transformShape(t, tr)
        expect(x.cells).toHaveLength(t.cells.length)
        expect(x.exits.length).toBe(t.exits.length)
        // exits still sit on tile cells and open outward
        const cellSet = new Set(x.cells.map((c) => `${c.row},${c.col}`))
        for (const e of x.exits) {
          expect(cellSet.has(`${e.cell.row},${e.cell.col}`)).toBe(true)
          const n = neighbor(e.cell, e.edge)
          expect(cellSet.has(`${n.row},${n.col}`)).toBe(false)
        }
      }
    }
  })

  it('every d66 roll 11-66 resolves to a shape (d66 skips x0/x7-x9)', () => {
    for (let tens = 1; tens <= 6; tens++) {
      for (let units = 1; units <= 6; units++) {
        expect(shapeById(tens * 10 + units)).toBeDefined()
      }
    }
  })

  it('all shapes fit the printed 20×28 grid', () => {
    for (const t of [...STARTING_TILES, ...D66_TILES]) {
      expect(Math.max(...t.cells.map((c) => c.col))).toBeLessThanOrEqual(GRID_W)
      expect(Math.max(...t.cells.map((c) => c.row))).toBeLessThanOrEqual(GRID_H)
    }
  })
})

function neighbor(c: { row: number; col: number }, e: 'N' | 'S' | 'E' | 'W') {
  switch (e) {
    case 'N': return { row: c.row - 1, col: c.col }
    case 'S': return { row: c.row + 1, col: c.col }
    case 'E': return { row: c.row, col: c.col + 1 }
    case 'W': return { row: c.row, col: c.col - 1 }
  }
}
