import { Navigate, Route, Routes } from 'react-router-dom'
import { firstTabPath } from './navigation'
import CampaignDashboard from '../features/campaign/CampaignDashboard'
import DungeonScreen from '../features/dungeon/DungeonScreen'
import PartyScreen from '../features/party/PartyScreen'
import PartyCreation from '../features/party/PartyCreation'
import CharacterSheet from '../features/party/CharacterSheet'
import JournalScreen from '../features/journal/JournalScreen'
import InventoryScreen from '../features/inventory/InventoryScreen'
import SettingsScreen from '../features/settings/SettingsScreen'

/**
 * Route map mirrors the five-tab navigation (Part VII §21).
 * Dungeon is the primary gameplay screen; the campaign dashboard sits above it.
 */
export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/campaign" replace />} />
      <Route path="/campaign" element={<CampaignDashboard />} />
      <Route path="/dungeon" element={<DungeonScreen />} />
      <Route path="/party" element={<PartyScreen />} />
      <Route path="/party/new" element={<PartyCreation />} />
      <Route path="/party/:charId" element={<CharacterSheet />} />
      <Route path="/journal" element={<JournalScreen />} />
      <Route path="/inventory" element={<InventoryScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="*" element={<Navigate to={firstTabPath()} replace />} />
    </Routes>
  )
}
