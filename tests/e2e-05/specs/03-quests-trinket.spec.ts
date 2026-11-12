import { test, expect } from '@playwright/test'
import { trackErrors, assertNoErrors, bootstrap, importFixture, engage, victoryStamp, attackUntilWon, SHOTS } from './helpers'

test('quest 3: Sleep, then subdue the Orc Brute alive, bind it, claim it (R155/R089)', async ({ page }) => {
  const errors = trackErrors(page)
  await bootstrap(page, 'Probe Quest3')
  await importFixture(page, 'quest3', 'Quest 3 Fixture')
  await expect(page.getByText(/Quest 3: I want it alive/)).toBeVisible()
  await expect(page.getByText(/subdue it alive/)).toBeVisible()
  await engage(page)
  // Opening choice: attack immediately to reach the party's turn.
  await page.getByRole('button', { name: 'Attack immediately' }).click()
  await page.waitForTimeout(600)
  // Fen casts Sleep — the Brute falls asleep and is subdued, not slain.
  await expect(page.getByRole('button', { name: 'Fen: sleep' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Fen: sleep' }).first().click()
  await expect(page.getByText(/falls asleep — subdued, not slain/i)).toBeVisible({ timeout: 10000 })
  // Subdue button: −1 attacks until the sleeper is bound at 0 Life.
  const subdue = page.getByRole('button', { name: /Subdue Orc Brute alive/ })
  await expect(subdue).toBeVisible()
  for (let i = 0; i < 12; i++) {
    if (await victoryStamp(page).isVisible().catch(() => false)) break
    if (await subdue.isVisible().catch(() => false)) {
      await subdue.click()
      await page.waitForTimeout(500)
    } else {
      await page.waitForTimeout(500)
    }
  }
  await expect(victoryStamp(page)).toBeVisible({ timeout: 10000 })
  await page.screenshot({ path: `${SHOTS}/4ad-05-quest-3.png` })
  // Assign the XP roll from the victory, then leave combat: the quest line
  // on the room panel now shows the captive as subdued.
  const xpButton = page.getByRole('button', { name: /Torsten \(L5\)/ }).first()
  if (await xpButton.isVisible().catch(() => false)) await xpButton.click()
  await page.getByRole('button', { name: 'Back to the room' }).click()
  await expect(page.getByText(/captive subdued \(bind with a rope to deliver\)/)).toBeVisible()
  // Claim at the giver's tile (the entrance — where the quest was given).
  await expect(page.getByRole('button', { name: 'Claim Quest reward' })).toBeVisible()
  await page.getByRole('button', { name: 'Claim Quest reward' }).click()
  await expect(page.getByText(/Quest complete! Choose the PC who gains 1 XP/)).toBeVisible()
  await page.getByRole('button', { name: 'Anya', exact: true }).click()
  await expect(page.getByText(/Quest XP roll for Anya/)).toBeVisible()
  assertNoErrors(errors)
})

test('quest 4: deliver the retrieved item unused (R155)', async ({ page }) => {
  const errors = trackErrors(page)
  await bootstrap(page, 'Probe Quest4')
  await importFixture(page, 'quest4', 'Quest 4 Fixture')
  await expect(page.getByText(/Quest 4: Bring me that/)).toBeVisible()
  await expect(page.getByText(/fetch silvered dagger \(found — deliver it unused\)/)).toBeVisible()
  await page.getByRole('button', { name: 'Claim Quest reward' }).click()
  await expect(page.getByText(/Quest complete! Choose the PC who gains 1 XP/)).toBeVisible()
  await page.getByRole('button', { name: 'Anya', exact: true }).click()
  await expect(page.getByText(/Quest XP roll for Anya/)).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/4ad-05-quest-4.png` })
  assertNoErrors(errors)
})

test('trinket: Wand of Sleep works in play; Ring of Teleportation too (R151)', async ({ page }) => {
  const errors = trackErrors(page)
  await bootstrap(page, 'Probe Trinket')
  await importFixture(page, 'trinket', 'Trinket Fixture')
  await engage(page)
  // Opening choice: attack immediately to reach the party's turn.
  await page.getByRole('button', { name: 'Attack immediately' }).click()
  await page.waitForTimeout(600)
  await expect(page.getByRole('button', { name: 'Fen: Wand of Sleep' })).toBeVisible()
  await page.getByRole('button', { name: 'Fen: Wand of Sleep' }).click()
  await expect(page.getByText(/Rats fall asleep/i)).toBeVisible({ timeout: 10000 })
  await page.screenshot({ path: `${SHOTS}/4ad-05-trinket.png` })
  // Ring: Joss leaves the fight; the rest keep fighting.
  await expect(page.getByRole('button', { name: /Joss: Ring of Teleportation/ })).toBeVisible()
  await page.getByRole('button', { name: /Joss: Ring of Teleportation/ }).click()
  await expect(page.getByText(/twists the Ring of Teleportation and vanishes/i)).toBeVisible()
  assertNoErrors(errors)
})
