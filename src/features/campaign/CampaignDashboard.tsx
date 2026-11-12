import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCampaignStore } from '../../state/campaignStore'
import type { CampaignMeta } from '../../database/db'
import type { Character } from '../../rulesets/schema/character'
import { listCampaigns, loadParty } from '../../database/repositories/campaignRepo'
import { deleteCampaignFull, duplicateCampaign } from '../../database/repositories/backupRepo'
import Lockup from '../common/Lockup'
import { ClassIcon } from '../common/ClassIcon'
import { findActiveTutorialCampaign, getTaleScenarios, useTutorialStore } from '../tutorial/tutorialStore'

/**
 * Campaign dashboard (PROJECT_SPEC §22): active campaign, continue, and the
 * campaign list with delete/duplicate (§17 — destructive ops confirm first).
 * Milestone 4 adds the "Learn to play" entry and the prepared tales.
 */
export default function CampaignDashboard() {
  const navigate = useNavigate()
  const { campaign, party, loadLastCampaign, newCampaign, loading, error } = useCampaignStore()
  const { startTutorial, startScenario, busy: tutorialBusy, error: tutorialError } = useTutorialStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [campaigns, setCampaigns] = useState<CampaignMeta[]>([])
  const [parties, setParties] = useState<Record<string, Character[]>>({})
  const [confirmDelete, setConfirmDelete] = useState<CampaignMeta | null>(null)
  const [hasLiveTutorial, setHasLiveTutorial] = useState(false)
  const tales = getTaleScenarios()

  const refresh = useCallback(async () => {
    const list = await listCampaigns()
    setCampaigns(list)
    setHasLiveTutorial(!!(await findActiveTutorialCampaign()))
    // Party composition per campaign card (D6): one Dexie read per campaign.
    const loaded: Record<string, Character[]> = {}
    await Promise.all(
      list.map(async (c) => {
        loaded[c.id] = await loadParty(c.id)
      }),
    )
    setParties(loaded)
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

  /** Milestone 4: start (or resume) the guided first delve. */
  const learnToPlay = async () => {
    const route = await startTutorial()
    if (route) navigate(route)
  }

  /** Milestone 4: begin a prepared tale — party and seed in one tap. */
  const beginTale = async (scenarioId: string) => {
    const route = await startScenario(scenarioId)
    if (route) navigate(route)
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 overflow-y-auto p-6 text-center">
      <div className="space-y-2">
        <h1 className="sr-only">Four Against Darkness</h1>
        <Lockup className="mx-auto w-64" />
        <p className="text-sm text-parchment/70">
          {campaign
            ? `${campaign.name} · ${party.length}/4 adventurers`
            : 'Solo dungeon crawler — no campaign yet.'}
        </p>
      </div>

      {campaign && !creating ? (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={() => navigate(party.length === 4 ? '/party' : '/party/new')}
            className="btn-wax px-6 py-3 text-lg"
          >
            {party.length === 4 ? 'Continue' : 'Form your party'}
          </button>
          {/* D6: starting a new campaign is a primary action beside Continue, not hidden */}
          <button onClick={() => setCreating(true)} className="btn-cartouche px-6 py-2.5">
            New campaign
          </button>
          <button
            onClick={() => void learnToPlay()}
            disabled={tutorialBusy}
            className="btn-cartouche px-6 py-2.5 disabled:opacity-40"
          >
            {hasLiveTutorial ? 'Continue the tutorial' : 'Learn to play'}
          </button>
        </div>
      ) : creating ? (
        <div className="flex w-full max-w-xs flex-col gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
            maxLength={40}
            className="ledger-input"
          />
          <button
            onClick={startNew}
            disabled={loading}
            className="btn-wax px-6 py-3 disabled:opacity-40"
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
            onClick={() => setCreating(true)}
            className="btn-wax px-6 py-3 text-lg"
          >
            New campaign
          </button>
          <button
            onClick={() => void learnToPlay()}
            disabled={tutorialBusy}
            className="btn-cartouche px-6 py-2.5 disabled:opacity-40"
          >
            {hasLiveTutorial ? 'Continue the tutorial' : 'Learn to play'}
          </button>
        </div>
      )}

      {tutorialError && <p className="text-sm text-ember">{tutorialError}</p>}

      {/* Milestone 4: prepared tales — pre-formed parties on fixed seeds. */}
      <div className="w-full max-w-md">
        <p className="mb-1 text-xs uppercase tracking-wide text-parchment/40">Tales to begin</p>
        <p className="mb-3 text-xs text-parchment/60">
          Three delves, already prepared — the party is formed, the dungeon is seeded, and the
          backstory is written in your journal when you begin.
        </p>
        <ul className="space-y-3 text-left">
          {tales.map((tale) => (
            <li key={tale.id} className="card-folio p-3">
              <p className="font-display text-base text-torch">{tale.name}</p>
              <p className="mt-1 text-sm leading-snug text-parchment">{tale.backstory}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {tale.party.map((m) => (
                  <span key={m.classId} className="flex items-center gap-1 text-xs text-parchment/80">
                    <ClassIcon classId={m.classId} className="h-5 w-5" />
                    {m.name}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs italic text-faint">{tale.goal}</p>
              <button
                onClick={() => void beginTale(tale.id)}
                disabled={tutorialBusy}
                className="btn-cartouche mt-3 w-full px-4 py-2 disabled:opacity-40"
              >
                Begin this tale
              </button>
            </li>
          ))}
        </ul>
      </div>

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
                    seed {c.seed} · last played {new Date(c.lastModified).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  {/* party composition icons (D6) */}
                  {(parties[c.id] ?? []).length > 0 && (
                    <span className="mt-1 flex items-center gap-1">
                      {(parties[c.id] ?? []).map((pc) => (
                        <ClassIcon key={pc.id} classId={pc.classId} className="h-5 w-5" />
                      ))}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => void doDuplicate(c)}
                  aria-label={`Duplicate campaign ${c.name}`}
                  title="Duplicate"
                  className="rounded bg-stone-800 p-2 text-parchment/70"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="9" y="9" width="11" height="11" rx="1" />
                    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                  </svg>
                </button>
                <button
                  onClick={() => setConfirmDelete(c)}
                  aria-label={`Delete campaign ${c.name}`}
                  title="Delete (cannot be undone)"
                  className="rounded bg-stone-800 p-2 text-ember"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 5 L19 19 M19 5 L5 19" />
                  </svg>
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
