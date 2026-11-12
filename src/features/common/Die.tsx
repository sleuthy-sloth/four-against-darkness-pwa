import { parseRollFromText, pipsFor, type ParsedRoll } from './dice'

/**
 * Drawn d6 (plan item C6): ink pips on a parchment face, oxblood only for
 * the exploding-die marker (a ring around the face). The roll log keeps its
 * mono numerals; the moment of the roll gets this die.
 */

function DieFace({
  value,
  size = 18,
  exploding = false,
  label,
}: {
  value: number
  size?: number
  exploding?: boolean
  label?: string
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? `die showing ${value}`}
      className="inline-block shrink-0 align-middle"
      style={{ marginTop: -2 }}
    >
      <rect x="6" y="6" width="88" height="88" rx="14" fill="#faf6ee" stroke="#2b241f" strokeWidth="5" />
      {exploding && (
        <rect x="1.5" y="1.5" width="97" height="97" rx="18" fill="none" stroke="#8c2626" strokeWidth="3" />
      )}
      {pipsFor(value).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="9" fill="#2b241f" />
      ))}
    </svg>
  )
}

/** Two dice for a d66 readout: first die = tens, second = units. */
export function D66Dice({
  tens,
  units,
  size = 18,
  exploding = false,
}: {
  tens: number
  units: number
  size?: number
  exploding?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`d66 roll ${tens}${units}`}>
      <DieFace value={tens} size={size} exploding={exploding} label={`tens die showing ${tens}`} />
      <DieFace value={units} size={size} exploding={exploding} label={`units die showing ${units}`} />
    </span>
  )
}

/** A drawn die for a parsed roll, or null when the text holds no roll. */
export function RollDie({ roll, size = 18 }: { roll: ParsedRoll; size?: number }) {
  if (roll.kind === 'd66') {
    return <D66Dice tens={roll.tens} units={roll.units} size={size} exploding={roll.exploding} />
  }
  return <DieFace value={roll.value} size={size} exploding={roll.exploding} />
}

/** Parse a log line and render its die inline; renders nothing when the line holds no roll. */
export function LogDie({ text, size = 18 }: { text: string; size?: number }) {
  const roll = parseRollFromText(text)
  if (!roll) return null
  return (
    <span className="mr-1.5 inline-block align-middle">
      <RollDie roll={roll} size={size} />
    </span>
  )
}
