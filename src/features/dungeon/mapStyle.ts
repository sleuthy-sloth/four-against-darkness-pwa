import type { PlacedExit, PlacedTile } from '../../engine/dungeon/generate'

/**
 * Map presentation helpers (Milestone 5 — C4/C5/D1).
 *
 * Pure functions over engine data, so the map, the legend, and the tests all
 * agree on what a door, a tile, and a floor look like. No engine state is
 * invented here: every state maps to a field the engine already carries.
 *
 * Honest gaps, recorded so the legend never promises what the map cannot
 * show:
 * - Locked doors: the book has lockpicking rules (FADEE p.110) but the
 *   engine carries no locked-door state and no door ever locks, so there is
 *   no `locked` state to render. The three states below are all the engine
 *   supports: open / closed / plain opening.
 * - Secret doors: a search find (FADEE p.108) records nothing on the tile
 *   until Milestone 5 added `secretDoorFound` (see claimFind). A tile with
 *   that flag shows a secret-door corner badge; it is not a door state,
 *   because the found door has no edge in the engine.
 * - Fog of war: every placed tile is `explored: true` the moment it is
 *   generated, so there is no placed-but-unexplored tile to render. The
 *   three visible states are current (torch-lit), explored (dim stone), and
 *   the unmapped directions — the glowing exit discs. The map background
 *   beyond placed tiles is unmapped parchment.
 */

/** Door states the engine can express, from a placed exit alone. */
export type DoorState = 'open' | 'closed' | 'opening'

/** Every door state the map renders — the legend renders exactly this set. */
export const DOOR_STATES: DoorState[] = ['open', 'closed', 'opening']

/**
 * Map an exit to its door state:
 * - `open` — a way already generated beyond it (the party has passed through).
 * - `closed` — a printed door (FADEE pp.109, 150) with nothing generated yet.
 * - `opening` — a plain opening with nothing generated yet.
 */
export function doorState(exit: PlacedExit): DoorState {
  if (exit.toTileId) return 'open'
  return exit.door ? 'closed' : 'opening'
}

/** Fog-of-war state for a placed tile, relative to the current tile. */
export type FogState = 'current' | 'explored'

export function fogState(tile: PlacedTile, currentTileId: string): FogState {
  return tile.id === currentTileId ? 'current' : 'explored'
}

/** FNV-1a hash of a string — deterministic, no seed needed beyond the input. */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/**
 * Per-tile floor variation, deterministic from the campaign seed and the
 * tile id — replays match, because the same dungeon always yields the same
 * floors. Four variants: each bakes a stone-pattern rotation and a slight
 * tone step into its SVG pattern (see DungeonScreen defs).
 */
export function floorVariant(seed: number, tileId: string): 0 | 1 | 2 | 3 {
  return (hashString(`${seed}:${tileId}`) % 4) as 0 | 1 | 2 | 3
}

/**
 * Zoom that fills the viewport with the dungeon ("fit dungeon", D1).
 * The SVG already fits the bounds with preserveAspectRatio="meet", so the
 * fill scale is the ratio of the fill aspect to the fit aspect, clamped to
 * a sane range. Pure, so it is unit-testable without a DOM.
 */
export function fitScale(
  viewW: number,
  viewH: number,
  viewBoxW: number,
  viewBoxH: number,
): number {
  if (viewW <= 0 || viewH <= 0 || viewBoxW <= 0 || viewBoxH <= 0) return 1
  const fit = Math.min(viewW / viewBoxW, viewH / viewBoxH)
  const fill = Math.max(viewW / viewBoxW, viewH / viewBoxH)
  return Math.min(2.5, Math.max(1, fill / fit))
}

/**
 * Human-readable one-line summary of a tile, for the hover tooltip (F).
 * Names what is there without inventing anything the engine does not know.
 */
export function tileSummary(tile: PlacedTile): string {
  const shape = tile.shapeId
  const c = tile.content
  if (!c) return `Tile ${shape} · entrance`
  switch (c.kind) {
    case 'empty':
      return `Tile ${shape} · empty`
    case 'treasure':
      return `Tile ${shape} · treasure`
    case 'treasureTrapped':
      return `Tile ${shape} · trapped treasure`
    case 'specialEvents':
      return `Tile ${shape} · strange event`
    case 'specialFeature':
      return `Tile ${shape} · feature`
    case 'secretPassage':
      return `Tile ${shape} · secret passage`
    case 'vermin':
    case 'minions':
    case 'weird':
      if (c.cleared) return `Tile ${shape} · cleared`
      return `Tile ${shape} · ${c.encounter?.count ?? 1}× ${c.encounter?.monster.name ?? 'foes'} (L${c.encounter?.level ?? 1})`
    case 'boss':
    case 'dragonLair':
      if (c.cleared) return `Tile ${shape} · boss slain`
      return `Tile ${shape} · FINAL BOSS — ${c.encounter?.monster.name ?? ''}`
    default:
      return `Tile ${shape}`
  }
}
