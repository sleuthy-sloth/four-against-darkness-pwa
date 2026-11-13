import verminFrag from '../../assets/icons/monster-vermin.svg.frag?raw'
import minionsFrag from '../../assets/icons/monster-minions.svg.frag?raw'
import undeadFrag from '../../assets/icons/monster-undead.svg.frag?raw'
import orcsFrag from '../../assets/icons/monster-orcs.svg.frag?raw'
import { cleanIconFragment } from '../common/iconUtils'

/**
 * Small ink portraits for monster families, for the encounter card.
 * Original line art generated for this project and traced to SVG with
 * VTracer (per-path translate() transforms baked into the path data, so
 * each portrait renders exactly where the viewBox says it does). The
 * portraits fill with currentColor, so the caller's text colour applies.
 * Families without a portrait get a generic threshold-arch mark.
 */

export type MonsterPortraitFamily = 'vermin' | 'minions' | 'undead' | 'orcs'

const PORTRAITS: Record<MonsterPortraitFamily, string> = {
  vermin: cleanIconFragment(verminFrag),
  minions: cleanIconFragment(minionsFrag),
  undead: cleanIconFragment(undeadFrag),
  orcs: cleanIconFragment(orcsFrag),
}

/** Engine family names that share a portrait with a named family. */
const ALIASES: Record<string, MonsterPortraitFamily> = {
  goblinoid: 'minions',
}

export function MonsterPortrait({
  family,
  width = 48,
  className = '',
  label,
}: {
  /** 'vermin' | 'minions' | 'undead' | 'orcs'; any other family renders a generic mark. */
  family: MonsterPortraitFamily | (string & {})
  /** Rendered width/height in px; the caller may also size it via className. */
  width?: number
  className?: string
  /** Accessible name; omit for a purely decorative portrait. */
  label?: string
}) {
  const key = (family in PORTRAITS
    ? family
    : ALIASES[family]) as MonsterPortraitFamily | undefined
  const portrait = key ? PORTRAITS[key] : undefined
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
      {portrait ? (
        <g dangerouslySetInnerHTML={{ __html: portrait }} />
      ) : (
        /* generic mark: the threshold arch with a torch, for unknown families */
        <g fill="none" stroke="currentColor" strokeWidth="18" strokeLinecap="round">
          <path d="M120 460 V212 A136 136 0 0 1 392 212 V460" />
          <path d="M256 316 V250" />
          <path
            d="M256 196 C232 222 232 248 256 268 C280 248 280 222 256 196 Z"
            fill="currentColor"
            stroke="none"
          />
        </g>
      )}
    </svg>
  )
}

export default MonsterPortrait
