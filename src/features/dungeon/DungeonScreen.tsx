import { useEffect, useMemo, useRef, useState } from 'react'
import {
  currentTile,
  openExits,
  useDungeonStore,
} from '../../state/dungeonStore'
import { tileGeometry, dungeonBounds } from './mapGeometry'
import { useCampaignStore } from '../../state/campaignStore'
import { D66_TILES } from '../../rulesets/expanded/tiles'
import CombatPanel from './CombatPanel'
import { ChoiceDialog } from './ChoiceDialog'
import { DUNGEON_FEATURES, FEATURE_INFO } from '../../rulesets/expanded/features'

/**
 * Dungeon screen (PROJECT_SPEC §23): the interactive map is the centerpiece.
 * Tap an exit marker to explore (generates the next tile), drag to pan,
 * pinch/buttons to zoom, recenter on the party. Collapsible bottom panel.
 */
export default function DungeonScreen() {
  const { dungeon, log, busy, error, ensureDungeon, explore, search, pendingFind, claimFind, clearError, beginCombat, beginSecretReveal, beginSecretItem, useTreasureLocation } =
    useDungeonStore()
  const { campaign, party, loadLastCampaign } = useCampaignStore()
  const [panelOpen, setPanelOpen] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  useEffect(() => {
    const boot = async () => {
      if (!campaign) await loadLastCampaign()
      const { campaign: c, party: p } = useCampaignStore.getState()
      if (c && p.length === 4) void ensureDungeon()
    }
    void boot()
  }, [campaign, party.length, ensureDungeon, loadLastCampaign])

  const tile = dungeon ? currentTile(dungeon) : null
  const bounds = useMemo(() => (dungeon ? dungeonBounds(dungeon) : null), [dungeon])

  // ----- pointer handlers: pan / pinch / tap -----
  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      dragRef.current = { x: e.clientX, y: e.clientY, moved: false }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom }
      dragRef.current = null
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const scale = Math.min(3, Math.max(0.5, (pinchRef.current.zoom * dist) / pinchRef.current.dist))
      setZoom(scale)
      return
    }
    const d = dragRef.current
    if (d) {
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }))
      d.x = e.clientX
      d.y = e.clientY
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchRef.current = null
    dragRef.current = null
  }

  const recenter = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  if (!campaign) {
    return <div className="screen-placeholder text-parchment/50">Start a campaign first.</div>
  }
  if (party.length < 4) {
    return (
      <div className="screen-placeholder">
        <p className="max-w-xs text-sm text-parchment/70">Form your party before delving.</p>
      </div>
    )
  }
  if (!dungeon || !tile || !bounds) {
    return (
      <div className="screen-placeholder">
        <p className="text-parchment/50">{busy ? 'Generating…' : error ?? '…'}</p>
      </div>
    )
  }

  const exits = openExits(dungeon, tile)
  const content = tile.content
  const isCorridor = D66_TILES.find((t) => t.id === tile.shapeId)?.corridor ?? false
  const searchable = content?.kind === 'empty' && tile.searchRoll === null

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* map viewport */}
      <div
        className="relative min-h-0 flex-1 touch-none bg-stone-950"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          viewBox={`0 0 ${bounds.maxCol - bounds.minCol + 4} ${bounds.maxRow - bounds.minRow + 4}`}
          className="h-full w-full"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(${2 - bounds.minCol}, ${2 - bounds.minRow})`}>
            {dungeon.tiles.map((t) => {
              const geo = tileGeometry(t)
              const isCurrent = t.id === tile.id
              return (
                <g key={t.id}>
                  {t.cells.map((c, i) => (
                    <rect
                      key={i}
                      x={c.col}
                      y={c.row}
                      width={1}
                      height={1}
                      className={isCurrent ? 'fill-torch/25' : 'fill-stone-800'}
                    />
                  ))}
                  {geo.walls.map((w, i) => (
                    <line
                      key={i}
                      x1={w.x1}
                      y1={w.y1}
                      x2={w.x2}
                      y2={w.y2}
                      className="stroke-stone-300"
                      strokeWidth={0.06}
                    />
                  ))}
                  {geo.doors.map((d, i) => (
                    <rect
                      key={i}
                      x={d.x - (d.edge === 'N' || d.edge === 'S' ? 0.15 : 0.04)}
                      y={d.y - (d.edge === 'N' || d.edge === 'S' ? 0.04 : 0.15)}
                      width={d.edge === 'N' || d.edge === 'S' ? 0.3 : 0.08}
                      height={d.edge === 'N' || d.edge === 'S' ? 0.08 : 0.3}
                      className={d.door ? 'fill-torch' : 'fill-parchment/40'}
                    />
                  ))}
                </g>
              )
            })}
            {/* party marker */}
            {tile.cells.length > 0 && (
              <circle
                cx={tile.cells[0].col + 0.5}
                cy={tile.cells[0].row + 0.5}
                r={0.28}
                className="fill-torch stroke-stone-950"
                strokeWidth={0.05}
              />
            )}
            {/* exit tap targets: glowing = unexplored (generate), dim = move through */}
            {tile.exits.map((e) => {
              const x = e.cell.col + (e.edge === 'E' ? 1 : e.edge === 'W' ? 0 : 0.5)
              const y = e.cell.row + (e.edge === 'S' ? 1 : e.edge === 'N' ? 0 : 0.5)
              const unexplored = !e.toTileId
              return (
                <circle
                  key={e.id}
                  cx={x}
                  cy={y}
                  r={0.34}
                  className={`cursor-pointer stroke-stone-950 ${
                    unexplored ? 'fill-torch/80' : 'fill-parchment/50'
                  }`}
                  strokeWidth={0.05}
                  onPointerUp={(ev) => {
                    if (!dragRef.current?.moved) {
                      ev.stopPropagation()
                      void explore(e.id)
                    }
                  }}
                />
              )
            })}
          </g>
        </svg>

        {/* map controls */}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(3, z * 1.25))}
            className="rounded bg-stone-800/90 px-2 py-1 text-parchment"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))}
            className="rounded bg-stone-800/90 px-2 py-1 text-parchment"
          >
            −
          </button>
          <button
            onClick={recenter}
            className="rounded bg-stone-800/90 px-2 py-1 text-xs text-parchment"
          >
            ◎
          </button>
        </div>
      </div>

      {/* bottom panel: combat replaces the exploration panel */}
      {dungeon.combat ? (
        <div className="max-h-[52%] shrink-0 overflow-hidden border-t border-stone-800 bg-stone-900/95 flex flex-col">
          <CombatPanel />
        </div>
      ) : (
        <div className="shrink-0 border-t border-stone-800 bg-stone-900/95">
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className="flex w-full items-center justify-between px-3 py-1.5 text-xs uppercase tracking-wide text-parchment/60"
        >
          <span>
            {isCorridor ? 'Corridor' : 'Room'} · tile {tile.shapeId}
            {content ? ` · ${content.kind}` : ' · entrance'}
          </span>
          <span>{panelOpen ? '▾' : '▴'}</span>
        </button>
        {panelOpen && (
          <div className="max-h-44 overflow-y-auto px-3 pb-3 text-sm">
            {content?.encounter && (
              <div className="mb-2 rounded bg-ember/20 px-2 py-1.5 text-parchment">
                <p>
                  {content.encounter.count}×{' '}
                  <span className="text-torch">{content.encounter.monster.name}</span> (L
                  {content.encounter.level}){content.encounter.isFinalBoss && ' — FINAL BOSS!'}
                </p>
                <button
                  onClick={() => void beginCombat()}
                  className="mt-1 rounded border border-torch/40 bg-torch/10 px-3 py-1 text-torch"
                >
                  Engage! (FADEE p.90)
                </button>
              </div>
            )}
            {content?.kind === 'treasure' && (
              <p className="mb-2 text-parchment/80">Treasure here! (loot tables land in Phase 5)</p>
            )}
            {content?.kind === 'treasureTrapped' && (
              <p className="mb-2 text-parchment/80">Treasure behind a trap. (Phase 5)</p>
            )}
            {content?.kind === 'specialEvents' && (
              <p className="mb-2 text-parchment/80">Special event! (event tables land in Phase 5)</p>
            )}
            {content?.kind === 'specialFeature' && (
              <p className="mb-2 text-parchment/80">
                {FEATURE_INFO[DUNGEON_FEATURES[content.specialFeatureRoll! - 1]].text}
              </p>
            )}
            {content?.kind === 'dragonLair' && (
              <p className="mb-2 text-parchment/80">
                {content.encounter?.count}× {content.encounter?.monster.name} — a dragon's lair!
              </p>
            )}
            {searchable && (
              <button
                onClick={() => void search()}
                className="mb-2 rounded border border-torch/40 bg-torch/10 px-3 py-1.5 text-torch"
              >
                Search this tile
              </button>
            )}
            {/* Location secrets (FADEE p.122): usable in the right tiles. */}
            {campaign.secrets?.includes('treasure-location') &&
              tile.contentRoll !== null &&
              !content?.encounter &&
              tile.id !== dungeon.tiles[0].id && (
                <button
                  onClick={() => void useTreasureLocation()}
                  className="mb-2 rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-xs text-parchment"
                >
                  Speak the password (hidden treasure — 3d6×10 gp)
                </button>
              )}
            {campaign.secrets?.includes('item-location') &&
              tile.contentRoll !== null &&
              !content?.encounter &&
              tile.id !== dungeon.tiles[0].id && (
                <button
                  onClick={() => void beginSecretItem()}
                  className="mb-2 rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-xs text-parchment"
                >
                  Speak the password (hidden magic item)
                </button>
              )}
            {(campaign.clues ?? 0) >= 3 && !dungeon.pendingChoice && (
              <button
                onClick={() => void beginSecretReveal()}
                className="mb-2 rounded border border-torch/40 bg-torch/10 px-3 py-1.5 text-xs text-torch"
              >
                Reveal a Secret (spend 3 Clues — {campaign.clues} in pool)
              </button>
            )}
            {tile.searchResult === 'find' && !pendingFind && (
              <p className="mb-2 text-parchment/70">You found something — choose below.</p>
            )}
            {pendingFind && (
              <div className="mb-2 flex flex-wrap gap-1">
                {(['hidden-treasure', 'secret-door', 'secret-passage', 'clue'] as const).map(
                  (choice) => (
                    <button
                      key={choice}
                      disabled={choice === 'secret-passage'} // environments arrive in Release 0.5
                      onClick={() => {
                        if (choice !== 'secret-passage') void claimFind(choice)
                      }}
                      className="rounded border border-stone-700 bg-stone-800 px-2 py-1 text-xs text-parchment disabled:opacity-40"
                    >
                      {choice === 'hidden-treasure' && 'Hidden treasure'}
                      {choice === 'secret-door' && 'Secret door'}
                      {choice === 'secret-passage' && 'Secret passage (0.5)'}
                      {choice === 'clue' && '1 Clue'}
                    </button>
                  ),
                )}
              </div>
            )}
            {exits.length === 0 && (
              <p className="text-parchment/60">
                No open exits here — move through a generated door to retrace (1-in-6 Wandering
                Monsters).
              </p>
            )}
            <ul className="space-y-0.5 text-xs text-parchment/60">
              {log.slice(-6).map((l, i) => (
                <li key={i}>· {l.text}</li>
              ))}
            </ul>
            {error && (
              <p className="mt-1 text-xs text-ember" onClick={clearError}>
                {error}
              </p>
            )}
          </div>
        )}
        </div>
      )}
      <ChoiceDialog />
    </div>
  )
}
