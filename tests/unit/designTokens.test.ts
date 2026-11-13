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

/** Alpha-blend a foreground hex over a background hex (Tailwind /NN opacity). */
function blend(fg: string, bg: string, alpha: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16)
  const out = [1, 3, 5]
    .map((i) => Math.round(alpha * ch(fg, i) + (1 - alpha) * ch(bg, i)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
  return `#${out}`
}

describe('design tokens: WCAG AA contrast', () => {
  const canvas = token(configText, '950')
  const leaf = token(configText, '900')
  const folio = token(configText, '800')
  const well = token(configText, '700')
  const ink = token(configText, 'parchment')
  const faint = token(configText, 'faint')
  const torch = token(configText, 'torch')
  const brassInk = token(configText, 'brassInk')

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

  // Phase G: brass gold numerals are 14px bold — normal text under WCAG,
  // so the decorative brass (3.20:1) fails; brassInk is the AA fallback.
  it('brassInk gold numerals clear AA on every light surface they sit on', () => {
    expect(contrast(brassInk, canvas)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(brassInk, leaf)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(brassInk, folio)).toBeGreaterThanOrEqual(4.5)
  })

  // Phase G: the opacity floor for parchment text is /70 — /60 tops out at
  // 4.04:1. The /70 blend must clear AA on all four light surfaces.
  it('parchment at 70% opacity clears AA on every light surface', () => {
    for (const surface of [canvas, leaf, folio, well]) {
      expect(contrast(blend(ink, surface, 0.7), surface)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('parchment at 60% opacity does NOT clear AA (the floor is load-bearing)', () => {
    expect(contrast(blend(ink, canvas, 0.6), canvas)).toBeLessThan(4.5)
  })
})

/**
 * Phase G source scan: no sub-AA parchment text may ship, and the brass /
 * ember / torch opacity usages stay in their exempt lanes (icon fills and
 * disabled or decorative text only). The allowlist below is the complete
 * set of exemptions — every entry is a disabled control or aria-hidden
 * decoration, both exempt from WCAG contrast. If a line is fixed, update
 * the expected count here; the counts keep this test load-bearing.
 */
describe('source scan: no sub-AA text classes', () => {
  const modules = import.meta.glob('../../src/**/*.tsx', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>

  const LOW_PARCHMENT = /text-parchment\/(30|40|50|60)\b/
  const ALLOWLIST: Record<string, { substring: string; count: number }> = {
    'src/features/dungeon/CombatPanel.tsx': {
      // Dead-enemy target button — disabled when dead (WCAG exempt).
      substring: "border-stone-800 bg-stone-900 text-parchment/30",
      count: 1,
    },
    'src/features/inventory/InventoryScreen.tsx': {
      // Disabled "use" buttons for potions/bandages in combat (WCAG exempt).
      substring: 'text-[10px] text-parchment/40',
      count: 2,
    },
    'src/features/party/PartyScreen.tsx': {
      // Drag grip "⋮⋮" — aria-hidden decoration.
      substring: 'aria-hidden="true" className="tracking-tighter text-parchment/30"',
      count: 1,
    },
  }

  it('no parchment text below 70% opacity outside the allowlist', () => {
    for (const [path, source] of Object.entries(modules)) {
      const rel = path.replace('../../', '')
      const allow = ALLOWLIST[rel]
      const hits = source.split('\n').filter((line) => LOW_PARCHMENT.test(line))
      const allowed = allow
        ? hits.filter((line) => line.includes(allow.substring))
        : []
      if (allow) {
        expect(allowed).toHaveLength(allow.count)
        expect(hits).toHaveLength(allow.count)
      } else {
        expect(hits).toEqual([])
      }
    }
  })

  it('no bare text-brass anywhere (gold numerals use text-brassInk)', () => {
    for (const [path, source] of Object.entries(modules)) {
      expect(source).not.toMatch(/text-brass(?![A-Za-z])/)
      void path
    }
  })

  it('no text-ember/80 outside ClassIcon (icon fills only)', () => {
    for (const [path, source] of Object.entries(modules)) {
      if (path.endsWith('src/features/common/ClassIcon.tsx')) continue
      expect(source).not.toContain('text-ember/80')
    }
  })

  it('no text-torch/60 or /80 outside ClassIcon (icon fills only)', () => {
    for (const [path, source] of Object.entries(modules)) {
      if (path.endsWith('src/features/common/ClassIcon.tsx')) continue
      expect(source).not.toMatch(/text-torch\/(60|80)\b/)
    }
  })
})
