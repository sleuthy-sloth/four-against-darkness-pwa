import { describe, expect, it } from 'vitest'
import { exitLabel, nextExitIndex } from '../../src/features/dungeon/mapNav'
import type { PlacedExit } from '../../src/engine/dungeon/generate'

/** Keyboard navigation for the map's exit discs (Phase G). */

function exit(over: Partial<PlacedExit> = {}): PlacedExit {
  return {
    id: 'x1',
    cell: { col: 0, row: 0 },
    edge: 'N',
    door: true,
    toTileId: null,
    ...over,
  }
}

describe('exitLabel (G)', () => {
  it('names a generated way as already open', () => {
    expect(exitLabel(exit({ toTileId: 't2' }), 14)).toBe('Move north — way already open, tile 14')
    expect(exitLabel(exit({ toTileId: 't2' }), null)).toBe('Move north — way already open')
  })

  it('names a plain opening as an explore action', () => {
    expect(exitLabel(exit({ door: false }))).toBe('Explore north — plain opening')
  })

  it('names an unlocked door as a closed door', () => {
    expect(exitLabel(exit({ doorInfo: { kind: 'unlocked', level: 0 } }))).toBe(
      'Explore north — closed door',
    )
  })

  it('names an opened door as a plain opening, not as locked (Phase G)', () => {
    // doorState returns 'opening' once info.open is set, so the disc
    // label stops claiming the door is locked after a pick/bash/spell.
    expect(exitLabel(exit({ doorInfo: { kind: 'locked', level: 2, open: true } }))).toBe(
      'Explore north — plain opening',
    )
    expect(exitLabel(exit({ doorInfo: { kind: 'iron', level: 3, open: true } }))).toBe(
      'Explore north — plain opening',
    )
  })

  it('names every action door with its level and direction', () => {
    expect(exitLabel(exit({ edge: 'E', doorInfo: { kind: 'locked', level: 2 } }))).toBe(
      'Locked door (L2) to the east — open the door',
    )
    expect(exitLabel(exit({ edge: 'S', doorInfo: { kind: 'sealed', level: 5 } }))).toBe(
      'Magically sealed door (L5) to the south — open the door',
    )
    expect(exitLabel(exit({ edge: 'W', doorInfo: { kind: 'iron', level: 3 } }))).toBe(
      'Iron door (L3) to the west — open the door',
    )
    expect(exitLabel(exit({ doorInfo: { kind: 'trapped', level: 4 } }))).toBe(
      'Trapped door (trap L4) to the north — open the door',
    )
    expect(exitLabel(exit({ doorInfo: { kind: 'illusionary', level: 2 } }))).toBe(
      'Illusionary door to the north — open the door',
    )
    expect(exitLabel(exit({ doorInfo: { kind: 'lever', level: 0 } }))).toBe(
      'Lever door to the north — open the door',
    )
  })
})

describe('nextExitIndex (G)', () => {
  it('steps forward and back with wraparound', () => {
    expect(nextExitIndex(0, 1, 3)).toBe(1)
    expect(nextExitIndex(2, 1, 3)).toBe(0)
    expect(nextExitIndex(0, -1, 3)).toBe(2)
    expect(nextExitIndex(1, -1, 3)).toBe(0)
  })

  it('is a no-op for a single exit and safe for none', () => {
    expect(nextExitIndex(0, 1, 1)).toBe(0)
    expect(nextExitIndex(0, -1, 1)).toBe(0)
    expect(nextExitIndex(0, 1, 0)).toBe(0)
  })
})
