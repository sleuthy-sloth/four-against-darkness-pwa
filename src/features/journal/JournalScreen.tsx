import { useEffect, useMemo, useState } from 'react'
import { useCampaignStore } from '../../state/campaignStore'
import { loadJournal, type JournalCategory } from '../../database/repositories/journalRepo'
import type { EventRecord } from '../../database/db'

/**
 * Journal screen (PROJECT_SPEC §26): chronological adventure history with
 * category filters. Events persist to Dexie from every engine action.
 */
const CATEGORIES: Array<JournalCategory | 'all'> = [
  'all',
  'explore',
  'combat',
  'loot',
  'search',
]

export default function JournalScreen() {
  const { campaign, loadLastCampaign } = useCampaignStore()
  const [entries, setEntries] = useState<EventRecord[]>([])
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>('all')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const boot = async () => {
      let c = campaign
      if (!c) await loadLastCampaign()
      c = useCampaignStore.getState().campaign
      if (c) setEntries(await loadJournal(c.id))
      setLoaded(true)
    }
    void boot()
  }, [campaign, loadLastCampaign])

  const shown = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.type === filter)),
    [entries, filter],
  )

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-6">
      <h1 className="text-xl text-torch">Journal</h1>
      <div className="mt-2 flex gap-1 overflow-x-auto pb-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
              filter === c
                ? 'border-torch bg-torch/15 text-torch'
                : 'border-stone-700 bg-stone-800/60 text-parchment/60'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {!loaded ? (
        <p className="text-parchment/50">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="mt-4 text-sm text-parchment/60">
          Nothing recorded yet. Every room, fight and treasure is logged here.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {shown.map((e) => (
            <li key={e.id} className="rounded bg-stone-800/60 px-3 py-2 text-sm">
              <span className="mr-2 rounded bg-stone-700 px-1.5 py-0.5 text-[10px] uppercase text-parchment/60">
                {e.type}
              </span>
              {String(e.payload)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
