import { test, expect } from '@playwright/test'
import { trackErrors, assertNoErrors, bootstrap, importFixture, engage, victoryStamp, attackUntilWon, SHOTS } from './helpers'

test('light/darkness: dark without a light, lit with a torch (R093/R094)', async ({ page }) => {
  const errors = trackErrors(page)
  await bootstrap(page, 'Probe Dark')
  await importFixture(page, 'dark', 'Dark Fixture')
  await expect(page.getByText(/Darkness — −2 Attack\/Defense\/Saves, no ranged weapons, no Search/)).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/4ad-05-light-darkness.png` })
  // In combat the darkness note shows too.
  await engage(page)
  await expect(page.getByText(/Darkness — −2 Attack\/Defense, no ranged weapons/)).toBeVisible()
  // A lit torch removes it.
  await importFixture(page, 'torch', 'Torch Fixture')
  await expect(page.getByText(/Lit by torch — 6 rooms left/)).toBeVisible()
  assertNoErrors(errors)
})

test('XP award on a scroll-kill; the gate holds until the roll is assigned (A6)', async ({ page }) => {
  const errors = trackErrors(page)
  await bootstrap(page, 'Probe Scroll')
  await importFixture(page, 'scroll', 'Scroll Fixture')
  await engage(page)
  // Opening choice: wait — Skeletons always fight, so this reaches pcTurn.
  await page.getByRole('button', { name: 'Wait for Reactions' }).click()
  await expect(page.getByRole('button', { name: 'Fen: scroll fireball' })).toBeVisible()
  await page.getByRole('button', { name: 'Fen: scroll fireball' }).click()
  await expect(victoryStamp(page)).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('Spoils of victory')).toBeVisible()
  const back = page.getByRole('button', { name: 'Back to the room' })
  await expect(back).toBeDisabled()
  await page.screenshot({ path: `${SHOTS}/4ad-05-xp-scroll-kill.png` })
  // Assign the roll, then the exit opens.
  await page.getByRole('button', { name: /Anya \(L3\)/ }).first().click()
  await expect(back).toBeEnabled()
  await back.click()
  await expect(page.locator('[role="status"].victory-stamp')).toHaveCount(0)
  assertNoErrors(errors)
})

test('XP award on a reaction-flee victory (A6)', async ({ page }) => {
  const errors = trackErrors(page)
  await bootstrap(page, 'Probe React')
  await importFixture(page, 'dark', 'Dark Fixture')
  // Rats flee on 1-3: engage and wait; if they fight, flee and re-engage.
  // (A re-engage can land in pcTurn on surprise — then flee instead.)
  let won = false
  for (let attempt = 0; attempt < 8 && !won; attempt++) {
    await engage(page)
    await page.waitForTimeout(500)
    if (await victoryStamp(page).isVisible().catch(() => false)) {
      won = true
      break
    }
    const wait = page.getByRole('button', { name: 'Wait for Reactions' })
    if (await wait.isVisible().catch(() => false)) {
      await wait.click()
      await page.waitForTimeout(600)
      if (await victoryStamp(page).isVisible().catch(() => false)) {
        won = true
        break
      }
    }
    const flee = page.getByRole('button', { name: /^Flee!/ })
    if (await flee.isVisible().catch(() => false)) {
      await flee.click()
      await page.waitForTimeout(600)
    } else if (await victoryStamp(page).isVisible().catch(() => false)) {
      won = true
      break
    } else {
      break // fighting with no flee option — stop rather than spin
    }
  }
  expect(won).toBe(true)
  // 9/10 minor tally + this flee win = the 10th: a roll is due and gated.
  await expect(page.getByText('Spoils of victory')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back to the room' })).toBeDisabled()
  await page.screenshot({ path: `${SHOTS}/4ad-05-xp-reaction-flee.png` })
  await page.getByRole('button', { name: /Anya \(L3\)/ }).first().click()
  await expect(page.getByRole('button', { name: 'Back to the room' })).toBeEnabled()
  assertNoErrors(errors)
})

test('XP systems: picker in Settings; Slow and Sure grants a Level, not a roll (R172)', async ({ page }) => {
  const errors = trackErrors(page)
  await bootstrap(page, 'Probe Slow')
  // Import FIRST: page.goto() is a full reload, and settings are in-memory
  // (like every setting in this app), so the picker must be set after the
  // last reload, then navigation stays inside the SPA.
  await importFixture(page, 'slow', 'Slow Fixture')
  await page.goto('settings')
  const group = page.getByRole('group', { name: 'XP system' })
  await expect(group).toBeVisible()
  await expect(group.getByRole('button', { name: 'Classical' })).toHaveAttribute('aria-pressed', 'true')
  await group.getByRole('button', { name: 'Slow and Sure' }).click()
  await expect(group.getByRole('button', { name: 'Slow and Sure' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/no rolls: 1 Level to one surviving PC per successful adventure/i)).toBeVisible()
  await group.getByRole('button', { name: 'Old School' }).click()
  await expect(page.getByText(/tally XP/i)).toBeVisible()
  await group.getByRole('button', { name: 'Slower Advancement' }).click()
  await expect(page.getByText(/XP stored as points/i)).toBeVisible()
  await group.getByRole('button', { name: 'Slow and Sure' }).click()
  // Stay in the SPA: the bottom nav keeps the in-memory setting alive.
  await page.getByRole('link', { name: 'Explore' }).click()
  await expect(page.getByText(/Darkness|Lit by/)).toBeVisible()
  // Kill the Final Boss: a Level to assign, not a pendingXp roll.
  await engage(page)
  const won = await attackUntilWon(page, 40)
  expect(won).toBe(true)
  await expect(page.getByText(/Slow and Sure: 1 Level to assign/i)).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: /Anya \(L3\)/ }).first().click()
  // Leaving is unblocked once the Level is assigned; the confirmation is
  // in the room log, on the tile panel.
  await expect(page.getByRole('button', { name: 'Back to the room' })).toBeEnabled()
  await page.getByRole('button', { name: 'Back to the room' }).click()
  await expect(page.getByText(/Slow and Sure: Anya gains 1 Level/i)).toBeVisible()
  assertNoErrors(errors)
})
