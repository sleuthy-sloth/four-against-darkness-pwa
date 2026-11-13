import type { PlacedExit } from '../../engine/dungeon/generate'
import { doorLabel } from '../../engine/dungeon/doors'
import { doorState } from './mapStyle'

/**
 * Keyboard navigation for the map's exit discs (Phase G).
 *
 * Pure helpers, so the labels and the arrow-key movement are unit-testable
 * without a DOM. The component owns the roving tabindex and the focus.
 */

const EDGE_DIRECTION: Record<string, string> = {
  N: 'north',
  S: 'south',
  E: 'east',
  W: 'west',
}

/**
 * Human label for an exit disc: direction + what lies beyond. A generated
 * exit names the tile it leads to; an ungenerated one names its door state,
 * so a keyboard player knows a locked door before pressing Enter.
 */
export function exitLabel(exit: PlacedExit, toTileShapeId?: number | null): string {
  const dir = EDGE_DIRECTION[exit.edge] ?? exit.edge
  if (exit.toTileId) {
    return `Move ${dir} — way already open${toTileShapeId ? `, tile ${toTileShapeId}` : ''}`
  }
  const state = doorState(exit)
  if (state === 'opening') return `Explore ${dir} — plain opening`
  if (state === 'closed') return `Explore ${dir} — closed door`
  return `${doorLabel(exit.doorInfo!)} to the ${dir} — open the door`
}

/** Arrow-key step among the current tile's exits, wrapping around. */
export function nextExitIndex(current: number, direction: 1 | -1, count: number): number {
  if (count <= 0) return 0
  return (((current + direction) % count) + count) % count
}
