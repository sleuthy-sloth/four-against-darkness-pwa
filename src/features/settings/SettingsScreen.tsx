import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCampaignStore } from '../../state/campaignStore'
import { useTutorialStore } from '../tutorial/tutorialStore'
import {
  exportCampaign,
  importArchive,
  listCheckpoints,
  restoreCheckpoint,
  saveCheckpoint,
  deleteCheckpoint,
  type CampaignArchive,
} from '../../database/repositories/backupRepo'
import type { CheckpointRecord } from '../../database/db'
import attribution from '../../assets/icons/attribution.json'
import { ChapterOrnament } from '../common/Ornament'

/**
 * Settings (PROJECT_SPEC §27): save management (named checkpoints, JSON
 * export/import), ruleset/credits info. Sound/haptics toggles arrive with
 * the polish milestone.
 * Milestone 3 (D6): grouped into Save / Ruleset / Credits with chapter
 * banners; credits render from attribution.json (single source of truth).
 */

/** Group attribution.json entries by author for the credits list. */
function creditsByAuthor(): Array<{ author: string; icons: string[] }> {
  const groups = new Map<string, string[]>()
  Object.entries(attribution as Record<string, string>).forEach(([icon, source]) => {
    const author = source.includes('/')
      ? source.split('/')[0]
      : 'Original art'
    const list = groups.get(author) ?? []
    list.push(icon)
    groups.set(author, list)
  })
  return [...groups.entries()]
    .map(([author, icons]) => ({ author, icons: icons.sort() }))
    .sort((a, b) => a.author.localeCompare(b.author))
}
export default function SettingsScreen() {
  const navigate = useNavigate()
  const { campaign, party, loadLastCampaign } = useCampaignStore()
  const { startTutorial, busy: tutorialBusy } = useTutorialStore()
  const [checkpoints, setCheckpoints] = useState<CheckpointRecord[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<CheckpointRecord | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async (id?: string) => {
    let cid = id
    if (!cid) {
      await loadLastCampaign()
      cid = useCampaignStore.getState().campaign?.id
    }
    setCheckpoints(cid ? await listCheckpoints(cid) : [])
  }, [loadLastCampaign])

  useEffect(() => {
    void refresh(campaign?.id)
  }, [campaign?.id, refresh])

  const doCheckpoint = async () => {
    if (!campaign) return
    const a = await exportCampaign(campaign.id)
    await saveCheckpoint(campaign.id, new Date().toLocaleString(), a)
    setMsg('Checkpoint saved.')
    await refresh(campaign.id)
  }

  const doExport = async () => {
    if (!campaign) return
    const a = await exportCampaign(campaign.id)
    const blob = new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${campaign.name.replace(/[^\w-]+/g, '_')}-4ad-export.json`
    link.click()
    URL.revokeObjectURL(url)
    setMsg('Campaign exported as JSON.')
  }

  const doImport = async (file: File) => {
    try {
      const text = await file.text()
      const archive = JSON.parse(text) as CampaignArchive
      const newId = await importArchive(archive)
      setMsg(`Imported “${archive.campaign.name}” as a new campaign.`)
      await refresh(newId)
    } catch (e) {
      setMsg(`Import failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const doRestore = async (cp: CheckpointRecord) => {
    setConfirmRestore(null)
    const id = await restoreCheckpoint(cp.id!)
    await loadLastCampaign()
    void id
    setMsg(`Checkpoint restored: “${cp.name}”.`)
    await refresh()
  }

  const live = !!campaign && party.length > 0
  const credits = useMemo(() => creditsByAuthor(), [])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-6">
      <h1 className="text-xl text-torch">Settings</h1>
      {msg && (
        <p className="mt-2 rounded bg-stone-800 px-3 py-2 text-xs text-parchment/80" onClick={() => setMsg(null)}>
          {msg}
        </p>
      )}

      <p className="chapter-banner mt-4">Save</p>
      <ChapterOrnament />
      <section className="card-folio mt-2 p-3">
        <p className="text-sm text-torch font-display">Save management (PROJECT_SPEC §18)</p>
        {!live && <p className="mt-1 text-xs text-parchment/50">Create a campaign first — saves are per campaign.</p>}
        {live && (
          <>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => void doCheckpoint()} className="rounded border border-torch/40 bg-torch/10 px-3 py-1.5 text-xs text-torch">
                Save checkpoint
              </button>
              <button onClick={() => void doExport()} className="rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-xs text-parchment">
                Export JSON
              </button>
              <button onClick={() => fileRef.current?.click()} className="rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-xs text-parchment">
                Import JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void doImport(f)
                  e.target.value = ''
                }}
              />
            </div>
            {checkpoints.length > 0 && (
              <ul className="mt-3 space-y-1">
                {checkpoints.map((cp) => (
                  <li key={cp.id} className="flex items-center gap-2 rounded bg-stone-800/60 px-2 py-1.5 text-xs">
                    <span className="flex-1 text-parchment/80">{cp.name}</span>
                    <button onClick={() => setConfirmRestore(cp)} className="rounded bg-stone-700 px-2 py-0.5 text-parchment">
                      restore
                    </button>
                    <button
                      onClick={() => {
                        void deleteCheckpoint(cp.id!).then(() => refresh())
                      }}
                      className="rounded bg-stone-700 px-2 py-0.5 text-ember"
                    >
                      delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <p className="chapter-banner mt-4">Ruleset</p>
      <ChapterOrnament />
      <section className="card-folio mt-2 p-3">
        <p className="text-xs text-parchment/70">
          Four Against Darkness — Expanded Edition. All mechanics are page-cited in
          docs/RULES_VERIFICATION.md; nothing is invented. Other environments and
          supplements land in Release 0.5+.
        </p>
      </section>

      {/* Milestone 4: restart the guided first delve (or resume it). */}
      <p className="chapter-banner mt-4">Learn to play</p>
      <ChapterOrnament />
      <section className="card-folio mt-2 p-3">
        <p className="text-xs text-parchment/70">
          A guided first delve: four adventurers, a real dungeon, and a patient voice
          walking you through exploring, fighting, searching, and resting — one lesson
          at a time. It starts a fresh tutorial campaign; a finished or skipped
          tutorial never shows again.
        </p>
        <button
          onClick={async () => {
            const route = await startTutorial()
            if (route) navigate(route)
          }}
          disabled={tutorialBusy}
          className="btn-cartouche mt-2 px-4 py-2 text-sm disabled:opacity-40"
        >
          {tutorialBusy ? 'Preparing…' : 'Learn to play'}
        </button>
      </section>

      <p className="chapter-banner mt-4">Credits</p>
      <ChapterOrnament />
      <section className="card-folio mt-2 p-3">
        <p className="text-sm text-torch font-display">Credits & licensing</p>
        <p className="mt-1 text-xs text-parchment/70">
          An original implementation of the Four Against Darkness rules. Game code and
          rules data: MIT. Four Against Darkness is © Andrea Sfiligoi /
          Grieving Willow Games; no rulebook text or art is reproduced here. Not
          affiliated with or endorsed by the publisher.
        </p>
        {/* Icon credits render from attribution.json — the single source of
            truth (D6/C8). Full per-icon sources live in ATTRIBUTION.md. */}
        <div className="mt-3 space-y-2">
          {credits.map(({ author, icons }) => (
            <div key={author}>
              <p className="font-label text-[10px] uppercase tracking-wide text-faint">
                {author === 'Original art' ? 'Original art' : `${author} · game-icons.net (CC BY 3.0)`}
              </p>
              <p className="text-xs text-parchment/70">{icons.join(' · ')}</p>
            </div>
          ))}
        </div>
      </section>

      {confirmRestore && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60 px-3 pb-16">
          <div className="w-full rounded-lg border border-ember/50 bg-stone-900 p-4">
            <p className="text-sm text-ember">
              Restore “{confirmRestore.name}”? The current campaign state is replaced by the checkpoint.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void doRestore(confirmRestore)}
                className="rounded border border-ember/50 bg-ember/10 px-3 py-2 text-sm text-ember"
              >
                Restore
              </button>
              <button onClick={() => setConfirmRestore(null)} className="rounded bg-stone-700 px-3 py-2 text-sm text-parchment">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
