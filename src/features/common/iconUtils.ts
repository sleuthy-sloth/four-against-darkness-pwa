/**
 * Shared cleaner for game-icons.net SVG fragments.
 *
 * Fragments ship two things the theme must remove:
 *  1. the black background square (`<path d="M0 0h512v512H0z"/>`), and
 *  2. a baked `fill="#fff"` on every art path, which overrides the
 *     `currentColor` / Tailwind `fill-*` classes the UI sets — without
 *     this strip, every icon renders white regardless of its class
 *     (invisible portraits on light folio cards, white blob on the map).
 * Stripping the attribute lets paths inherit fill from their parent.
 */
export function cleanIconFragment(frag: string): string {
  return frag
    .replace('<path d="M0 0h512v512H0z"/>', '')
    .replace(/fill="#fff"/g, '')
}
