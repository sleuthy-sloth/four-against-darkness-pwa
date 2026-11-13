import type { PlacedExit, PlacedTile } from '../../engine/dungeon/generate'

/**
 * Map presentation helpers (Milestone 5 — C4/C5/D1).
 *
 * Pure functions over engine data, so the map, the legend, and the tests all
 * agree on what a door, a tile, and a floor look like. No engine state is
 * invented here: every state maps to a field the engine already carries.
 *
 * Locked doors (R129-R131) are rendered from the exit's rolled `doorInfo`;
 * exits on older saves carry no `doorInfo` and render as plain closed
 * doors (unlocked by default). Fog of war: `explored` now means ENTERED —
 * a tile placed beyond a secret door stays unexplored until the party
 * steps through it, and renders dark with no content until then. A
 * peeked secret-door tile shows its contents (the peek already told the
 * player what is there) while staying unexplored until entered.
 */

/** Door states the engine can express, from a placed exit alone. */
export type DoorState =
  | 'open'
  | 'closed'
  | 'opening'
  | 'locked'
  | 'sealed'
  | 'iron'
  | 'illusionary'
  | 'trapped'
  | 'lever'

/** Every door state the map renders — the legend renders exactly this set. */
export const DOOR_STATES: DoorState[] = [
  'open',
  'closed',
  'opening',
  'locked',
  'sealed',
  'iron',
  'illusionary',
  'trapped',
  'lever',
]

/**
 * Map an exit to its door state:
 * - `open` — a way already generated beyond it (the party has passed through).
 * - `closed` — a printed door with nothing generated yet, unlocked (or an
 *   older save's door, which carries no rolled state and defaults unlocked).
 * - `opening` — a plain opening with nothing generated yet, or a door the
 *   party already opened (pick/bash/spell/Clues) that it has not walked
 *   through yet — the way is clear, so it must not keep the locked glyph
 *   or the "Locked door — open the door" label. (Phase G: without this,
 *   an opened door still reads locked, and a keyboard loop that trusts
 *   the label never explores through it.)
 * - `locked` / `sealed` / `iron` / `illusionary` / `trapped` / `lever` —
 *   the rolled door table result (R129) for an ungenerated door exit.
 */
export function doorState(exit: PlacedExit): DoorState {
  if (exit.toTileId) return 'open'
  if (!exit.door) return 'opening'
  if (exit.doorInfo?.open) return 'opening'
  return exit.doorInfo?.kind === 'unlocked' || !exit.doorInfo ? 'closed' : exit.doorInfo.kind
}

/** Fog-of-war state for a placed tile, relative to the current tile. */
export type FogState = 'current' | 'explored' | 'unexplored' | 'peeked'

/**
 * - `current` — the party's tile (torch-lit).
 * - `explored` — entered before (dim stone, contents shown).
 * - `unexplored` — placed but never entered (secret-door tile before
 *   entry): dark, no contents.
 * - `peeked` — an unexplored secret-door tile the party has peeked at:
 *   contents shown (the peek already told the player), still unexplored
 *   until entered.
 */
export function fogState(tile: PlacedTile, currentTileId: string, peeked = false): FogState {
  if (tile.id === currentTileId) return 'current'
  if (!tile.explored) return peeked ? 'peeked' : 'unexplored'
  return 'explored'
}

/**
 * Whether a tile's contents may be shown on the map (icons, foe counts,
 * feature glyphs, treasure markers, tooltip text). Explored tiles always
 * show; an unexplored tile shows only if it is the secret-door tile and
 * the party has peeked at it.
 */
export function tileContentVisible(
  tile: PlacedTile,
  secretDoor?: { toTileId: string; peeked?: boolean } | null,
): boolean {
  if (tile.explored) return true
  return secretDoor?.toTileId === tile.id && secretDoor.peeked === true
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
 * Unexplored tiles say so and name nothing — their contents are hidden
 * until entered (or peeked, for a secret-door tile).
 */
export function tileSummary(tile: PlacedTile, contentVisible = true): string {
  const shape = tile.shapeId
  if (!contentVisible) return `Tile ${shape} · unexplored`
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
