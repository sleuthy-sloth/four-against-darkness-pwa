import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  currentTile,
  openExits,
  useDungeonStore,
} from '../../state/dungeonStore'
import { tileGeometry, dungeonBounds, wallCorners, edgeMidpoint } from './mapGeometry'
import { useCampaignStore } from '../../state/campaignStore'
import { D66_TILES } from '../../rulesets/expanded/tiles'
import CombatPanel from './CombatPanel'
import { ChoiceDialog } from './ChoiceDialog'
import { DUNGEON_FEATURES, FEATURE_INFO } from '../../rulesets/expanded/features'
import { QUEST_TABLE } from '../../rulesets/expanded/quests'

/** Map iconography — game-icons.net fragments rendered inside the SVG. */
import chestIcon from '../../assets/icons/chest.svg.frag?raw'
import fountainIcon from '../../assets/icons/fountain.svg.frag?raw'
import templeIcon from '../../assets/icons/temple.svg.frag?raw'
import statueIcon from '../../assets/icons/statue.svg.frag?raw'
import altarIcon from '../../assets/icons/altar.svg.frag?raw'
import boxIcon from '../../assets/icons/box.svg.frag?raw'
import skullIcon from '../../assets/icons/skull.svg.frag?raw'
import stairsIcon from '../../assets/icons/stairs.svg.frag?raw'
import secretDoorIcon from '../../assets/icons/secret-door.svg.frag?raw'
import partyIconFrag from '../../assets/icons/party.svg.frag?raw'
import type { TileContent } from '../../engine/dungeon/generate'
import { cleanIconFragment } from '../common/iconUtils'
import { LogDie } from '../common/Die'
import { TornEdge } from '../common/Ornament'
import EmptyState from '../common/EmptyState'
import FragIcon from '../common/FragIcon'
import { familyFrag } from './foeIcons'
import MapLegend from './MapLegend'
import ShortcutsSheet from './ShortcutsSheet'
import { doorState, floorVariant, fitScale, tileSummary } from './mapStyle'
import { mapKeyAction, isTypingTarget } from './mapKeys'
import { hapticBuzz } from '../common/motion'

/** Stone-floor tones per floor variant (C4): rotation is baked into the
    pattern defs below, so the same dungeon always draws the same floors. */
const FLOOR_TONES = ['#6b5f46', '#675c44', '#6f634a', '#635741']
const FLOOR_LIT_TONES = ['#8a7147', '#86703f', '#8e764c', '#82704a']
const FLOOR_ROTATIONS = [0, 90, 180, 270]

/** Iconography lookup for a tile's content (FADEE p.152 kinds). */
function contentIcon(
  content: TileContent | null,
  isEntrance = false,
): { frag: string; boss: boolean; size?: number } | null {
  // The entrance tile never rolls content (FADEE p.104) — it gets the stairs
  // down, so the way in reads as a way in (plan item C3).
  if (!content) return isEntrance ? { frag: cleanIconFragment(stairsIcon), boss: false } : null
  const plain = (frag: string) => ({ frag: cleanIconFragment(frag), boss: false })
  switch (content.kind) {
    case 'treasure':
    case 'treasureTrapped':
      return plain(chestIcon)
    case 'vermin':
    case 'minions':
    case 'weird': {
      if (content.cleared) return null
      const family = content.encounter?.monster.family ?? 'vermin'
      return plain(familyFrag(family))
    }
    case 'boss':
    case 'dragonLair':
      // Final foes get the skull in an oxblood ring: a boss tile must read differently at a glance.
      // The skull glyph only fills ~25% of its 512 canvas (vs ~93% for the
      // goblin-head), so it renders at 1.6 to read as a skull inside the ring.
      return content.cleared
        ? null
        : { frag: cleanIconFragment(skullIcon), boss: true, size: 1.6 }
    case 'specialFeature': {
      const frag = [
        cleanIconFragment(fountainIcon),
        cleanIconFragment(templeIcon),
        null, // armory — plain room
        cleanIconFragment(altarIcon),
        cleanIconFragment(statueIcon),
        cleanIconFragment(boxIcon),
      ][(content.specialFeatureRoll ?? 1) - 1]
      return frag ? plain(frag) : null
    }
    default:
      return null
  }
}

/** Render a game-icons fragment centered at (x, y) map units. */
function MapIcon({ frag, x, y, size = 0.62, className = 'map-icon' }: { frag: string; x: number; y: number; size?: number; className?: string }) {
  return (
    <g
      transform={`translate(${x - size / 2}, ${y - size / 2}) scale(${size / 512})`}
      className={className}
      dangerouslySetInnerHTML={{ __html: frag }}
    />
  )
}

/**
 * Dungeon screen (PROJECT_SPEC §23): the interactive map is the centerpiece.
 * Tap an exit marker to explore (generates the next tile), drag to pan,
 * pinch/buttons to zoom, recenter on the party. Collapsible bottom panel;
 * on desktop (≥1024px) the panel becomes a right rail and the bottom tabs
 * stay (Milestone 5, Phase F — decided: keep bottom tabs).
 */
export default function DungeonScreen() {
  const navigate = useNavigate()
  const { dungeon, log, busy, error, ensureDungeon, explore, search, pendingFind, claimFind, clearError, beginCombat, beginSecretReveal, beginSecretItem, useTreasureLocation, rest, claimQuest, requestUndo, cancelUndo, performUndo, confirmUndo } =
    useDungeonStore()
  const { campaign, party, loadLastCampaign } = useCampaignStore()
  const [panelOpen, setPanelOpen] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [hover, setHover] = useState<{ tileId: string; text: string; x: number; y: number } | null>(null)
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const mapRef = useRef<HTMLDivElement>(null)

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

  const fitDungeon = useCallback(() => {
    const el = mapRef.current
    if (!el || !bounds) return
    const vbw = bounds.maxCol - bounds.minCol + 4
    const vbh = bounds.maxRow - bounds.minRow + 4
    setZoom(fitScale(el.clientWidth, el.clientHeight, vbw, vbh))
    setPan({ x: 0, y: 0 })
  }, [bounds])

  const engage = useCallback(() => {
    // Haptics (E): a short buzz on engage, behind the Settings toggle.
    hapticBuzz(10)
    void beginCombat()
  }, [beginCombat])

  // ----- keyboard shortcuts (Phase F): every mouse action has a key -----
  const content = tile?.content ?? null
  const canEngage = !!content?.encounter && !content.cleared && !dungeon?.combat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (dungeon?.pendingChoice || confirmUndo) return
      if (showShortcuts) {
        if (e.key === 'Escape' || e.key === '?') {
          e.preventDefault()
          setShowShortcuts(false)
        }
        return
      }
      const action = mapKeyAction(e.key, {
        canEngage,
        canUndo: !!dungeon,
        mapFocused: document.activeElement === mapRef.current,
      })
      if (!action) return
      e.preventDefault()
      switch (action) {
        case 'zoom-in':
          setZoom((z) => Math.min(3, z * 1.25))
          break
        case 'zoom-out':
          setZoom((z) => Math.max(0.5, z / 1.25))
          break
        case 'fit':
          fitDungeon()
          break
        case 'recenter':
          recenter()
          break
        case 'engage':
          engage()
          break
        case 'undo':
          requestUndo()
          break
        case 'shortcuts':
          setShowShortcuts(true)
          break
        case 'pan-up':
          setPan((p) => ({ ...p, y: p.y + 40 }))
          break
        case 'pan-down':
          setPan((p) => ({ ...p, y: p.y - 40 }))
          break
        case 'pan-left':
          setPan((p) => ({ ...p, x: p.x + 40 }))
          break
        case 'pan-right':
          setPan((p) => ({ ...p, x: p.x - 40 }))
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dungeon, canEngage, showShortcuts, confirmUndo, fitDungeon, engage, requestUndo])

  if (!campaign) {
    return (
      <EmptyState
        kind="campaign"
        title="No campaign yet"
        body="The delve begins with a campaign — four adventurers, one dungeon, one story."
        action={
          <button onClick={() => navigate('/campaign')} className="btn-wax px-6 py-3">
            Start a campaign first
          </button>
        }
      />
    )
  }
  if (party.length < 4) {
    return (
      <EmptyState
        kind="party"
        title="Four chairs, empty"
        body="A delve needs four adventurers. Form your party and the dungeon will wait."
        action={
          <button onClick={() => navigate('/party/new')} className="btn-wax px-6 py-3">
            Form your party
          </button>
        }
      />
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
  const isCorridor = D66_TILES.find((t) => t.id === tile.shapeId)?.corridor ?? false
  const searchable = content?.kind === 'empty' && tile.searchRoll === null
  const seed = campaign.seed
  // Party token position (first cell of the current tile) — the torch
  // falloff is centred here, and the token always renders last, on top.
  const partyX = tile.cells[0].col + 0.5
  const partyY = tile.cells[0].row + 0.5
  const newestTileId = dungeon.tiles[dungeon.tiles.length - 1].id

  const zoomButtons: Array<{ label: string; title: string; glyph: string; onClick: () => void }> = [
    { label: 'Zoom in', title: 'Zoom in (+)', glyph: '+', onClick: () => setZoom((z) => Math.min(3, z * 1.25)) },
    { label: 'Zoom out', title: 'Zoom out (−)', glyph: '−', onClick: () => setZoom((z) => Math.max(0.5, z / 1.25)) },
    { label: 'Fit dungeon', title: 'Fit dungeon (0)', glyph: 'Fit', onClick: fitDungeon },
    { label: 'Recenter', title: 'Recenter on the party (R)', glyph: '◎', onClick: recenter },
    { label: 'Undo', title: 'Undo the last action (U)', glyph: '⟲', onClick: requestUndo },
    { label: 'Keyboard shortcuts', title: 'Keyboard shortcuts (?)', glyph: '?', onClick: () => setShowShortcuts(true) },
  ]

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      {/* map column: viewport + legend; on desktop the panel is a right rail */}
      <div className="flex min-h-0 flex-1 flex-col lg:min-w-0">
        {/* map viewport */}
        <div
          ref={mapRef}
          tabIndex={0}
          role="application"
          aria-label="Dungeon map. Plus and minus zoom, zero fits the dungeon, E engages foes, U undoes, question mark lists shortcuts."
          className="relative min-h-0 flex-1 touch-none bg-stone-950 outline-none focus-visible:ring-2 focus-visible:ring-torch"
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
            <defs>
              {/* stone floors, four variants (C4): rotation + tone baked in,
                  chosen per tile from the campaign seed, so replays match */}
              {[0, 1, 2, 3].map((v) => (
                <pattern
                  key={`f${v}`}
                  id={`stoneFloor${v}`}
                  width="1"
                  height="1"
                  patternUnits="userSpaceOnUse"
                  patternTransform={`rotate(${FLOOR_ROTATIONS[v]} 0.5 0.5)`}
                >
                  <rect width="1" height="1" fill={FLOOR_TONES[v]} />
                  <rect width="1" height="1" fill="#544b38" opacity="0.35" />
                  <path d="M0 0.5h1M0.5 0v1" className="stroke-parchment/30" strokeWidth={0.06} />
                </pattern>
              ))}
              {[0, 1, 2, 3].map((v) => (
                <pattern
                  key={`l${v}`}
                  id={`stoneFloorLit${v}`}
                  width="1"
                  height="1"
                  patternUnits="userSpaceOnUse"
                  patternTransform={`rotate(${FLOOR_ROTATIONS[v]} 0.5 0.5)`}
                >
                  <rect width="1" height="1" fill={FLOOR_LIT_TONES[v]} />
                  <rect width="1" height="1" fill="#a3742c" opacity="0.3" />
                  <path d="M0 0.5h1M0.5 0v1" className="stroke-parchment/30" strokeWidth={0.06} />
                </pattern>
              ))}
              {/* torch-lit gradient falloff (C4): bright at the party token,
                  dimming with distance — no flat two-tone */}
              <radialGradient
                id="torchFalloff"
                gradientUnits="userSpaceOnUse"
                cx={partyX}
                cy={partyY}
                r={7}
              >
                <stop offset="0%" stopColor="#2b241f" stopOpacity="0" />
                <stop offset="55%" stopColor="#2b241f" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#2b241f" stopOpacity="0.3" />
              </radialGradient>
            </defs>
            <g transform={`translate(${2 - bounds.minCol}, ${2 - bounds.minRow})`}>
              {dungeon.tiles.map((t) => {
                const geo = tileGeometry(t)
                const isCurrent = t.id === tile.id
                const isEntrance = t.id === dungeon.tiles[0].id
                const isNewest = t.id === newestTileId
                const variant = floorVariant(seed, t.id)
                const icon = contentIcon(t.content, isEntrance)
                const cx = t.cells.reduce((n, c) => n + c.col, 0) / Math.max(1, t.cells.length) + 0.5
                const cy = t.cells.reduce((n, c) => n + c.row, 0) / Math.max(1, t.cells.length) + 0.5
                const cols = t.cells.map((c) => c.col)
                const rows = t.cells.map((c) => c.row)
                const minCol = Math.min(...cols)
                const minRow = Math.min(...rows)
                const maxCol = Math.max(...cols)
                const maxRow = Math.max(...rows)
                const encounterCount =
                  t.content?.encounter && !t.content.cleared ? t.content.encounter.count : 0
                // Corridors read darker than rooms (each tile by its own shape).
                const tIsCorridor = D66_TILES.find((s) => s.id === t.shapeId)?.corridor ?? false
                const isHovered = hover?.tileId === t.id
                return (
                  <g
                    key={t.id}
                    className={isCurrent && isNewest ? 'tile-reveal' : undefined}
                    onMouseEnter={(e) => {
                      const r = mapRef.current?.getBoundingClientRect()
                      setHover({
                        tileId: t.id,
                        text: tileSummary(t),
                        x: e.clientX - (r?.left ?? 0),
                        y: e.clientY - (r?.top ?? 0),
                      })
                    }}
                    onMouseMove={(e) => {
                      const r = mapRef.current?.getBoundingClientRect()
                      setHover((h) =>
                        h && h.tileId === t.id
                          ? { ...h, x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) }
                          : h,
                      )
                    }}
                    onMouseLeave={() => setHover((h) => (h?.tileId === t.id ? null : h))}
                  >
                    <title>{tileSummary(t)}</title>
                    {/* floor: patterned stone; the current tile is torch-lit,
                        explored tiles dim stone (C4 fog of war) */}
                    {t.cells.map((c, i) => (
                      <rect
                        key={i}
                        x={c.col}
                        y={c.row}
                        width={1}
                        height={1}
                        fill={isCurrent ? `url(#stoneFloorLit${variant})` : `url(#stoneFloor${variant})`}
                        opacity={tIsCorridor ? 0.55 : 1}
                      />
                    ))}
                    {/* hover highlight (F): the tile under the pointer */}
                    {isHovered && (
                      <rect
                        x={minCol}
                        y={minRow}
                        width={maxCol - minCol + 1}
                        height={maxRow - minRow + 1}
                        className="fill-none stroke-torch"
                        strokeWidth={0.06}
                        strokeDasharray="0.12 0.08"
                      />
                    )}
                    {/* walls: deep shadow base + pale carved edge; the
                        entrance keeps a distinct brass treatment (C4) */}
                    {geo.walls.map((w, i) => (
                      <line
                        key={i}
                        x1={w.x1}
                        y1={w.y1}
                        x2={w.x2}
                        y2={w.y2}
                        className={isEntrance ? 'stroke-brass' : 'stroke-parchment'}
                        strokeWidth={isEntrance ? 0.16 : 0.14}
                      />
                    ))}
                    {geo.walls.map((w, i) => (
                      <line
                        key={`hl${i}`}
                        x1={w.x1}
                        y1={w.y1}
                        x2={w.x2}
                        y2={w.y2}
                        className="stroke-faint"
                        strokeWidth={0.04}
                      />
                    ))}
                    {/* corner caps (C4): square caps where walls turn */}
                    {wallCorners(geo.walls).map((c, i) => (
                      <rect
                        key={`cap${i}`}
                        x={c.x - 0.08}
                        y={c.y - 0.08}
                        width={0.16}
                        height={0.16}
                        className={isEntrance ? 'fill-brass' : 'fill-parchment'}
                      />
                    ))}
                    {/* doors (C4): open = bare threshold, closed = oxblood
                        leaf + swing arc, plain opening = dashed gap. The
                        engine carries no locked-door state (lockpicking,
                        FADEE p.110, is unimplemented), so no locked state. */}
                    {t.exits.map((e) => {
                      const state = doorState(e)
                      const { x, y } = edgeMidpoint(e.cell, e.edge)
                      const horiz = e.edge === 'N' || e.edge === 'S'
                      return (
                        <g key={e.id}>
                          {state === 'closed' && (
                            <>
                              <rect
                                x={x - (horiz ? 0.16 : 0.04)}
                                y={y - (horiz ? 0.04 : 0.16)}
                                width={horiz ? 0.32 : 0.08}
                                height={horiz ? 0.08 : 0.32}
                                className="fill-ember stroke-parchment"
                                strokeWidth={0.02}
                              />
                              <path
                                d={
                                  horiz
                                    ? `M ${x - 0.2} ${y} A 0.28 0.28 0 0 1 ${x - 0.2} ${y + (e.edge === 'N' ? -0.28 : 0.28)}`
                                    : `M ${x} ${y - 0.2} A 0.28 0.28 0 0 0 ${x + (e.edge === 'W' ? -0.28 : 0.28)} ${y - 0.2}`
                                }
                                className="stroke-parchment/25"
                                fill="none"
                                strokeWidth={0.03}
                              />
                            </>
                          )}
                          {state === 'opening' && (
                            <line
                              x1={horiz ? x - 0.2 : x}
                              y1={horiz ? y : y - 0.2}
                              x2={horiz ? x + 0.2 : x}
                              y2={horiz ? y : y + 0.2}
                              className="stroke-parchment/60"
                              strokeWidth={0.05}
                              strokeDasharray="0.08 0.06"
                            />
                          )}
                          {state === 'open' && (
                            <line
                              x1={horiz ? x - 0.2 : x}
                              y1={horiz ? y : y - 0.2}
                              x2={horiz ? x + 0.2 : x}
                              y2={horiz ? y : y + 0.2}
                              className="stroke-parchment/40"
                              strokeWidth={0.04}
                            />
                          )}
                        </g>
                      )
                    })}
                    {/* content iconography; boss tiles get an oxblood ring around the skull */}
                    {icon && (
                      <>
                        <MapIcon frag={icon.frag} x={cx} y={cy} size={icon.size} />
                        {icon.boss && (
                          <circle cx={cx} cy={cy} r={0.44} className="fill-none stroke-torch" strokeWidth={0.06} />
                        )}
                      </>
                    )}
                    {/* foe count badge (C4): one token, the count on it */}
                    {encounterCount > 1 && (
                      <g>
                        <circle
                          cx={cx + 0.34}
                          cy={cy - 0.34}
                          r={0.2}
                          className="fill-torch stroke-parchment"
                          strokeWidth={0.03}
                        />
                        <text
                          x={cx + 0.34}
                          y={cy - 0.34}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={0.24}
                          fill="#faf6ee"
                          fontFamily="'JetBrains Mono', monospace"
                        >
                          {encounterCount}×
                        </text>
                      </g>
                    )}
                    {/* secret door found by searching (C4): a badge on the tile */}
                    {t.secretDoorFound && (
                      <g>
                        <circle
                          cx={minCol + 0.2}
                          cy={minRow + 0.2}
                          r={0.22}
                          className="fill-stone-800 stroke-parchment"
                          strokeWidth={0.03}
                        />
                        <MapIcon
                          frag={cleanIconFragment(secretDoorIcon)}
                          x={minCol + 0.2}
                          y={minRow + 0.2}
                          size={0.24}
                        />
                      </g>
                    )}
                  </g>
                )
              })}
              {/* torch falloff over the tiles only — tokens and exits stay bright */}
              <rect
                x={bounds.minCol - 1}
                y={bounds.minRow - 1}
                width={bounds.maxCol - bounds.minCol + 3}
                height={bounds.maxRow - bounds.minRow + 3}
                fill="url(#torchFalloff)"
                pointerEvents="none"
              />
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
                    className={`cursor-pointer stroke-parchment ${
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
              {/* party marker: banner token on a torch disc — rendered LAST
                  so it is always on top, never overlapped by the exit discs
                  (C4). The pulse ring is the "you are here" (C5). */}
              {tile.cells.length > 0 && (
                <g>
                  <circle
                    cx={partyX}
                    cy={partyY}
                    r={0.3}
                    className="party-pulse fill-none stroke-torch"
                    strokeWidth={0.05}
                    aria-hidden="true"
                  />
                  <circle
                    cx={partyX}
                    cy={partyY}
                    r={0.3}
                    className="fill-torch stroke-parchment"
                    strokeWidth={0.05}
                  />
                  <MapIcon
                    frag={cleanIconFragment(partyIconFrag)}
                    x={partyX}
                    y={partyY}
                    size={0.34}
                    className="fill-stone-800"
                  />
                </g>
              )}
            </g>
          </svg>

          {/* torch-lit vignette (C7): soft dark corners over the map, never intercepting taps */}
          <div aria-hidden="true" className="vignette pointer-events-none absolute inset-0" />

          {/* hover tooltip (F): tile contents under the pointer */}
          {hover && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-10 max-w-[220px] rounded border border-parchment bg-stone-800 px-2 py-1 text-xs text-parchment shadow-folio"
              style={{ left: Math.min(hover.x + 12, 180), top: Math.min(hover.y + 12, 320) }}
            >
              {hover.text}
            </div>
          )}

          {/* map controls: 44px parchment cards (C5/D1), not floating white squares */}
          <div className="absolute right-2 top-2 flex flex-col gap-1">
            {zoomButtons.map((b) => (
              <button
                key={b.label}
                onClick={b.onClick}
                title={b.title}
                aria-label={b.label}
                className="flex h-11 w-11 items-center justify-center rounded border border-parchment bg-stone-800 text-lg text-parchment shadow-folio"
              >
                <span className={b.glyph === 'Fit' ? 'font-label text-[10px] uppercase' : ''}>
                  {b.glyph}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* map legend (C5) — collapsible, same icons as the map */}
        <MapLegend />

        {/* torn parchment edge (C7) between the map and the panel below it */}
        <div className="lg:hidden">
          <TornEdge />
        </div>
      </div>

      {/* bottom panel (mobile) / right rail (desktop): combat replaces exploration */}
      <div className="shrink-0 border-t border-stone-800 bg-stone-900/95 lg:flex lg:w-[380px] lg:shrink-0 lg:flex-col lg:border-l lg:border-t-0 lg:overflow-hidden">
        {/* Combat max-h in dvh, not %: this panel is shrink-0 with an
            indefinite height, so a % max-height resolves to none, the
            panel grows to its content, and the flex-1 map above it is
            squeezed to a sliver (34px in the victory state) — the exit
            discs become unreachable and the player is trapped. The tile
            panel below already uses max-h-[36vh] for the same reason. */}
        {dungeon.combat ? (
          <div className="flex max-h-[45dvh] flex-col overflow-hidden lg:max-h-none lg:min-h-0 lg:flex-1">
            <CombatPanel />
          </div>
        ) : (
          <div className="flex flex-col lg:min-h-0 lg:flex-1">
            <button
              onClick={() => setPanelOpen((o) => !o)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-xs uppercase tracking-wide text-parchment/60"
            >
              <span className="font-label">
                {isCorridor ? 'Corridor' : 'Room'} · tile {tile.shapeId}
                {content ? ` · ${content.kind}` : ' · entrance'}
              </span>
              <span>{panelOpen ? '▾' : '▴'}</span>
            </button>
            {panelOpen && (
              <div className="max-h-[36vh] overflow-y-auto px-3 pb-3 text-sm lg:max-h-none lg:min-h-0 lg:flex-1">
                {/* encounter folio card (D1): family icon, count, level, wax
                    Engage, and the reaction hint the engine already knows */}
                {content?.encounter && !content.cleared && (
                  <div className="card-folio mb-2 p-3">
                    <div className="flex items-start gap-2">
                      <FragIcon
                        frag={familyFrag(content.encounter.monster.family)}
                        size={28}
                        label={content.encounter.monster.name}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-base text-torch">
                          {content.encounter.count}× {content.encounter.monster.name}
                          {content.encounter.isFinalBoss && ' — FINAL BOSS'}
                        </p>
                        <p className="num-tabular font-mono text-xs text-parchment/70">
                          Level {content.encounter.level} · {content.encounter.count}{' '}
                          {content.encounter.count === 1 ? 'foe' : 'foes'}
                        </p>
                        <p className="mt-1 text-xs text-parchment/60">
                          Foes may fight, flee, or demand a bribe — engage to see their reaction
                          (FADEE pp.90, 101–102).
                        </p>
                      </div>
                    </div>
                    <button onClick={engage} className="btn-wax mt-2 w-full px-4 py-2">
                      Engage!
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
                {dungeon.quest && !dungeon.quest.complete && (
                  <div className="mb-2">
                    <p className="text-xs text-parchment/70">
                      Quest {dungeon.quest.roll}: {QUEST_TABLE[dungeon.quest.roll - 1]}
                      {dungeon.quest.target && ` — target: ${dungeon.quest.target}`}
                      {dungeon.quest.amount > 0 && ` — bring ${dungeon.quest.amount}gp`}
                      {dungeon.quest.roll === 5 && ` — ${dungeon.quest.progress}/3`}
                    </p>
                    <button
                      onClick={() => void claimQuest()}
                      className="rounded border border-torch/40 bg-torch/10 px-3 py-1.5 text-xs text-torch"
                    >
                      Claim Quest reward
                    </button>
                  </div>
                )}
                {/* Milestone 4: the button gate matches the engine's tileCleared
                    rule (engine/camp/rest.ts — an empty room with no Foes counts
                    as cleared). The old gate (`content?.cleared`) only ever
                    showed Rest on a room whose encounter was won, so an empty
                    room — the most common rest spot — never offered it, even
                    though rest() itself would have allowed it. Neighbours, doors
                    and nails are still enforced by canRest, with its reason shown
                    as the error if they fail. */}
                {(!tile.content?.encounter || tile.content?.cleared) && !dungeon.combat && (
                  <button
                    onClick={() => void rest()}
                    className="mb-2 rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-xs text-parchment"
                  >
                    Rest here (1 Life or 1 ability each — FADEE p.114)
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
                          {choice === 'secret-door' && (
                            <>
                              <FragIcon frag={secretDoorIcon} size={14} label="Secret door" /> Secret door
                            </>
                          )}
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
                {/* Log (D1): timestamps, drawn dice, capped with a fade */}
                <ul className="log-fade num-tabular space-y-0.5 text-xs text-parchment/60">
                  {log.slice(-6).map((l, i) => (
                    <li key={i}>
                      <span className="mr-1 font-mono text-[10px] text-faint">
                        {new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <LogDie text={l.text} />
                      · {l.text}
                    </li>
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
      </div>
      {/* undo (PROJECT_SPEC §19): confirm before reversing the last action */}
      {confirmUndo && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60 px-3 pb-16">
          <div className="panel-in w-full rounded-lg border border-ember/50 bg-stone-900 p-4">
            <p className="text-sm text-torch">Undo “{confirmUndo.label}”?</p>
            <p className="mt-1 text-[10px] text-parchment/50">
              Restores dice, Life, inventory, rooms and the Journal exactly as they were before that action.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void performUndo()}
                className="rounded border border-ember/50 bg-ember/10 px-3 py-2 text-sm text-ember"
              >
                Undo it
              </button>
              <button onClick={() => void cancelUndo()} className="rounded bg-stone-700 px-3 py-2 text-sm text-parchment">
                Keep
              </button>
            </div>
          </div>
        </div>
      )}
      <ChoiceDialog />
      {showShortcuts && <ShortcutsSheet onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}
