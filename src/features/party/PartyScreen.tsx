import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CORE_CLASSES } from '../../rulesets/expanded/coreClasses'
import { useCampaignStore } from '../../state/campaignStore'
import { useDungeonStore } from '../../state/dungeonStore'
import { ClassIcon } from '../common/ClassIcon'
import EmptyState from '../common/EmptyState'
import { CoinDevice } from '../common/Ornament'

/** Party dashboard (PROJECT_SPEC §24): four character cards + create flow.
 * Milestone 3 (D2): no duplicated class text, Life numerals at both ends of
 * the bar with a delta flash on change, a party footer, and labelled
 * reorder controls. */
export default function PartyScreen() {
  const navigate = useNavigate()
  const { party, campaign, loading, loadLastCampaign } = useCampaignStore()
  const { pendingXp } = useDungeonStore()
  const [loaded, setLoaded] = useState(false)

  // Life delta flash (D2): PCs whose Life changed since the last render get
  // a one-shot ember pulse on the Life row; cleared after the animation.
  const prevLife = useRef<Record<string, number>>({})
  const [flashIds, setFlashIds] = useState<ReadonlySet<string>>(new Set())
  useEffect(() => {
    const changed = party
      .filter((p) => prevLife.current[p.id] !== undefined && prevLife.current[p.id] !== p.currentLife)
      .map((p) => p.id)
    party.forEach((p) => {
      prevLife.current[p.id] = p.currentLife
    })
    if (changed.length === 0) return
    setFlashIds(new Set(changed))
    const t = setTimeout(() => setFlashIds(new Set()), 700)
    return () => clearTimeout(t)
  }, [party])

  useEffect(() => {
    loadLastCampaign().finally(() => setLoaded(true))
  }, [loadLastCampaign])

  if (!loaded || loading) {
    return <div className="screen-placeholder text-parchment/50">Loading…</div>
  }

  /** Marching order = party array order (FADEE pp.97, 104, 163). */
  const reorder = async (from: number, to: number): Promise<void> => {
    if (!campaign) return
    const chars = [...party]
    const [moved] = chars.splice(from, 1)
    chars.splice(to, 0, moved)
    useCampaignStore.setState({ party: chars })
    const { saveParty } = await import('../../database/repositories/campaignRepo')
    await saveParty(campaign.id, chars)
  }

  const totalGold = party.reduce((n, p) => n + p.gold, 0)
  const xpBanked = pendingXp ? pendingXp.major + (pendingXp.minor ? 1 : 0) + (pendingXp.boss ? 1 : 0) : 0

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-6">
      {/* Delver artwork: the dungeon entrance, cropped to a banner. */}
      <img
        src={`${import.meta.env.BASE_URL}art/delve-entrance.webp`}
        alt=""
        aria-hidden="true"
        className="-mx-4 -mt-4 h-44 w-[calc(100%+2rem)] max-w-none object-cover object-top"
      />
      <h1 className="mt-3 text-xl text-torch">Party</h1>
      {campaign && <p className="text-xs text-parchment/50">{campaign.name}</p>}

      {party.length === 0 ? (
        <EmptyState
          kind="party"
          title="Four chairs, empty"
          body="No adventurers yet. Form a party of four to begin the delve."
          action={
            <button
              onClick={() => navigate(campaign ? '/party/new' : '/campaign')}
              className="btn-wax px-6 py-3"
            >
              {campaign ? 'Form your party' : 'Start a campaign first'}
            </button>
          }
        />
      ) : (
        <>
          <div className="mt-3 space-y-2">
            {party.map((c, idx) => {
              const def = CORE_CLASSES.find((x) => x.id === c.classId)!
              const hpPct = (c.currentLife / c.maxLife) * 100
              // The default name IS the class name ("Cleric") — repeating it
              // on the second line duplicates text. Show the class only
              // when the player renamed the character.
              const classLine = c.name === def.name ? `L${c.level}` : `${def.name} · L${c.level}`
              return (
                <div key={c.id} className="card-folio p-3">
                  <button
                    onClick={() => navigate(`/party/${encodeURIComponent(c.id)}`)}
                    className="block w-full text-left active:opacity-80"
                    aria-label={`${c.name}, ${def.name}, level ${c.level}, ${c.currentLife} of ${c.maxLife} Life`}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="flex items-center gap-2 text-base text-parchment">
                        <ClassIcon classId={c.classId} className="w-7 h-7 shrink-0" />
                        {idx + 1}. {c.name}
                      </span>
                      <span className="text-xs text-parchment/50">{classLine}</span>
                    </div>
                    {/* Life bar with numerals at both ends (D2) */}
                    <div className={flashIds.has(c.id) ? 'life-delta rounded-sm px-1 -mx-1' : ''}>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="font-mono text-[11px] text-parchment/60">{c.currentLife}</span>
                        <div className="h-1.5 flex-1 rounded bg-stone-700">
                          <div className="h-1.5 rounded bg-ember" style={{ width: `${hpPct}%` }} />
                        </div>
                        <span className="font-mono text-[11px] text-parchment/60">{c.maxLife}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-parchment/50">
                        Life · {c.gold} gp · {c.traits.length} trait{c.traits.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  </button>
                  {/* Marching order (FADEE pp.97, 104): first = leader; position
                      4 eats falling stones, rearmost eats ambush hits. */}
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-parchment/40">
                    <span aria-hidden="true" className="tracking-tighter text-parchment/30">⋮⋮</span>
                    <span>{idx === 0 ? 'leading' : idx === 3 ? 'rearmost' : `position ${idx + 1}`}</span>
                    {idx > 0 && (
                      <button
                        onClick={() => void reorder(idx, idx - 1)}
                        aria-label={`Move ${c.name} up in marching order`}
                        className="rounded bg-stone-700 px-2 py-0.5 text-parchment/80"
                      >
                        ▲
                      </button>
                    )}
                    {idx < party.length - 1 && (
                      <button
                        onClick={() => void reorder(idx, idx + 1)}
                        aria-label={`Move ${c.name} down in marching order`}
                        className="rounded bg-stone-700 px-2 py-0.5 text-parchment/80"
                      >
                        ▼
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Party footer (D2): pooled gold, banked XP rolls, marching-order note */}
          <div className="mt-3 rounded-lg border border-stone-700 bg-stone-900/70 px-3 py-2 text-xs text-parchment/70">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                <CoinDevice size={14} />
                <span className="font-mono text-sm font-bold text-brass">{totalGold}</span> gp pooled
              </span>
              {xpBanked > 0 && <span>{xpBanked} XP roll{xpBanked === 1 ? '' : 's'} banked — spend in the combat panel</span>}
            </div>
            <p className="mt-1 text-[10px] text-parchment/40">
              Marching order: leader first — position 4 takes falling stones, the rearmost takes ambush hits.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
