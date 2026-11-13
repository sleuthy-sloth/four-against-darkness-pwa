import { useEffect, useState } from 'react'
import { parseRollFromText, pipsFor, type ParsedRoll } from './dice'
import { prefersReducedMotion } from './motion'

/**
 * Drawn d6 (plan item C6): ink pips on a parchment face, oxblood only for
 * the exploding-die marker (a ring around the face). The roll log keeps its
 * mono numerals; the moment of the roll gets this die.
 *
 * Stream 2 (c): the newest die tumbles — its face cycles through a short
 * deterministic run of faces while `.die-tumble` rolls it, then it lands
 * on the result and `.die-settle` (the polish-pass settle) plays as the
 * end state. Only the newest log line tumbles (CombatPanel passes
 * `tumble` for the last visible line); older dice render settled. The
 * tumble is presentation only: the result is the engine's parsed value
 * throughout, and under prefers-reduced-motion the face shows the final
 * value at once with no cycling.
 */

const TUMBLE_MS = 280
const TUMBLE_STEP_MS = 70

function DieFace({
  value,
  size = 18,
  exploding = false,
  label,
  tumble = false,
}: {
  value: number
  size?: number
  exploding?: boolean
  label?: string
  tumble?: boolean
}) {
  const [shown, setShown] = useState(value)
  const [tumbling, setTumbling] = useState(false)
  useEffect(() => {
    if (!tumble || prefersReducedMotion()) {
      setShown(value)
      setTumbling(false)
      return
    }
    // Deterministic tumble faces, derived from the result — no RNG, so
    // the roll is identical every render and the result never changes.
    const faces = [((value + 1) % 6) + 1, ((value + 3) % 6) + 1, ((value + 5) % 6) + 1]
    setTumbling(true)
    const timers = faces.map((f, i) => window.setTimeout(() => setShown(f), TUMBLE_STEP_MS * (i + 1)))
    timers.push(
      window.setTimeout(() => {
        setShown(value)
        setTumbling(false)
      }, TUMBLE_MS),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [tumble, value])

  // Polish pass (P0-5): a short settle on mount (≤300ms, gentle
  // scale/rotate — never a tumble); an exploding die gets a brass-accent
  // pulse on a wrapper span. The die remounts with each new log line
  // (stable keys), so only the fresh roll settles.
  const face = (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? `die showing ${value}`}
      className={`${tumbling ? 'die-tumble' : 'die-settle'} inline-block shrink-0 align-middle`}
      style={{ marginTop: -2 }}
    >
      <rect x="6" y="6" width="88" height="88" rx="14" fill="#faf6ee" stroke="#2b241f" strokeWidth="5" />
      {exploding && (
        <rect x="1.5" y="1.5" width="97" height="97" rx="18" fill="none" stroke="#8c2626" strokeWidth="3" />
      )}
      {pipsFor(shown).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="9" fill="#2b241f" />
      ))}
    </svg>
  )
  return exploding ? <span className="die-explode inline-block align-middle">{face}</span> : face
}

/** Two dice for a d66 readout: first die = tens, second = units. */
export function D66Dice({
  tens,
  units,
  size = 18,
  exploding = false,
  tumble = false,
}: {
  tens: number
  units: number
  size?: number
  exploding?: boolean
  tumble?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`d66 roll ${tens}${units}`}>
      <DieFace value={tens} size={size} exploding={exploding} label={`tens die showing ${tens}`} tumble={tumble} />
      <DieFace value={units} size={size} exploding={exploding} label={`units die showing ${units}`} tumble={tumble} />
    </span>
  )
}

/** A drawn die for a parsed roll, or null when the text holds no roll. */
export function RollDie({ roll, size = 18, tumble = false }: { roll: ParsedRoll; size?: number; tumble?: boolean }) {
  if (roll.kind === 'd66') {
    return <D66Dice tens={roll.tens} units={roll.units} size={size} exploding={roll.exploding} tumble={tumble} />
  }
  return <DieFace value={roll.value} size={size} exploding={roll.exploding} tumble={tumble} />
}

/** Parse a log line and render its die inline; renders nothing when the line holds no roll. */
export function LogDie({ text, size = 18, tumble = false }: { text: string; size?: number; tumble?: boolean }) {
  const roll = parseRollFromText(text)
  if (!roll) return null
  return (
    <span className="mr-1.5 inline-block align-middle">
      <RollDie roll={roll} size={size} tumble={tumble} />
    </span>
  )
}
