import FragIcon from '../common/FragIcon'
import potionFrag from '../../assets/icons/potion.svg.frag?raw'
import bandageFrag from '../../assets/icons/bandage.svg.frag?raw'
import nailsFrag from '../../assets/icons/nails.svg.frag?raw'
import ropeFrag from '../../assets/icons/rope.svg.frag?raw'
import lanternFrag from '../../assets/icons/lantern.svg.frag?raw'
import rationsFrag from '../../assets/icons/rations.svg.frag?raw'
import scrollFrag from '../../assets/icons/scroll.svg.frag?raw'
import lightArmorFrag from '../../assets/icons/light-armor.svg.frag?raw'
import heavyArmorFrag from '../../assets/icons/heavy-armor.svg.frag?raw'
import shieldFrag from '../../assets/icons/shield.svg.frag?raw'
import handWeaponFrag from '../../assets/icons/hand-weapon.svg.frag?raw'
import lightWeaponFrag from '../../assets/icons/light-weapon.svg.frag?raw'
import bowFrag from '../../assets/icons/bow.svg.frag?raw'
import lockpicksFrag from '../../assets/icons/lockpicks.svg.frag?raw'

/**
 * Inventory icons (plan item D5): every item gets its icon. Exact names map
 * directly; scrolls match by prefix; anything unrecognised (magic items
 * from the treasure tables) gets an honest "?" instead of a wrong picture.
 */
const EXACT: Record<string, string> = {
  'healing potion': potionFrag,
  'blade poison': potionFrag,
  bandage: bandageFrag,
  'bag of nails': nailsFrag,
  rope: ropeFrag,
  lantern: lanternFrag,
  rations: rationsFrag,
  'light armor': lightArmorFrag,
  'heavy armor': heavyArmorFrag,
  shield: shieldFrag,
  'hand weapon': handWeaponFrag,
  'light weapon': lightWeaponFrag,
  bow: bowFrag,
  'lock-picks': lockpicksFrag,
}

export function itemFrag(item: string): string | null {
  if (EXACT[item]) return EXACT[item]
  if (item.startsWith('scroll of ')) return scrollFrag
  return null
}

export default function ItemIcon({ item, size = 20 }: { item: string; size?: number }) {
  const frag = itemFrag(item)
  if (!frag) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-parchment/50 font-display text-xs text-parchment/70"
        style={{ width: size, height: size }}
        aria-label={`${item} (unidentified item)`}
      >
        ?
      </span>
    )
  }
  return <FragIcon frag={frag} size={size} label={item} className="text-parchment" />
}
