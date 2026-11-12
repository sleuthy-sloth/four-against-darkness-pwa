import { cleanIconFragment } from './iconUtils'

/**
 * A game-icons fragment rendered as an inline SVG in HTML context (buttons,
 * list rows, choice chips). The map has its own MapIcon; this is the HTML
 * counterpart. Fragments render with currentColor so the caller's text
 * colour applies.
 */
export default function FragIcon({
  frag,
  size = 20,
  className = '',
  label,
}: {
  frag: string
  size?: number
  className?: string
  label?: string
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-block shrink-0 align-middle ${className}`}
      fill="currentColor"
    >
      <g dangerouslySetInnerHTML={{ __html: cleanIconFragment(frag) }} />
    </svg>
  )
}
