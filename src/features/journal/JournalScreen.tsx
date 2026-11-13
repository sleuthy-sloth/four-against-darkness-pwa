import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCampaignStore } from '../../state/campaignStore'
import { loadJournal, type JournalCategory } from '../../database/repositories/journalRepo'
import type { EventRecord } from '../../database/db'
import EmptyState from '../common/EmptyState'
import { ChapterOrnament } from '../common/Ornament'
import { stripCitations } from '../common/stripCitations'

/**
 * Journal screen (PROJECT_SPEC §26): chronological adventure history with
 * category filters. Events persist to Dexie from every engine action.
 * Milestone 3 (D4): date separators, drop caps, kit-style filter chips,
 * per-category ink, long-entry clamping with "read more", illustrated
 * empty state.
 */
const CATEGORIES: Array<JournalCategory | 'all'> = [
  'all',
  'explore',
  'combat',
  'loot',
  'search',
  'event',
]

/** Per-category ink (D4): encounters oxblood, treasure brass, story ink. */
const CATEGORY_INK: Record<JournalCategory, string> = {
  explore: 'text-parchment',
  combat: 'text-torch',
  loot: 'text-brassInk',
  search: 'text-faint',
  event: 'text-ember',
}

const CLAMP_AT = 160

function JournalEntry({ entry, dropCap }: { entry: EventRecord; dropCap: boolean }) {
  const [expanded, setExpanded] = useState(false)
  // Journal payloads are the internal record (they keep citations); the
  // player-facing rendering strips them (Release 0.5, Part B).
  const text = stripCitations(String(entry.payload))
  const long = text.length > CLAMP_AT
  return (
    <li className="rounded bg-stone-800/60 px-3 py-2 text-sm shadow-folio">
      <span
        className={`mr-2 rounded-sm border border-parchment/40 px-1.5 py-0.5 font-label text-[10px] uppercase ${CATEGORY_INK[entry.type as JournalCategory] ?? 'text-parchment'}`}
      >
        {entry.type}
      </span>
      {/* long entries clamp to three lines until expanded */}
      <span className={`${dropCap ? 'drop-cap' : ''} ${long && !expanded ? 'line-clamp-3' : ''}`}>{text}</span>
      {long && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="ml-1 text-xs text-torch underline underline-offset-2"
        >
          {expanded ? 'show less' : 'read more'}
        </button>
      )}
    </li>
  )
}

export default function JournalScreen() {
  const navigate = useNavigate()
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

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    entries.forEach((e) => m.set(e.type, (m.get(e.type) ?? 0) + 1))
    return m
  }, [entries])

  // Group by calendar date for separators (D4).
  const groups = useMemo(() => {
    const out: Array<{ date: string; entries: EventRecord[] }> = []
    shown.forEach((e) => {
      const date = new Date(e.timestamp).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      const last = out[out.length - 1]
      if (last && last.date === date) last.entries.push(e)
      else out.push({ date, entries: [e] })
    })
    return out
  }, [shown])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-6">
      {/* Delver artwork: quill, tome and candle above the journal. */}
      <img
        src={`${import.meta.env.BASE_URL}art/journal-header.webp`}
        alt=""
        aria-hidden="true"
        className="-mx-4 -mt-4 h-28 w-[calc(100%+2rem)] max-w-none object-cover"
      />
      <h1 className="mt-3 text-xl text-torch">Journal</h1>
      {/* Polish pass (P0-7): the filter chips wrap instead of scrolling
          off the right edge — on a 390px viewport "loot · 0" was cut off
          with no affordance that more chips existed. */}
      <div className="mt-2 flex flex-wrap gap-1 pb-2">
        {CATEGORIES.map((c) => {
          const count = c === 'all' ? entries.length : (counts.get(c) ?? 0)
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              aria-pressed={filter === c}
              className={`shrink-0 rounded-sm border px-3 py-1 font-label text-xs ${
                filter === c
                  ? 'border-torch bg-torch/15 text-torch'
                  : 'border-parchment/40 bg-stone-800/60 text-parchment/70'
              }`}
            >
              {c} · {count}
            </button>
          )
        })}
      </div>
      {!loaded ? (
        <p className="text-parchment/70">Loading…</p>
      ) : shown.length === 0 ? (
        <EmptyState
          kind="journal"
          title="Blank pages"
          body="Nothing recorded yet. Every room, fight and treasure is logged here as you delve."
          action={
            <button onClick={() => navigate('/dungeon')} className="btn-wax px-6 py-3">
              Explore the dungeon
            </button>
          }
        />
      ) : (
        <div className="mt-2 space-y-3">
          {groups.map((g) => (
            <section key={g.date}>
              <div className="mb-1 flex items-center gap-2">
                <span className="h-px flex-1 bg-parchment/30" />
                <p className="chapter-banner !text-[11px]">{g.date}</p>
                <span className="h-px flex-1 bg-parchment/30" />
              </div>
              <ul className="space-y-1">
                {g.entries.map((e, i) => (
                  <JournalEntry key={e.id} entry={e} dropCap={i === 0} />
                ))}
              </ul>
            </section>
          ))}
          <ChapterOrnament className="pt-2" />
        </div>
      )}
    </div>
  )
}
