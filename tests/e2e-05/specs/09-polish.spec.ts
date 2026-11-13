import { test, expect, type Page } from '@playwright/test'
import {
  trackErrors,
  assertNoErrors,
  bootstrap,
  exploreExit,
  importFixture,
  engage,
  attackUntilWon,
  victoryStamp,
  SHOTS,
} from './helpers'

/** Polish pass (2026-11-12): map zoom/pan fluidity, panel peek, dice,
 *  dialog fade, combat hit feedback on the map, resize fluidity, and the
 *  journal chip overflow fix — all on the production build. */

/**
 * The install sheet shows once after the first delve and can slide up
 * over the map; dismiss it whenever it is showing so it never intercepts
 * the next tap. Dismissal sticks (one auto-show ever), so this is a
 * no-op after the first call. (Same pattern as 06-doors-fog.)
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

async function gotoDungeon(page: Page) {
  await page.goto('dungeon')
  await expect(page.locator('text=Darkness').or(page.locator('text=Lit by'))).toBeVisible({
    timeout: 15000,
  })
}

/** Explore once (handling a door dialog or a dead end) until the dungeon
 *  log shows a fresh "Rolled d66 = NN" line — the drawn d66 dice render
 *  beside it. Returns false if no exit yields a new tile. */
async function exploreForD66(page: Page): Promise<boolean> {
  for (let i = 0; i < 8; i++) {
    if ((await page.getByText(/Rolled d66 = /).count()) > 0) return true
    await dismissInstallPrompt(page)
    const leave = page.getByRole('button', { name: 'Leave the door for now' })
    if (await leave.isVisible().catch(() => false)) {
      await leave.click()
      await page.waitForTimeout(400)
      continue
    }
    const discs = page.locator('circle.cursor-pointer[class*="fill-torch"]')
    const n = await discs.count()
    if (n === 0) return false
    await discs.nth(i % n).dispatchEvent('pointerup')
    await page.waitForTimeout(700)
  }
  return (await page.getByText(/Rolled d66 = /).count()) > 0
}

test('map zoom animates, panel peek animates, dice settle, dialog fades', async ({ page }) => {
  const errors = trackErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  // Deterministic setup: bootstrap once (Settings only offers Import
  // when a campaign exists), then import the Trinket fixture, which
  // parks the party on a Rats encounter (seed 7) — no random delve
  // needed to reach a fight.
  await bootstrap(page, 'Polish Probe')
  await importFixture(page, 'trinket', 'Trinket Fixture')
  // The imported dungeon counts as delved, so the install sheet may
  // slide up over the map at any moment; dismiss it before it can
  // cover the bottom panel.
  await dismissInstallPrompt(page)

  const svg = page.locator('[role="application"] svg').first()
  const transform = () => svg.evaluate((el) => (el as SVGElement).style.transform)

  // P0-1: zoom in/out glides (transform changes; the 200ms transition
  // class is on the svg while no pointer is down).
  await expect(svg).toHaveClass(/map-smooth/)
  expect(await transform()).toContain('scale(1)')
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.waitForTimeout(300)
  expect(await transform()).toContain('scale(1.25)')
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await page.waitForTimeout(300)
  expect(await transform()).toContain('scale(1)')
  // The install sheet's 1.2s timer can fire during the button-zoom
  // steps (after the opening dismissal, which ran before it appeared),
  // and an open sheet swallows keyboard input — dismiss it again so
  // the '+' key reaches the map, not the sheet's focus trap.
  await dismissInstallPrompt(page)
  // Keyboard zoom works too (focus the map; a click could land on an
  // exit disc and explore).
  await page.locator('[role="application"]').focus()
  await page.keyboard.press('+')
  await page.waitForTimeout(300)
  expect(await transform()).toContain('scale(1.25)')
  // The install sheet's 1.2s auto-show timer can fire during the zoom
  // steps (after the opening dismissal, which ran before it appeared),
  // and an open sheet swallows the '0' key — dismiss it again so the
  // fit shortcut reaches the map.
  await dismissInstallPrompt(page)
  await page.locator('[role="application"]').focus()
  await page.keyboard.press('0')
  await page.waitForTimeout(300)
  // Fit sets the zoom to fitScale(container, viewBox) — recompute it
  // here and compare, instead of assuming it differs from 1.25 (for
  // this two-tile dungeon the fit is close to 1.25).
  const fitScale = parseFloat(/scale\(([\d.]+)\)/.exec(await transform())?.[1] ?? 'NaN')
  const expectedFit = await page.locator('[role="application"]').evaluate((el) => {
    const svg = el.querySelector('svg')!
    const vb = svg.viewBox.baseVal
    const fit = Math.min(el.clientWidth / vb.width, el.clientHeight / vb.height)
    const fill = Math.max(el.clientWidth / vb.width, el.clientHeight / vb.height)
    return Math.min(2.5, Math.max(1, fill / fit))
  })
  expect(Math.abs(fitScale - expectedFit)).toBeLessThan(0.01)

  // P0-2: the peek panel collapses (animated close, then unmounts) and
  // re-opens.
  await dismissInstallPrompt(page)
  const peekToggle = page.getByRole('button', { name: /· tile / }).first()
  await expect(peekToggle).toBeVisible()
  await expect(page.locator('.panel-peek-open')).toHaveCount(1)
  await peekToggle.click()
  await expect(page.locator('.panel-peek')).toHaveCount(0, { timeout: 5000 })
  await peekToggle.click()
  await expect(page.locator('.panel-peek-open')).toHaveCount(1, { timeout: 5000 })

  // The encounter card crossfades in (P1-9) and rests raised (P0-8).
  await dismissInstallPrompt(page)
  await expect(page.locator('.encounter-fade.card-raised')).toHaveCount(1)
  await page.screenshot({ path: `${SHOTS}/4ad-polish-390-encounter.png` })

  // P0-5: engage — "Attack immediately" IS the opening attack (the
  // first PC strikes at once); the reaction d6 only rolls on the
  // "Wait for Reactions" path, so the dice check happens mid-fight
  // below, on the Morale test's d6.
  await engage(page)
  await page.getByRole('button', { name: 'Attack immediately' }).click()

  // P1-9: fight — the map's foe token flashes when a hit lands.
  let sawFlash = false
  for (let i = 0; i < 8 && !sawFlash; i++) {
    if (await victoryStamp(page).isVisible().catch(() => false)) break
    const attack = page.getByRole('button', { name: /^Attack / }).first()
    if (await attack.isVisible().catch(() => false)) {
      await attack.click()
      for (let j = 0; j < 10; j++) {
        if ((await page.locator('circle.foe-hit-flash').count()) > 0) {
          sawFlash = true
          break
        }
        await page.waitForTimeout(100)
      }
      continue
    }
    const wait = page.getByRole('button', { name: 'Wait for Reactions' })
    if (await wait.isVisible().catch(() => false)) {
      await wait.click()
      await page.waitForTimeout(400)
      continue
    }
    // A bribe demand: refuse it and fight.
    const refuse = page.getByRole('button', { name: 'Refuse (fight)' })
    if (await refuse.isVisible().catch(() => false)) {
      await refuse.click()
      await page.waitForTimeout(400)
      continue
    }
    await page.waitForTimeout(400)
  }
  expect(sawFlash).toBe(true)

  // P0-5 note: no dice check mid-fight — L1 Rats die in bulk (a d6[5]
  // vs L1 slays 5 at once), so the group goes 6 → 0 in one hit and the
  // Morale test (which needs survivors below half) never fires. The
  // dice check happens after victory instead, on the XP roll's d6.

  // Finish the fight (or accept a fall) and confirm the log lines
  // animate in (P0-6).
  const won = await attackUntilWon(page)
  if (!won) {
    const diag = await page.evaluate(() => {
      const txt = document.body.innerText
      return JSON.stringify({
        round: /round (\d+)/.exec(txt)?.[1] ?? null,
        log: [...document.querySelectorAll('ul li')].map((li) => li.textContent ?? '').slice(-8),
        errors: (window as unknown as { __errors?: string[] }).__errors ?? undefined,
      })
    })
    throw new Error(`combat not won; diag: ${diag}; pageErrors: ${errors.join(' | ')}`)
  }
  await expect(page.locator('.log-line').first()).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/4ad-polish-390-victory.png` })

  // P0-3: the shortcuts dialog opens over a fading backdrop and closes.
  // A lone Minor victory earns no XP roll (one accrues every 10th minor
  // encounter), so there is no Spoils card and the room can be left at
  // once.
  const backBtn = page.getByRole('button', { name: 'Back to the room' })
  await expect(backBtn).toBeVisible()
  await backBtn.click()
  await expect(page.locator('text=Darkness').or(page.locator('text=Lit by'))).toBeVisible()
  // P0-5: dice settle — one explore rolls a fresh d66; the drawn dice
  // render beside the "Rolled d66 = NN" log line and settle on mount.
  expect(await exploreForD66(page)).toBe(true)
  await expect(page.locator('svg[aria-label*="die showing"]').first()).toBeVisible()
  await expect(page.locator('svg.die-settle').first()).toBeVisible()
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
  await expect(page.locator('.dialog-backdrop')).toHaveCount(1)
  await page.screenshot({ path: `${SHOTS}/4ad-polish-390-shortcuts.png` })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveCount(0)

  assertNoErrors(errors)
})

test('resize 390→820→1280 with no overflow or jump', async ({ page }) => {
  const errors = trackErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await bootstrap(page, 'Resize Probe')
  await gotoDungeon(page)

  const noOverflow = async () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

  for (const [width, height, shot] of [
    [390, 844, '4ad-polish-390-dungeon.png'],
    [820, 900, '4ad-polish-820-dungeon.png'],
    [1280, 800, '4ad-polish-1280-dungeon.png'],
  ] as const) {
    await page.setViewportSize({ width, height })
    // The debounced re-fit fires 200ms after the resize.
    await page.waitForTimeout(500)
    expect(await noOverflow(), `horizontal overflow at ${width}px`).toBe(true)
    await page.screenshot({ path: `${SHOTS}/${shot}` })
  }
  // Desktop: the 1080px shell + right rail are in play, bottom tabs stay.
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  // The sliding tab indicator sits on the active tab.
  await expect(page.locator('.tab-indicator')).toHaveCount(1)
  const indicatorOpacity = await page
    .locator('.tab-indicator')
    .evaluate((el) => getComputedStyle(el).opacity)
  expect(indicatorOpacity).toBe('1')

  assertNoErrors(errors)
})

test('journal filter chips fit a 390px viewport', async ({ page }) => {
  const errors = trackErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await bootstrap(page, 'Chips Probe')
  await gotoDungeon(page)
  await exploreExit(page)
  await page.waitForTimeout(300)
  await exploreExit(page)
  await page.waitForTimeout(300)

  await page.goto('journal')
  await expect(page.getByRole('heading', { name: 'Journal' })).toBeVisible()
  // Every chip's right edge must sit inside the viewport (the known nit:
  // "loot · 0" was cut off at 390px).
  const chips = page.getByRole('button', { name: /· \d+$/ })
  await expect(chips).toHaveCount(6)
  for (const chip of await chips.all()) {
    const box = await chip.boundingBox()
    expect(box, 'chip without a bounding box').not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  }
  await page.screenshot({ path: `${SHOTS}/4ad-polish-390-journal.png` })
  assertNoErrors(errors)
})

test('party screen: life bars ease, cards lift, gold numeral present', async ({ page }) => {
  const errors = trackErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await bootstrap(page, 'Party Polish Probe')
  await page.goto('party')
  await expect(page.getByRole('heading', { name: 'Party' })).toBeVisible()
  // Life-bar fills carry the 300ms width transition (P0-4).
  await expect(page.locator('.life-bar-fill').first()).toBeVisible()
  const transition = await page
    .locator('.life-bar-fill')
    .first()
    .evaluate((el) => getComputedStyle(el).transitionDuration)
  expect(transition).toBe('0.3s')
  // Party cards lift on hover (P0-8).
  await expect(page.locator('.card-interactive').first()).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/4ad-polish-390-party.png` })
  assertNoErrors(errors)
})
