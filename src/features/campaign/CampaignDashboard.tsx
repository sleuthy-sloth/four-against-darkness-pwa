import { NavLink } from 'react-router-dom'
import { TABS } from '../../app/navigation'

/**
 * Campaign dashboard (Part VII §22). Phase 1 scope: shows the app is alive and
 * routes to the campaign flow; campaign persistence arrives in Phase 6.
 * Real content (party summary, last-save status, continue button) is
 * deliberately absent until the campaign engine exists — no fake data.
 */
export default function CampaignDashboard() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl text-torch">Four Against Darkness</h1>
        <p className="text-sm text-parchment/70">
          Solo dungeon crawler — no campaign yet.
        </p>
      </div>
      <NavLink
        to="/dungeon"
        className="rounded-lg border border-torch/40 bg-torch/10 px-6 py-3 text-lg text-torch active:bg-torch/20"
      >
        Enter the dungeon
      </NavLink>
      <p className="phase-note">
        Campaign creation arrives in Phase 6 · party creation in Phase 2
      </p>
    </div>
  )
}
