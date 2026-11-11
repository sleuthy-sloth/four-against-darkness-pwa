import { useCallback, useEffect, useRef, useState } from 'react'
import { useCampaignStore } from '../../state/campaignStore'
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

/**
 * Settings (PROJECT_SPEC §27): save management (named checkpoints, JSON
 * export/import), ruleset/credits info. Sound/haptics toggles arrive with
 * the polish milestone.
 */
export default function SettingsScreen() {
  const { campaign, party, loadLastCampaign } = useCampaignStore()
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

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-6">
      <h1 className="text-xl text-torch">Settings</h1>
      {msg && (
        <p className="mt-2 rounded bg-stone-800 px-3 py-2 text-xs text-parchment/80" onClick={() => setMsg(null)}>
          {msg}
        </p>
      )}

      <section className="card-folio p-3">
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

      <section className="card-folio p-3">
        <p className="text-sm text-torch font-display">Ruleset</p>
        <p className="mt-1 text-xs text-parchment/70">
          Four Against Darkness — Expanded Edition. All mechanics are page-cited in
          docs/RULES_VERIFICATION.md; nothing is invented. Other environments and
          supplements land in Release 0.5+.
        </p>
      </section>

      <section className="card-folio p-3">
        <p className="text-sm text-torch font-display">Credits & licensing</p>
        <p className="mt-1 text-xs text-parchment/70">
          An original implementation of the Four Against Darkness rules. Game code and
          rules data: MIT. Icon art from game-icons.net (CC BY 3.0 — see
          src/assets/icons/ATTRIBUTION.md). Four Against Darkness is © Andrea Sfiligoi /
          Grieving Willow Games; no rulebook text or art is reproduced here. Not
          affiliated with or endorsed by the publisher.
        </p>
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
