import { create } from 'zustand'
import { Rng } from '../../engine/core/rng'
import type { CampaignMeta } from '../../database/db'
import {
  createCampaign,
  listCampaigns,
  loadParty,
  touchCampaign,
} from '../../database/repositories/campaignRepo'
import { saveEvent } from '../../database/repositories/journalRepo'
import { useCampaignStore } from '../../state/campaignStore'
import {
  SCENARIOS,
  TUTORIAL_SCENARIO_ID,
  getScenario,
  type ScenarioDef,
} from '../../rulesets/expanded/scenarios'
import {
  getTutorialStep,
  nextTutorialStepId,
  TUTORIAL_STEPS,
} from './tutorialSteps'

/**
 * How-to-play tutorial + prepared tales (Milestone 4).
 *
 * This store owns the tutorial coach state and the scenario-start flow:
 * create the fixed-seed campaign, form its pre-built party, log the
 * backstory as the first journal entry, and (for the tutorial) arm the step
 * machine. The step machine itself is pure (tutorialSteps.ts); the coach
 * (TutorialCoach.tsx) renders the current step and calls advance/skip.
 *
 * Persistence: the step and status live on CampaignMeta.tutorial, so a
 * finished or skipped tutorial never re-triggers — even after a reload or
 * after switching campaigns. The in-memory `active` mirrors the loaded
 * campaign's meta.
 */

export interface TutorialActive {
  campaignId: string
  stepId: string
}

interface TutorialState {
  active: TutorialActive | null
  busy: boolean
  error: string | null
  /** Sync the coach to the loaded campaign (called when the campaign changes). */
  loadForCampaign: (campaign: CampaignMeta | null) => void
  /** Start (or resume) the tutorial; returns where the UI should navigate. */
  startTutorial: () => Promise<string | null>
  /** Begin a prepared tale; returns where the UI should navigate. */
  startScenario: (scenarioId: string) => Promise<string | null>
  /** Move to the next step (or finish, on the last step). */
  advance: () => Promise<void>
  /** Give up the guided tour; the campaign continues normally. */
  skip: () => Promise<void>
  clearError: () => void
}

async function logBackstory(campaign: CampaignMeta, scenario: ScenarioDef): Promise<void> {
  const rng = Rng.deserialize(JSON.parse(campaign.rngState))
  const now = Date.now()
  await saveEvent(campaign.id, 'event', now, scenario.backstory, rng)
  await saveEvent(campaign.id, 'event', now + 1, scenario.goal, rng)
}

async function formParty(scenario: ScenarioDef): Promise<boolean> {
  const { createParty } = useCampaignStore.getState()
  return createParty(
    scenario.party.map((m) => ({
      name: m.name,
      classId: m.classId,
      ...(m.extraEquipment ? { extraEquipment: m.extraEquipment } : {}),
    })),
  )
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  active: null,
  busy: false,
  error: null,

  loadForCampaign: (campaign) => {
    const { active } = get()
    if (!campaign) return // still loading — never clear on a null
    if (campaign.tutorial?.status === 'active') {
      if (active?.campaignId !== campaign.id || active.stepId !== campaign.tutorial.stepId) {
        set({ active: { campaignId: campaign.id, stepId: campaign.tutorial.stepId } })
      }
      return
    }
    // This campaign has no live tutorial; stop coaching it.
    if (active?.campaignId === campaign.id) set({ active: null })
  },

  startTutorial: async () => {
    set({ busy: true, error: null })
    try {
      // Resume the live tutorial campaign instead of starting a second one.
      const list = await listCampaigns()
      const live = list.find((c) => c.tutorial?.status === 'active')
      if (live) {
        const party = await loadParty(live.id)
        useCampaignStore.setState({ campaign: live, party })
        set({ active: { campaignId: live.id, stepId: live.tutorial?.stepId ?? 'welcome' }, busy: false })
        return getTutorialStep(live.tutorial?.stepId ?? 'welcome')?.route ?? '/dungeon'
      }
      const scenario = getScenario(TUTORIAL_SCENARIO_ID)
      if (!scenario) throw new Error('tutorial scenario is missing')
      const meta = await createCampaign(scenario.name, scenario.seed, {
        idSuffix: Date.now().toString(36),
        scenarioId: scenario.id,
        tutorial: { stepId: TUTORIAL_STEPS[0].id, status: 'active' },
        ...(scenario.startingClues !== undefined ? { clues: scenario.startingClues } : {}),
      })
      useCampaignStore.setState({ campaign: meta, party: [] })
      const ok = await formParty(scenario)
      if (!ok) throw new Error('the tutorial party could not be formed')
      await logBackstory(meta, scenario)
      set({ active: { campaignId: meta.id, stepId: TUTORIAL_STEPS[0].id }, busy: false })
      return '/campaign'
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), busy: false })
      return null
    }
  },

  startScenario: async (scenarioId) => {
    set({ busy: true, error: null })
    try {
      const scenario = getScenario(scenarioId)
      if (!scenario) throw new Error(`unknown scenario: ${scenarioId}`)
      if (scenario.tutorial) throw new Error('use startTutorial for the tutorial scenario')
      const meta = await createCampaign(scenario.name, scenario.seed, {
        idSuffix: Date.now().toString(36),
        scenarioId: scenario.id,
        ...(scenario.startingClues !== undefined ? { clues: scenario.startingClues } : {}),
      })
      useCampaignStore.setState({ campaign: meta, party: [] })
      const ok = await formParty(scenario)
      if (!ok) throw new Error(`the ${scenario.name} party could not be formed`)
      await logBackstory(meta, scenario)
      set({ busy: false })
      return '/party'
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), busy: false })
      return null
    }
  },

  advance: async () => {
    const { active } = get()
    if (!active) return
    const next = nextTutorialStepId(active.stepId)
    if (next === null) {
      // Last step: finish the tutorial; the campaign continues normally.
      await touchCampaign(active.campaignId, {
        tutorial: { stepId: active.stepId, status: 'done' },
      })
      const cs = useCampaignStore.getState()
      if (cs.campaign?.id === active.campaignId) {
        useCampaignStore.setState({
          campaign: { ...cs.campaign, tutorial: { stepId: active.stepId, status: 'done' } },
        })
      }
      set({ active: null })
      return
    }
    await touchCampaign(active.campaignId, {
      tutorial: { stepId: next, status: 'active' },
    })
    const cs = useCampaignStore.getState()
    if (cs.campaign?.id === active.campaignId) {
      useCampaignStore.setState({
        campaign: { ...cs.campaign, tutorial: { stepId: next, status: 'active' } },
      })
    }
    set({ active: { ...active, stepId: next } })
  },

  skip: async () => {
    const { active } = get()
    if (!active) return
    await touchCampaign(active.campaignId, {
      tutorial: { stepId: active.stepId, status: 'skipped' },
    })
    const cs = useCampaignStore.getState()
    if (cs.campaign?.id === active.campaignId) {
      useCampaignStore.setState({
        campaign: { ...cs.campaign, tutorial: { stepId: active.stepId, status: 'skipped' } },
      })
    }
    set({ active: null })
  },

  clearError: () => set({ error: null }),
}))

/** Every prepared tale, for the dashboard cards. */
export function getTaleScenarios(): ScenarioDef[] {
  return SCENARIOS.filter((s) => !s.tutorial)
}

/** The live tutorial campaign, if one exists (for the dashboard button). */
export async function findActiveTutorialCampaign(): Promise<CampaignMeta | undefined> {
  const list = await listCampaigns()
  return list.find((c) => c.tutorial?.status === 'active')
}
