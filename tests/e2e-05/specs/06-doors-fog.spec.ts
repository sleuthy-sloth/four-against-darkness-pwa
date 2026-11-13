import { test, expect, type Page } from '@playwright/test'
import {
  trackErrors,
  assertNoErrors,
  assertNoCitationsVisible,
  bootstrap,
  importFixture,
  SHOTS,
} from './helpers'

/**
 * Locked doors (R129-R131) and true fog of war, driven against the
 * forced-doors fixture (tests/e2e-05/make-fixtures.test.ts): a four-tile
 * chain where every exit is a door, and the dice are brute-forced so
 * each step lands as asserted. The spec identifies doors by the dialog
 * heading, never by disc position.
 */

const discs = (page: Page) => page.locator('circle.cursor-pointer')
const dialog = (page: Page) => page.locator('div.fixed.inset-0')
const leaveBtn = (page: Page) => page.getByRole('button', { name: 'Leave the door for now' })

/**
 * A disc's fill tells whether it can be a door under test: amber = a door
 * that still needs an action (unexplored extras, or the onward link);
 * torch = an unexplored exit; parchment = already passable (the way back,
 * or a link already opened) — clicking one of those would retrace the
 * party instead of opening a dialog, so the scan skips them.
 */
async function discFill(page: Page, index: number): Promise<string> {
  return (await discs(page).nth(index).getAttribute('class')) ?? ''
}

/**
 * The install sheet shows once after the first delve and can slide up
 * over the map between door dialogs; dismiss it whenever it is showing
 * so it never intercepts the next tap. Dismissal sticks (one auto-show
 * ever), so this is a no-op after the first call.
 */
async function dismissInstallPrompt(page: Page) {
  const notNow = page.getByRole('button', { name: 'Not now' })
  if (await notNow.isVisible().catch(() => false)) {
    await notNow.click()
    await page.waitForTimeout(300)
    return
  }
  const gotIt = page.getByRole('button', { name: 'Got it' })
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click()
    await page.waitForTimeout(300)
  }
}

/** Click disc `index`; return the door-dialog heading, or null if no dialog opened. */
async function doorLabelAt(page: Page, index: number): Promise<string | null> {
  await dismissInstallPrompt(page)
  await discs(page).nth(index).dispatchEvent('pointerup')
  await page.waitForTimeout(500)
  if (await leaveBtn(page).isVisible().catch(() => false)) {
    return (await dialog(page).locator('p.text-torch').first().innerText()).trim()
  }
  return null
}

async function closeDialog(page: Page) {
  await dismissInstallPrompt(page)
  await leaveBtn(page).click()
  await page.waitForTimeout(300)
}

async function expectLog(page: Page, re: RegExp) {
  await expect(page.getByText(re).first()).toBeVisible({ timeout: 10000 })
}

test('locked doors: pick, failed pick then bash, trap disarm, lever, sealed, iron, illusionary', async ({
  page,
}) => {
  const errors = trackErrors(page)
  await bootstrap(page, 'Probe Doors')
  await importFixture(page, 'doors', 'Doors & Fog Fixture')

  // --- t2: locked L2 (link), locked L7 (fail pick, then bash) ---
  const t2count = await discs(page).count()
  expect(t2count).toBe(3)
  let linkIdx = -1
  // Screenshot the first door dialog before acting on it.
  let shotTaken = false
  for (let i = 0; i < t2count; i++) {
    if ((await discFill(page, i)).includes('fill-parchment/50')) continue
    const label = await doorLabelAt(page, i)
    if (label === null) continue
    if (!shotTaken) {
      await page.screenshot({ path: `${SHOTS}/4ad-06-door-dialog.png` })
      shotTaken = true
    }
    if (label === 'Locked door (L2)') {
      linkIdx = i
      await page.getByRole('button', { name: /Joss picks/ }).click()
      await expectLog(page, /picks the lock/)
    } else if (label === 'Locked door (L7)') {
      await page.getByRole('button', { name: /Joss picks/ }).click()
      await expectLog(page, /fails to pick the lock/)
      // Failed pick means bashing now; repeatable, so loop until it falls.
      for (let attempt = 0; attempt < 12; attempt++) {
        if (!(await leaveBtn(page).isVisible().catch(() => false))) break
        await page.getByRole('button', { name: /Torsten bashes/ }).click()
        await page.waitForTimeout(500)
      }
      await expectLog(page, /bashes the door down/)
    } else {
      // Way back (trapped L9): not under test on this tile.
      await closeDialog(page)
    }
  }
  expect(linkIdx).toBeGreaterThanOrEqual(0)
  await assertNoCitationsVisible(page)
  await page.screenshot({ path: `${SHOTS}/4ad-06-doors-t2.png` })

  // Travel t2 -> t3 through the picked-open link.
  await discs(page).nth(linkIdx).dispatchEvent('pointerup')
  await page.waitForTimeout(800)

  // --- t3: trapped L2 (link, disarm), lever (1 Clue) ---
  const t3count = await discs(page).count()
  expect(t3count).toBe(3)
  linkIdx = -1
  for (let i = 0; i < t3count; i++) {
    if ((await discFill(page, i)).includes('fill-parchment/50')) continue
    const label = await doorLabelAt(page, i)
    if (label === null) continue
    if (label === 'Trapped door (trap L2)') {
      linkIdx = i
      await page.getByRole('button', { name: /Joss disarms/ }).click()
      await expectLog(page, /disarms the trap/)
    } else if (label === 'Lever door') {
      await page.getByRole('button', { name: /Spend 1 Clue/ }).click()
      await expectLog(page, /lever clicks/)
    } else {
      await closeDialog(page)
    }
  }
  expect(linkIdx).toBeGreaterThanOrEqual(0)
  await discs(page).nth(linkIdx).dispatchEvent('pointerup')
  await page.waitForTimeout(800)

  // --- t4: sealed L2 (link, spellcaster roll), iron (Lightning) ---
  const t4count = await discs(page).count()
  expect(t4count).toBe(3)
  linkIdx = -1
  for (let i = 0; i < t4count; i++) {
    if ((await discFill(page, i)).includes('fill-parchment/50')) continue
    const label = await doorLabelAt(page, i)
    if (label === null) continue
    if (label === 'Magically sealed door (L2)') {
      linkIdx = i
      await page.getByRole('button', { name: /Fen rolls/ }).click()
      await expectLog(page, /breaks the seal/)
    } else if (label === 'Iron door (L3)') {
      await page.getByRole('button', { name: /Fen casts lightning/ }).click()
      await expectLog(page, /destroyed outright/)
    } else {
      await closeDialog(page)
    }
  }
  expect(linkIdx).toBeGreaterThanOrEqual(0)
  await discs(page).nth(linkIdx).dispatchEvent('pointerup')
  await page.waitForTimeout(800)

  // --- t5: illusionary (3 Clues) ---
  const t5count = await discs(page).count()
  expect(t5count).toBe(2)
  for (let i = 0; i < t5count; i++) {
    if ((await discFill(page, i)).includes('fill-parchment/50')) continue
    const label = await doorLabelAt(page, i)
    if (label === null) continue
    if (label === 'Illusionary door') {
      await page.getByRole('button', { name: /Spend 3 Clues/ }).click()
      await expectLog(page, /dissolves/)
    } else {
      await closeDialog(page)
    }
  }
  await page.screenshot({ path: `${SHOTS}/4ad-06-doors-done.png` })
  await assertNoCitationsVisible(page)
  assertNoErrors(errors)
})

test('fog of war: secret-door tile hidden until entered, peek reveals it', async ({ page }) => {
  const errors = trackErrors(page)
  await bootstrap(page, 'Probe Fog')
  await importFixture(page, 'search', 'Search Find Fixture')

  // Unexplored tiles render as solid dark recesses (fill #0f0c09, no
  // pattern). The tile-fog-lift overlay (Stream 3 animation) shares the
  // fill, so exclude it — it is a transient veil on the current tile,
  // not an unexplored cell.
  const darkCells = () => page.locator('svg rect[fill="#0f0c09"]:not(.tile-fog-lift)')
  await dismissInstallPrompt(page)
  await expect(page.getByRole('button', { name: 'Search this tile' })).toBeVisible()
  await page.getByRole('button', { name: 'Search this tile' }).click()
  await expect(page.getByRole('button', { name: 'Secret door' })).toBeVisible()
  await page.getByRole('button', { name: 'Secret door' }).click()
  await expectLog(page, /A secret door! Peek before you enter/)
  // The generation must not leak the new tile's contents into the log.
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toMatch(/Encounter:/)
  // The tile beyond is placed but unexplored: dark cells, no contents.
  await expect(darkCells()).not.toHaveCount(0)
  await page.screenshot({ path: `${SHOTS}/4ad-06-fog-hidden.png` })

  // Peek: the contents are told in the log and shown on the map, but the
  // tile stays unexplored until entered.
  await dismissInstallPrompt(page)
  await page.getByRole('button', { name: 'Peek' }).click()
  await expectLog(page, /Peek through the secret door:/)
  await expect(darkCells()).toHaveCount(0)
  await page.screenshot({ path: `${SHOTS}/4ad-06-fog-peeked.png` })

  // Enter: the tile is explored now; a normal explore from it shows its
  // contents immediately (no dark cells anywhere).
  await dismissInstallPrompt(page)
  await page.getByRole('button', { name: /Enter \(Foes surprised\)/ }).click()
  await expectLog(page, /slips through the secret door/)
  await expect(darkCells()).toHaveCount(0)
  await page.screenshot({ path: `${SHOTS}/4ad-06-fog-entered.png` })
  let exploredNew = false
  const count = await discs(page).count()
  for (let i = 0; i < count && !exploredNew; i++) {
    await dismissInstallPrompt(page)
    await discs(page).nth(i).dispatchEvent('pointerup')
    await page.waitForTimeout(700)
    if (await leaveBtn(page).isVisible().catch(() => false)) {
      await closeDialog(page)
      continue
    }
    const text = await page.locator('body').innerText()
    if (/Rolled d66/.test(text) || /Engage!/.test(text)) exploredNew = true
  }
  expect(exploredNew).toBe(true)
  await expect(darkCells()).toHaveCount(0)
  await assertNoCitationsVisible(page)
  assertNoErrors(errors)
})
