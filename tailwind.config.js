/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tome & Delve OSR palette (Google Stitch design system, DESIGN.md):
        // weathered manuscript ground, iron-gall ink, dried oxblood sealing
        // wax, antique brass. Legacy names are remapped to the same system so
        // existing components flip without edits:
        stone: {
          950: '#e8dfca', // workspace canvas (was dark navy)
          900: '#f4eedd', // journal leaf (was panel)
          800: '#faf6ee', // lifted folio/card (was raised panel)
          700: '#dfd4bc', // recessed wells (was dark surface)
        },
        parchment: '#2b241f', // iron-gall ink (was pale text)
        torch: '#8c2626', // dried oxblood / sealing wax (was torch gold)
        ember: '#a83232', // bright wax accent (was ember orange)
        brass: '#9c7428', // antique brass / gold leaf (loot, torch charges) — decorative & large text only: 3.20:1 on canvas, never body text
        brassInk: '#7d5c1e', // darkened brass for gold numerals at text sizes: 4.63:1 on canvas, 5.30:1 on leaf, 5.69:1 on folio (AA) — DESIGN.md's own fallback
        faint: '#5f5346', // diluted ink / marginalia — 5.63:1 on canvas (AA)
      },
      fontFamily: {
        display: ['"Noto Serif"', 'Georgia', 'serif'],
        body: ['"EB Garamond"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        label: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        folio: '1px 2px 4px -1px rgba(31,26,22,0.12), 0 0 1px rgba(31,26,22,0.25)',
        raised: '3px 6px 14px -3px rgba(31,26,22,0.22), 0 1px 3px rgba(31,26,22,0.18)',
        modal: '6px 16px 28px -4px rgba(31,26,22,0.32), 0 2px 6px rgba(31,26,22,0.2)',
      },
      borderRadius: {
        none: '0px', // squared, cut-parchment corners
      },
    },
  },
  plugins: [],
}
