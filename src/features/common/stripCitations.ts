/**
 * Strip rulebook page citations from player-facing strings (Release 0.5,
 * Part B). The rules TEXT stays; only the page numbers go.
 *
 * Render sites apply this to anything that reaches the DOM (log lines,
 * journal entries, error text). Data `source:` fields and code comments
 * keep their citations — they are the internal citation trail, same as
 * the docs — so this helper is only ever called at a render site, never
 * on the data itself.
 */
export function stripCitations(text: string): string {
  return text
    // " (FADEE p.105)" / " (FADEE pp.104, 152)" / " (FADEE pp.97–98)"
    .replace(/ \(FADEE pp?\.[^)]*\)/g, '')
    // " — FADEE p.97)" / ", FADEE p.97)" inside a parenthetical
    .replace(/\s*[—–]\s*FADEE pp?\.[^)]*\)/g, ')')
    .replace(/, FADEE pp?\.[^)]*\)/g, ')')
    // bare "FADEE p.105" left standing on its own
    .replace(/\bFADEE pp?\.[0-9–\-, ]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?)])/g, '$1')
    .trim()
}
