interface ScreenStubProps {
  title: string
  phase: number
  note: string
}

/**
 * Honest in-progress screen for navigation targets that land in a later phase.
 * Clearly labelled per spec Rule 7/8: never presented as a working feature.
 * Each stub is replaced wholesale when its phase is implemented.
 */
export default function ScreenStub({ title, phase, note }: ScreenStubProps) {
  return (
    <div className="screen-placeholder">
      <h1 className="text-2xl text-torch">{title}</h1>
      <p className="max-w-xs text-sm text-parchment/70">{note}</p>
      <p className="phase-note">Scheduled for Phase {phase}</p>
    </div>
  )
}
