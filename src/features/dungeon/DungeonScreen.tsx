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
import { DoorDialog } from './DoorDialog'
import { DUNGEON_FEATURES, FEATURE_INFO } from '../../rulesets/expanded/features'
import { QUEST_TABLE } from '../../rulesets/expanded/quests'
import { ENVIRONMENT_LABELS, CAVERN_FEATURE_INFO, cavernFeatureForRoll, type EnvironmentId } from '../../rulesets/expanded/environments'
import { computeLight } from '../../engine/light'
import { stripCitations } from '../common/stripCitations'

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
import { doorState, floorVariant, floorKind, floorPatternId, floorOpacity, floorShade, fogTint, fitScale, tileSummary, tileContentVisible, fogState } from './mapStyle'
import { doorNeedsAction } from '../../engine/dungeon/doors'
import { mapKeyAction, isTypingTarget } from './mapKeys'
import { exitLabel, nextExitIndex } from './mapNav'
import { useDialogFocus } from '../common/useDialogFocus'
import { hapticBuzz, prefersReducedMotion } from '../common/motion'
import { debounce } from '../common/debounce'
import { feedbackTargetName, latestKindIndex } from './combatFeedback'
import DungeonVignette from './DungeonVignette'

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

/** Render a game-icons fragment centered at (x, y) map units. Decorative:
    the tile's own label already names what is here, so screen readers
    never hear the icon twice. */
function MapIcon({ frag, x, y, size = 0.62, className = 'map-icon' }: { frag: string; x: number; y: number; size?: number; className?: string }) {
  return (
    <g
      aria-hidden="true"
      transform={`translate(${x - size / 2}, ${y - size / 2}) scale(${size / 512})`}
      className={className}
      dangerouslySetInnerHTML={{ __html: frag }}
    />
  )
}

/**
 * Stream 2: the joint geometry that makes each floor variant read as a
 * different stone at a glance, inside its 1×1 pattern cell (rotation is
 * baked into the pattern defs, so the same variant still varies by tile):
 * - flagstone (0): large slabs — thick cross joints, half-joints offset.
 * - cobble (1): small rounded stones — a 3×3 of pale-topped rounds.
 * - ashlar (2): running-bond courses — offset vertical joints per course.
 * - rough (3): speckled stone — scattered pits and one wandering crack.
 * Drawn in black/white at low opacity, so the same geometry reads on
 * both the dim pattern and the warm torch-lit pattern. The kind name
 * lives in mapStyle.floorKind; this component draws it.
 */
function FloorPatternInner({ variant }: { variant: 0 | 1 | 2 | 3 }) {
  const kind = floorKind(variant)
  if (kind === 'flagstone') {
    return (
      <path
        d="M0 0.5h1M0.5 0v1M0 0.25h0.5M0.5 0.75h0.5"
        className="stroke-parchment/30"
        strokeWidth={0.07}
        fill="none"
      />
    )
  }
  if (kind === 'cobble') {
    return (
      <g fill="#ffffff" fillOpacity={0.09} stroke="#2b241f" strokeOpacity={0.35} strokeWidth={0.03}>
        <circle cx={0.17} cy={0.17} r={0.13} />
        <circle cx={0.5} cy={0.17} r={0.13} />
        <circle cx={0.83} cy={0.17} r={0.13} />
        <circle cx={0.17} cy={0.5} r={0.13} />
        <circle cx={0.5} cy={0.5} r={0.13} />
        <circle cx={0.83} cy={0.5} r={0.13} />
        <circle cx={0.17} cy={0.83} r={0.13} />
        <circle cx={0.5} cy={0.83} r={0.13} />
        <circle cx={0.83} cy={0.83} r={0.13} />
      </g>
    )
  }
  if (kind === 'ashlar') {
    return (
      <path
        d="M0 0.33h1M0 0.66h1M0.66 0v0.33M0.33 0.33v0.33M0.66 0.66V1"
        className="stroke-parchment/30"
        strokeWidth={0.06}
        fill="none"
      />
    )
  }
  // rough
  return (
    <g>
      <path
        d="M0.15 0.1 L0.35 0.45 L0.3 0.7 L0.5 0.95"
        stroke="#2b241f"
        strokeOpacity={0.3}
        strokeWidth={0.03}
        fill="none"
      />
      <g fill="#2b241f" fillOpacity={0.25}>
        <circle cx={0.2} cy={0.3} r={0.03} />
        <circle cx={0.7} cy={0.2} r={0.025} />
        <circle cx={0.4} cy={0.6} r={0.035} />
        <circle cx={0.85} cy={0.75} r={0.03} />
        <circle cx={0.15} cy={0.85} r={0.025} />
        <circle cx={0.6} cy={0.9} r={0.03} />
      </g>
    </g>
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
  const { dungeon, log, busy, error, ensureDungeon, explore, search, pendingFind, claimFind, clearError, beginCombat, beginSecretReveal, beginSecretItem, useTreasureLocation, rest, claimQuest, requestUndo, cancelUndo, performUndo, confirmUndo, pendingXp, pendingDoor, lightTorch, extinguishTorch, pickupLantern, peekSecretDoor, enterSecretDoor, dipPool, buyPassage, spendLevelUp, spendStoredXp, spendOldSchoolXp, openDoorDialog } =
    useDungeonStore()
  const { campaign, party, loadLastCampaign } = useCampaignStore()
  const [panelOpen, setPanelOpen] = useState(true)
  // Polish pass (P0-2): the peek panel animates closed over 200ms, then
  // unmounts; opening mounts it first, then expands on the next frame.
  // Reduced motion skips the animation (instant mount/unmount).
  const [panelMounted, setPanelMounted] = useState(true)
  const panelTimer = useRef<number | null>(null)
  const togglePanel = useCallback(() => {
    if (prefersReducedMotion()) {
      setPanelOpen((o) => !o)
      setPanelMounted((m) => !m)
      return
    }
    if (panelOpen) {
      setPanelOpen(false)
      panelTimer.current = window.setTimeout(() => setPanelMounted(false), 210)
    } else {
      if (panelTimer.current !== null) window.clearTimeout(panelTimer.current)
      setPanelMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setPanelOpen(true)))
    }
  }, [panelOpen])
  useEffect(
    () => () => {
      if (panelTimer.current !== null) window.clearTimeout(panelTimer.current)
    },
    [],
  )
  // Polish pass (P0-1): the map's zoom/pan transform animates (200ms)
  // except while a pointer is dragging or pinching, where it must track
  // the finger 1:1. The svg gets .map-smooth only when not interacting.
  const [interacting, setInteracting] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [hover, setHover] = useState<{ tileId: string; text: string; x: number; y: number } | null>(null)
  // Phase G: roving tabindex over the current tile's exit discs — one Tab
  // stop for the whole disc group, arrows move between discs, Enter/Space
  // explores. `focusedExitId` renders the focus ring on the focused disc.
  const [activeExit, setActiveExit] = useState(0)
  const [focusedExitId, setFocusedExitId] = useState<string | null>(null)
  // Phase G: the undo confirm traps Tab and closes on Escape (keep).
  const undoRef = useDialogFocus<HTMLDivElement>(!!confirmUndo, () => void cancelUndo())
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

  // Roving tabindex follows the party: a new tile resets the active exit.
  useEffect(() => {
    setActiveExit(0)
  }, [tile])

  // Light & darkness (R093/R094, Release 0.5 A4): what the party can see
  // by right now, and whether a torch is burning down.
  const light = useMemo(() => {
    if (!dungeon) return null
    return computeLight(party, {
      torchLit: dungeon.torchLit ?? false,
      torchRooms: dungeon.torchRooms ?? 0,
      lanternDropped: dungeon.lanternDropped ?? false,
      glowmaggots: tile?.content?.encounter?.monster.name === 'Glowmaggots',
    })
  }, [dungeon, party, tile])
  const env: EnvironmentId = (tile?.environment ?? dungeon?.environment ?? 'dungeon') as EnvironmentId
  // A torch on a dead PC is lost (lightTorch requires a living carrier,
  // and there is no "pick up the dropped torch" action) — showing the
  // button then would promise light the game cannot give.
  const hasTorch = party.some((p) => p.status !== 'dead' && p.equipment.includes('torch'))
  const hasRope = party.some((p) => p.equipment.includes('rope'))
  const living = party.filter((p) => p.status !== 'dead')

  // ----- pointer handlers: pan / pinch / tap -----
  const onPointerDown = (e: React.PointerEvent) => {
    setInteracting(true)
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
    setInteracting(false)
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

  // Polish pass (P0-1): re-fit the dungeon smoothly when the viewport
  // width changes (resize / orientationchange), debounced 200ms — the
  // re-fit glides because the svg carries .map-smooth while no pointer
  // is down. A height-only change (mobile browser chrome showing or
  // hiding) leaves the player's zoom alone.
  const lastWidthRef = useRef(typeof window === 'undefined' ? 0 : window.innerWidth)
  useEffect(() => {
    const onResize = debounce(() => {
      if (typeof window === 'undefined') return
      if (window.innerWidth !== lastWidthRef.current) {
        lastWidthRef.current = window.innerWidth
        fitDungeon()
      }
    }, 200)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      onResize.cancel()
    }
  }, [fitDungeon])

  const engage = useCallback(() => {
    // Haptics (E): a short buzz on engage, behind the Settings toggle.
    hapticBuzz(10)
    void beginCombat()
  }, [beginCombat])

  // ----- keyboard shortcuts (Phase F): every mouse action has a key -----
  // Phase G: the map's exit discs are a roving-tabindex group — Tab lands
  // on the active disc, arrows move between discs, Enter/Space explores,
  // Escape returns focus to the map container (which keeps arrows-pan).
  // NOTE: the roving index runs over tile.exits (ALL rendered discs,
  // including the way back) — NOT openExits, which filters to unexplored
  // exits only and would put the handler in a different index space than
  // the render's `i === activeExit` tabIndex.
  const content = tile?.content ?? null
  const canEngage = !!content?.encounter && !content.cleared && !dungeon?.combat
  // Polish pass (P1-9): the map's foe token flashes when the combat log
  // says a hit landed on the current tile's encounter — the hit channel
  // scans back past the foes-turn block (see latestKindIndex), since the
  // last line alone almost never carries a hit.
  const combatLog = dungeon?.combat?.log ?? []
  const mapHitIdx = latestKindIndex(combatLog.map((l) => l.text), 'hit')
  const mapHitTarget =
    mapHitIdx !== null
      ? feedbackTargetName(
          combatLog[mapHitIdx].text,
          content?.encounter ? [content.encounter.monster.name] : [],
        )
      : null
  useEffect(() => {
    const focusExit = (index: number) => {
      if (!dungeon || !tile) return
      const target = tile.exits[index]
      if (!target) return
      const el = mapRef.current?.querySelector<SVGCircleElement>(
        `[data-exit-id="${CSS.escape(target.id)}"]`,
      )
      el?.focus()
    }
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      // A dialog owns the keyboard while it is open (its own trap handles
      // Tab/Escape); the undo confirm likewise.
      if (dungeon?.pendingChoice || pendingDoor || confirmUndo) return
      if (showShortcuts) {
        if (e.key === 'Escape' || e.key === '?') {
          e.preventDefault()
          setShowShortcuts(false)
        }
        return
      }
      const activeEl = document.activeElement as Element | null
      const exitFocused = !!activeEl?.hasAttribute?.('data-exit-id')
      const action = mapKeyAction(e.key, {
        canEngage,
        canUndo: !!dungeon,
        mapFocused: document.activeElement === mapRef.current,
        exitFocused,
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
        case 'exit-next':
        case 'exit-prev': {
          if (!dungeon || !tile) break
          const dir = action === 'exit-next' ? 1 : -1
          const next = nextExitIndex(activeExit, dir as 1 | -1, tile.exits.length)
          setActiveExit(next)
          focusExit(next)
          break
        }
        case 'activate-exit': {
          if (!dungeon || !tile || dungeon.pendingXp) break
          const list = tile.exits
          const focusedId = activeEl?.getAttribute('data-exit-id')
          const exit = list.find((x) => x.id === focusedId) ?? list[activeExit]
          if (!exit) break
          if (doorNeedsAction(exit)) openDoorDialog(exit.id)
          else void explore(exit.id)
          break
        }
        case 'exit-to-map':
          mapRef.current?.focus()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dungeon, tile, canEngage, activeExit, showShortcuts, confirmUndo, fitDungeon, engage, requestUndo, explore, openDoorDialog])

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
        <p className="text-parchment/70">{busy ? 'Generating…' : error ?? '…'}</p>
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
    <div className="fade-in flex flex-1 flex-col overflow-hidden lg:flex-row">
      {/* Phase G: the screen's heading for assistive tech (axe
          page-has-heading-one) — the visible room header is a collapse
          toggle, so it cannot be the h1. */}
      <h1 className="sr-only">Dungeon</h1>
      {/* map column: viewport + legend; on desktop the panel is a right rail */}
      <div className="flex min-h-0 flex-1 flex-col lg:min-w-0">
        {/* Stream 2: scene art above the map — a calm corridor panel
            while exploring (no combat active), the sunlit-steps panel
            once the fight is won (the victory stamp shows in the rail
            at the same time). A fixed-height banner, shrink-0: it never
            covers the map, the exit discs, or any button, and it leaves
            the map full-height while a fight is still running. */}
        {dungeon.combat?.phase === 'won' ? (
          <div className="shrink-0 px-3 pt-2">
            <DungeonVignette
              kind="victory"
              className="mx-auto h-32 w-full object-cover shadow-folio sm:h-40"
            />
          </div>
        ) : !dungeon.combat ? (
          <div className="shrink-0 px-3 pt-2">
            <DungeonVignette
              kind="entrance"
              className="mx-auto h-20 w-full object-cover shadow-folio sm:h-24"
            />
          </div>
        ) : null}
        {/* map viewport */}
        <div
          ref={mapRef}
          tabIndex={0}
          role="application"
          aria-label="Dungeon map. Tab to the exits, arrow keys move between them, Enter explores. Plus and minus zoom, zero fits the dungeon, E engages foes, U undoes, question mark lists shortcuts."
          className="relative min-h-0 flex-1 touch-none overflow-hidden bg-stone-950"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <svg
            viewBox={`0 0 ${bounds.maxCol - bounds.minCol + 4} ${bounds.maxRow - bounds.minRow + 4}`}
            className={`h-full w-full ${interacting ? '' : 'map-smooth'}`}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* stone floors, four variants (C4, Stream 2): each variant is
                  a different stone now (flagstone / cobble / ashlar /
                  rough — see FloorPatternInner), rotation + tone baked in
                  and chosen per tile from the campaign seed, so replays
                  match */}
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
                  <FloorPatternInner variant={v as 0 | 1 | 2 | 3} />
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
                  <FloorPatternInner variant={v as 0 | 1 | 2 | 3} />
                </pattern>
              ))}
              {/* torchlight (C4, deepened in Stream 2): the dark falloff
                  now reaches further and darker at the edges, and two
                  warm glows sit on top of it — a bright heart on the
                  party's tile and a faint wash over the explored rooms,
                  so lit stone reads warm and the fog reads as depth.
                  No flat two-tone */}
              <radialGradient
                id="torchFalloff"
                gradientUnits="userSpaceOnUse"
                cx={partyX}
                cy={partyY}
                r={9}
              >
                <stop offset="0%" stopColor="#2b241f" stopOpacity="0" />
                <stop offset="30%" stopColor="#2b241f" stopOpacity="0.05" />
                <stop offset="60%" stopColor="#2b241f" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2b241f" stopOpacity="0.55" />
              </radialGradient>
              <radialGradient
                id="torchGlow"
                gradientUnits="userSpaceOnUse"
                cx={partyX}
                cy={partyY}
                r={3.2}
              >
                <stop offset="0%" stopColor="#d9a441" stopOpacity="0.3" />
                <stop offset="45%" stopColor="#d9a441" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#d9a441" stopOpacity="0" />
              </radialGradient>
              <radialGradient
                id="torchGlowWide"
                gradientUnits="userSpaceOnUse"
                cx={partyX}
                cy={partyY}
                r={8}
              >
                <stop offset="0%" stopColor="#d9a441" stopOpacity="0.09" />
                <stop offset="100%" stopColor="#d9a441" stopOpacity="0" />
              </radialGradient>
            </defs>
            <g transform={`translate(${2 - bounds.minCol}, ${2 - bounds.minRow})`}>
              {/* dark void under the dungeon (Stream 2): semi-transparent
                  floors (corridors, peeked tiles) read as recessed stone
                  over this, never as light canvas showing through */}
              <rect
                x={bounds.minCol}
                y={bounds.minRow}
                width={bounds.maxCol - bounds.minCol + 1}
                height={bounds.maxRow - bounds.minRow + 1}
                fill="#171208"
                aria-hidden="true"
              />
              {dungeon.tiles.map((t) => {
                const geo = tileGeometry(t)
                const isCurrent = t.id === tile.id
                const isEntrance = t.id === dungeon.tiles[0].id
                const isNewest = t.id === newestTileId
                const variant = floorVariant(seed, t.id)
                // True fog of war: an unexplored tile shows no contents —
                // no icon, foe count, or tooltip detail — until entered
                // (or peeked, for a secret-door tile).
                const visible = tileContentVisible(t, dungeon.secretDoor)
                const fog = fogState(
                  t,
                  tile.id,
                  dungeon.secretDoor?.toTileId === t.id && dungeon.secretDoor.peeked === true,
                )
                const icon = visible ? contentIcon(t.content, isEntrance) : null
                const cx = t.cells.reduce((n, c) => n + c.col, 0) / Math.max(1, t.cells.length) + 0.5
                const cy = t.cells.reduce((n, c) => n + c.row, 0) / Math.max(1, t.cells.length) + 0.5
                const cols = t.cells.map((c) => c.col)
                const rows = t.cells.map((c) => c.row)
                const minCol = Math.min(...cols)
                const minRow = Math.min(...rows)
                const maxCol = Math.max(...cols)
                const maxRow = Math.max(...rows)
                const encounterCount =
                  visible && t.content?.encounter && !t.content.cleared ? t.content.encounter.count : 0
                // Corridors read darker than rooms (each tile by its own shape).
                const tIsCorridor = D66_TILES.find((s) => s.id === t.shapeId)?.corridor ?? false
                // Stream 2: which floor this tile draws, and the washes
                // over it — pattern by fog state, a whisper of per-tile
                // tone, and the fog tint (warm on explored, dark on
                // peeked). Unexplored tiles get no pattern at all.
                const patternId = floorPatternId(fog, variant)
                const cellOpacity = floorOpacity(fog, tIsCorridor)
                const tint = fogTint(fog)
                const shade = floorShade(seed, t.id)
                const isHovered = hover?.tileId === t.id
                return (
                  <g
                    key={t.id}
                    role="img"
                    aria-label={`${tileSummary(t, visible)}${isCurrent ? ' — you are here' : ''}`}
                    className={isCurrent && isNewest ? 'tile-reveal' : undefined}
                    onMouseEnter={(e) => {
                      const r = mapRef.current?.getBoundingClientRect()
                      setHover({
                        tileId: t.id,
                        text: tileSummary(t, visible),
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
                    <title>{tileSummary(t, visible)}</title>
                    {/* floor: patterned stone by variant and fog state —
                        the current tile is torch-lit, explored tiles dim
                        stone with a warm wash, peeked tiles sit half-lit
                        and recessed, unexplored tiles are a solid dark
                        recess with no contents (fog of war) */}
                    {t.cells.map((c, i) => (
                      <rect
                        key={i}
                        x={c.col}
                        y={c.row}
                        width={1}
                        height={1}
                        fill={patternId ? `url(#${patternId})` : '#0f0c09'}
                        opacity={cellOpacity}
                      />
                    ))}
                    {/* per-tile tone whisper + fog tint, over the tile's
                        bounding box (Stream 2) */}
                    {shade !== 0 && fog !== 'unexplored' && (
                      <rect
                        x={minCol}
                        y={minRow}
                        width={maxCol - minCol + 1}
                        height={maxRow - minRow + 1}
                        fill={shade > 0 ? '#ffffff' : '#000000'}
                        opacity={Math.abs(shade)}
                        pointerEvents="none"
                      />
                    )}
                    {tint && (
                      <rect
                        x={minCol}
                        y={minRow}
                        width={maxCol - minCol + 1}
                        height={maxRow - minRow + 1}
                        fill={tint.fill}
                        opacity={tint.opacity}
                        pointerEvents="none"
                      />
                    )}
                    {/* current-tile marker (Stream 2): an oxblood frame
                        around the party's tile, on top of the lit floor
                        and the torch glow — the "you are here" reads
                        before the token does */}
                    {isCurrent && (
                      <rect
                        x={minCol}
                        y={minRow}
                        width={maxCol - minCol + 1}
                        height={maxRow - minRow + 1}
                        className="fill-none stroke-torch"
                        strokeWidth={0.05}
                        opacity={0.85}
                        pointerEvents="none"
                      />
                    )}
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
                        entrance keeps a distinct brass treatment (C4).
                        Unexplored tiles (Stream 2) get faint, flat walls
                        — no carved edge, no caps in full ink — so they
                        sit recessed in the fog instead of reading as
                        solid rooms */}
                    {geo.walls.map((w, i) => (
                      <line
                        key={i}
                        x1={w.x1}
                        y1={w.y1}
                        x2={w.x2}
                        y2={w.y2}
                        className={fog === 'unexplored' ? 'stroke-faint' : isEntrance ? 'stroke-brass' : 'stroke-parchment'}
                        strokeWidth={isEntrance ? 0.16 : 0.14}
                        opacity={fog === 'unexplored' ? 0.6 : 1}
                      />
                    ))}
                    {fog !== 'unexplored' &&
                      geo.walls.map((w, i) => (
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
                        className={fog === 'unexplored' ? 'fill-faint' : isEntrance ? 'fill-brass' : 'fill-parchment'}
                      />
                    ))}
                    {/* doors (C4, Stream 2): open = bare threshold, closed
                        = oxblood leaf + swing arc + knob, plain opening =
                        dashed gap. Rolled doors (R129) each sit on a dark
                        backing disc so they read at a glance, and each
                        carries its own mark on top of the shared colour:
                        locked = amber padlock with a keyhole, sealed =
                        violet diamond with a warded inner diamond, iron =
                        slate leaf with rivets, illusionary = dashed
                        violet leaf slashed through, trapped = amber
                        warning triangle with a bold mark, lever = brass
                        lever on a base plate. Shape, colour, and stroke
                        all differ — what each state MEANS is unchanged. */}
                    {t.exits.map((e) => {
                      const state = doorState(e)
                      const { x, y } = edgeMidpoint(e.cell, e.edge)
                      const horiz = e.edge === 'N' || e.edge === 'S'
                      const isRolled =
                        state === 'locked' ||
                        state === 'sealed' ||
                        state === 'iron' ||
                        state === 'illusionary' ||
                        state === 'trapped' ||
                        state === 'lever'
                      return (
                        <g key={e.id}>
                          {isRolled && (
                            <circle cx={x} cy={y} r={0.24} fill="#14100c" opacity={0.65} />
                          )}
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
                              <circle cx={x} cy={y} r={0.03} className="fill-parchment" />
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
                          {state === 'locked' && (
                            <>
                              <rect
                                x={x - 0.14}
                                y={y - 0.1}
                                width={0.28}
                                height={0.24}
                                className="fill-amber-500 stroke-parchment"
                                strokeWidth={0.02}
                              />
                              <path
                                d={`M ${x - 0.09} ${y - 0.1} v -0.07 a 0.09 0.09 0 0 1 0.18 0 v 0.07`}
                                className="stroke-amber-500"
                                fill="none"
                                strokeWidth={0.03}
                              />
                              <circle cx={x} cy={y} r={0.032} fill="#2b241f" />
                              <line
                                x1={x}
                                y1={y + 0.02}
                                x2={x}
                                y2={y + 0.09}
                                stroke="#2b241f"
                                strokeWidth={0.025}
                              />
                            </>
                          )}
                          {state === 'sealed' && (
                            <>
                              <polygon
                                points={`${x},${y - 0.18} ${x + 0.16},${y} ${x},${y + 0.18} ${x - 0.16},${y}`}
                                className="fill-violet-500 stroke-parchment"
                                strokeWidth={0.02}
                              />
                              <polygon
                                points={`${x},${y - 0.1} ${x + 0.08},${y} ${x},${y + 0.1} ${x - 0.08},${y}`}
                                className="fill-none stroke-parchment"
                                strokeWidth={0.02}
                              />
                            </>
                          )}
                          {state === 'iron' && (
                            <>
                              <rect
                                x={x - (horiz ? 0.16 : 0.04)}
                                y={y - (horiz ? 0.04 : 0.16)}
                                width={horiz ? 0.32 : 0.08}
                                height={horiz ? 0.08 : 0.32}
                                className="fill-slate-500 stroke-parchment"
                                strokeWidth={0.03}
                              />
                              <circle
                                cx={horiz ? x - 0.1 : x}
                                cy={horiz ? y : y - 0.1}
                                r={0.025}
                                className="fill-parchment"
                              />
                              <circle
                                cx={horiz ? x + 0.1 : x}
                                cy={horiz ? y : y + 0.1}
                                r={0.025}
                                className="fill-parchment"
                              />
                            </>
                          )}
                          {state === 'illusionary' && (
                            <>
                              <rect
                                x={x - (horiz ? 0.16 : 0.04)}
                                y={y - (horiz ? 0.04 : 0.16)}
                                width={horiz ? 0.32 : 0.08}
                                height={horiz ? 0.08 : 0.32}
                                className="fill-none stroke-violet-400"
                                strokeWidth={0.03}
                                strokeDasharray="0.06 0.04"
                              />
                              <line
                                x1={x - 0.14}
                                y1={y + 0.14}
                                x2={x + 0.14}
                                y2={y - 0.14}
                                className="stroke-violet-400"
                                strokeWidth={0.025}
                                strokeDasharray="0.05 0.04"
                              />
                            </>
                          )}
                          {state === 'trapped' && (
                            <>
                              <polygon
                                points={`${x},${y - 0.18} ${x + 0.18},${y + 0.14} ${x - 0.18},${y + 0.14}`}
                                className="fill-amber-500 stroke-parchment"
                                strokeWidth={0.03}
                              />
                              <text
                                x={x}
                                y={y + 0.1}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={0.18}
                                fill="#2b241f"
                                fontWeight="bold"
                              >
                                !
                              </text>
                            </>
                          )}
                          {state === 'lever' && (
                            <>
                              <rect
                                x={x - 0.06}
                                y={y + 0.1}
                                width={0.12}
                                height={0.06}
                                className="fill-amber-400 stroke-parchment"
                                strokeWidth={0.015}
                              />
                              <line
                                x1={x}
                                y1={y + 0.14}
                                x2={x + 0.12}
                                y2={y - 0.14}
                                className="stroke-amber-400"
                                strokeWidth={0.05}
                              />
                              <circle cx={x + 0.12} cy={y - 0.14} r={0.06} className="fill-amber-400 stroke-parchment" strokeWidth={0.02} />
                            </>
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
                    {/* foe-token hit flash (P1-9): the current tile blooms
                        oxblood when the combat log reports a hit on its
                        encounter; the key is the hit line's index, so a
                        new hit remounts and replays the flash */}
                    {isCurrent && mapHitIdx !== null && mapHitTarget && (
                      <circle
                        key={`fb-hit-${mapHitIdx}`}
                        cx={cx}
                        cy={cy}
                        r={0.55}
                        className="foe-hit-flash"
                        fill="#8c2626"
                      />
                    )}
                    {/* secret door found by searching (C4): a badge on the tile */}
                    {visible && t.secretDoorFound && (
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
              {/* torch falloff over the tiles only — tokens and exits stay bright.
                  The warm glows sit on top of the dark falloff: a bright
                  heart on the party's tile, and a faint wash that keeps
                  explored stone warm as the light falls away (Stream 2) */}
              <rect
                x={bounds.minCol - 1}
                y={bounds.minRow - 1}
                width={bounds.maxCol - bounds.minCol + 3}
                height={bounds.maxRow - bounds.minRow + 3}
                fill="url(#torchFalloff)"
                pointerEvents="none"
              />
              <rect
                x={bounds.minCol - 1}
                y={bounds.minRow - 1}
                width={bounds.maxCol - bounds.minCol + 3}
                height={bounds.maxRow - bounds.minRow + 3}
                fill="url(#torchGlowWide)"
                pointerEvents="none"
              />
              <rect
                x={bounds.minCol - 1}
                y={bounds.minRow - 1}
                width={bounds.maxCol - bounds.minCol + 3}
                height={bounds.maxRow - bounds.minRow + 3}
                fill="url(#torchGlow)"
                pointerEvents="none"
              />
              {/* exit tap targets: glowing = unexplored (generate), dim = move through.
                  While an XP roll is unspent the exits are closed: the roll is
                  assigned from the victory card before leaving,
                  so the discs dim and ignore taps (the store guards explore
                  too, and the panel explains why). */}
              {/* Exit discs (Phase G): a roving-tabindex group — one Tab stop
                  for the whole set, arrows move between discs, Enter/Space
                  explores. The focused disc gets a dashed oxblood ring on
                  top of the global focus outline, so it reads at map scale. */}
              {tile.exits.map((e, i) => {
                const x = e.cell.col + (e.edge === 'E' ? 1 : e.edge === 'W' ? 0 : 0.5)
                const y = e.cell.row + (e.edge === 'S' ? 1 : e.edge === 'N' ? 0 : 0.5)
                const unexplored = !e.toTileId
                const needsDoor = doorNeedsAction(e)
                const toTile = e.toTileId ? dungeon.tiles.find((t) => t.id === e.toTileId) : undefined
                return (
                  <g key={e.id}>
                    <circle
                      data-exit-id={e.id}
                      tabIndex={pendingXp ? -1 : i === activeExit ? 0 : -1}
                      role="button"
                      aria-label={exitLabel(e, toTile?.shapeId ?? null)}
                      cx={x}
                      cy={y}
                      r={0.34}
                      className={`${pendingXp ? 'pointer-events-none opacity-40' : 'cursor-pointer'} stroke-parchment ${
                        needsDoor ? 'fill-amber-500/80' : unexplored ? 'fill-torch/80' : 'fill-parchment/50'
                      }`}
                      strokeWidth={0.05}
                      onFocus={() => {
                        setActiveExit(i)
                        setFocusedExitId(e.id)
                      }}
                      onBlur={() => setFocusedExitId((id) => (id === e.id ? null : id))}
                      onPointerUp={(ev) => {
                        if (pendingXp) return
                        if (!dragRef.current?.moved) {
                          ev.stopPropagation()
                          // A door that still needs an action opens the door
                          // dialog; anything else explores straight through.
                          if (needsDoor) openDoorDialog(e.id)
                          else void explore(e.id)
                        }
                      }}
                    />
                    {focusedExitId === e.id && (
                      <circle
                        cx={x}
                        cy={y}
                        r={0.44}
                        pointerEvents="none"
                        className="fill-none stroke-torch"
                        strokeWidth={0.05}
                        strokeDasharray="0.1 0.06"
                      />
                    )}
                  </g>
                )
              })}
              {/* party marker: banner token on a torch disc — rendered LAST
                  so it is always on top, never overlapped by the exit discs
                  (C4). The pulse ring is the "you are here" (C5). */}
              {tile.cells.length > 0 && (
                <g>
                  {/* warm disc under the token (Stream 2): the torch's
                      heart, breathing almost imperceptibly — instant
                      under reduced motion (see the gate in index.css) */}
                  <circle
                    cx={partyX}
                    cy={partyY}
                    r={0.52}
                    fill="#d9a441"
                    opacity={0.22}
                    className="torch-flicker"
                    aria-hidden="true"
                  />
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
                className="flex h-11 w-11 items-center justify-center rounded border border-parchment bg-stone-800 text-lg text-parchment shadow-folio transition-shadow duration-150 hover:shadow-raised"
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
              onClick={togglePanel}
              aria-expanded={panelOpen}
              className="flex w-full items-center justify-between px-3 py-1.5 text-xs uppercase tracking-wide text-parchment/70"
            >
              <span className="font-label">
                {isCorridor ? 'Corridor' : 'Room'} · tile {tile.shapeId}
                {content ? ` · ${content.kind}` : ' · entrance'}
                {' · '}
                {ENVIRONMENT_LABELS[env]}
              </span>
              <span>{panelOpen ? '▾' : '▴'}</span>
            </button>
            {/* Light & darkness (R093/R094): what the party sees by. */}
            {light && (
              <p className="px-3 text-xs text-parchment/70">
                {light.hasLight
                  ? light.source === 'lantern'
                    ? 'Lit by lantern'
                    : light.source === 'torch'
                      ? `Lit by torch — ${6 - light.torchRooms} room${6 - light.torchRooms === 1 ? '' : 's'} left`
                      : light.source === 'crystal'
                        ? 'Lit by Glittering Crystal (hands-free)'
                        : light.source === 'glowmaggots'
                          ? 'Lit by Glowmaggots'
                          : 'Lit (darkvision)'
                  : 'Darkness — −2 Attack/Defense/Saves, no ranged weapons, no Search'}
                {dungeon.lanternDropped && ' · lantern dropped!'}
              </p>
            )}
            {panelMounted && (
              <div
                className={`panel-peek px-3 pb-3 text-sm lg:min-h-0 lg:flex-1 ${panelOpen ? 'panel-peek-open' : 'panel-peek-closed'}`}
              >
                {/* encounter folio card (D1): family icon, count, level, wax
                    Engage, and the reaction hint the engine already knows */}
                {content?.encounter && !content.cleared && (
                  <div
                    key={`${tile.id}-${content.encounter.monster.name}`}
                    className="card-folio card-raised encounter-fade mb-2 p-3"
                  >
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
                        <p className="mt-1 text-xs text-parchment/70">
                          Foes may fight, flee, or demand a bribe — engage to see their reaction
                         .
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
                    {env === 'caverns' && content.specialFeatureRoll
                      ? CAVERN_FEATURE_INFO[cavernFeatureForRoll(content.specialFeatureRoll)].text
                      : FEATURE_INFO[DUNGEON_FEATURES[content.specialFeatureRoll! - 1]].text}
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
                      {dungeon.quest.roll === 3 &&
                        ` — ${dungeon.quest.subdued ? 'captive subdued (bind with a rope to deliver)' : 'subdue it alive (−1 Attack, or Sleep)'}${hasRope ? '' : ' — no rope in the party!'}`}
                      {dungeon.quest.roll === 4 &&
                        ` — fetch ${dungeon.quest.itemName}${dungeon.quest.itemFound ? ' (found — deliver it unused)' : ' (1-in-6 per Major Foe slain)'}`}
                    </p>
                    <button
                      onClick={() => void claimQuest()}
                      className="rounded border border-torch/40 bg-torch/10 px-3 py-1.5 text-xs text-torch"
                    >
                      Claim Quest reward
                    </button>
                  </div>
                )}
                {/* XP systems (R172-R174): Slow level-ups, Slower stored XP,
                    Old School tally — assigned here, not on the combat card. */}
                {(dungeon.pendingLevelUps ?? 0) > 0 && (
                  <div className="mb-2 rounded border border-torch/40 bg-torch/10 p-2">
                    <p className="text-xs text-torch">
                      Slow and Sure: {dungeon.pendingLevelUps} Level{dungeon.pendingLevelUps === 1 ? '' : 's'} to
                      assign — pick a surviving adventurer.
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {living.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => void spendLevelUp(p.id)}
                          className="btn-cartouche px-2 py-1 text-xs"
                        >
                          {p.name} (L{p.level})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(dungeon.storedXp ?? 0) > 0 && (
                  <div className="mb-2 rounded border border-stone-700 bg-stone-800 p-2">
                    <p className="text-xs text-parchment/80">
                      Slower Advancement: {dungeon.storedXp} stored XP — levelling a PC to L
                      {living[0]?.level ?? 1 + 1} costs that level in XP (d6 + extra &gt; L to succeed).
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {living.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => void spendStoredXp(p.id)}
                          disabled={(dungeon.storedXp ?? 0) < p.level + 1}
                          className="btn-cartouche px-2 py-1 text-xs disabled:opacity-40"
                        >
                          {p.name} → L{p.level + 1} ({p.level + 1} XP)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(dungeon.oldSchoolXp ?? 0) > 0 && (
                  <div className="mb-2 rounded border border-stone-700 bg-stone-800 p-2">
                    <p className="text-xs text-parchment/80">
                      Old School tally: {dungeon.oldSchoolXp} XP — level up costs (Tier+2)×100 XP, never
                      the same PC twice in a row.
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {living.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => void spendOldSchoolXp(p.id)}
                          className="btn-cartouche px-2 py-1 text-xs"
                        >
                          {p.name} → L{p.level + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Light controls (R094): torch and dropped lantern. */}
                {light && !dungeon.combat && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {hasTorch && !light.torchLit && (
                      <button
                        onClick={() => void lightTorch()}
                        className="rounded border border-stone-600 bg-stone-800 px-2 py-1 text-xs text-parchment"
                      >
                        Light torch (6 rooms)
                      </button>
                    )}
                    {light.torchLit && (
                      <button
                        onClick={() => void extinguishTorch()}
                        className="rounded border border-stone-600 bg-stone-800 px-2 py-1 text-xs text-parchment"
                      >
                        Extinguish torch
                      </button>
                    )}
                    {dungeon.lanternDropped && (
                      <button
                        onClick={() => void pickupLantern()}
                        className="rounded border border-torch/40 bg-torch/10 px-2 py-1 text-xs text-torch"
                      >
                        Pick up the dropped lantern (1 turn)
                      </button>
                    )}
                  </div>
                )}
                {/* Secret door (R125): peek at the tile beyond, then enter. */}
                {dungeon.secretDoor && dungeon.currentTileId === dungeon.secretDoor.fromTileId && (
                  <div className="mb-2 rounded border border-torch/40 bg-torch/10 p-2">
                    <p className="text-xs text-torch">
                      A secret door leads onward
                      {dungeon.secretDoor.peeked ? ' — peeked: the tile beyond is mapped' : ' — peek before you enter.'}
                      {dungeon.secretDoor.safeExit && ' A shortcut exit lies beyond — no Wandering Monsters through it.'}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {!dungeon.secretDoor.peeked && (
                        <button
                          onClick={() => void peekSecretDoor()}
                          className="rounded border border-stone-600 bg-stone-800 px-2 py-1 text-xs text-parchment"
                        >
                          Peek
                        </button>
                      )}
                      <button
                        onClick={() => void enterSecretDoor()}
                        className="rounded border border-torch/40 bg-torch/10 px-2 py-1 text-xs text-torch"
                      >
                        Enter (Foes surprised)
                      </button>
                    </div>
                  </div>
                )}
                {/* Cavern water pools (R142): dip for 1 Life on 5-6, once per PC. */}
                {tile.cavernFeature === 'waterPools' && !dungeon.combat && (
                  <div className="mb-2">
                    <p className="text-xs text-parchment/70">Water pools here — dip in (d6: 1 contaminated, 2-4 nothing, 5-6 +1 Life).</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {living
                        .filter((p) => !(dungeon.poolDippedPcIds ?? []).includes(p.id))
                        .map((p) => (
                          <button
                            key={p.id}
                            onClick={() => void dipPool(p.id)}
                            className="rounded border border-stone-600 bg-stone-800 px-2 py-1 text-xs text-parchment"
                          >
                            {p.name} dips in
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                {/* Secret passage for 2 Clues (R126, Tile Content 9): buy the
                    way to another environment from an empty tile. */}
                {(campaign.clues ?? 0) >= 2 && !dungeon.combat && !dungeon.pendingChoice && (
                  <div className="mb-2">
                    <p className="text-xs text-parchment/70">
                      Spend 2 Clues ({campaign.clues} in pool) to open a secret passage:
                    </p>
                    <div className="mt-1 flex gap-1">
                      <button
                        onClick={() => void buyPassage('caverns')}
                        disabled={env === 'caverns'}
                        className="rounded border border-stone-600 bg-stone-800 px-2 py-1 text-xs text-parchment disabled:opacity-40"
                      >
                        → Caverns
                      </button>
                      <button
                        onClick={() => void buyPassage('fungal')}
                        disabled={env === 'fungal'}
                        className="rounded border border-stone-600 bg-stone-800 px-2 py-1 text-xs text-parchment disabled:opacity-40"
                      >
                        → Fungal grottoes
                      </button>
                    </div>
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
                    Rest here (1 Life or 1 ability each)
                  </button>
                )}
                {tile.searchResult === 'find' && !pendingFind && (
                  <p className="mb-2 text-parchment/70">You found something — choose below.</p>
                )}
                {pendingFind && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {(env === 'caverns'
                      ? (['clue', 'listen'] as const)
                      : env === 'fungal'
                        ? (['clue', 'rare-mushroom'] as const)
                        : (['hidden-treasure', 'secret-door', 'secret-passage', 'clue'] as const)
                    ).map((choice) => (
                      <button
                        key={choice}
                        onClick={() => void claimFind(choice)}
                        className="rounded border border-stone-700 bg-stone-800 px-2 py-1 text-xs text-parchment disabled:opacity-40"
                      >
                        {choice === 'hidden-treasure' && 'Hidden treasure'}
                        {choice === 'secret-door' && (
                          <>
                            <FragIcon frag={secretDoorIcon} size={14} label="Secret door" /> Secret door
                          </>
                        )}
                        {choice === 'secret-passage' && 'Secret passage'}
                        {choice === 'clue' && '1 Clue'}
                        {choice === 'listen' && 'Listen (pre-roll next tile)'}
                        {choice === 'rare-mushroom' && 'Rare Mushroom'}
                      </button>
                    ))}
                  </div>
                )}
                {exits.length === 0 && (
                  <p className="text-parchment/70">
                    No open exits here — move through a generated door to retrace (1-in-6 Wandering
                    Monsters).
                  </p>
                )}
                {/* Log (D1): timestamps, drawn dice, capped with a fade.
                    Rendered strings are citation-stripped (Release 0.5, Part B);
                    the store/journal keeps the internal record. */}
                <ul className="log-fade num-tabular space-y-0.5 text-xs text-parchment/70">
                  {log.slice(-6).map((l) => (
                    <li key={`${l.ts}-${l.text}`} className="log-line">
                      <span className="mr-1 font-mono text-[10px] text-faint">
                        {new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <LogDie text={l.text} />
                      · {stripCitations(l.text)}
                    </li>
                  ))}
                </ul>
                {error && (
                  <button
                    type="button"
                    onClick={clearError}
                    aria-label="Dismiss error"
                    className="mt-1 block text-left text-xs text-ember"
                  >
                    {stripCitations(error)}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* undo (PROJECT_SPEC §19): confirm before reversing the last action */}
      {confirmUndo && (
        <div className="dialog-backdrop fixed inset-0 z-40 flex items-end bg-black/60 px-3 pb-16">
          <div
            ref={undoRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Undo ${confirmUndo.label}?`}
            className="panel-in shadow-modal w-full rounded-lg border border-ember/50 bg-stone-900 p-4"
          >
            <p className="text-sm text-torch">Undo “{confirmUndo.label}”?</p>
            <p className="mt-1 text-[10px] text-parchment/70">
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
      <DoorDialog />
      {showShortcuts && <ShortcutsSheet onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}
