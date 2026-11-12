/**
 * Combat feedback from the engine's own log lines (Milestone 5 — D3/E).
 *
 * The combat engine writes stable, page-cited log phrasing; this module
 * classifies the latest line so the UI can flash/shake/slump/stamp in
 * response. Display only — it reads log text, never engine state, and
 * returns null for lines that carry no feedback.
 *
 * Phrasing matched (engine/combat/combat.ts):
 * - "Hit! N <foes> slain (...)" → hit
 * - "<pc> fails the defense: 1 damage ..." / "A natural 1 always fails: 1 damage."
 *   → defense-fail
 * - "The remaining <foes> flee! ..." / "<foes> flee!" / "<foes> are outnumbered and flee!"
 *   → morale (the player fleeing, "The party flees!", is NOT morale)
 * - "Victory! All Foes defeated or fled. ..." → victory
 * - "<pc> has fallen! (FADEE p.105)" / "The whole party has fallen." /
 *   "The party has been wiped out. ..." → fallen
 */

export type CombatFeedbackKind = 'hit' | 'defense-fail' | 'morale' | 'victory' | 'fallen'

export function feedbackForLogLine(text: string): CombatFeedbackKind | null {
  if (text.startsWith('Victory!')) return 'victory'
  if (
    text.includes('has fallen!') ||
    text === 'The whole party has fallen.' ||
    text.startsWith('The party has been wiped out.')
  ) {
    return 'fallen'
  }
  if (text.startsWith('Hit!')) return 'hit'
  if (text.includes('fails the defense') || text.startsWith('A natural 1 always fails')) {
    return 'defense-fail'
  }
  if (
    text.includes(' flee!') &&
    !text.startsWith('The party flees!') &&
    !text.startsWith('The party escapes')
  ) {
    return 'morale'
  }
  return null
}

/**
 * Which foe (by profile name) a feedback line is about, if any — so the
 * hit flash lands on the right token/row instead of flashing everything.
 */
export function feedbackTargetName(text: string, names: string[]): string | null {
  const lower = text.toLowerCase()
  for (const name of names) {
    if (lower.includes(name.toLowerCase())) return name
  }
  return null
}
