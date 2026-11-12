import { describe, expect, it } from 'vitest'
import { cleanIconFragment } from '../../src/features/common/iconUtils'
import warriorFrag from '../../src/assets/icons/warrior.svg.frag?raw'
import wizardFrag from '../../src/assets/icons/wizard.svg.frag?raw'
import monstersFrag from '../../src/assets/icons/monsters.svg.frag?raw'
import altarFrag from '../../src/assets/icons/altar.svg.frag?raw'
import boxFrag from '../../src/assets/icons/box.svg.frag?raw'
import clericFrag from '../../src/assets/icons/cleric.svg.frag?raw'
import halflingFrag from '../../src/assets/icons/halfling.svg.frag?raw'
import verminFrag from '../../src/assets/icons/vermin.svg.frag?raw'
import undeadFrag from '../../src/assets/icons/undead.svg.frag?raw'
import demonFrag from '../../src/assets/icons/demon.svg.frag?raw'
import beastFrag from '../../src/assets/icons/beast.svg.frag?raw'
import constructFrag from '../../src/assets/icons/construct.svg.frag?raw'
import skullFrag from '../../src/assets/icons/skull.svg.frag?raw'
// Milestone 3 (C3): feature & treasure icons + consumable/equipment icons
import fountainFrag from '../../src/assets/icons/fountain.svg.frag?raw'
import secretDoorFrag from '../../src/assets/icons/secret-door.svg.frag?raw'
import templeFrag from '../../src/assets/icons/temple.svg.frag?raw'
import statueFrag from '../../src/assets/icons/statue.svg.frag?raw'
import chestFrag from '../../src/assets/icons/chest.svg.frag?raw'
import stairsFrag from '../../src/assets/icons/stairs.svg.frag?raw'
import potionFrag from '../../src/assets/icons/potion.svg.frag?raw'
import bandageFrag from '../../src/assets/icons/bandage.svg.frag?raw'
import scrollFrag from '../../src/assets/icons/scroll.svg.frag?raw'
import nailsFrag from '../../src/assets/icons/nails.svg.frag?raw'
import ropeFrag from '../../src/assets/icons/rope.svg.frag?raw'
import lanternFrag from '../../src/assets/icons/lantern.svg.frag?raw'
import rationsFrag from '../../src/assets/icons/rations.svg.frag?raw'
import lightArmorFrag from '../../src/assets/icons/light-armor.svg.frag?raw'
import heavyArmorFrag from '../../src/assets/icons/heavy-armor.svg.frag?raw'
import shieldFrag from '../../src/assets/icons/shield.svg.frag?raw'
import handWeaponFrag from '../../src/assets/icons/hand-weapon.svg.frag?raw'
import lightWeaponFrag from '../../src/assets/icons/light-weapon.svg.frag?raw'
import bowFrag from '../../src/assets/icons/bow.svg.frag?raw'
import lockpicksFrag from '../../src/assets/icons/lockpicks.svg.frag?raw'

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
    // art-direction milestone (C1/C2): replaced portraits + new family icons
    ['cleric', clericFrag],
    ['halfling', halflingFrag],
    ['vermin', verminFrag],
    ['undead', undeadFrag],
    ['demon', demonFrag],
    ['beast', beastFrag],
    ['construct', constructFrag],
    // skull recentered in its frag (C2): glyph was at canvas (128,128)
    ['skull', skullFrag],
    // Milestone 3 (C3): feature & treasure icons + consumable/equipment icons
    ['fountain', fountainFrag],
    ['secret-door', secretDoorFrag],
    ['temple', templeFrag],
    ['statue', statueFrag],
    ['chest', chestFrag],
    ['stairs', stairsFrag],
    ['potion', potionFrag],
    ['bandage', bandageFrag],
    ['scroll', scrollFrag],
    ['nails', nailsFrag],
    ['rope', ropeFrag],
    ['lantern', lanternFrag],
    ['rations', rationsFrag],
    ['light-armor', lightArmorFrag],
    ['heavy-armor', heavyArmorFrag],
    ['shield', shieldFrag],
    ['hand-weapon', handWeaponFrag],
    ['light-weapon', lightWeaponFrag],
    ['bow', bowFrag],
    ['lockpicks', lockpicksFrag],
  ])('cleans the real %s fragment: no white fill, no background square', (_name, frag) => {
    const out = cleanIconFragment(frag)
    expect(out).not.toContain('fill="#fff"')
    expect(out).not.toContain('M0 0h512v512H0z')
    expect(out).toContain('<path')
  })
})
