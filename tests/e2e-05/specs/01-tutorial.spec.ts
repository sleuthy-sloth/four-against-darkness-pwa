import { test, expect } from '@playwright/test'
import { trackErrors, assertNoErrors, assertNoCitationsVisible, exploreExit, SHOTS } from './helpers'

test('tutorial shows no rulebook citations; class picker uses plain names', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('campaign')
  await expect(page.getByRole('button', { name: 'Learn to play' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Learn to play' }).first().click()
  // Lesson 1 (welcome) on /campaign, then the party lesson.
  const coach = page.locator('[aria-label^="Tutorial, step"]')
  await expect(coach).toBeVisible({ timeout: 15000 })
  await assertNoCitationsVisible(page)
  await page.getByRole('button', { name: 'Begin the delve' }).click()
  await expect(page).toHaveURL(/\/party/)
  // Class picker is not shown here (party is pre-made), but the lesson
  // text must still be citation-free.
  await assertNoCitationsVisible(page)
  await page.getByRole('button', { name: 'Enter the dungeon' }).click()
  await expect(page).toHaveURL(/\/dungeon/)
  await assertNoCitationsVisible(page)

  // Drive the tutorial: tap steps via their primary button, event steps by
  // doing the thing (explore exits, engage, fight, rest, search).
  for (let step = 0; step < 40; step++) {
    await assertNoCitationsVisible(page)
    if (!(await coach.isVisible().catch(() => false))) break
    const label = (await coach.innerText()).replace(/\s+/g, ' ')
    if (/step 12 of 12/.test(label)) {
      // Last lesson: finish it if a primary button is offered.
      const primary = coach.getByRole('button').last()
      if (await primary.isVisible().catch(() => false)) await primary.click()
      break
    }
    const primary = coach.locator('button.btn-wax').first()
    if (await primary.isVisible().catch(() => false)) {
      await primary.click()
      await page.waitForTimeout(600)
      continue
    }
    // Event step: explore, engage, or fight.
    const engage = page.getByRole('button', { name: 'Engage!' })
    if (await engage.isVisible().catch(() => false)) {
      await engage.click()
      await page.waitForTimeout(500)
      continue
    }
    const attack = page.getByRole('button', { name: /^Attack / }).first()
    if (await attack.isVisible().catch(() => false)) {
      await attack.click()
      await page.waitForTimeout(400)
      continue
    }
    const wait = page.getByRole('button', { name: 'Wait for Reactions' })
    if (await wait.isVisible().catch(() => false)) {
      await wait.click()
      await page.waitForTimeout(400)
      continue
    }
    const search = page.getByRole('button', { name: 'Search this tile' })
    if (await search.isVisible().catch(() => false)) {
      await search.click()
      await page.waitForTimeout(400)
      continue
    }
    const rest = page.getByRole('button', { name: /^Rest here/ })
    if (await rest.isVisible().catch(() => false)) {
      await rest.click()
      await page.waitForTimeout(400)
      continue
    }
    const back = page.getByRole('button', { name: 'Back to the room' })
    if (await back.isVisible().catch(() => false)) {
      await back.click()
      await page.waitForTimeout(400)
      continue
    }
    // Otherwise: step through a glowing exit.
    await exploreExit(page)
    await page.waitForTimeout(600)
  }
  await assertNoCitationsVisible(page)
  await page.screenshot({ path: `${SHOTS}/4ad-05-tutorial-no-citations.png` })
  assertNoErrors(errors)
})
