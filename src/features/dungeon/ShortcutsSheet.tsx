import { useDialogFocus } from '../common/useDialogFocus'

/**
 * Keyboard shortcut sheet (Milestone 5 — Phase F). Opened with `?` on the
 * dungeon screen; every mouse action on the map has a keyboard equivalent.
 */
export default function ShortcutsSheet({ onClose }: { onClose: () => void }) {
  // Phase G: Tab traps inside the sheet, Escape closes it, focus returns
  // to the map. The backdrop click still closes it too.
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose)
  const rows: Array<[string, string]> = [
    ['+', 'Zoom in'],
    ['−', 'Zoom out'],
    ['0', 'Fit the whole dungeon'],
    ['R', 'Recenter on the party'],
    ['E', 'Engage the foes on this tile'],
    ['U', 'Undo the last action'],
    ['Tab', 'Move to the map exits'],
    ['← → ↑ ↓', 'Pan the map (map focused) · move between exits (an exit focused)'],
    ['Enter / Space', 'Explore the focused exit'],
    ['Esc', 'Close a dialog · return to the map'],
    ['?', 'This sheet'],
  ]
  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-40 flex items-end bg-black/60 px-3 pb-16"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="panel-in w-full rounded-lg border border-parchment bg-stone-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-sm text-torch">Keyboard shortcuts</p>
        <dl className="mt-2 space-y-1 text-sm text-parchment/80">
          {rows.map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <dt className="num-tabular w-20 shrink-0 rounded border border-stone-700 bg-stone-800 px-2 py-0.5 text-center text-xs">
                {key}
              </dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
        <button onClick={onClose} className="btn-wax mt-3 px-4 py-2 text-sm">
          Close
        </button>
      </div>
    </div>
  )
}
