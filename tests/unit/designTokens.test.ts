import { describe, expect, it } from 'vitest'
import configText from '../../tailwind.config.js?raw'

/**
 * Design-token contrast gates (visual polish Phase A2): the palette values
 * are read from the real tailwind.config.js, so a token change that breaks
 * WCAG AA fails the suite instead of shipping silently.
 */

function token(source: string, name: string): string {
  const m = source.match(new RegExp(`${name}:\\s*'(#[0-9a-f]{6})'`, 'i'))
  if (!m) throw new Error(`token ${name} not found in tailwind.config.js`)
  return m[1]
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('design tokens: WCAG AA contrast', () => {
  const canvas = token(configText, '950')
  const leaf = token(configText, '900')
  const folio = token(configText, '800')
  const ink = token(configText, 'parchment')
  const faint = token(configText, 'faint')
  const torch = token(configText, 'torch')

  it('body ink on canvas clears AAA', () => {
    expect(contrast(ink, canvas)).toBeGreaterThanOrEqual(7)
  })

  it('faint secondary text on canvas clears AA (4.5:1)', () => {
    expect(contrast(faint, canvas)).toBeGreaterThanOrEqual(4.5)
  })

  it('faint secondary text on leaf clears AA', () => {
    expect(contrast(faint, leaf)).toBeGreaterThanOrEqual(4.5)
  })

  it('oxblood accents on canvas clear AA', () => {
    expect(contrast(torch, canvas)).toBeGreaterThanOrEqual(4.5)
  })

  it('folio text on oxblood (wax buttons) clears AA', () => {
    expect(contrast(folio, torch)).toBeGreaterThanOrEqual(4.5)
  })
})
