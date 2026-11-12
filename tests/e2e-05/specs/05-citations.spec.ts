import { test, expect } from '@playwright/test'
import { trackErrors, assertNoErrors, assertNoCitationsVisible, bootstrap, SHOTS } from './helpers'

test('character sheet and other screens show no rulebook citations', async ({ page }) => {
  const errors = trackErrors(page)
  // Barbarian on purpose: its class abilities carry citations in the raw
  // data (Rage, illiteracy), so this sheet only passes because
  // CharacterSheet strips them at render time.
  await bootstrap(page, 'Citation Probe', ['Barbarian', 'Cleric', 'Rogue', 'Wizard'])
  await page.getByRole('button', { name: /Barbarian, Barbarian, level 1/ }).click()
  await expect(page).toHaveURL(/\/party\//)
  await expect(page.getByText('Class abilities')).toBeVisible()
  await expect(page.getByText(/Rage: 1 \+ floor\(L\/2\) rage attacks per adventure/)).toBeVisible()
  await assertNoCitationsVisible(page)
  await page.screenshot({ path: `${SHOTS}/4ad-05-character-sheet.png`, fullPage: true })
  // The other screens a player reads also stay citation-free.
  await page.goto('settings')
  await assertNoCitationsVisible(page)
  await page.goto('inventory')
  await assertNoCitationsVisible(page)
  await page.goto('journal')
  await assertNoCitationsVisible(page)
  assertNoErrors(errors)
})
