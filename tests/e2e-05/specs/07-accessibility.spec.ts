import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { trackErrors, assertNoErrors, bootstrap, importFixture, SHOTS } from './helpers'

/**
 * Accessibility (Phase G): axe-core clean on the dashboard and all five
 * tabs, plus the door dialog (the densest sheet in the app). A violation
 * fails the spec — the message names the rule and the offending nodes.
 */

async function expectAxeClean(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).analyze()
  const summary = results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => n.target.join(' ')),
  }))
  expect(summary, `${label} axe violations`).toEqual([])
}

/** Dismiss the install sheet by keyboard if it slid up (it shows once
 * after the first delve; the focus trap already put focus on its button). */
async function dismissInstallKeyboard(page: Page) {
  const sheet = page.getByRole('dialog', { name: 'Install Four Against Darkness' })
  if (await sheet.isVisible().catch(() => false)) {
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
  }
}

test('axe clean: dashboard and all five tabs', async ({ page }) => {
  const errors = trackErrors(page)
  await bootstrap(page, 'Probe A11y')

  await page.goto('campaign')
  await expect(page.getByRole('button', { name: 'New campaign' }).first()).toBeVisible()
  await expectAxeClean(page, 'campaign dashboard')

  await page.goto('dungeon')
  // The entrance may be dark (no Search without light), so wait on the
  // log line instead of the Search button.
  await expect(page.getByText('The party enters the dungeon.')).toBeVisible({ timeout: 15000 })
  await expectAxeClean(page, 'dungeon tab')

  await page.goto('party')
  await expect(page.getByRole('heading', { name: 'Party' })).toBeVisible({ timeout: 15000 })
  await expectAxeClean(page, 'party tab')

  await page.goto('journal')
  await expect(page.getByRole('heading', { name: 'Journal' })).toBeVisible()
  await expectAxeClean(page, 'journal tab')

  await page.goto('inventory')
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
  await expectAxeClean(page, 'inventory tab')

  await page.goto('settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expectAxeClean(page, 'settings tab')

  assertNoErrors(errors)
})

test('axe clean: locked-door dialog, opened by keyboard', async ({ page }) => {
  const errors = trackErrors(page)
  await bootstrap(page, 'Probe Doors A11y')
  await importFixture(page, 'doors', 'Doors & Fog Fixture')
  await page.waitForTimeout(1500)
  await dismissInstallKeyboard(page)

  // Find a door that still needs an action (amber disc) by fill, then
  // reach it by keyboard: Tab lands on the first disc, arrows cycle.
  const discs = page.locator('circle.cursor-pointer')
  const count = await discs.count()
  expect(count).toBeGreaterThan(0)
  let doorIdx = -1
  for (let i = 0; i < count; i++) {
    const cls = (await discs.nth(i).getAttribute('class')) ?? ''
    if (cls.includes('fill-amber-500/80')) {
      doorIdx = i
      break
    }
  }
  expect(doorIdx).toBeGreaterThanOrEqual(0)

  // Tab to the first exit disc, then arrow across to the door disc.
  for (let i = 0; i < 40; i++) {
    const focused = await page.evaluate(() => {
      const el = document.activeElement as Element | null
      return el?.getAttribute?.('role') === 'button' && !!el.getAttribute('data-exit-id')
    })
    if (focused) break
    await page.keyboard.press('Tab')
    await page.waitForTimeout(50)
  }
  for (let i = 0; i < doorIdx; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
  }
  // Regression (Phase G): the roving index runs over ALL rendered discs,
  // so arrowing must land on the intended disc — not the first one. The
  // handler once indexed openExits (unexplored only), which put arrows in
  // a different index space than the render and never moved focus.
  const targetId = await discs.nth(doorIdx).getAttribute('data-exit-id')
  const focusedId = await page.evaluate(
    () => (document.activeElement as Element | null)?.getAttribute('data-exit-id'),
  )
  expect(focusedId).toBe(targetId)
  // The focused disc is the door: its ring is drawn, and Enter opens it.
  await page.screenshot({ path: `${SHOTS}/4ad-07-focus-ring.png` })
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Leave the door for now' })).toBeVisible({
    timeout: 10000,
  })
  await expectAxeClean(page, 'door dialog')

  // Escape closes the dialog and returns focus to the map.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Leave the door for now' })).toBeHidden()
  assertNoErrors(errors)
})
