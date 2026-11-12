import type { DoorState } from './mapStyle'
import { DOOR_STATES } from './mapStyle'
import FragIcon from '../common/FragIcon'
import chestIcon from '../../assets/icons/chest.svg.frag?raw'
import monstersIcon from '../../assets/icons/monsters.svg.frag?raw'
import partyIcon from '../../assets/icons/party.svg.frag?raw'
import secretDoorIcon from '../../assets/icons/secret-door.svg.frag?raw'

/**
 * Door glyph (Milestone 5 — C4/C5): the same door drawing the map uses,
 * as a small inline SVG for the legend. One component, two homes — the
 * legend and the map can never disagree about what a door looks like.
 *
 * - open: a gap in the wall line — the way is passable.
 * - closed: a filled oxblood leaf across the gap.
 * - opening: a dashed gap — a plain opening, no door.
 */
export function DoorGlyph({ state, size = 20 }: { state: DoorState; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={
        state === 'open' ? 'Open passage' : state === 'closed' ? 'Closed door' : 'Plain opening'
      }
      className="inline-block shrink-0 align-middle"
    >
      {/* wall line, broken where the door sits */}
      <line x1="1" y1="12" x2="8" y2="12" stroke="#2b241f" strokeWidth="2.5" />
      <line x1="16" y1="12" x2="23" y2="12" stroke="#2b241f" strokeWidth="2.5" />
      {state === 'closed' && <rect x="8.5" y="8" width="7" height="8" fill="#8c2626" stroke="#2b241f" strokeWidth="1" />}
      {state === 'opening' && (
        <line x1="8" y1="12" x2="16" y2="12" stroke="#2b241f" strokeWidth="1.5" strokeDasharray="2 2" />
      )}
    </svg>
  )
}

const DOOR_LABELS: Record<DoorState, string> = {
  open: 'Open passage',
  closed: 'Closed door',
  opening: 'Plain opening',
}

/**
 * Collapsible map legend (C5). Every entry uses the same icon or glyph as
 * the map itself: the party banner, the goblin-head foe, the chest, the
 * door glyphs, and the secret-door icon. Secret doors are found by
 * searching (FADEE p.108) — the legend says so, so it never promises a
 * secret door is on the map.
 */
export default function MapLegend() {
  return (
    <details className="shrink-0 border-t border-stone-700 bg-stone-900/95 px-3 py-1.5">
      <summary className="cursor-pointer list-none text-xs uppercase tracking-wide text-parchment/60">
        Legend — tap to show the map&apos;s marks
      </summary>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 pb-1 text-xs text-parchment/80">
        <li className="flex items-center gap-1.5">
          <FragIcon frag={partyIcon} size={18} label="Party" />
          <span>You are here</span>
        </li>
        <li className="flex items-center gap-1.5">
          <FragIcon frag={monstersIcon} size={18} label="Foes" />
          <span>Foes — count shown on the token</span>
        </li>
        <li className="flex items-center gap-1.5">
          <FragIcon frag={chestIcon} size={18} label="Feature" />
          <span>Treasure &amp; features</span>
        </li>
        {DOOR_STATES.map((state) => (
          <li key={state} className="flex items-center gap-1.5">
            <DoorGlyph state={state} size={18} />
            <span>{DOOR_LABELS[state]}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <FragIcon frag={secretDoorIcon} size={18} label="Secret door" />
          <span>Secret door — found by searching</span>
        </li>
      </ul>
    </details>
  )
}
