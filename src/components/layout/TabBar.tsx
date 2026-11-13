import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { TABS } from '../../app/navigation'

/**
 * Fixed bottom navigation, safe-area aware for iPhone (Part VII §21, §28).
 *
 * Polish pass (P0-3): the active tab gets a sliding brass indicator —
 * measured off the active link's position, gliding 200ms to the new tab
 * instead of an instant swap. The bar is decorative (never text), and
 * its transition is off under prefers-reduced-motion (CSS).
 */
export default function TabBar() {
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false })

  useEffect(() => {
    const measure = () => {
      const nav = navRef.current
      const active = nav?.querySelector('[aria-current="page"]') as HTMLElement | null
      if (!nav || !active) {
        setIndicator((i) => ({ ...i, visible: false }))
        return
      }
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth, visible: true })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [location.pathname])

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      className="relative flex shrink-0 border-t-2 border-parchment bg-stone-900/95 pb-[env(safe-area-inset-bottom)]"
    >
      {/* Sliding active-tab indicator (decorative brass bar). */}
      <span
        aria-hidden="true"
        className="tab-indicator pointer-events-none absolute left-0 top-0 h-[3px] bg-brass"
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: indicator.width,
          opacity: indicator.visible ? 1 : 0,
        }}
      />
      {TABS.map((tab) => (
        <NavLink
          key={tab.id}
          to={tab.path}
          className={({ isActive }) =>
            `ribbon-tab flex-1 ${isActive ? 'ribbon-tab-active' : ''}`
          }
        >
          <span aria-hidden="true" className="text-base leading-none">
            {tabGlyph(tab.id)}
          </span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Simple procedural glyphs — original shapes, no licensed art. */
function tabGlyph(id: string): string {
  switch (id) {
    case 'dungeon':
      return '⚒'
    case 'party':
      return '⚔'
    case 'journal':
      return '✒'
    case 'inventory':
      return '⛁'
    case 'settings':
      return '✦'
    default:
      return '•'
  }
}
