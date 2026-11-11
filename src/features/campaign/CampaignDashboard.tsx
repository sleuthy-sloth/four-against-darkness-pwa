import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCampaignStore } from '../../state/campaignStore'
import type { CampaignMeta } from '../../database/db'
import { listCampaigns } from '../../database/repositories/campaignRepo'
import { deleteCampaignFull, duplicateCampaign } from '../../database/repositories/backupRepo'

/**
 * Campaign dashboard (PROJECT_SPEC §22): active campaign, continue, and the
 * campaign list with delete/duplicate (§17 — destructive ops confirm first).
 */
export default function CampaignDashboard() {
  const navigate = useNavigate()
  const { campaign, party, loadLastCampaign, newCampaign, loading, error } = useCampaignStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [campaigns, setCampaigns] = useState<CampaignMeta[]>([])
  const [confirmDelete, setConfirmDelete] = useState<CampaignMeta | null>(null)

  const refresh = useCallback(async () => {
    setCampaigns(await listCampaigns())
  }, [])

  useEffect(() => {
    void loadLastCampaign().then(refresh)
  }, [loadLastCampaign, refresh])

  const startNew = async () => {
    await newCampaign(name || 'New Campaign')
    setCreating(false)
    navigate('/party/new')
  }

  const doDelete = async (c: CampaignMeta) => {
    await deleteCampaignFull(c.id)
    setConfirmDelete(null)
    await refresh()
    if (campaign?.id === c.id) await loadLastCampaign()
  }

  const doDuplicate = async (c: CampaignMeta) => {
    await duplicateCampaign(c.id)
    await refresh()
  }

  const open = async (c: CampaignMeta) => {
    useCampaignStore.setState({ campaign: c })
    navigate('/party')
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
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg border border-torch/40 bg-torch/10 px-6 py-3 text-lg text-torch active:bg-torch/20"
        >
          New campaign
        </button>
      )}

      {/* campaign list (PROJECT_SPEC §17) */}
      {campaigns.length > 0 && (
        <div className="w-full max-w-md">
          <p className="mb-2 text-xs uppercase tracking-wide text-parchment/40">All campaigns</p>
          <ul className="space-y-1">
            {campaigns.map((c) => (
              <li
                key={c.id}
                className={`flex items-center gap-2 rounded border px-3 py-2 text-left ${
                  c.id === campaign?.id
                    ? 'border-torch/40 bg-torch/10'
                    : 'border-stone-700 bg-stone-900/60'
                }`}
              >
                <button onClick={() => void open(c)} className="flex-1 text-left">
                  <span className="block text-sm text-parchment">{c.name}</span>
                  <span className="text-[10px] text-parchment/40">
                    seed {c.seed} · saved {new Date(c.lastModified).toLocaleString()}
                  </span>
                </button>
                <button
                  onClick={() => void doDuplicate(c)}
                  title="Duplicate"
                  className="rounded bg-stone-800 px-2 py-1 text-[10px] text-parchment/70"
                >
                  copy
                </button>
                <button
                  onClick={() => setConfirmDelete(c)}
                  title="Delete (cannot be undone)"
                  className="rounded bg-stone-800 px-2 py-1 text-[10px] text-ember"
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60 px-3 pb-16">
          <div className="w-full rounded-lg border border-ember/50 bg-stone-900 p-4">
            <p className="text-sm text-ember">
              Delete “{confirmDelete.name}” permanently — party, dungeon, journal and checkpoints?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void doDelete(confirmDelete)}
                className="rounded border border-ember/50 bg-ember/10 px-3 py-2 text-sm text-ember"
              >
                Delete forever
              </button>
              <button onClick={() => setConfirmDelete(null)} className="rounded bg-stone-700 px-3 py-2 text-sm text-parchment">
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-ember">{error}</p>}
    </div>
  )
}
