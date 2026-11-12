/**
 * Drawn ornaments (plan item C7): chapter dividers, the brass coin device,
 * and the parchment-fibre texture. All flat SVG, all offline, all cacheable.
 * The texture is a single feTurbulence data-URI (362 bytes) applied as a
 * low-opacity overlay — invisible at 100% zoom, felt at arm's length.
 */

/** feTurbulence parchment fibre, URL-encoded SVG data-URI (362 bytes). */
export const PARCHMENT_NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")"

/** Torn-edge divider (plan item C7): a jagged parchment tear between the map and the panel below it. */
export const TORN_EDGE_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='10' viewBox='0 0 48 10'%3E%3Cpath d='M0 10 L0 6 L4 4 L7 7 L11 3 L15 6 L19 2 L23 6 L27 4 L31 7 L35 3 L39 6 L43 4 L48 6 L48 10 Z' fill='%23e8dfca'/%3E%3C/svg%3E\")"

/**
 * Full-screen parchment grain (plan item C7): one fixed, pointer-transparent
 * layer over the app. The noise alpha is baked into the filter (0.05), so
 * the grain is invisible at 100% zoom and felt at arm's length. No asset,
 * no layout shift — the layer never moves.
 */
export function TextureOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60]"
      style={{ backgroundImage: PARCHMENT_NOISE_URI }}
    />
  )
}

/** Torn-edge strip (plan item C7): jagged parchment tear, 10px tall, repeat-x. */
export function TornEdge({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-[10px] w-full shrink-0 ${className}`}
      style={{ backgroundImage: TORN_EDGE_URI, backgroundRepeat: 'repeat-x', backgroundSize: '48px 10px' }}
    />
  )
}

/** A drawn fleuron divider: rule — diamond — rule, with ink curls. Not an emoji. */
export function ChapterOrnament({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 20"
      aria-hidden="true"
      className={`mx-auto h-5 w-48 text-torch ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M8 10 H78" />
      <path d="M122 10 H192" />
      <path d="M100 3 L107 10 L100 17 L93 10 Z" fill="currentColor" stroke="none" />
      <circle cx="86" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="114" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <path d="M78 10 q-4 -5 0 -8 M78 10 q-4 5 0 8" />
      <path d="M122 10 q4 -5 0 -8 M122 10 q4 5 0 8" />
    </svg>
  )
}

/** Brass coin device for gold (plan item D5): a brass disc with a struck diamond, not plain text. */
export function CoinDevice({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className={`inline-block shrink-0 align-middle ${className}`}
    >
      <circle cx="12" cy="12" r="10" fill="#9c7428" stroke="#7d5c1e" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#e8dfca" strokeWidth="1" opacity="0.7" />
      <path d="M12 8 L14 12 L12 16 L10 12 Z" fill="#e8dfca" />
    </svg>
  )
}
