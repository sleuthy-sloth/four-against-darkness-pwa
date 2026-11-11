import { NavLink } from 'react-router-dom'
import { TABS } from '../../app/navigation'

/** Fixed bottom navigation, safe-area aware for iPhone (Part VII §21, §28). */
export default function TabBar() {
  return (
    <nav
      aria-label="Main navigation"
      className="flex shrink-0 border-t-2 border-parchment bg-stone-900/95 pb-[env(safe-area-inset-bottom)]"
    >
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
