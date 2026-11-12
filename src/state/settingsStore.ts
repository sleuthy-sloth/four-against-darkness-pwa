import { create } from 'zustand'
import type { XpSystem } from '../engine/xp'

export interface Settings {
  soundEffects: boolean
  hapticFeedback: boolean
  textSize: 'small' | 'medium' | 'large'
  diceAnimation: boolean
  mapZoomPreset: number
  /** XP system (R171-R174, pp.117-118): Classical is the default. Stored
   * globally like the other settings (in-memory, same as the rest of this
   * store); the dungeon engine reads it at award time. */
  xpSystem: XpSystem
}

interface SettingsState {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

export const DEFAULT_SETTINGS: Settings = {
  soundEffects: true,
  hapticFeedback: true,
  textSize: 'medium',
  diceAnimation: true,
  mapZoomPreset: 1,
  xpSystem: 'classical',
}

/**
 * Settings state (Part VII §27). Phase 1: in-memory defaults behind typed
 * actions; Dexie persistence of settings arrives with campaign persistence
 * (Phase 6) so every save is transactional in one database.
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  update: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),
}))
