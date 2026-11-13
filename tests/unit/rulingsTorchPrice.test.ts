import { describe, expect, it } from 'vitest'
import { ITEM_INFO, SHOP_STOCK } from '../../src/rulesets/expanded/features'

describe('Ruling 11 — torch price (FADEE p.81)', () => {
  it('"Torch 1/dozen" means 1 gp per dozen torches, not 1 gp each', () => {
    expect(ITEM_INFO['torch'].price).toBe(1)
    expect(ITEM_INFO['torch'].unit).toBe('dozen')
    expect(ITEM_INFO['torch'].source).toBe('FADEE p.81')
  })

  it('the torch text states the dozen pricing', () => {
    expect(ITEM_INFO['torch'].text).toMatch(/dozen/i)
    expect(ITEM_INFO['torch'].text).toMatch(/12 torches/)
  })

  it('torches are still sold at the outfitter under the load-bearing "torch" name', () => {
    expect(SHOP_STOCK).toContain('torch')
    // The 'torch' equipment name is load-bearing: the light system, the
    // free-hand rule, and starting gear all key off equipment 'torch'
    // (see src/engine/light.ts), so the entry is NOT renamed to
    // 'dozen torches' — the purchase unit is a dozen at 1 gp instead.
  })

})
