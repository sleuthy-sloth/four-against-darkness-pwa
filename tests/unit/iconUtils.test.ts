import { describe, expect, it } from 'vitest'
import { cleanIconFragment } from '../../src/features/common/iconUtils'
import warriorFrag from '../../src/assets/icons/warrior.svg.frag?raw'
import wizardFrag from '../../src/assets/icons/wizard.svg.frag?raw'
import monstersFrag from '../../src/assets/icons/monsters.svg.frag?raw'
import altarFrag from '../../src/assets/icons/altar.svg.frag?raw'
import boxFrag from '../../src/assets/icons/box.svg.frag?raw'

const FRAG =
  '<path d="M0 0h512v512H0z"/><path fill="#fff" d="M10 10h10v10H10z"/><path fill="#000" d="M20 20h5v5H20z"/>'

describe('cleanIconFragment (visual polish Fix #0)', () => {
  it('strips the black background square', () => {
    expect(cleanIconFragment(FRAG)).not.toContain('M0 0h512v512H0z')
  })

  it('strips the baked white fill so currentColor applies', () => {
    expect(cleanIconFragment(FRAG)).not.toContain('fill="#fff"')
  })

  it('keeps other fills and path data intact', () => {
    const out = cleanIconFragment(FRAG)
    expect(out).toContain('fill="#000"')
    expect(out).toContain('M10 10h10v10H10z')
  })

  it.each([
    ['warrior', warriorFrag],
    ['wizard', wizardFrag],
    ['monsters', monstersFrag],
    ['altar', altarFrag],
    ['box', boxFrag],
  ])('cleans the real %s fragment: no white fill, no background square', (_name, frag) => {
    const out = cleanIconFragment(frag)
    expect(out).not.toContain('fill="#fff"')
    expect(out).not.toContain('M0 0h512v512H0z')
    expect(out).toContain('<path')
  })
})
