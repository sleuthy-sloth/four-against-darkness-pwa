import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCampaignStore } from '../../state/campaignStore'
import { useDungeonStore } from '../../state/dungeonStore'
import { useTutorialStore } from './tutorialStore'
import {
  getTutorialStep,
  tutorialStepIndex,
  TUTORIAL_STEPS,
  type TutorialSnapshot,
  type TutorialStep,
} from './tutorialSteps'

/**
 * The tutorial coach mark (Milestone 4): a folio strip pinned above the tab
 * bar while a tutorial campaign is live. One short teaching line at a time.
 *
 * Event steps advance when the player does the thing — the coach watches the
 * live game state (real engine, real dungeon). If the player already did
 * the thing before the step became current, the step shows a Continue button
 * instead of auto-advancing past unread teaching. Tap steps wait for the
 * tap. Skip is always available; the campaign continues normally either way.
 *
 * The strip renders in the app column (App.tsx), between the routed screen
 * and the tab bar, so it never covers the map or the tabs.
 */

function buildSnapshot(
  route: string,
  partySize: number,
  dungeon: ReturnType<typeof useDungeonStore.getState>['dungeon'],
): TutorialSnapshot {
  const tiles = dungeon?.tiles ?? []
  const combatPhase = dungeon?.combat?.phase ?? null
  return {
    route,
    partySize,
    tiles: tiles.length,
    encounterPresent: tiles.some((t) => t.content?.encounter && !t.content.cleared),
    combatActive: combatPhase !== null,
    combatResolved:
      combatPhase === 'won' || combatPhase === 'lost' || combatPhase === 'fled',
    encounterCleared: tiles.some((t) => t.content?.cleared === true),
    searched: tiles.some((t) => t.searchRoll !== null),
    rested: dungeon?.rested === true,
  }
}

const ROUTE_NAMES: Record<string, string> = {
  '/campaign': 'the dashboard',
  '/party': 'your party',
  '/dungeon': 'the dungeon',
  '/journal': 'the journal',
  '/inventory': 'your packs',
}

function StepCard({
  step,
  snap,
  onAdvance,
  onSkip,
}: {
  step: TutorialStep
  snap: TutorialSnapshot
  onAdvance: () => void
  onSkip: () => void
}) {
  const navigate = useNavigate()
  const satisfied =
    step.advance === 'event' ? (step.satisfied?.(snap) ?? false) : false
  // Was the thing already done when this step became current? Captured once
  // per step (this card is keyed by step id, so the state resets per step).
  const [entrySatisfied] = useState(() => satisfied)
  const onWrongRoute = step.route !== undefined && snap.route !== step.route

  useEffect(() => {
    // Auto-advance only on a false→true transition while the step is current
    // and the player is where the lesson happens.
    if (step.advance === 'event' && satisfied && !entrySatisfied && !onWrongRoute) {
      void onAdvance()
    }
  }, [satisfied, entrySatisfied, step, onAdvance, onWrongRoute])

  const index = tutorialStepIndex(step.id)
  const goThereLabel = step.route
    ? `Go to ${ROUTE_NAMES[step.route] ?? 'the lesson'}`
    : null

  const handlePrimary = () => {
    if (onWrongRoute && step.route) {
      navigate(step.route)
      return
    }
    if (step.goTo) navigate(step.goTo)
    void onAdvance()
  }

  const primaryLabel = onWrongRoute
    ? goThereLabel
    : step.advance === 'event' && satisfied
      ? 'Continue'
      : step.cta

  return (
    <div
      role="region"
      aria-label={`Tutorial, step ${index + 1} of ${TUTORIAL_STEPS.length}: ${step.title}`}
      aria-live="polite"
      className="shrink-0 border-t-2 border-torch/60 bg-stone-800 px-4 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5"
    >
      <div className="mx-auto max-w-lg">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-label text-[11px] uppercase tracking-wider text-torch">
            Lesson {index + 1} of {TUTORIAL_STEPS.length} · {step.title}
          </p>
          <button
            onClick={() => void onSkip()}
            className="shrink-0 text-xs text-faint underline underline-offset-2"
          >
            Skip the tutorial
          </button>
        </div>
        {onWrongRoute ? (
          <p className="mt-1 text-sm text-parchment">
            {step.goThereHint ?? `This lesson happens on ${ROUTE_NAMES[step.route ?? ''] ?? 'another screen'}.`}
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm leading-snug text-parchment">{step.body}</p>
            {step.advance === 'event' && !satisfied && step.hint && (
              <p className="mt-1 text-sm font-semibold text-torch">{step.hint}</p>
            )}
          </>
        )}
        {primaryLabel && (
          <button onClick={handlePrimary} className="btn-wax mt-2 w-full px-4 py-2 text-sm">
            {primaryLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export default function TutorialCoach() {
  const location = useLocation()
  const campaign = useCampaignStore((s) => s.campaign)
  const party = useCampaignStore((s) => s.party)
  const dungeon = useDungeonStore((s) => s.dungeon)
  const { active, advance, skip, loadForCampaign } = useTutorialStore()

  useEffect(() => {
    loadForCampaign(campaign)
  }, [campaign, loadForCampaign])

  const step = active ? getTutorialStep(active.stepId) : undefined
  // Wait until the data the snapshot reads is actually loaded, or the
  // entry-satisfaction capture would read a stale, empty snapshot.
  const ready = !!campaign && (location.pathname !== '/dungeon' || dungeon !== null)
  if (!active || !step || !ready) return null

  const snap = buildSnapshot(location.pathname, party.length, dungeon)
  return <StepCard key={step.id} step={step} snap={snap} onAdvance={advance} onSkip={skip} />
}
