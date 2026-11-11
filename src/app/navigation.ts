/**
 * Main navigation model (Part VII §21): five primary areas.
 * Pure data, no React — the router, tab bar and tests all read from here
 * so a tab is never a dead button in the UI without a route behind it.
 */
export type TabId = 'dungeon' | 'party' | 'journal' | 'inventory' | 'settings'

export interface TabDef {
  id: TabId
  label: string
  path: string
  /** Phase where this screen becomes functional (documented, not hidden). */
  functionalAtPhase: number
}

export const TABS: TabDef[] = [
  { id: 'dungeon', label: 'Explore', path: '/dungeon', functionalAtPhase: 3 },
  { id: 'party', label: 'Party', path: '/party', functionalAtPhase: 2 },
  { id: 'journal', label: 'Journal', path: '/journal', functionalAtPhase: 3 },
  { id: 'inventory', label: 'Inventory', path: '/inventory', functionalAtPhase: 5 },
  { id: 'settings', label: 'Settings', path: '/settings', functionalAtPhase: 1 },
]

export const DEFAULT_TAB: TabId = 'dungeon'

export function tabForPath(path: string): TabDef | undefined {
  return TABS.find((t) => t.path === path)
}

export function firstTabPath(): string {
  return TABS[0].path
}
