import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import {
  GRID_H,
  GRID_W,
  currentTile,
  exploreThrough,
  newDungeon,
  openExits,
  rollHiddenTreasure,
  searchTile,
  type DungeonState,
} from '../../src/engine/dungeon/generate'
import { ContentKind } from '../../src/engine/dungeon/generate'

/**
 * Dungeon-generation simulation (PROJECT_SPEC §30): batch exploration runs
 * hunting for invalid connections, overlaps, out-of-bounds cells, broken
 * content rolls. Deterministic seeds reproduce any failure.
 */

const CONTENT_KINDS: ContentKind[] = [
  'empty', 'treasure', 'treasureTrapped', 'specialEvents', 'specialFeature',
  'secretPassage', 'vermin', 'minions', 'weird', 'boss', 'dragonLair',
]

function runExploration(seed: number, steps: number): { state: DungeonState; deadEnds: number } {
  const rng = new Rng(seed)
  let state = newDungeon('sim', rng)
  let deadEnds = 0
  for (let i = 0; i < steps; i++) {
    const tile = currentTile(state)
    const exits = openExits(state, tile)
    if (exits.length === 0) {
      deadEnds++
      // Go back to the start tile and try again (dead ends are legal; the
      // party re-routes through generated exits).
      const withExits = state.tiles.find((t) => openExits(state, t).length > 0)
      if (!withExits) break
      state.currentTileId = withExits.id
      continue
    }
    const choice = exits[rng.d(exits.length) - 1]
    const before = state.tiles.length
    const res = exploreThrough(state, rng, choice.id, 1)
    state = res.state
    if (state.tiles.length === before) deadEnds++
  }
  return { state, deadEnds }
}

function validate(state: DungeonState): void {
  const seen = new Map<string, string>()
  for (const tile of state.tiles) {
    for (const c of tile.cells) {
      expect(c.row, `tile ${tile.id} row bound`).toBeGreaterThanOrEqual(1)
      expect(c.row, `tile ${tile.id} row bound`).toBeLessThanOrEqual(GRID_H)
      expect(c.col, `tile ${tile.id} col bound`).toBeGreaterThanOrEqual(1)
      expect(c.col, `tile ${tile.id} col bound`).toBeLessThanOrEqual(GRID_W)
      const k = `${c.row},${c.col}`
      const owner = seen.get(k)
      if (owner) throw new Error(`overlap at ${k}: ${owner} vs ${tile.id}`)
      seen.set(k, tile.id)
    }
    // content validity
    if (tile.content) {
      expect(CONTENT_KINDS).toContain(tile.content.kind)
      if (tile.content.encounter) {
        expect(tile.content.encounter.count).toBeGreaterThanOrEqual(1)
        expect(tile.content.encounter.level).toBeGreaterThanOrEqual(1)
      }
    } else {
      expect(tile.contentRoll === null, 'non-start tiles roll content').toBe(true)
    }
    // exit links are bidirectional
    for (const e of tile.exits) {
      if (e.toTileId) {
        const other = state.tiles.find((t) => t.id === e.toTileId)
        expect(other, `link target ${e.toTileId}`).toBeDefined()
        const back = other!.exits.find(
          (x) => x.toTileId === tile.id &&
            Math.abs(x.cell.row - e.cell.row) + Math.abs(x.cell.col - e.cell.col) === 1,
        )
        expect(back, `reciprocal link for ${tile.id}->${e.toTileId}`).toBeDefined()
      }
    }
  }
  // connectivity: all generated tiles reachable from the start
  const start = state.tiles[0]
  const visited = new Set([start.id])
  const queue = [start]
  while (queue.length) {
    const t = queue.pop()!
    for (const e of t.exits) {
      if (e.toTileId && !visited.has(e.toTileId)) {
        visited.add(e.toTileId)
        queue.push(state.tiles.find((x) => x.id === e.toTileId)!)
      }
    }
  }
  expect(visited.size, 'all tiles reachable').toBe(state.tiles.length)
}

describe('dungeon generation simulation', () => {
  it('runs 100 seeded dungeons without structural violations', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { state } = runExploration(seed, 25)
      expect(() => validate(state)).not.toThrow()
    }
  })

  it('is deterministic: same seed → identical dungeon', () => {
    const a = runExploration(4242, 20).state
    const b = runExploration(4242, 20).state
    expect(JSON.stringify(a.tiles)).toBe(JSON.stringify(b.tiles))
  })

  it('starts at the bottom of the grid with a content-free starting room', () => {
    const rng = new Rng(11)
    const state = newDungeon('x', rng)
    expect(state.tiles).toHaveLength(1)
    expect(state.tiles[0].contentRoll).toBeNull()
    const minRow = Math.min(...state.tiles[0].cells.map((c) => c.row))
    expect(minRow).toBeGreaterThan(GRID_H / 2) // bottom half
  })

  it('grows one tile per exploration through an open exit', () => {
    const rng = new Rng(99)
    let state = newDungeon('x', rng)
    const before = state.tiles.length
    // Pick an exit that has room to grow (paper-edge exits may be dead ends).
    const exits = openExits(state, currentTile(state)).filter(
      (e) =>
        (e.edge === 'N' && e.cell.row > 2) ||
        (e.edge === 'S' && e.cell.row < GRID_H - 1) ||
        (e.edge === 'W' && e.cell.col > 2) ||
        (e.edge === 'E' && e.cell.col < GRID_W - 1),
    )
    const res = exploreThrough(state, rng, exits[0].id, 1)
    expect(res.state.tiles.length).toBe(before + 1)
    expect(res.events.length).toBeGreaterThan(0)
  })

  it('rolls valid encounters with capped levels (HCL system, FADEE p.3)', () => {
    const rng = new Rng(7)
    let state = newDungeon('x', rng)
    let encounterChecks = 0
    for (let i = 0; i < 200 && encounterChecks < 15; i++) {
      let tile = currentTile(state)
      let exits = openExits(state, tile)
      if (!exits.length) {
        const withExits = state.tiles.find((t) => openExits(state, t).length > 0)
        if (!withExits) break
        state.currentTileId = withExits.id
        tile = withExits
        exits = openExits(state, tile)
      }
      const before = state.tiles.length
      const res = exploreThrough(state, rng, exits[rng.d(exits.length) - 1].id, 3)
      state = res.state
      if (state.tiles.length === before) continue // dead end
      const enc = res.state.tiles.at(-1)!.content?.encounter
      if (enc) {
        encounterChecks++
        expect(enc.level).toBeGreaterThanOrEqual(1)
        expect(enc.count).toBeGreaterThanOrEqual(1)
        expect(enc.monster.source).toMatch(/^FADEE p\.\d+$/)
      }
    }
    expect(encounterChecks).toBeGreaterThan(0)
  })

  it('flags the Final Boss on a 6+ roll tally (FADEE p.105)', () => {
    const rng = new Rng(2026)
    let state = newDungeon('x', rng)
    let sawBossFlag = false
    for (let i = 0; i < 60; i++) {
      const tile = currentTile(state)
      const exits = openExits(state, tile)
      if (!exits.length) break
      const res = exploreThrough(state, rng, exits[0].id, 4)
      state = res.state
      const enc = res.state.tiles.at(-1)!.content?.encounter
      if (enc?.isFinalBoss) sawBossFlag = true
    }
    expect(state.majorFoesMet).toBeGreaterThanOrEqual(0)
    expect(sawBossFlag || state.majorFoesMet < 6).toBe(true)
  })

  it('searches each tile at most once (FADEE p.107)', () => {
    const rng = new Rng(33)
    let state = newDungeon('x', rng)
    const tile = currentTile(state)
    const first = searchTile(state, rng, tile.id)
    expect(first.result).toBeDefined()
    expect(() => searchTile(state, rng, tile.id)).toThrow(/already searched/)
  })

  it('hidden treasure rolls (2d6+HCL)² with a complication (FADEE p.108)', () => {
    const rng = new Rng(55)
    let state = newDungeon('x', rng)
    const r = rollHiddenTreasure(state, rng, 2)
    const min = (2 + 2) ** 2
    const max = (12 + 2) ** 2
    expect(r.gold).toBeGreaterThanOrEqual(min)
    expect(r.gold).toBeLessThanOrEqual(max)
    expect(r.complication).toBeDefined()
  })
})
