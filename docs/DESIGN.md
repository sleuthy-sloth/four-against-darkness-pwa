# DESIGN.md — Tome & Delve design system

> Four Against Darkness PWA — "Tome & Delve" OSR design system. Written
> 2026-11-11 from the visual-polish plan's measured evidence; token hexes and
> all contrast ratios verified against `tailwind.config.js` and
> `src/styles/index.css` on `main`. This is the doc `index.css` and
> `tailwind.config.js` cite.

Four Against Darkness PWA — "Tome & Delve" OSR design system. Light parchment
manuscript theme. One theme, one palette, one component kit. Polish means
completing the kit, not inventing a second one.

## 1. Palette

| Token | Value | Role |
|---|---|---|
| Ink | `#2b241f` | Primary text, line art |
| Canvas | `#e8dfca` | Page background (`theme_color` + `background_color` + `index.html` theme-color all aligned to this in milestone 1) |
| Oxblood | `#8c2626` | Primary accent — wax seals, primary buttons, encounter emphasis |
| Brass | `#9c7428` | Decorative / large-only accent (see §3) |
| Faint | `#5f5346` | Secondary text — darkened from `#6e6255` in milestone 1 (see §3) |

Supporting surfaces (verified against `tailwind.config.js` on `main`):
`leaf` is stone-900 `#f4eedd` (journal leaf); `folio` is stone-800 `#faf6ee`
(lifted folio/card).

## 2. Typography

Three-font system with a real hierarchy. Keep it; extend it, don't replace it.

- **Noto Serif** — display / headlines, chapter banners, lockup.
- **EB Garamond** — body text, journal entries, descriptions.
- **JetBrains Mono** — labels, numbers, dice/roll log, tile labels (mono caps).

Type sizes today are ad hoc per screen (chapter banner, card titles, log,
mono labels). When adding a size, pick from the sizes already in use; do not
introduce one-off sizes. Line length for log/journal text: cap at ~65ch.

## 3. Contrast rules (measured, not vibes)

Measured 2026-11-11, on canvas unless noted:

| Pair | Ratio | Verdict |
|---|---|---|
| Ink / canvas | 11.52:1 | Pass |
| Oxblood / canvas | 6.54:1 | Pass |
| Near-white / oxblood | 8.05:1 | Pass |
| Faint / canvas | **5.63:1** | Pass (AA) — was 4.47:1 at `#6e6255`, fixed in milestone 1 |
| Faint / leaf | 6.44:1 | Pass |
| Faint / folio | 6.93:1 | Pass |
| Brass / canvas | **3.20:1** | **Decorative / large text only — never body text** |

Rules:

- Every text pair must meet **≥ 4.5:1** (normal text) / **3:1** (large text).
  Gated by `tests/unit/designTokens.test.ts` (added in milestone 1).
- **Brass rule:** brass `#9c7428` is 3.20:1 on canvas. Use it for decoration,
  numerals ≥ 18px, or bold ≥ 14px only. Never brass body text. If brass text
  is ever needed at body size, darken to `#7d5c1e` first.
- Do not reintroduce the old `#6e6255` faint value.

## 4. Shape, spacing, shadow

- **Radii:** squared. The manuscript look is sharp corners; do not round cards
  or buttons.
- **Spacing:** 8px rhythm. Use the scale already in use; do not invent
  one-off gaps.
- **Shadows:** folio (resting card), raised (interactive / hover), modal.
  Keep them warm brown-tinted, never grey.

## 5. Component kit

These classes exist in `src/styles/index.css` and are used across screens.
Build new screens from them; do not restyle the same pattern a second way.

- `.ink-frame` — ink-ruled frame (cards, map surround)
- `.card-folio` — folio card (the default card surface)
- `.btn-wax` — primary wax-seal button
- `.btn-cartouche` — secondary cartouche button
- `.ledger-input` — ledger-style input
- `.graph-paper` — unmapped / unexplored surface treatment
- `.ribbon-tab` — tab treatment
- `.chapter-banner` — section / chapter heading

## 6. State system

Define for every kit component (buttons, tabs, tiles, cards):

- hover / focus-visible / active / disabled / pressed.
- **Focus rings are required and visible: 2px oxblood, offset.** (No focus
  styles existed before this doc — keyboard tab-through must be visible on
  every interactive element.)

## 7. Icons

- Icon fragments live in `src/assets/icons/*.svg.frag` (game-icons.net,
  CC BY 3.0 — see `ATTRIBUTION.md` + `attribution.json`).
- **Never bake `fill="#fff"` into a fragment.** Fragments must use
  `currentColor` so theme colors apply. (Milestone 1, Fix #0: baked white
  fill made class portraits invisible white-on-cream and put a white blob
  over foe tokens on the map. The shared `cleanIconFragment` util strips it.)
- Class portraits render in their `CLASS_COLORS`; map content icons at full
  `fill-parchment` with an ink/parchment halo — never at low opacity.
- Every game concept gets its own icon. Altar, puzzle box, and monsters must
  never share one drawing again (they all used `lorc/stone-sphere.svg` until
  milestone 1: altar → `delapouite/sword-altar`, box → `delapouite/puzzle`,
  monsters → `delapouite/goblin-head`).
- Tab glyphs: drawn icons, not unicode dingbats (⚒ ⚔ ✒ ⛁ ✦ render
  inconsistently across platforms).

## 8. Motion language

- Tile reveal, dice roll, hit/defeat feedback, panel transitions: all
  **≤ 300ms, ease-out**.
- Every animation has a `prefers-reduced-motion` off-ramp (instant state
  change instead). Nothing animates on a timer without a cause.

## 9. Dark mode — UNDECIDED

**No dark theme.** The light parchment flip is a complete system; do not add
a dark theme implicitly. Reason to record if light-only is confirmed:
manuscript legibility, single-theme maintenance. This is a Steven taste call
(plan item A6) — this draft records the question, not the answer.

## 10. Do / Don't

- **Do:** build from the kit; check contrast with the test gate, not by eye;
  keep screenshots in the README re-shot from a live seeded session.
- **Don't:** add a second palette, a second button style, rounded corners,
  grey shadows, brass body text, white-filled icon fragments, or book art
  (the Expanded Edition's illustrations are copyrighted — see the repo's
  copyright policy; new art is original or CC0 / CC BY with attribution).
- **Don't:** use emoji as UI icons (chapter ornaments are drawn, not emoji).

## 11. Licensing hygiene

- Every shipped art asset keeps a `source` field (author, URL, license) in
  `attribution.json`; `ATTRIBUTION.md`, README, and Settings credits match it.
- `attribution.json` must cover 100% of shipped art.

## 12. Screenshot references

- `docs/screenshots/party-mobile.png` — legible class portraits (milestone 1)
- `docs/screenshots/dungeon-mobile.png` — map with ink + parchment-halo icons
- README captures are re-shot from a live seeded session and verified in-DOM.
