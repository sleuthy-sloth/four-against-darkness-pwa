import warrior from '../../assets/icons/warrior.svg.frag?raw'
import barbarian from '../../assets/icons/barbarian.svg.frag?raw'
import dwarf from '../../assets/icons/dwarf.svg.frag?raw'
import elf from '../../assets/icons/elf.svg.frag?raw'
import halfling from '../../assets/icons/halfling.svg.frag?raw'
import cleric from '../../assets/icons/cleric.svg.frag?raw'
import rogue from '../../assets/icons/rogue.svg.frag?raw'
import wizard from '../../assets/icons/wizard.svg.frag?raw'
import party from '../../assets/icons/party.svg.frag?raw'
import { cleanIconFragment } from './iconUtils'

/**
 * Class portrait icons — art from game-icons.net (CC BY 3.0; see
 * ../../assets/icons/ATTRIBUTION.md). Rendered with currentColor so the
 * theme palette applies.
 */
const ICONS: Record<string, string> = {
  warrior,
  barbarian,
  dwarf,
  elf,
  halfling,
  cleric,
  rogue,
  wizard,
  party,
}

/** Class colors from the dungeon palette (Tailwind classes). */
export const CLASS_COLORS: Record<string, string> = {
  warrior: 'text-torch',
  barbarian: 'text-ember',
  dwarf: 'text-ember/80',
  elf: 'text-parchment',
  halfling: 'text-torch/80',
  cleric: 'text-parchment/90',
  rogue: 'text-parchment/70',
  wizard: 'text-torch/70',
  party: 'text-torch',
}

/**
 * Class portrait icons — art from game-icons.net (CC BY 3.0; see
 * ../../assets/icons/ATTRIBUTION.md). Rendered with currentColor so the
 * theme palette applies.
 *
 * Phase G: the icon is decorative by default (`aria-hidden`) — it always
 * sits next to the class name in visible text, or inside a button whose
 * accessible name already names the class. Pass `label` only when the icon
 * stands alone (campaign-card composition icons), and pass the HUMAN name
 * ("Cleric"), never the raw id ("cleric").
 */
export function ClassIcon({
  classId,
  className = 'w-10 h-10',
  label,
}: {
  classId: string
  className?: string
  /** Human-readable label when the icon stands alone; omit for decorative use. */
  label?: string
}) {
  const frag = ICONS[classId] ?? ICONS.party
  const cls = CLASS_COLORS[classId] ?? 'text-torch'
  return (
    <span
      className={`inline-block ${className} ${cls}`}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <svg viewBox="0 0 512 512" width="100%" height="100%" fill="currentColor">
        <g dangerouslySetInnerHTML={{ __html: cleanIconFragment(frag) }} />
      </svg>
    </span>
  )
}

export function PartyIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return <ClassIcon classId="party" className={className} />
}
