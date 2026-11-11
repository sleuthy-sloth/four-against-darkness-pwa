import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCampaignStore } from '../../state/campaignStore'

/**
 * Campaign dashboard (PROJECT_SPEC §22). Phase 2: create a campaign, then
 * form the party. Dungeon exploration arrives in Phase 3.
 */
export default function CampaignDashboard() {
  const navigate = useNavigate()
  const { campaign, party, loadLastCampaign, newCampaign, loading, error } = useCampaignStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    void loadLastCampaign()
  }, [loadLastCampaign])

  const startNew = async () => {
    await newCampaign(name || 'New Campaign')
    setCreating(false)
    navigate('/party/new')
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl text-torch">Four Against Darkness</h1>
        <p className="text-sm text-parchment/70">
          {campaign
            ? `${campaign.name} · ${party.length}/4 adventurers`
            : 'Solo dungeon crawler — no campaign yet.'}
        </p>
      </div>

      {campaign ? (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={() => navigate(party.length === 4 ? '/party' : '/party/new')}
            className="rounded-lg border border-torch/40 bg-torch/10 px-6 py-3 text-lg text-torch active:bg-torch/20"
          >
            {party.length === 4 ? 'Continue' : 'Form your party'}
          </button>
          <button
            onClick={() => navigate('/party')}
            className="rounded-lg border border-stone-700 bg-stone-800/60 px-6 py-2 text-sm text-parchment/80"
          >
            Party screen
          </button>
        </div>
      ) : creating ? (
        <div className="flex w-full max-w-xs flex-col gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
            maxLength={40}
            className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-parchment placeholder:text-parchment/30"
          />
          <button
            onClick={startNew}
            disabled={loading}
            className="rounded-lg border border-torch/40 bg-torch/10 px-6 py-3 text-torch disabled:opacity-40"
          >
            {loading ? 'Creating…' : 'Create campaign'}
          </button>
          <button onClick={() => setCreating(false)} className="p-2 text-xs text-parchment/50">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={() => navigate('/party')}
            className="rounded-lg border border-stone-700 bg-stone-800/60 px-6 py-3 text-parchment/80"
          >
            Continue
          </button>
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg border border-torch/40 bg-torch/10 px-6 py-3 text-lg text-torch active:bg-torch/20"
          >
            New campaign
          </button>
        </div>
      )}

      {error && <p className="text-sm text-ember">{error}</p>}
      <p className="phase-note">
        Party creation live · dungeon generation arrives in Phase 3
      </p>
    </div>
  )
}
