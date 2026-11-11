import { describe, expect, it } from 'vitest'
import { DEFAULT_TAB, TABS, firstTabPath, tabForPath } from '../../src/app/navigation'

describe('main navigation (Part VII §21)', () => {
  it('exposes exactly the five required areas', () => {
    expect(TABS.map((t) => t.id)).toEqual([
      'dungeon',
      'party',
      'journal',
      'inventory',
      'settings',
    ])
  })

  it('has a unique path per tab and a resolvable default', () => {
    const paths = TABS.map((t) => t.path)
    expect(new Set(paths).size).toBe(paths.length)
    expect(tabForPath(firstTabPath())).toBeDefined()
    expect(TABS.find((t) => t.id === DEFAULT_TAB)).toBeDefined()
  })

  it('routes resolve both directions', () => {
    for (const tab of TABS) {
      expect(tabForPath(tab.path)?.id).toBe(tab.id)
    }
  })

  it('unknown paths resolve to no tab', () => {
    expect(tabForPath('/nope')).toBeUndefined()
  })
})
