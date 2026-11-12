import { describe, expect, it } from 'vitest'
import attribution from '../../src/assets/icons/attribution.json'

/** C8 licensing hygiene: every icon frag and every shipped art file must
 * have a source recorded in attribution.json, and every attribution entry
 * must point at a frag, an art file, the lockup, or the icon set. The
 * Settings credits list renders from this file. */
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

  const artModules = import.meta.glob('../../public/art/*.webp', {
    eager: true,
  })
  const artNames = Object.keys(artModules)
    .map((p) => p.split('/').pop()!.replace(/\.webp$/, ''))
    .sort()

  /** Attribution keys that are not frags and not art files. */
  const EXTRA_KEYS = ['app-icons', 'lockup-delver']

  it('records a source for every frag', () => {
    fragNames.forEach((name) => {
      const source = (attribution as Record<string, string>)[name]
      expect(source, `${name} is missing from attribution.json`).toBeTruthy()
    })
  })

  it('records a source for every shipped art file', () => {
    artNames.forEach((name) => {
      const source = (attribution as Record<string, string>)[`art-${name}`]
      expect(source, `art-${name} is missing from attribution.json`).toBeTruthy()
    })
  })

  it('has an attribution entry only for a frag, an art file, the lockup, or the icon set', () => {
    const known = new Set([
      ...fragNames,
      ...artNames.map((n) => `art-${n}`),
      ...EXTRA_KEYS,
    ])
    Object.keys(attribution).forEach((key) => {
      expect(known.has(key), `${key} has no frag or art file`).toBe(true)
    })
    expect(Object.keys(attribution).sort()).toEqual([...known].sort())
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
