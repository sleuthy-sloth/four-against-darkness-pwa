import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CORE_CLASSES } from '../../rulesets/expanded/coreClasses'
import { useCampaignStore } from '../../state/campaignStore'
import { stripCitations } from '../common/stripCitations'

/**
 * Party creation (Phase 2): pick 4 different classes (FADEE p.7), name them,
 * create. Traits roll automatically; wizard/elf spell slots get a default
 * assignment the player can change before each adventure (FADEE p.64).
 */
export default function PartyCreation() {
  const navigate = useNavigate()
  const { createParty, loading, error, clearError, campaign } = useCampaignStore()
  const [names, setNames] = useState<Record<string, string>>({})
  const [picked, setPicked] = useState<string[]>([])

  useEffect(() => {
    if (!campaign) navigate('/campaign', { replace: true })
  }, [campaign, navigate])

  const toggle = (id: string) => {
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length < 4 ? [...p, id] : p,
    )
  }

  const submit = async () => {
    const ok = await createParty(
      picked.map((classId) => ({
        classId,
        name: names[classId]?.trim() || CORE_CLASSES.find((c) => c.id === classId)!.name,
      })),
    )
    if (ok) navigate('/party')
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-6">
      <h1 className="text-xl text-torch">Form your party</h1>
      <p className="mb-3 text-xs text-parchment/60">
        Four adventurers, one of each class. Tap to choose {picked.length}/4.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {CORE_CLASSES.map((c) => {
          const selected = picked.includes(c.id)
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`rounded-lg border p-3 text-left ${
                selected ? 'border-torch bg-torch/15' : 'border-stone-700 bg-stone-800/60'
              }`}
            >
              <div className="text-base text-parchment">{c.name}</div>
            </button>
          )
        })}
      </div>

      {picked.length === 4 && (
        <div className="mt-4 space-y-3">
          {picked.map((id) => {
            const def = CORE_CLASSES.find((c) => c.id === id)!
            return (
              <label key={id} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-sm text-parchment/70">{def.name}</span>
                <input
                  value={names[id] ?? ''}
                  onChange={(e) => setNames((n) => ({ ...n, [id]: e.target.value }))}
                  placeholder={`${def.name} name`}
                  maxLength={40}
                  className="min-w-0 flex-1 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-parchment placeholder:text-parchment/30"
                />
              </label>
            )
          })}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-ember" onClick={clearError}>
          {stripCitations(error)}
        </p>
      )}

      <button
        disabled={picked.length !== 4 || loading}
        onClick={submit}
        className="mt-5 rounded-lg border border-torch/40 bg-torch/10 px-6 py-3 text-lg text-torch active:bg-torch/20 disabled:opacity-40"
      >
        {loading ? 'Creating…' : 'Create party'}
      </button>
      <button onClick={() => navigate('/campaign')} className="mt-2 p-2 text-xs text-parchment/50">
        Back
      </button>
    </div>
  )
}
