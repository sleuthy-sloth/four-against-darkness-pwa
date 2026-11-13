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

- **Noto Serif** — display / headlines, chapter banners, lockup. The lockup
  lives in `src/features/common/Lockup.tsx` — the Delver at the Threshold: a
  hooded delver with a raised torch before a tall pointed stone arch,
  original AI-generated line art traced to SVG with VTracer (per-path
  translate() transforms baked into the path data), oxblood wax seal,
  wordmark as real text; the same SVG is inlined in `index.html` as the
  first-paint splash. The four generated artworks (dashboard hero, delve
  entrance, journal header, splash torch) live in `public/art/` as WebP
  (PNG masters are the generation originals, not shipped) and are covered
  in `attribution.json`.
- **EB Garamond** — body text, journal entries, descriptions.
- **JetBrains Mono** — labels, numbers, dice/roll log, tile labels (mono caps).

Type scale (formalized in the 2026-11-12 polish pass from the sizes
already in use — counted across `src/`; no new one-off sizes):

| Size | Role | Where |
|---|---|---|
| 10px mono (`text-[10px]`) | Micro-labels, uppercase | Tab labels, log timestamps, card micro-copy |
| 11px mono (`text-[11px]`) | Small numerals | Life numerals, date separators, combat grid |
| 12px (`text-xs`) | Secondary text | Log lines, buttons, helper text (most-used size) |
| 14px (`text-sm`) | Body / UI text | Card bodies, dialog text, journal entries |
| 16px (`text-base`) | Card titles, names | Encounter titles, tale names, party names |
| 18px (`text-lg`) | Section headings | Combat heading, About title |
| 20px (`text-xl`) | Screen headings | Every screen `h1` (Party, Journal, Inventory, Settings) |
| 24px (`text-2xl`) | Character-sheet display | Character name + big stat numerals only |

Line length for log/journal text: cap at ~65ch. Numerals that change
in place are tabular (`JetBrains Mono` + `.num-tabular`) so the log
never jitters.

## 3. Contrast rules (measured, not vibes)

Measured 2026-11-11, re-measured 2026-11-12 (Phase G) on canvas unless noted:

| Pair | Ratio | Verdict |
|---|---|---|
| Ink / canvas | 11.52:1 | Pass |
| Oxblood / canvas | 6.54:1 | Pass |
| Near-white / oxblood | 8.05:1 | Pass |
| Faint / canvas | **5.63:1** | Pass (AA) — was 4.47:1 at `#6e6255`, fixed in milestone 1 |
| Faint / leaf | 6.44:1 | Pass |
| Faint / folio | 6.93:1 | Pass |
| Faint / well | 5.08:1 | Pass |
| Brass / canvas | **3.20:1** | **Decorative only — never text** |
| Brass ink `#7d5c1e` / canvas | 4.63:1 | Pass (AA) — gold numerals use this, not brass |
| Brass ink / leaf | 5.30:1 | Pass |
| Brass ink / folio | 5.69:1 | Pass |
| Brass ink / well | 4.17:1 | Fail — gold numerals never sit on well |
| Parchment 70% / canvas | 5.50:1 | Pass — the floor for parchment text |
| Parchment 70% / leaf | 5.10:1 | Pass |
| Parchment 70% / folio | 5.10:1 | Pass |
| Parchment 70% / well | 4.69:1 | Pass (worst light surface) |
| Parchment 60% / canvas | 4.04:1 | **Fail — no parchment text below 70% opacity** |
| Ember / canvas | 5.00:1 | Pass |
| Ember / leaf | 5.72:1 | Pass |
| Ember / folio | 6.15:1 | Pass |
| Ember / well | 4.51:1 | Pass |
| Ember 80% / leaf | 3.99:1 | Fail — fixed to solid ember (Phase G) |
| Amber-500 / dark tile `#14100c` | 8.82:1 | Pass (locked-door disc) |
| Folio / dark tile | 17.56:1 | Pass (unexplored-tile text) |
| Folio / oxblood (foe-count badge) | 8.05:1 | Pass |
| Ink / amber-500 (trapped "!" disc) | ≈8.8:1 | Pass |

Rules:

- Every text pair must meet **≥ 4.5:1** (normal text) / **3:1** (large text).
  Gated by `tests/unit/designTokens.test.ts` (added in milestone 1,
  extended in Phase G with a source scan).
- **Parchment opacity floor (Phase G):** no parchment text below 70%
  opacity — /60 measures 3.61–4.04:1 on the light surfaces and fails AA.
  The only exceptions are disabled controls (exempt from WCAG/axe) and
  `aria-hidden` decorative glyphs; both are allowlisted by file and line
  count in the gate test. Prefer `text-faint` over a low opacity when the
  text is meant to recede.
- **Brass rule (corrected, Phase G):** brass `#9c7428` is 3.20:1 on canvas.
  It is decorative only — never text. The old allowance ("numerals ≥ 18px,
  or bold ≥ 14px") was wrong: WCAG large text needs ≥ 18.66px bold or
  ≥ 24px regular, so 14px bold is normal text and brass fails it at
  3.67:1 (leaf) / 3.94:1 (folio). Gold numerals (inventory, journal,
  party gold) use `brassInk` `#7d5c1e` instead (4.63–5.69:1 on
  canvas/leaf/folio).
- Do not reintroduce the old `#6e6255` faint value.

## 4. Shape, spacing, shadow

- **Radii:** squared. The manuscript look is sharp corners; do not round cards
  or buttons.
- **Spacing:** 8px rhythm, from the scale already in use (counted across
  `src/`): screen padding `p-4 pb-6` (dashboard landing `p-6`); card
  padding `p-3` (sections `p-4`); gaps `gap-1`/`gap-2` (lists `space-y-1`/
  `space-y-2`, sections `mt-2`/`mt-3`, chapter banners `mt-4`); button
  padding `px-3 py-1.5` (small) / `px-4 py-2` (standard) / `px-6 py-3`
  (primary). Do not invent one-off gaps. Every Settings section follows
  the same rhythm — chapter banner, ornament, `card-folio mt-2` — with no
  section skipping its ornament.
- **Shadows:** folio (resting card), raised (interactive / hover), modal.
  Keep them warm brown-tinted, never grey. Interactive cards lift to
  `raised` on hover with a 1px rise (`.card-interactive`, 150ms shadow
  transition); the hero card (encounter) rests at `raised` (`.card-raised`);
  dialogs sit at `modal` (`.shadow-modal`).

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

Motion inventory (all timings measured in `src/styles/index.css`;
everything below is gated by the reduced-motion block there):

| Animation | Trigger | Timing |
|---|---|---|
| Tile reveal (`.tile-reveal`) | Newest tile generated | 150ms ease-out |
| Tab crossfade (`.tab-fade`) | Tab switch | 120ms ease-out |
| Panel/drawer in (`.panel-in`) | Dialog/panel mounts | 200ms ease-out |
| Dialog backdrop fade (`.dialog-backdrop`) | Any dialog opens | 200ms ease-out |
| Bottom-panel peek (`.panel-peek`) | Peek expand/collapse | 200ms ease-out (max-height + opacity) |
| Map zoom/pan (`.map-smooth`) | Zoom buttons/keys/fit, resize re-fit | 200ms ease-out on the SVG transform — **never while dragging/pinching** (the transform tracks the pointer 1:1 then) |
| Resize re-fit | Viewport width change (resize / orientationchange) | Debounced 200ms, then the smooth re-fit above; height-only changes (mobile browser chrome) do not re-fit |
| Button press (`.btn-wax` / `.btn-cartouche`) | `:active` | 120ms, scale 0.98 + deeper shadow |
| Tab indicator (`.tab-indicator`) | Active tab changes | 200ms ease-out (glides to the measured tab) |
| Life bar (`.life-bar-fill`) | Life changes | 300ms ease-out on width |
| Gold flash (`.gold-flash`) | Pooled gold changes | 300ms ease-out background flash (brass tint as background only — brass never becomes text, §3) |
| Dice settle (`.die-settle`) | A new roll renders | 300ms ease-out, gentle scale/rotate — never a tumble |
| Exploding die (`.die-explode`) | Exploding roll renders | 300ms ease-out brass-accent pulse |
| Log line in (`.log-line`) | A log line is appended | 150ms ease-out fade/slide; lines are stably keyed so only the new line plays |
| Encounter crossfade (`.encounter-fade`) | A new encounter appears | 200ms ease-out opacity |
| Foe hit flash (`.foe-hit-flash`) | Combat log reports a hit | 300ms ease-out oxblood bloom on the map tile |
| Combat hit flash / defense shake / morale slump | Engine log lines | 300ms / 300ms / 400ms (the shake is the one decided exception to subtle motion) |
| Victory stamp (`.victory-stamp`) | Victory / Fallen | 200ms ease-out, with a tiny wax-seal press (scale 1.02 → 1) |
| Mount fade-in (`.fade-in`) | Campaign list / dungeon mount | 200ms ease-out opacity |
| Card hover (`.card-interactive`) | Pointer over an interactive card | 150ms shadow transition + 1px lift |
| "You are here" pulse (`.party-pulse`) | Always, on the party token | 2s ease-out, infinite — the one ambient motion; a static ring under reduced motion |
| Splash progress (`.splash-progress`) | First paint only | 1.4s linear, before the bundle loads |

## 9. Dark mode — DECIDED: light-only

**No dark theme.** Decided 2026-11-11 (plan item A6, per Steven's
delegation to make judgement calls): Tome & Delve is a parchment
identity; a dark theme means re-grading every token. Manuscript
legibility, single-theme maintenance. Do not add a dark theme implicitly.

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
