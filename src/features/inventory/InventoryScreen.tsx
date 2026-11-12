import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCampaignStore } from '../../state/campaignStore'
import { useDungeonStore } from '../../state/dungeonStore'
import { ITEM_INFO, SHOP_STOCK, sameBuild, NO_MAGIC_CLASSES } from '../../rulesets/expanded/features'
import { applyBandage, drinkHealingPotion } from '../../engine/combat/combat'
import { saveParty } from '../../database/repositories/campaignRepo'
import type { Character } from '../../rulesets/schema/character'
import ItemIcon from './ItemIcon'
import EmptyState from '../common/EmptyState'
import { CoinDevice } from '../common/Ornament'
import { stripCitations } from '../common/stripCitations'

/**
 * Inventory screen (PROJECT_SPEC §25): party equipment, gold, consumables.
 * Exchange rules per FADEE p.111: outside combat; armor only between same
 * builds; spells/prayers are never equipment; scrolls can be exchanged.
 * Milestone 3 (D5): every item gets its icon, gold is a brass numeral with
 * a coin device, consumable counts are badges, and unusable-here items are
 * visibly disabled with the reason instead of silently absent.
 */
export default function InventoryScreen() {
  const navigate = useNavigate()
  const { party, campaign, loadLastCampaign } = useCampaignStore()
  const { dungeon, error, clearError, buyItem, useInventoryItem, useMapFragment, useOintment } = useDungeonStore()
  const [msg, setMsg] = useState<string | null>(null)
  const [moveItem, setMoveItem] = useState<{ pcId: string; item: string } | null>(null)
  const [buying, setBuying] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Deep-link / PWA-relaunch safety: the store starts empty on a fresh
  // load, so reload the last campaign like the other screens do — otherwise
  // a real party would read as "Empty packs".
  useEffect(() => {
    loadLastCampaign().finally(() => setLoaded(true))
  }, [loadLastCampaign])

  if (!loaded) {
    return <div className="screen-placeholder text-parchment/50">Loading…</div>
  }

  if (!party.length) {
    return (
      <EmptyState
        kind="inventory"
        title="Empty packs"
        body="No party, no packs. Create a party first — every adventurer starts with a class kit."
        action={
          <button onClick={() => navigate(campaign ? '/party/new' : '/campaign')} className="btn-wax px-6 py-3">
            {campaign ? 'Form your party' : 'Start a campaign first'}
          </button>
        }
      />
    )
  }
  const inCombat = !!dungeon?.combat
  const living = party.filter((p) => p.status !== 'dead')

  const exchange = async (from: Character, item: string, to: Character) => {
    const idx = from.equipment.indexOf(item)
    if (idx < 0) return
    // Armor exchange: same build only (FADEE p.111).
    if (item.includes('armor') && !sameBuild(from.classId, to.classId)) {
      setMsg(`${from.name} and ${to.name} are not the same build — armor does not fit.`)
      return
    }
    if (item.includes('heavy armor') || item.includes('light armor')) {
      //Armor: exchange only OUTSIDE combat (FADEE p.111: hand-held only in combat)
      if (inCombat) {
        setMsg('During combat only hand-held equipment may be exchanged.')
        return
      }
    } else if (inCombat) {
      setMsg('Exchanging hand-held items in combat costs both PCs 1 turn each.')
      return
    }
    from.equipment.splice(idx, 1)
    to.equipment.push(item)
    setMoveItem(null)
    setMsg(`${item} moved from ${from.name} to ${to.name}.`)
    if (campaign) await saveParty(campaign.id, party)
  }

  const useItem = async (pc: Character, item: string) => {
    try {
      if (item === 'healing potion') {
        if (inCombat) return // combat potion lives in the combat panel
        setMsg(drinkHealingPotion(null, pc))
      } else if (item === 'bandage') {
        if (inCombat) {
          setMsg('Bandages may not be applied in combat.')
          return
        }
        setMsg(applyBandage(pc))
      } else if (
        item === 'Chanterelle' ||
        item.startsWith('Phoenix Mushroom') ||
        item.startsWith('white angel') ||
        item === 'Brown Cap Delight'
      ) {
        // Rare-mushroom effects (R152) via the store.
        await useInventoryItem(pc.id, item)
        setMsg(`${item} used — see the Journal for the effect.`)
      } else if (item === 'Map Fragment') {
        await useMapFragment(pc.id)
        setMsg('The map fragment is studied — the next tile is pre-rolled.')
      } else if (item === "Miners' Ointment") {
        await useOintment(pc.id)
        setMsg("Miners' Ointment applied — the next Wandering Monster arrival is ignored.")
      } else {
        setMsg(`${item}: ${ITEM_INFO[item]?.text ?? 'usable when the rules apply.'}`)
        return
      }
      if (campaign) await saveParty(campaign.id, party)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }

  /** Collapse duplicate equipment strings into (item, count) rows. */
  const grouped = (equipment: string[]): Array<{ item: string; count: number }> => {
    const rows: Array<{ item: string; count: number }> = []
    equipment.forEach((item) => {
      const row = rows.find((r) => r.item === item)
      if (row) row.count += 1
      else rows.push({ item, count: 1 })
    })
    return rows
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-6">
      <h1 className="text-xl text-torch">Inventory</h1>
      {(msg || error) && (
        <p className="mt-2 rounded bg-stone-800 px-3 py-2 text-xs text-parchment/80" onClick={() => { setMsg(null); clearError() }}>
          {stripCitations(msg ?? error ?? '')}
        </p>
      )}
      {inCombat && <p className="mt-2 text-xs text-ember">Combat is active — armor may not be exchanged; use the combat panel for potions.</p>}
      {!inCombat && (
        <div className="mt-3 rounded-lg border border-stone-700 bg-stone-900/70 p-3">
          <p className="text-sm text-torch">Outfitter (between adventures)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SHOP_STOCK.map((item) => (
              <button
                key={item}
                onClick={() => setBuying(item)}
                className="flex items-center gap-1.5 rounded border border-stone-600 bg-stone-800 px-2.5 py-1.5 text-xs text-parchment"
                title={ITEM_INFO[item].text}
              >
                <ItemIcon item={item} size={16} />
                {item} · {ITEM_INFO[item].price}gp
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-parchment/40">Tap an item, then who carries it. Armor and weapons come from class kits; magic-item services land with the supplements milestone.</p>
        </div>
      )}
      <div className="mt-3 space-y-3">
        {party.map((pc) => (
          <div key={pc.id} className="rounded-lg border border-stone-700 bg-stone-900/70 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-parchment">
                {pc.name} <span className="text-parchment/50">({pc.classId} L{pc.level})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CoinDevice size={14} />
                <span className="font-mono text-sm font-bold text-brass">{pc.gold}</span>
                <span className="text-xs text-parchment/60">gp</span>
              </span>
            </div>
            {pc.status === 'dead' && <p className="text-xs text-ember">Dead — allies may loot the body.</p>}
            <ul className="mt-2 space-y-1">
              {grouped(pc.equipment).map(({ item, count }) => {
                const noMagic = NO_MAGIC_CLASSES.has(pc.classId) && (item.startsWith('scroll') || item === 'healing potion')
                const isBandage = item === 'bandage'
                const isPotion = item === 'healing potion'
                const usable = !noMagic && (isPotion || isBandage) && pc.status !== 'dead'
                // Why an item can't be used here, shown instead of hiding the action (D5).
                const disabledReason = noMagic
                  ? 'barbarians may not use this'
                  : isBandage && inCombat
                    ? 'never in combat (p.83)'
                    : isPotion && inCombat
                      ? 'use in the combat panel'
                      : null
                return (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <ItemIcon item={item} size={20} />
                    <span className="flex-1 text-parchment/90">
                      {item}
                      {count > 1 && (
                        <span className="ml-1.5 rounded-full border border-torch/50 bg-torch/10 px-1.5 py-0.5 font-mono text-[10px] text-torch">
                          ×{count}
                        </span>
                      )}
                    </span>
                    {disabledReason && <span className="text-[10px] text-ember">{disabledReason}</span>}
                    {usable && !inCombat && (
                      <button
                        onClick={() => void useItem(pc, item)}
                        className="rounded bg-stone-700 px-2 py-0.5 text-[10px] text-parchment"
                      >
                        use
                      </button>
                    )}
                    {usable && inCombat && isPotion && (
                      <button
                        disabled
                        title="Healing potions are used from the combat panel during a fight."
                        className="rounded bg-stone-700 px-2 py-0.5 text-[10px] text-parchment/40"
                      >
                        use
                      </button>
                    )}
                    {usable && inCombat && isBandage && (
                      <button
                        disabled
                        title="Bandages may not be applied in combat."
                        className="rounded bg-stone-700 px-2 py-0.5 text-[10px] text-parchment/40"
                      >
                        use
                      </button>
                    )}
                    {pc.status !== 'dead' && !item.startsWith('scroll of ') && !ITEM_INFO[item] && (
                      <button
                        onClick={() => setMoveItem({ pcId: pc.id, item })}
                        className="rounded bg-stone-700 px-2 py-0.5 text-[10px] text-parchment"
                      >
                        give
                      </button>
                    )}
                    {pc.status !== 'dead' && item.startsWith('scroll of ') && (
                      <button
                        onClick={() => setMoveItem({ pcId: pc.id, item })}
                        className="rounded bg-stone-700 px-2 py-0.5 text-[10px] text-parchment"
                      >
                        give
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
            {pc.conditions.filter((c) => c !== 'prayer:healing:n' && c !== 'prayer:blessing:n').length > 0 && (
              <p className="mt-1 text-[10px] text-ember/80">
                Conditions: {pc.conditions.filter((c) => !c.startsWith('prayer:')).join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
      {moveItem && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60 px-3 pb-16">
          <div className="w-full rounded-lg border border-torch/40 bg-stone-900 p-4">
            <p className="text-sm text-torch">Give “{moveItem.item}” to whom?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {living
                .filter((p) => p.id !== moveItem.pcId)
                .map((to) => {
                  const from = party.find((p) => p.id === moveItem.pcId)!
                  const blocked =
                    moveItem.item.includes('armor') && !sameBuild(from.classId, to.classId)
                  return (
                    <button
                      key={to.id}
                      disabled={blocked}
                      onClick={() => void exchange(from, moveItem.item, to)}
                      className="rounded border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-parchment disabled:opacity-40"
                    >
                      {to.name}
                      {blocked && ' (different build)'}
                    </button>
                  )
                })}
              <button onClick={() => setMoveItem(null)} className="rounded bg-stone-700 px-3 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {buying && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60 px-3 pb-16">
          <div className="w-full rounded-lg border border-torch/40 bg-stone-900 p-4">
            <p className="flex items-center gap-1.5 text-sm text-torch">
              Who buys the {buying} (<CoinDevice size={14} />
              <span className="font-mono font-bold text-brass">{ITEM_INFO[buying].price}</span> gp)?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {living.map((p) => (
                <button
                  key={p.id}
                  disabled={p.gold < ITEM_INFO[buying].price}
                  onClick={() => {
                    void buyItem(p.id, buying)
                    setMsg(`${p.name} buys ${buying}.`)
                    setBuying(null)
                  }}
                  className="flex items-center gap-1.5 rounded border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-parchment disabled:opacity-40"
                >
                  <ItemIcon item={buying} size={16} />
                  {p.name} ({p.gold}gp)
                </button>
              ))}
              <button onClick={() => setBuying(null)} className="rounded bg-stone-700 px-3 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
