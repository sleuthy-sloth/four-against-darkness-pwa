import { test, expect, type Page } from '@playwright/test'
import { trackErrors, assertNoErrors, assertNoCitationsVisible, SHOTS } from './helpers'

/**
 * Accessibility (Phase G): a full delve played with the keyboard only —
 * no page.click, no dispatchEvent. Tab moves between controls, the map's
 * exit discs are a roving-tabindex group (arrows cycle, Enter explores),
 * dialogs trap focus and close on Escape. The tutorial is state-driven,
 * so the same keyboard actions that change game state satisfy its steps.
 *
 * Focus is driven purely by Tab/arrow/Enter keypresses. The loop first
 * checks (cheaply, by visibility) which action the game is offering,
 * then Tabs to that one control — it never scans the page blindly.
 *
 * Two branches are gated on the coach's current step: Search (step 7)
 * and Rest (step 8). Both buttons stay visible on any cleared tile, so
 * an ungated loop rests during the explore step and never leaves — the
 * button has no disabled state, it just errors on a repeat rest.
 */

async function tabUntil(page: Page, predicate: string, maxTabs = 60): Promise<boolean> {
  // Check after EVERY Tab: batching (check every 5th) skips focus
  // positions and can never land on the target. The per-Tab cost is the
  // price of a real keyboard path.
  for (let i = 0; i < maxTabs; i++) {
    if (await page.evaluate(predicate)) return true
    await page.keyboard.press('Tab')
  }
  return page.evaluate(predicate)
}

async function pressEnter(page: Page) {
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
}

async function visible(page: Page, locator: ReturnType<Page['locator']>): Promise<boolean> {
  return locator.isVisible().catch(() => false)
}

const IN_COACH_WAX =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && el.classList.contains("btn-wax") && !!el.closest("[aria-label^=\\"Tutorial, step\\"]") })()'
const IS_ENGAGE =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && /Engage!/.test(el.textContent || "") })()'
const IS_ATTACK =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && /^Attack /.test(el.textContent || "") })()'
const IS_WAIT =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && /Wait for Reactions/.test(el.textContent || "") })()'
const IS_SEARCH =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && /Search this tile/.test(el.textContent || "") })()'
const IS_REST =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && /^Rest here/.test(el.textContent || "") })()'
const IS_BACK =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && /Back to the room/.test(el.textContent || "") })()'
const IS_XP_ASSIGN =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && el.tagName === "BUTTON" && /\\(L\\d+\\)/.test(el.textContent || "") })()'
const IS_EXIT_DISC =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && el.getAttribute("role") === "button" && /^(Explore|Move|Locked|Iron|Magically|Trapped|Illusionary|Lever|Unlocked)/.test(el.getAttribute("aria-label") || "") })()'
const IS_DIALOG_BUTTON =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && !!el.closest("[role=\\"dialog\\"]") && el.tagName === "BUTTON" })()'

test('keyboard-only: play the tutorial delve start to finish', async ({ page }) => {
  // A full delve by Tab is slow in Playwright (a round-trip per Tab and
  // per check, ~14s per loop iteration once the dungeon grows) — a human
  // keyboard player moves at their own pace and the app answers each Tab
  // in milliseconds (probe8: 17–96ms). The timeout budgets the harness,
  // not the app: the loop reached the Lesson 7 Mummy fight by iteration
  // ~38 of 150 inside 600s and only ran out of clock, it never stalled.
  test.setTimeout(1_200_000)
  const errors = trackErrors(page)
  await page.goto('campaign')
  await expect(page.getByRole('button', { name: 'Learn to play' }).first()).toBeVisible()

  // Start the tutorial from the keyboard: Tab to "Learn to play", Enter.
  expect(
    await tabUntil(
      page,
      '(() => { const el = document.activeElement; return !!el && el !== document.body && /Learn to play/.test(el.textContent || "") })()',
    ),
  ).toBe(true)
  await pressEnter(page)

  const coach = page.locator('[aria-label^="Tutorial, step"]')
  await expect(coach).toBeVisible({ timeout: 15000 })
  await assertNoCitationsVisible(page)

  // Dead-end memory (Milestone 5 harness note): a d66 roll that does not
  // fit an exit stays a dead end for that exit — re-rolling the same disc
  // burns iterations. Keyed by the room header ("Room · tile 25 · …");
  // the value is the set of disc indices that dead-ended here.
  const deadEnds = new Map<string, Set<number>>()
  const roomKey = async () =>
    (await page.locator('button', { hasText: /tile \d+/ }).first().innerText()).replace(/\s+/g, ' ')
  const lastLogLine = async () => {
    // During combat the dungeon log is replaced by the combat log, so
    // the list may not exist at all — return '' instead of waiting on a
    // locator that will never appear (that hang cost the spec its timeout).
    const items = page.locator('ul.log-fade li')
    if ((await items.count()) === 0) return ''
    return (await items.last().innerText()).replace(/\s+/g, ' ')
  }
  const focusedDiscIndex = async () =>
    page.evaluate(() => {
      const discs = [...document.querySelectorAll('circle[data-exit-id]')]
      return discs.findIndex((d) => d === document.activeElement)
    })

  let shotTaken = false
  // A door disc whose dialog is dismissed without opening the door (no
  // Clues for an illusionary door, no illusionist, a failed pick with no
  // bash left) must be remembered like a dead end — otherwise the loop
  // opens the same dialog, leaves it, and re-opens it forever.
  let pendingDisc: { key: string; idx: number; exitId: string } | null = null
  for (let step = 0; step < 150; step++) {
    await assertNoCitationsVisible(page)
    if (!(await coach.isVisible().catch(() => false))) break
    // The step number lives in the coach's aria-label ("Tutorial, step 7
    // of 12: …") — the visible text says "LESSON 7 OF 12", which a
    // /step (\d+)/ regex never matches.
    const stepLabel = (await coach.getAttribute('aria-label')) ?? ''
    const stepNum = Number(stepLabel.match(/step (\d+) of 12/)?.[1] ?? 0)
    if (stepNum === 12) {
      if (await tabUntil(page, IN_COACH_WAX, 30)) await pressEnter(page)
      break
    }

    // A dialog owns the keyboard while open: the focus trap already put
    // focus on its first option, so Enter takes it. (Door dialog: first
    // option attempts the door; rest-pick: first option is +1 Life for
    // the first PC; secret/treasure: first option is the affirmative.)
    if (await visible(page, page.locator('[role="dialog"]').first())) {
      if (await tabUntil(page, IS_DIALOG_BUTTON, 10)) {
        await pressEnter(page)
        // If the dialog closed without the party moving on, and the disc
        // that opened it is still a shut door, remember it as tried —
        // the door was left for now and re-opening it burns iterations.
        // If the disc's label changed (door opened) or the party moved,
        // the door was passed: do not mark it.
        if (!(await visible(page, page.locator('[role="dialog"]').first())) && pendingDisc) {
          const nowKey = await roomKey().catch(() => '')
          if (nowKey === pendingDisc.key) {
            const disc = page.locator(`circle[data-exit-id="${pendingDisc.exitId}"]`)
            if ((await disc.count()) > 0) {
              const label = (await disc.getAttribute('aria-label')) ?? ''
              if (/^(Locked|Iron|Magically|Trapped|Illusionary|Lever)/.test(label)) {
                const tried = deadEnds.get(pendingDisc.key) ?? new Set<number>()
                tried.add(pendingDisc.idx)
                deadEnds.set(pendingDisc.key, tried)
              }
            }
          }
          pendingDisc = null
        }
        continue
      }
    }
    // Coach tap step: its wax primary button (also the "Go to …" button
    // when the lesson lives on another tab).
    if (await visible(page, coach.locator('button.btn-wax').first())) {
      if (await tabUntil(page, IN_COACH_WAX, 40)) {
        await pressEnter(page)
        continue
      }
    }
    // Combat / tile actions, in the order the game presents them.
    if (await visible(page, page.getByRole('button', { name: 'Engage!' }))) {
      if (await tabUntil(page, IS_ENGAGE, 40)) {
        await pressEnter(page)
        continue
      }
    }
    if (await visible(page, page.getByRole('button', { name: /^Attack / }).first())) {
      if (await tabUntil(page, IS_ATTACK, 40)) {
        await pressEnter(page)
        continue
      }
      // Attack is visible but unfocusable: the foes are acting and their
      // turn resolves on its own. Wait for the party's turn instead of
      // falling through to the exit discs, which cannot be used mid-combat.
      await page.waitForTimeout(1000)
      continue
    }
    if (await visible(page, page.getByRole('button', { name: 'Wait for Reactions' }))) {
      if (await tabUntil(page, IS_WAIT, 40)) {
        await pressEnter(page)
        continue
      }
    }
    // An XP roll is due: assign it before leaving the room.
    if (await visible(page, page.getByRole('button', { name: /\(L\d+\)/ }).first())) {
      if (await tabUntil(page, IS_XP_ASSIGN, 40)) {
        await pressEnter(page)
        continue
      }
    }
    if (await visible(page, page.getByRole('button', { name: 'Back to the room' }))) {
      if (await tabUntil(page, IS_BACK, 40)) {
        await pressEnter(page)
        continue
      }
    }
    // Step 7 only: searching any other room would waste its one search
    // and never satisfy the explore step.
    if (
      stepNum === 7 &&
      (await visible(page, page.getByRole('button', { name: 'Search this tile' })))
    ) {
      if (await tabUntil(page, IS_SEARCH, 40)) {
        await pressEnter(page)
        continue
      }
    }
    // Step 8 only: the Rest button stays visible on every cleared tile
    // and never disables — resting early strands the loop here.
    if (
      stepNum === 8 &&
      (await visible(page, page.getByRole('button', { name: /^Rest here/ })))
    ) {
      if (await tabUntil(page, IS_REST, 40)) {
        await pressEnter(page)
        continue
      }
    }
    // Never explore mid-combat: if any combat control is showing, wait
    // for the fight to resolve instead of tabbing to a disc.
    if (
      (await visible(page, page.getByRole('button', { name: /^Attack / }).first())) ||
      (await visible(page, page.getByRole('button', { name: 'Flee!' }))) ||
      (await visible(page, page.getByRole('button', { name: 'Wait for Reactions' })))
    ) {
      await page.waitForTimeout(1000)
      continue
    }
    // Otherwise: step through an exit disc — Tab to it, Enter explores.
    // Prefer an ONWARD disc (label "Explore …" or a door state) over a
    // "Move …" disc, which retraces to a tile already generated — without
    // that preference the loop oscillates between two tiles forever. A
    // disc that dead-ended here is skipped for an untried onward one
    // (the tutorial's own hint: "try another exit"); if every onward
    // disc is tried, retrace out of the dead end; only when even that
    // is exhausted does it re-roll the first disc.
    if (await tabUntil(page, IS_EXIT_DISC, 60)) {
      if (!shotTaken) {
        await page.screenshot({ path: `${SHOTS}/4ad-07-keyboard-delve.png` })
        shotTaken = true
      }
      const key = await roomKey()
      const tried = deadEnds.get(key) ?? new Set<number>()
      const discs = page.locator('circle[data-exit-id]')
      const count = await discs.count()
      const labels: string[] = []
      for (let i = 0; i < count; i++) labels.push((await discs.nth(i).getAttribute('aria-label')) ?? '')
      const isOnward = (l: string) => !l.startsWith('Move ')
      let idx = await focusedDiscIndex()
      let target = -1
      for (let n = 0; n < count; n++) {
        const cand = (idx + n) % count
        if (isOnward(labels[cand]) && !tried.has(cand)) {
          target = cand
          break
        }
      }
      if (target === -1) {
        for (let n = 0; n < count; n++) {
          const cand = (idx + n) % count
          if (!isOnward(labels[cand])) {
            target = cand
            break
          }
        }
      }
      if (target === -1) target = idx
      for (let n = 0; n < count && idx !== target; n++) {
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(100)
        idx = await focusedDiscIndex()
      }
      const before = await lastLogLine()
      pendingDisc = {
        key,
        idx: target,
        exitId: (await discs.nth(target).getAttribute('data-exit-id')) ?? '',
      }
      await pressEnter(page)
      const after = await lastLogLine()
      if (after !== before && /does not fit beyond this door/.test(after)) {
        tried.add(target)
        deadEnds.set(key, tried)
        pendingDisc = null
      }
      // A successful move leaves the disc behind — it is not pending.
      if ((await roomKey().catch(() => '')) !== key) pendingDisc = null
      continue
    }
    // Nothing actionable found — stop rather than Tab forever.
    break
  }
  await assertNoCitationsVisible(page)
  // The tutorial is done when the coach is gone; the delve continues as
  // a normal campaign on the dungeon tab, map showing.
  await expect(coach).toBeHidden()
  await expect(page.getByRole('application', { name: /Dungeon map/ })).toBeVisible()
  assertNoErrors(errors)
})
