import { describe, expect, it } from 'vitest'
import attribution from '../../src/assets/icons/attribution.json'

/** C8 licensing hygiene: every icon frag in the repo must have a source
 * recorded in attribution.json, and every attribution entry must point at
 * a frag that exists. The Settings credits list renders from this file. */
describe('icon attribution coverage (C8)', () => {
  // import.meta.glob (Vite) lists the frags without node:fs, which tsc
  // cannot resolve here (no @types/node in this project).
  const fragModules = import.meta.glob('../../src/assets/icons/*.svg.frag', {
    eager: true,
    query: '?raw',
  })
  const fragNames = Object.keys(fragModules)
    .map((p) => p.split('/').pop()!.replace(/\.svg\.frag$/, ''))
    .sort()

  it('has a frag for every attribution entry', () => {
    const keys = Object.keys(attribution).sort()
    expect(keys).toEqual(fragNames)
  })

  it('records a source for every frag', () => {
    fragNames.forEach((name) => {
      const source = (attribution as Record<string, string>)[name]
      expect(source, `${name} is missing from attribution.json`).toBeTruthy()
    })
  })

  it('records game-icons sources as author/name.svg (or original art)', () => {
    Object.entries(attribution as Record<string, string>).forEach(([name, source]) => {
      expect(
        source.includes('/') || source.startsWith('Original'),
        `${name}: unexpected source format "${source}"`,
      ).toBe(true)
    })
  })
})
