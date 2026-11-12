import verminIcon from '../../assets/icons/vermin.svg.frag?raw'
import monstersIcon from '../../assets/icons/monsters.svg.frag?raw'
import undeadIcon from '../../assets/icons/undead.svg.frag?raw'
import demonIcon from '../../assets/icons/demon.svg.frag?raw'
import beastIcon from '../../assets/icons/beast.svg.frag?raw'
import constructIcon from '../../assets/icons/construct.svg.frag?raw'
import skullIcon from '../../assets/icons/skull.svg.frag?raw'
import type { MonsterFamily } from '../../rulesets/expanded/monsters'
import { cleanIconFragment } from '../common/iconUtils'

/**
 * Monster family → map icon (plan item C2), shared by the dungeon map, the
 * combat panel, and the legend so all three always agree. Goblinoid reuses
 * the goblin-head; the boss family gets the skull.
 */
const FAMILY_FRAGS: Record<MonsterFamily, string> = {
  vermin: verminIcon,
  goblinoid: monstersIcon,
  undead: undeadIcon,
  demon: demonIcon,
  beast: beastIcon,
  construct: constructIcon,
  boss: skullIcon,
}

/** Cleaned SVG fragment for a monster family, ready to render. */
export function familyFrag(family: MonsterFamily): string {
  return cleanIconFragment(FAMILY_FRAGS[family])
}
