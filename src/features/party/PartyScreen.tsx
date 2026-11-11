import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CORE_CLASSES } from '../../rulesets/expanded/coreClasses'
import { useCampaignStore } from '../../state/campaignStore'

/** Party dashboard (PROJECT_SPEC §24): four character cards + create flow. */
export default function PartyScreen() {
  const navigate = useNavigate()
  const { party, campaign, loading, loadLastCampaign } = useCampaignStore()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadLastCampaign().finally(() => setLoaded(true))
  }, [loadLastCampaign])

  if (!loaded || loading) {
    return <div className="screen-placeholder text-parchment/50">Loading…</div>
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-6">
      <h1 className="text-xl text-torch">Party</h1>
      {campaign && <p className="text-xs text-parchment/50">{campaign.name}</p>}

      {party.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="max-w-xs text-sm text-parchment/70">
            No adventurers yet. Form a party of four to begin.
          </p>
          <button
            onClick={() => navigate(campaign ? '/party/new' : '/campaign')}
            className="rounded-lg border border-torch/40 bg-torch/10 px-6 py-3 text-torch active:bg-torch/20"
          >
            {campaign ? 'Form your party' : 'Start a campaign first'}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {party.map((c) => {
            const def = CORE_CLASSES.find((x) => x.id === c.classId)!
            const hpPct = (c.currentLife / c.maxLife) * 100
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/party/${encodeURIComponent(c.id)}`)}
                className="block w-full rounded-lg border border-stone-700 bg-stone-800/60 p-3 text-left active:bg-stone-700/60"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-base text-parchment">{c.name}</span>
                  <span className="text-xs text-parchment/50">
                    {def.name} · L{c.level}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded bg-stone-700">
                  <div className="h-1.5 rounded bg-ember" style={{ width: `${hpPct}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-parchment/50">
                  Life {c.currentLife}/{c.maxLife} · {c.gold} gp · {c.traits.length} trait
                  {c.traits.length === 1 ? '' : 's'}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
