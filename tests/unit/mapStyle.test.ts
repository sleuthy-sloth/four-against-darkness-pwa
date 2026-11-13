import { describe, it, expect } from 'vitest'
import {
  doorState,
  DOOR_STATES,
  fogState,
  floorVariant,
  fitScale,
  tileSummary,
  tileContentVisible,
  hashString,
} from '../../src/features/dungeon/mapStyle'
import type { PlacedExit, PlacedTile } from '../../src/engine/dungeon/generate'

function exit(over: Partial<PlacedExit> = {}): PlacedExit {
  return {
    id: 'x1',
    cell: { row: 0, col: 0 },
    edge: 'N',
    door: false,
    toTileId: null,
    ...over,
  }
}

function tile(over: Partial<PlacedTile> = {}): PlacedTile {
  return {
    id: 't1',
    shapeId: 14,
    transform: 0,
    origin: { row: 0, col: 0 },
    cells: [{ row: 0, col: 0 }],
    exits: [],
    explored: true,
    contentRoll: null,
    content: null,
    searchRoll: null,
    searchResult: null,
    ...over,
  }
}

describe('doorState (C4 + locked doors R129)', () => {
  it('open when a tile was generated beyond the exit', () => {
    expect(doorState(exit({ toTileId: 't2' }))).toBe('open')
    expect(doorState(exit({ door: true, toTileId: 't2' }))).toBe('open')
  })
  it('closed for an unexplored printed door', () => {
    expect(doorState(exit({ door: true }))).toBe('closed')
  })
  it('opening for an unexplored plain opening', () => {
    expect(doorState(exit({ door: false }))).toBe('opening')
  })
  it('renders each rolled door kind distinctly', () => {
    const kinds = ['locked', 'sealed', 'iron', 'illusionary', 'trapped', 'lever'] as const
    for (const kind of kinds) {
      expect(doorState(exit({ door: true, doorInfo: { kind, level: 3 } }))).toBe(kind)
    }
    expect(doorState(exit({ door: true, doorInfo: { kind: 'unlocked', level: 0 } }))).toBe('closed')
  })
  it('older exits with no rolled state render as plain closed doors', () => {
    expect(doorState(exit({ door: true }))).toBe('closed')
  })
  it('every door state has a legend entry (C5 agreement)', () => {
    const states = new Set<ReturnType<typeof doorState>>([
      doorState(exit({ toTileId: 't2' })),
      doorState(exit({ door: true })),
      doorState(exit({ door: false })),
      ...(['locked', 'sealed', 'iron', 'illusionary', 'trapped', 'lever'] as const).map((kind) =>
        doorState(exit({ door: true, doorInfo: { kind, level: 3 } })),
      ),
    ])
    for (const s of states) expect(DOOR_STATES).toContain(s)
    expect(states.size).toBe(DOOR_STATES.length)
  })
})

describe('fogState (C4 + true fog of war)', () => {
  it('current tile is torch-lit, every other explored tile is explored', () => {
    expect(fogState(tile({ id: 't1' }), 't1')).toBe('current')
    expect(fogState(tile({ id: 't2' }), 't1')).toBe('explored')
  })
  it('a placed-but-unentered tile is unexplored; a peeked one is peeked', () => {
    expect(fogState(tile({ id: 't2', explored: false }), 't1')).toBe('unexplored')
    expect(fogState(tile({ id: 't2', explored: false }), 't1', true)).toBe('peeked')
    expect(fogState(tile({ id: 't2', explored: true }), 't1', true)).toBe('explored')
  })
  it('unexplored tiles hide their contents from the map and the tooltip', () => {
    const hidden = tile({ explored: false, content: { roll: 7, kind: 'minions' } })
    expect(tileContentVisible(hidden, null)).toBe(false)
    expect(tileSummary(hidden, false)).toBe('Tile 14 · unexplored')
    expect(tileContentVisible(tile({ explored: true }), null)).toBe(true)
    const peeked = tile({ explored: false })
    expect(tileContentVisible(peeked, { toTileId: peeked.id, peeked: true })).toBe(true)
    expect(tileContentVisible(peeked, { toTileId: peeked.id, peeked: false })).toBe(false)
    expect(tileContentVisible(peeked, { toTileId: 'other', peeked: true })).toBe(false)
  })
})

describe('floorVariant (C4)', () => {
  it('is deterministic from seed + tile id (replays match)', () => {
    expect(floorVariant(1481, 'camp-x-t3')).toBe(floorVariant(1481, 'camp-x-t3'))
    expect(floorVariant(1481, 'camp-x-t3')).not.toBe(floorVariant(1004, 'camp-x-t3'))
    expect(floorVariant(1481, 'camp-x-t3')).not.toBe(floorVariant(1481, 'camp-x-t4'))
  })
  it('stays in the four-variant range', () => {
    for (let i = 0; i < 50; i++) {
      expect([0, 1, 2, 3]).toContain(floorVariant(1481, `t${i}`))
    }
  })
  it('hashString is stable and spreads', () => {
    expect(hashString('a')).toBe(hashString('a'))
    expect(hashString('a')).not.toBe(hashString('b'))
  })
})

describe('fitScale (D1)', () => {
  it('returns 1 for a square viewport on a square dungeon', () => {
    expect(fitScale(800, 800, 10, 10)).toBe(1)
  })
  it('fills a wide viewport on a tall dungeon', () => {
    // viewBox 10 wide × 20 tall in an 800×400 viewport: fit scale is 20,
    // fill scale is 80 → ratio 4, clamped to 2.5.
    expect(fitScale(800, 400, 10, 20)).toBe(2.5)
  })
  it('returns 1 for degenerate inputs', () => {
    expect(fitScale(0, 400, 10, 10)).toBe(1)
    expect(fitScale(800, 400, 0, 10)).toBe(1)
  })
})

import { wallCorners } from '../../src/features/dungeon/mapGeometry'

describe('wallCorners (C4)', () => {
  it('finds right-angle corners and skips straight joins', () => {
    // An L: two segments meeting at a right angle at (1,0).
    const corners = wallCorners([
      { x1: 0, y1: 0, x2: 1, y2: 0 },
      { x1: 1, y1: 0, x2: 1, y2: 1 },
    ])
    expect(corners).toEqual([{ x: 1, y: 0 }])
    // A straight run: no corner.
    expect(
      wallCorners([
        { x1: 0, y1: 0, x2: 1, y2: 0 },
        { x1: 1, y1: 0, x2: 2, y2: 0 },
      ]),
    ).toEqual([])
  })
  it('finds all four corners of a unit square', () => {
    const corners = wallCorners([
      { x1: 0, y1: 0, x2: 1, y2: 0 },
      { x1: 1, y1: 0, x2: 1, y2: 1 },
      { x1: 1, y1: 1, x2: 0, y2: 1 },
      { x1: 0, y1: 1, x2: 0, y2: 0 },
    ])
    expect(corners).toHaveLength(4)
  })
})

describe('tileSummary (F tooltip)', () => {
  it('names encounters with count and level', () => {
    const t = tile({
      content: {
        roll: 7,
        kind: 'minions',
        encounter: {
          table: 'minions',
          monster: { roll: 1, name: 'Orcs', family: 'goblinoid', category: 'Humanoid', levelOffset: 0 } as never,
          count: 3,
          level: 4,
        },
      },
    })
    expect(tileSummary(t)).toBe('Tile 14 · 3× Orcs (L4)')
  })
  it('names the entrance and cleared rooms honestly', () => {
    expect(tileSummary(tile())).toBe('Tile 14 · entrance')
    expect(
      tileSummary(tile({ content: { roll: 7, kind: 'minions', cleared: true } })),
    ).toBe('Tile 14 · cleared')
  })
})
