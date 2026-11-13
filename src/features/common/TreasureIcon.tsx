import goldFrag from '../../assets/icons/treasure-gold.svg.frag?raw'
import potionFrag from '../../assets/icons/treasure-potion.svg.frag?raw'
import scrollFrag from '../../assets/icons/treasure-scroll.svg.frag?raw'
import magicFrag from '../../assets/icons/treasure-magic.svg.frag?raw'
import { cleanIconFragment } from '../common/iconUtils'

/**
 * Treasure icons in the Delver ink-line style. Original line art
 * generated for this project and traced to SVG with VTracer (per-path
 * translate() transforms baked into the path data). The icons fill with
 * currentColor, so the caller's text colour applies.
 */

export type TreasureIconKind = 'gold' | 'potion' | 'scroll' | 'magic'

const ICONS: Record<TreasureIconKind, string> = {
  gold: cleanIconFragment(goldFrag),
  potion: cleanIconFragment(potionFrag),
  scroll: cleanIconFragment(scrollFrag),
  magic: cleanIconFragment(magicFrag),
}

export function TreasureIcon({
  kind,
  width = 20,
  className = '',
  label,
}: {
  kind: TreasureIconKind
  /** Rendered width/height in px; the caller may also size it via className. */
  width?: number
  className?: string
  /** Accessible name; omit for a purely decorative icon. */
  label?: string
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={width}
      height={width}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-block shrink-0 align-middle ${className}`}
      fill="currentColor"
    >
      <g dangerouslySetInnerHTML={{ __html: ICONS[kind] }} />
    </svg>
  )
}

export default TreasureIcon
