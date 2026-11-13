import { test, expect } from '@playwright/test'
import { trackErrors, assertNoErrors, bootstrap, SHOTS } from './helpers'

/**
 * Polish pass (2026-11-12): under `prefers-reduced-motion: reduce` every
 * animation is an instant state change — zoom jumps, the panel snaps, the
 * dialog appears with no fade — while the app stays fully usable.
 */
test.use({ reducedMotion: 'reduce' })

test('reduced motion: animations are instant, function stays', async ({ page }) => {
  const errors = trackErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await bootstrap(page, 'Reduced Motion Probe')
  await page.goto('dungeon')
  await expect(page.locator('text=Darkness').or(page.locator('text=Lit by'))).toBeVisible({
    timeout: 15000,
  })

  const durationOf = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration)

  // The buttons have no transition under reduced motion (dashboard first,
  // where a wax button is always present).
  await page.goto('campaign')
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
  expect(await durationOf('.btn-wax')).toBe('0s')
  // The tab indicator does not glide.
  expect(await durationOf('.tab-indicator')).toBe('0s')

  await page.goto('dungeon')
  await expect(page.locator('text=Darkness').or(page.locator('text=Lit by'))).toBeVisible({
    timeout: 15000,
  })

  // The map transform has no transition under reduced motion…
  expect(await durationOf('[role="application"] svg')).toBe('0s')

  // …but zoom still works, instantly.
  const svg = page.locator('[role="application"] svg').first()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  expect(await svg.evaluate((el) => (el as SVGElement).style.transform)).toContain('scale(1.25)')

  // The peek panel toggles instantly (mount/unmount, no 200ms close).
  const peekToggle = page.getByRole('button', { name: /· tile / }).first()
  await peekToggle.click()
  await expect(page.locator('.panel-peek')).toHaveCount(0)
  await peekToggle.click()
  await expect(page.locator('.panel-peek-open')).toHaveCount(1)

  // The dialog opens with no backdrop fade.
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
  const backdropAnim = await page
    .locator('.dialog-backdrop')
    .first()
    .evaluate((el) => getComputedStyle(el).animationDuration)
  expect(backdropAnim).toBe('0s')
  await page.keyboard.press('Escape')

  await page.screenshot({ path: `${SHOTS}/4ad-polish-390-reduced-motion.png` })
  assertNoErrors(errors)
})
