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
 * Speed note: every per-iteration state read is batched into ONE
 * page.evaluate (readState) and every disc read into one more
 * (readDiscState). The earlier version did ~12 separate locator calls
 * plus a full-body citation read per iteration (~15s each once the
 * dungeon grew) and could not finish the 12-lesson delve inside its
 * 20-minute clock — the loop reached the Lesson 7 Mummy fight and the
 * clock ran out mid-fight, which looked like a stall. The app was
 * proven fine separately (probe14: Tab reaches "Attack Mummy" in 9
 * stops). The citation strip is asserted at the start and the end of
 * the delve and covered independently by 05-citations, so it is not
 * re-read every iteration.
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

// One round-trip per iteration for every branch decision, instead of a
// separate locator call per button. Visibility mirrors Playwright's
// isVisible closely enough for these buttons: a non-empty bounding box
// and no visibility:hidden. Button matching is by textContent, the same
// signal the IS_* predicates below already use.
type LoopState = {
  coachVisible: boolean
  stepNum: number
  dialogOpen: boolean
  coachWax: boolean
  lightTorch: boolean
  pickupLantern: boolean
  engage: boolean
  attack: boolean
  wait: boolean
  xp: boolean
  back: boolean
  search: boolean
  rest: boolean
  flee: boolean
  /** The party was wiped out — the delve is over and no branch can help. */
  wiped: boolean
  /** Smart play (pcTurn): a cleric Healing button is showing. */
  heal: boolean
  /** Smart play: a healing-potion button is showing (free action). */
  potion: boolean
  /** Smart play: a cast button (sleep/fireball/lightning/blessing, spell or scroll) is showing. */
  cast: boolean
  /** Smart play: the encounter has a major foe (its row shows Life, not a count) — worth a spell. */
  foeIsMajor: boolean
  /** Smart play: lowest current Life among living PCs (99 when none). */
  minLife: number
  /** Smart play: number of living PCs. */
  livingCount: number
  /** The room header ("Room · tile N · …") — the party's current tile. */
  roomKey: string
}
async function readState(page: Page): Promise<LoopState> {
  return page.evaluate(() => {
    const vis = (el: Element | null) =>
      !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
    const btns = [...document.querySelectorAll('button')]
    const has = (re: RegExp) => btns.some((b) => vis(b) && re.test(b.textContent ?? ''))
    const coach = document.querySelector('[aria-label^="Tutorial, step"]')
    const stepLabel = coach?.getAttribute('aria-label') ?? ''
    return {
      coachVisible: vis(coach),
      stepNum: Number(stepLabel.match(/step (\d+) of 12/)?.[1] ?? 0),
      dialogOpen: vis(document.querySelector('[role="dialog"]')),
      coachWax: vis(coach?.querySelector('button.btn-wax') ?? null),
      lightTorch: has(/Light torch/),
      pickupLantern: has(/Pick up the dropped lantern/),
      engage: has(/Engage!/),
      attack: has(/^Attack /),
      wait: has(/Wait for Reactions/),
      xp: has(/\(L\d+\)/),
      back: has(/Back to the room/),
      search: has(/Search this tile/),
      rest: has(/^Rest here/),
      flee: has(/Flee!/),
      wiped:
        /wiped out/i.test(document.body.textContent ?? '') ||
        // A "Fallen" stamp alone is not a wipe: the party can lose a
        // fight with survivors (the "Back to the room" button leaves
        // with whoever is left). It is a wipe only when no PC is alive.
        (() => {
          if (document.querySelector('[role="status"].victory-stamp')?.textContent?.trim() !== 'Fallen')
            return false
          const lives = [...document.querySelectorAll('div.grid-cols-4 div')]
            .map((d) => (d.textContent ?? '').trim())
            .filter((t) => /^\d+\/\d+$/.test(t))
            .map((t) => Number(t.split('/')[0]))
          return lives.length > 0 && lives.every((n) => n === 0)
        })(),
      heal: has(/Healing \(\d+ left\)/),
      potion: has(/: potion \(free\)/),
      cast: has(/: (scroll )?(sleep|fireball|lightning|blessing)/),
      foeIsMajor: btns.some((b) => vis(b) && /Life \d+\/\d+/.test(b.textContent ?? '')),
      ...(() => {
        // The party grid (4 cells, each "cur/max Life") is the only place
        // that shows every PC's Life at once. Dead PCs read 0/max. The
        // grid lives in the combat panel, so outside combat there is no
        // Life to read — livingCount 0 there means "not in combat", not
        // "the party is dead" (the wipe check below is the real signal).
        const lives = [...document.querySelectorAll('div.grid-cols-4 div')]
          .map((d) => (d.textContent ?? '').trim())
          .filter((t) => /^\d+\/\d+$/.test(t))
          .map((t) => Number(t.split('/')[0]))
        const living = lives.filter((n) => n > 0)
        const roomBtn = [...document.querySelectorAll('button')].find((b) =>
          /tile \d+/i.test(b.textContent ?? ''),
        )
        return {
          minLife: living.length ? Math.min(...living) : 99,
          livingCount: living.length,
          roomKey: ((roomBtn as HTMLElement | undefined)?.innerText ?? '').replace(/\s+/g, ' '),
        }
      })(),
    }
  })
}

// One round-trip for everything the disc branch needs: the room key,
// every exit disc's label + exit id, which disc is focused, and the
// last dungeon-log line ('' while the combat log replaces it).
type DiscState = {
  roomKey: string
  discs: { label: string; exitId: string }[]
  focusedIdx: number
  lastLog: string
}
async function readDiscState(page: Page): Promise<DiscState> {
  return page.evaluate(() => {
    const roomBtn = [...document.querySelectorAll('button')].find((b) =>
      /tile \d+/i.test(b.textContent ?? ''),
    )
    const discEls = [...document.querySelectorAll('circle[data-exit-id]')]
    const items = document.querySelectorAll('ul.log-fade li')
    return {
      roomKey: ((roomBtn as HTMLElement | undefined)?.innerText ?? '').replace(/\s+/g, ' '),
      discs: discEls.map((d) => ({
        label: d.getAttribute('aria-label') ?? '',
        exitId: d.getAttribute('data-exit-id') ?? '',
      })),
      focusedIdx: discEls.findIndex((d) => d === document.activeElement),
      lastLog: items.length
        ? ((items[items.length - 1] as HTMLElement).innerText ?? '').replace(/\s+/g, ' ')
        : '',
    }
  })
}

type DialogButton = { label: string; disabled: boolean }

/** The open dialog's buttons, in DOM order, with their labels. */
async function readDialogButtons(page: Page): Promise<DialogButton[]> {
  return page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]')
    if (!dlg) return []
    return [...dlg.querySelectorAll('button')].map((b) => ({
      label: (b.textContent ?? '').replace(/\s+/g, ' ').trim(),
      disabled: b.disabled,
    }))
  })
}

/** Tab until the focused element is a dialog button whose label matches `re` (a regex source). */
async function tabToDialogButton(page: Page, re: string, maxTabs = 12): Promise<boolean> {
  const pred = `(() => { const el = document.activeElement; return !!el && el !== document.body && !!el.closest('[role="dialog"]') && el.tagName === "BUTTON" && /${re}/.test(el.textContent || "") })()`
  return tabUntil(page, pred, maxTabs)
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
const IS_LIGHT_TORCH =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && /Light torch/.test(el.textContent || "") })()'
const IS_PICKUP_LANTERN =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && /Pick up the dropped lantern/.test(el.textContent || "") })()'
const IS_HEAL =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && /Healing \\(\\d+ left\\)/.test(el.textContent || "") })()'
const IS_POTION =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && /: potion \\(free\\)/.test(el.textContent || "") })()'
const IS_CAST =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && /: (scroll )?(sleep|fireball|lightning|blessing)/.test(el.textContent || "") })()'
const IS_FLEE =
  '(() => { const el = document.activeElement; return !!el && el !== document.body && /Flee!/.test(el.textContent || "") })()'

test('keyboard-only: play the tutorial delve start to finish', async ({ page }) => {
  // A full delve by Tab is slow in Playwright (a round-trip per Tab and
  // per check) — a human keyboard player moves at their own pace and the
  // app answers each Tab in milliseconds (probe8: 17–96ms). The timeout
  // budgets the harness, not the app. State reads are batched (see
  // readState/readDiscState above); the Tabs themselves are the floor.
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

  let shotTaken = false
  // Door-option memory: for a given door (roomKey + exitId), the labels
  // of the dialog options already tried. A door is only "tried" (marked
  // in deadEnds) once every open attempt has failed and the loop leaves
  // it — a failed pick is not the end of a door (the rules say "must
  // bash"), so the loop must not burn the door on one bad roll.
  const triedDoorOptions = new Map<string, Set<string>>()
  // A door disc whose dialog is dismissed without opening the door (no
  // Clues for an illusionary door, no illusionist, a failed pick with no
  // bash left) must be remembered like a dead end — otherwise the loop
  // opens the same dialog, leaves it, and re-opens it forever.
  let pendingDisc: { key: string; idx: number; exitId: string } | null = null
  // Stuck detection: the party can be trapped on a tile whose exits are
  // all doors it cannot open (or dead ends) — re-opening the same door
  // dialogs forever. If the party spends 40 straight navigation
  // iterations (disc/dialog) on one tile without moving, say so clearly
  // instead of spinning to the cap. Combat iterations do not count:
  // a long fight legitimately holds the party on one tile.
  let stuckRoom = ''
  let stuckCount = 0
  for (let step = 0; step < 400; step++) {
    const st = await readState(page)
    const branch = !st.coachVisible
      ? 'coach-gone'
      : st.stepNum === 12
        ? 'step12'
        : st.dialogOpen
          ? 'dialog'
          : st.lightTorch
            ? 'light-torch'
            : st.pickupLantern
              ? 'pickup-lantern'
              : st.coachWax
                ? 'coach-wax'
                : st.engage
                  ? 'engage'
                  : st.heal && st.minLife <= 2
                    ? 'heal'
                    : st.potion && st.minLife <= 2
                      ? 'potion'
                      : st.flee && st.livingCount <= 1 && st.minLife <= 2
                        ? 'flee'
                        : st.cast && (st.foeIsMajor || st.minLife <= 3)
                          ? 'cast'
                          : st.attack
                            ? 'attack'
                            : st.wait
                              ? 'wait'
                              : st.xp
                                ? 'xp'
                                : st.back
                                  ? 'back'
                                  : st.stepNum === 7 && st.search
                                    ? 'search'
                                    : st.stepNum === 8 && st.rest
                                      ? 'rest'
                                      : st.attack || st.flee || st.wait
                                        ? 'combat-guard'
                                        : 'disc'
    // Fail fast on a wipe: the delve is over, no branch can recover it,
    // and spinning the remaining iterations only wastes the clock. A wipe
    // is a real gameplay outcome (real dice, naive play — no healing,
    // scrolls or fleeing), not a keyboard defect.
    if (st.wiped) {
      throw new Error(
        `Party wiped out at tutorial step ${st.stepNum} (iteration ${step}) — the delve cannot continue.`,
      )
    }
    if (branch === 'disc' || branch === 'dialog') {
      if (st.roomKey === stuckRoom) {
        stuckCount++
      } else {
        stuckRoom = st.roomKey
        stuckCount = 1
      }
      if (stuckCount >= 40) {
        throw new Error(
          `Party stuck on ${st.roomKey} for 40 navigation iterations (tutorial step ${st.stepNum}, iteration ${step}) — every exit is a door it cannot open or a dead end.`,
        )
      }
    } else {
      stuckCount = 0
    }
    if (!st.coachVisible) break
    if (st.stepNum === 12) {
      if (await tabUntil(page, IN_COACH_WAX, 30)) await pressEnter(page)
      break
    }

    // A dialog owns the keyboard while open. For a door dialog the loop
    // works the door's options in order instead of always taking the
    // first: a failed pick is not the end of a door (the rules say
    // "must bash"), so after a failed attempt it re-opens the dialog
    // and tries the next untried option. Only when every open attempt
    // has failed (or none is available) does it leave the door and
    // remember the disc as tried. Other dialogs (puzzle, rest-pick,
    // secret/treasure) keep the old rule: the first option is the
    // affirmative, so take it.
    if (st.dialogOpen) {
      const buttons = await readDialogButtons(page)
      const doorKey = pendingDisc ? `${pendingDisc.key}|${pendingDisc.exitId}` : null
      const tried = doorKey ? (triedDoorOptions.get(doorKey) ?? new Set<string>()) : new Set<string>()
      const isLeave = (label: string) => /leave/i.test(label)
      // An open attempt is any enabled button that is not a "leave".
      const attempt = buttons.find((b) => !b.disabled && !isLeave(b.label) && !tried.has(b.label))
      const leave = buttons.find((b) => !b.disabled && isLeave(b.label))
      const target = attempt ?? leave ?? buttons.find((b) => !b.disabled)
      let picked: string | null = null
      if (target) {
        // Tab to the target button by label (labels are unique per dialog).
        const re = target.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        if (await tabToDialogButton(page, re)) {
          picked = target.label
          await pressEnter(page)
        } else if (await tabUntil(page, IS_DIALOG_BUTTON, 10)) {
          // Fallback: Enter on whatever dialog button has focus, and
          // read its label back so the door-option memory stays true.
          picked = await page.evaluate(() => {
            const el = document.activeElement
            return el ? (el.textContent ?? '').replace(/\s+/g, ' ').trim() : null
          })
          await pressEnter(page)
        }
      }
      if (picked !== null) {
        if (doorKey && attempt && picked === attempt.label) tried.add(picked)
        if (doorKey) triedDoorOptions.set(doorKey, tried)
        // If the dialog closed without the party moving on, and the disc
        // that opened it is still a shut door, remember it as tried
        // ONLY when the loop gave up (picked a "leave") — a failed open
        // attempt just means the next option gets its turn.
        const after = await readState(page)
        if (!after.dialogOpen && pendingDisc) {
          const ds = await readDiscState(page)
          if (ds.roomKey === pendingDisc.key) {
            const idx = ds.discs.findIndex((d) => d.exitId === pendingDisc!.exitId)
            if (
              idx >= 0 &&
              /^(Locked|Iron|Magically|Trapped|Illusionary|Lever)/.test(ds.discs[idx].label) &&
              (isLeave(picked) || !attempt)
            ) {
              const triedDiscs = deadEnds.get(pendingDisc.key) ?? new Set<number>()
              triedDiscs.add(idx)
              deadEnds.set(pendingDisc.key, triedDiscs)
            }
          }
          pendingDisc = null
        }
        continue
      }
    }
    // Light (R093/R094): the tutorial party carries one torch (the
    // backstory promises it) and a dropped lantern can be picked up. A
    // keyboard player lights the torch before fighting or exploring —
    // darkness is -2 to attack/defense/saves and blocks Search, so
    // fighting blind is how the party got wiped at the Hobgoblins.
    // The torch burns 6 rooms, then the button returns and the loop
    // relights it; the lantern pickup costs a turn in combat but is
    // worth it for the rest of the fight.
    if (st.lightTorch) {
      if (await tabUntil(page, IS_LIGHT_TORCH, 40)) {
        await pressEnter(page)
        continue
      }
    }
    if (st.pickupLantern) {
      if (await tabUntil(page, IS_PICKUP_LANTERN, 40)) {
        await pressEnter(page)
        continue
      }
    }
    // Coach tap step: its wax primary button (also the "Go to …" button
    // when the lesson lives on another tab).
    if (st.coachWax) {
      if (await tabUntil(page, IN_COACH_WAX, 40)) {
        await pressEnter(page)
        continue
      }
    }
    // Combat / tile actions, in the order the game presents them.
    if (st.engage) {
      if (await tabUntil(page, IS_ENGAGE, 40)) {
        await pressEnter(page)
        continue
      }
    }
    // Smart play: the party wins fights it would otherwise lose by
    // using what it carries. Heal the most wounded PC when anyone is
    // in danger (2 Life or less — one more hit can kill them); a potion
    // is a free action, so it never costs an attack. Flee only when the
    // party is nearly wiped (one survivor at 2 Life or less) — staying
    // then is a wipe, and each foe strikes just once on the way out.
    // A cast (sleep/fireball/lightning/blessing, spell or scroll) is
    // spent on a major foe, or when the party is hurt — not on minions
    // the party can already beat by attacking.
    if (st.heal && st.minLife <= 2) {
      if (await tabUntil(page, IS_HEAL, 40)) {
        await pressEnter(page)
        continue
      }
    }
    if (st.potion && st.minLife <= 2) {
      if (await tabUntil(page, IS_POTION, 40)) {
        await pressEnter(page)
        continue
      }
    }
    if (st.flee && st.livingCount <= 1 && st.minLife <= 2) {
      if (await tabUntil(page, IS_FLEE, 40)) {
        await pressEnter(page)
        continue
      }
    }
    if (st.cast && (st.foeIsMajor || st.minLife <= 3)) {
      if (await tabUntil(page, IS_CAST, 40)) {
        await pressEnter(page)
        continue
      }
    }
    if (st.attack) {
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
    if (st.wait) {
      if (await tabUntil(page, IS_WAIT, 40)) {
        await pressEnter(page)
        continue
      }
    }
    // An XP roll is due: assign it before leaving the room.
    if (st.xp) {
      if (await tabUntil(page, IS_XP_ASSIGN, 40)) {
        await pressEnter(page)
        continue
      }
    }
    if (st.back) {
      if (await tabUntil(page, IS_BACK, 40)) {
        await pressEnter(page)
        continue
      }
    }
    // Step 7 only: searching any other room would waste its one search
    // and never satisfy the explore step.
    if (st.stepNum === 7 && st.search) {
      if (await tabUntil(page, IS_SEARCH, 40)) {
        await pressEnter(page)
        continue
      }
    }
    // Step 8 only: the Rest button stays visible on every cleared tile
    // and never disables — resting early strands the loop here.
    if (st.stepNum === 8 && st.rest) {
      if (await tabUntil(page, IS_REST, 40)) {
        await pressEnter(page)
        continue
      }
    }
    // Never explore mid-combat: if any combat control is showing, wait
    // for the fight to resolve instead of tabbing to a disc.
    if (st.attack || st.flee || st.wait) {
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
      const ds = await readDiscState(page)
      const key = ds.roomKey
      const tried = deadEnds.get(key) ?? new Set<number>()
      const count = ds.discs.length
      const labels = ds.discs.map((d) => d.label)
      const isOnward = (l: string) => !l.startsWith('Move ')
      let idx = ds.focusedIdx
      if (idx < 0) idx = 0
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
        idx = (await readDiscState(page)).focusedIdx
        if (idx < 0) break
      }
      const before = ds.lastLog
      pendingDisc = {
        key,
        idx: target,
        exitId: ds.discs[target].exitId,
      }
      await pressEnter(page)
      const afterDs = await readDiscState(page)
      if (afterDs.lastLog !== before && /does not fit beyond this door/.test(afterDs.lastLog)) {
        tried.add(target)
        deadEnds.set(key, tried)
        pendingDisc = null
      }
      // A successful move leaves the disc behind — it is not pending.
      if (afterDs.roomKey !== key) pendingDisc = null
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
