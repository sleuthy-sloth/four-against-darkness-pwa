import { describe, expect, it } from 'vitest'
import lockupSrc from '../../src/features/common/Lockup.tsx?raw'

/** The Delver at the Threshold lockup: the traced mark is present, the
 * wordmark is real text (never baked into the image), and the old tome
 * lockup is gone. No DOM renderer in this repo (no @testing-library), so
 * the component source is asserted directly — the Playwright suite
 * screenshots the rendered lockup at dashboard size. */
describe('delver lockup', () => {
  it('renders the traced delver mark as filled paths', () => {
    expect(lockupSrc).toContain('viewBox="0 0 512 640"')
    expect(lockupSrc).toContain('fill="currentColor"')
    const paths = lockupSrc.match(/<path d="M[^"]+"/g) ?? []
    // Six traced mark paths, plus the wax-seal doorway.
    expect(paths.length).toBeGreaterThanOrEqual(6)
    expect(lockupSrc).not.toContain('transform=')
  })

  it('keeps the wordmark as real text', () => {
    expect(lockupSrc).toContain('<text')
    expect(lockupSrc).toContain('Four Against Darkness')
    expect(lockupSrc).toContain("fontFamily=\"'Noto Serif', Georgia, serif\"")
  })

  it('no longer shows the tome', () => {
    // Comments may mention the old mark; assert on the rendered JSX only.
    const jsx = lockupSrc
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    expect(jsx.toLowerCase()).not.toContain('tome')
    expect(jsx).not.toContain('open tome')
  })
})
