import { describe, expect, it } from 'vitest'
import {
  TUTORIAL_STEPS,
  emptyTutorialSnapshot,
  getTutorialStep,
  nextTutorialStepId,
  type TutorialSnapshot,
} from '../../src/features/tutorial/tutorialSteps'

/**
 * Tutorial step-machine gates (Milestone 4): the steps form one ordered
 * chain, every event step's predicate fires exactly when the player has done
 * the thing, and a full play-through walk satisfies the steps in order.
 */
function snap(patch: Partial<TutorialSnapshot>): TutorialSnapshot {
  return { ...emptyTutorialSnapshot('/dungeon'), ...patch }
}

describe('tutorial steps', () => {
  it('is one ordered chain of 12 steps with unique ids', () => {
    expect(TUTORIAL_STEPS).toHaveLength(12)
    expect(new Set(TUTORIAL_STEPS.map((s) => s.id)).size).toBe(12)
    expect(TUTORIAL_STEPS.map((s) => s.id)).toEqual([
      'welcome',
      'party',
      'explore',
      'room',
      'encounter',
      'combat',
      'treasure',
      'rest',
      'journal',
      'inventory',
      'goal',
      'handoff',
    ])
  })

  it('chains to the next step and ends after the handoff', () => {
    let id: string | null = 'welcome'
    const seen: string[] = []
    while (id !== null) {
      seen.push(id)
      id = nextTutorialStepId(id)
    }
    expect(seen).toEqual(TUTORIAL_STEPS.map((s) => s.id))
    expect(nextTutorialStepId('handoff')).toBeNull()
    expect(nextTutorialStepId('no-such-step')).toBeNull()
    expect(getTutorialStep('combat')?.title).toBe('Fighting')
    expect(getTutorialStep('no-such-step')).toBeUndefined()
  })

  it('advances explore only once a second tile exists', () => {
    const step = getTutorialStep('explore')!
    expect(step.advance).toBe('event')
    expect(step.satisfied!(snap({ tiles: 1 }))).toBe(false)
    expect(step.satisfied!(snap({ tiles: 2 }))).toBe(true)
  })

  it('advances encounter when foes appear, fight, or were fought', () => {
    const step = getTutorialStep('encounter')!
    expect(step.satisfied!(snap({}))).toBe(false)
    expect(step.satisfied!(snap({ encounterPresent: true }))).toBe(true)
    expect(step.satisfied!(snap({ combatActive: true }))).toBe(true)
    expect(step.satisfied!(snap({ combatResolved: true }))).toBe(true)
    expect(step.satisfied!(snap({ encounterCleared: true }))).toBe(true)
  })

  it('advances combat on any resolution, or a cleared tile with no combat', () => {
    const step = getTutorialStep('combat')!
    expect(step.satisfied!(snap({ combatActive: true }))).toBe(false)
    expect(step.satisfied!(snap({ combatActive: true, combatResolved: true }))).toBe(true)
    expect(step.satisfied!(snap({ combatActive: false, encounterCleared: true }))).toBe(true)
    // A lost or fled fight still counts: the lesson was taught.
    expect(step.satisfied!(snap({ combatResolved: true }))).toBe(true)
  })

  it('advances treasure on a search and rest on a rest', () => {
    expect(getTutorialStep('treasure')!.satisfied!(snap({ searched: false }))).toBe(false)
    expect(getTutorialStep('treasure')!.satisfied!(snap({ searched: true }))).toBe(true)
    expect(getTutorialStep('rest')!.satisfied!(snap({ rested: false }))).toBe(false)
    expect(getTutorialStep('rest')!.satisfied!(snap({ rested: true }))).toBe(true)
  })

  it('rest advances only on an actual rest — winning the fight is not enough', () => {
    // The victory-screen trap: after the win the combat is resolved and
    // the tile is cleared, but Lesson 8 still waits for the rest itself.
    // The step must not auto-advance on the win (or the player would skip
    // the lesson), and it must not be satisfiable without the Rest action.
    const step = getTutorialStep('rest')!
    expect(step.satisfied!(snap({ combatResolved: true, encounterCleared: true, rested: false }))).toBe(false)
    expect(step.satisfied!(snap({ combatResolved: true, encounterCleared: true, rested: true }))).toBe(true)
  })

  it('walks a full play-through in order', () => {
    // The coach shows each step in turn; the event steps fire as the player
    // does the thing, and the tap steps wait for the tap.
    const order: string[] = []
    let s = emptyTutorialSnapshot('/campaign')
    // welcome + party are tap steps on their routes.
    order.push('welcome', 'party')
    // Explore into the second tile.
    s = snap({ tiles: 2 })
    expect(getTutorialStep('explore')!.satisfied!(s)).toBe(true)
    order.push('explore', 'room')
    // Foes appear; the player engages and wins.
    s = snap({ tiles: 3, encounterPresent: true })
    expect(getTutorialStep('encounter')!.satisfied!(s)).toBe(true)
    s = snap({ tiles: 3, combatActive: true })
    expect(getTutorialStep('combat')!.satisfied!(s)).toBe(false)
    s = snap({ tiles: 3, combatResolved: true, encounterCleared: true })
    expect(getTutorialStep('combat')!.satisfied!(s)).toBe(true)
    order.push('encounter', 'combat')
    // Search an empty room, then rest in the cleared room.
    s = snap({ tiles: 3, encounterCleared: true, searched: true })
    expect(getTutorialStep('treasure')!.satisfied!(s)).toBe(true)
    order.push('treasure')
    s = snap({ tiles: 3, encounterCleared: true, searched: true, rested: true })
    expect(getTutorialStep('rest')!.satisfied!(s)).toBe(true)
    order.push('rest')
    // Journal, inventory, goal, handoff are tap steps on their routes.
    order.push('journal', 'inventory', 'goal', 'handoff')
    expect(order).toEqual(TUTORIAL_STEPS.map((x) => x.id))
  })

  it('keeps every step on its intended route', () => {
    const routes = new Map(TUTORIAL_STEPS.map((s) => [s.id, s.route]))
    expect(routes.get('welcome')).toBe('/campaign')
    expect(routes.get('party')).toBe('/party')
    expect(routes.get('journal')).toBe('/journal')
    expect(routes.get('inventory')).toBe('/inventory')
    expect(routes.get('handoff')).toBe('/dungeon')
  })
})
