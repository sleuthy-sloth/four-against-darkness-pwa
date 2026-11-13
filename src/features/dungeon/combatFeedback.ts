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

/**
 * Latest index of a line of the given feedback kind, scanning back from
 * the newest line (bounded to the last 8 lines: a foes-turn block is at
 * most a separator + 4 defense lines). Hit, defense-fail, and morale are
 * separate channels with separate targets — a "Hit!" line is always
 * followed in the same store update by the foes-turn block, so a
 * last-line-only read (or a single most-recent-feedback slot) lets the
 * foes' defense results swallow the hit flash (verified by probe,
 * 2026-11-12: hits landed, no flash — the defense lines always won the
 * slot). Each channel keeps its own most recent line; the index keys
 * the animation, so a new event replays it.
 */
export function latestKindIndex(
  lines: string[],
  kind: CombatFeedbackKind,
  window = 8,
): number | null {
  const start = Math.max(0, lines.length - window)
  for (let i = lines.length - 1; i >= start; i--) {
    if (feedbackForLogLine(lines[i]) === kind) return i
  }
  return null
}
