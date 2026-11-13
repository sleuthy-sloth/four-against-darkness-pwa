import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Location } from 'react-router-dom'
import { prefersReducedMotion } from './motion'

/**
 * ScreenTransition — Stream 1 (animation round, 2026-11-13): navigation
 * fluidity. The five tabs used to switch instantly; now the outgoing
 * screen crossfades/slides out under the incoming screen, which
 * crossfades/slides in from the direction of travel, on the same 200ms
 * ease-out beat as the sliding brass tab indicator.
 *
 * One mechanism covers every screen (all five tabs plus /party/new and
 * /party/:charId): the router renders its <Routes> through this
 * component's render prop, once per live entry, with the entry's frozen
 * location. No screen file is edited.
 *
 * How the outgoing screen survives: entries are keyed by pathname, so
 * the previous entry keeps its already-mounted component instance (and
 * its scroll position and local state) while it exits — it is never
 * remounted. It is absolutely positioned, pointer-events-none, and
 * aria-hidden, so it can never swallow a tap; the entering screen is
 * interactive from the first frame and motion never delays a game
 * action. Exiting entries are pruned ~20ms after the 200ms animation
 * ends (immediately under reduced motion).
 *
 * Direction: tabs slide in reading order (Explore → Party → Journal →
 * Inventory → Settings); drilling into a detail screen (/party/new,
 * /party/:charId) slides forward, coming back slides back; a
 * same-level switch (one character sheet to another) eases in with a
 * short fade + slight rise. The first mount eases in the same way.
 *
 * StrictMode-safe: the prune timer is armed in an effect with a
 * cleanup that clears it, so the dev double-invoke only re-arms it.
 */

type Direction = 'forward' | 'back' | 'neutral'

interface Entry {
  key: string
  location: Location
  dir: Direction
  exiting: boolean
}

/** 200ms animation + 20ms slack so the exit finishes before unmount. */
const EXIT_PRUNE_MS = 220

/** Tab reading order; /campaign sits above the dungeon tab. */
const TAB_ORDER = ['/campaign', '/dungeon', '/party', '/journal', '/inventory', '/settings']

function rank(pathname: string): { order: number; depth: number } {
  const depth = pathname.split('/').filter(Boolean).length
  let order = TAB_ORDER.indexOf(pathname)
  if (order === -1) {
    // Detail route (/party/new, /party/:charId): inherit its parent tab.
    const parent = TAB_ORDER.find((base) => pathname.startsWith(`${base}/`))
    order = parent ? TAB_ORDER.indexOf(parent) : -1
  }
  return { order, depth }
}

/** Pure helper, exported for testing: which way does `to` travel from `from`? */
export function screenTransitionDirection(from: string, to: string): Direction {
  const a = rank(from)
  const b = rank(to)
  if (b.depth !== a.depth) return b.depth > a.depth ? 'forward' : 'back'
  if (a.order !== -1 && b.order !== -1 && a.order !== b.order) {
    return b.order > a.order ? 'forward' : 'back'
  }
  return 'neutral'
}

export default function ScreenTransition({
  location,
  children,
}: {
  location: Location
  children: (location: Location) => ReactNode
}) {
  const [entries, setEntries] = useState<Entry[]>([
    { key: location.pathname, location, dir: 'neutral', exiting: false },
  ])
  const pruneTimer = useRef<number | undefined>(undefined)

  // On navigation: retire the current entry (dropping any older
  // half-exited one — rapid taps never pile up stale screens) and
  // mount the incoming screen.
  useEffect(() => {
    setEntries((prev) => {
      const current = prev.find((e) => !e.exiting)
      if (current && current.key === location.pathname) return prev
      const dir = current
        ? screenTransitionDirection(current.key, location.pathname)
        : 'neutral'
      // The retiring entry exits in the travel direction too — not the
      // direction it entered with — so both screens move together.
      return [
        ...(current ? [{ ...current, exiting: true, dir }] : []),
        { key: location.pathname, location, dir, exiting: false },
      ]
    })
  }, [location.pathname, location])

  // Prune exited entries once their animation has finished.
  useEffect(() => {
    if (!entries.some((e) => e.exiting)) return
    const delay = prefersReducedMotion() ? 0 : EXIT_PRUNE_MS
    pruneTimer.current = window.setTimeout(() => {
      setEntries((prev) => prev.filter((e) => !e.exiting))
    }, delay)
    return () => window.clearTimeout(pruneTimer.current)
  }, [entries])

  return (
    <div className="screen-transition relative flex min-h-0 flex-1 flex-col">
      {entries.map((entry) =>
        entry.exiting ? (
          <div
            key={entry.key}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 flex min-h-0 flex-col overflow-hidden screen-exit-${entry.dir}`}
          >
            {children(entry.location)}
          </div>
        ) : (
          <div
            key={entry.key}
            className={`flex min-h-0 flex-1 flex-col screen-enter-${entry.dir}`}
          >
            {children(entry.location)}
          </div>
        ),
      )}
    </div>
  )
}
