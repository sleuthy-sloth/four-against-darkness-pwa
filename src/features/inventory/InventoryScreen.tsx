import { useState } from 'react'
import { useCampaignStore } from '../../state/campaignStore'
import { useDungeonStore } from '../../state/dungeonStore'
import { ITEM_INFO, SHOP_STOCK, sameBuild, NO_MAGIC_CLASSES } from '../../rulesets/expanded/features'
import { applyBandage, drinkHealingPotion } from '../../engine/combat/combat'
import { saveParty } from '../../database/repositories/campaignRepo'
import type { Character } from '../../rulesets/schema/character'

/**
 * Inventory screen (PROJECT_SPEC §25): party equipment, gold, consumables.
 * Exchange rules per FADEE p.111: outside combat; armor only between same
 * builds; spells/prayers are never equipment; scrolls can be exchanged.
 */
export default function InventoryScreen() {
  const { party, campaign } = useCampaignStore()
  const { dungeon, error, clearError, buyItem } = useDungeonStore()
  const [msg, setMsg] = useState<string | null>(null)
  const [moveItem, setMoveItem] = useState<{ pcId: string; item: string } | null>(null)
  const [buying, setBuying] = useState<string | null>(null)

  if (!party.length) {
    return <div className="p-4 text-parchment/60">Create a party first.</div>
  }
  const inCombat = !!dungeon?.combat
  const living = party.filter((p) => p.status !== 'dead')

  const exchange = async (from: Character, item: string, to: Character) => {
    const idx = from.equipment.indexOf(item)
    if (idx < 0) return
    // Armor exchange: same build only (FADEE p.111).
    if (item.includes('armor') && !sameBuild(from.classId, to.classId)) {
      setMsg(`${from.name} and ${to.name} are not the same build — armor does not fit. (FADEE p.111)`)
      return
    }
    if (item.includes('heavy armor') || item.includes('light armor')) {
      //Armor: exchange only OUTSIDE combat (FADEE p.111: hand-held only in combat)
      if (inCombat) {
        setMsg('During combat only hand-held equipment may be exchanged. (FADEE p.111)')
        return
      }
    } else if (inCombat) {
      setMsg('Exchanging hand-held items in combat costs both PCs 1 turn each. (FADEE p.111 — timing not yet simulated)')
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
          setMsg('Bandages may not be applied in combat. (FADEE p.83)')
          return
        }
        setMsg(applyBandage(pc))
      } else {
        setMsg(`${item}: ${ITEM_INFO[item]?.text ?? 'usable when the rules apply.'}`)
        return
      }
      if (campaign) await saveParty(campaign.id, party)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-6">
      <h1 className="text-xl text-torch">Inventory</h1>
      {(msg || error) && (
        <p className="mt-2 rounded bg-stone-800 px-3 py-2 text-xs text-parchment/80" onClick={() => { setMsg(null); clearError() }}>
          {msg ?? error}
        </p>
      )}
      {inCombat && <p className="mt-2 text-xs text-ember">Combat is active — armor may not be exchanged; use the combat panel for potions.</p>}
      {!inCombat && (
        <div className="mt-3 rounded-lg border border-stone-700 bg-stone-900/70 p-3">
          <p className="text-sm text-torch">Outfitter (between adventures — FADEE pp.82-85)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SHOP_STOCK.map((item) => (
              <button
                key={item}
                onClick={() => setBuying(item)}
                className="rounded border border-stone-600 bg-stone-800 px-2.5 py-1.5 text-xs text-parchment"
                title={ITEM_INFO[item].text}
              >
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
              <span className="text-torch">{pc.gold} gp</span>
            </div>
            {pc.status === 'dead' && <p className="text-xs text-ember">Dead — allies may loot the body (FADEE p.104).</p>}
            <ul className="mt-2 space-y-1">
              {pc.equipment.map((item, i) => (
                <li key={`${item}-${i}`} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-parchment/90">
                    {item}
                    {ITEM_INFO[item] && <span className="ml-1 text-[10px] text-parchment/40">{ITEM_INFO[item].source}</span>}
                  </span>
                  {NO_MAGIC_CLASSES.has(pc.classId) && (item.startsWith('scroll') || item === 'healing potion') && (
                    <span className="text-[10px] text-ember">barbarians may not use this</span>
                  )}
                  {!NO_MAGIC_CLASSES.has(pc.classId) && (item === 'healing potion' || item === 'bandage') && pc.status !== 'dead' && (
                    <button
                      onClick={() => void useItem(pc, item)}
                      className="rounded bg-stone-700 px-2 py-0.5 text-[10px] text-parchment"
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
              ))}
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
            <p className="text-sm text-torch">Who buys the {buying} ({ITEM_INFO[buying].price}gp)?</p>
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
                  className="rounded border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-parchment disabled:opacity-40"
                >
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
