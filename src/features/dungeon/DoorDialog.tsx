import { useDungeonStore } from '../../state/dungeonStore'
import { useCampaignStore } from '../../state/campaignStore'
import { canCast } from '../../engine/combat/combat'
import { bashBonus, doorLabel, lockpickBonus } from '../../engine/dungeon/doors'
import { useDialogFocus } from '../common/useDialogFocus'

/**
 * Locked-door dialog (R129-R131). Tapping a door that still needs an
 * action opens this over the map; every option is gated on what the
 * party actually has — a rogue for picking and disarming, a memorized
 * Lightning or Fireball for an iron door, Clues for illusionary and
 * lever doors, a wizard or elf for a sealed door.
 *
 * Options the build cannot offer are named, not hidden: there is no
 * illusionist class (so an illusionary door takes 3 Clues only), no
 * gnome class (so a lever door takes 1 Clue only), and no Halfling
 * Luck economy (so no Luck reroll is offered on any door roll).
 */
export function DoorDialog() {
  const { dungeon, pendingDoor, closeDoorDialog, attemptDoor } = useDungeonStore()
  const { campaign, party } = useCampaignStore()
  // Phase G: focus lands on the first option when the sheet opens, Tab
  // stays inside it, Escape leaves the door for now, and focus returns
  // to the exit disc that opened it.
  const dialogRef = useDialogFocus<HTMLDivElement>(!!pendingDoor, closeDoorDialog)
  if (!dungeon || !pendingDoor) return null
  const tile = dungeon.tiles.find((t) => t.id === dungeon.currentTileId)
  const exit = tile?.exits.find((e) => e.id === pendingDoor.exitId)
  const info = exit?.doorInfo
  if (!exit || !info) return null
  const living = party.filter((p) => p.status !== 'dead')
  const rogues = living.filter((p) => p.classId === 'rogue')
  const casters = living.filter((p) => p.classId === 'wizard' || p.classId === 'elf')
  const clues = campaign?.clues ?? 0

  const optionBtn =
    'rounded border border-stone-600 bg-stone-800 px-3 py-2 text-left text-sm text-parchment disabled:opacity-40'
  const note = 'mt-1 text-xs text-parchment/70'

  return (
    <div className="dialog-backdrop fixed inset-0 z-40 flex items-end bg-black/60 px-3 pb-16">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={doorLabel(info)}
        className="panel-in shadow-modal w-full rounded-lg border border-torch/40 bg-stone-900 p-4"
      >
        <p className="text-sm text-torch">{doorLabel(info)}</p>
        <p className="mt-1 text-xs text-parchment/70">
          {info.kind === 'locked' && 'Pick it (rogue), or bash it down. A failed pick means bashing.'}
          {info.kind === 'iron' && 'No bashing an iron door — pick it, or destroy it with Lightning or Fireball.'}
          {info.kind === 'sealed' &&
            'No bashing a sealed door — a spellcaster rolls against it, once. A roll of 1 lashes back for 2 Life.'}
          {info.kind === 'illusionary' && 'Spend 3 Clues and the door dissolves — it was never really there.'}
          {info.kind === 'trapped' &&
            'The door itself is unlocked, but opening it triggers a trap. A rogue may disarm it first.'}
          {info.kind === 'lever' && 'No bashing, no picking — the lever answers to 1 Clue.'}
        </p>
        <div className="mt-3 space-y-2">
          {(info.kind === 'locked' || info.kind === 'iron') && (
            <div>
              <p className="text-xs uppercase tracking-wide text-parchment/70">Pick the lock</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {rogues.length === 0 && (
                  <p className={note}>No rogue in the party — nobody can pick this lock.</p>
                )}
                {rogues.map((r) => (
                  <button
                    key={r.id}
                    disabled={info.pickFailed}
                    onClick={() => void attemptDoor(exit.id, 'pick', r.id)}
                    className={optionBtn}
                  >
                    {r.name} picks (d6 +{lockpickBonus(r)} vs L{info.level})
                  </button>
                ))}
              </div>
              {info.pickFailed && <p className={note}>The pick already failed — this door must be bashed.</p>}
            </div>
          )}
          {(info.kind === 'locked') && (
            <div>
              <p className="text-xs uppercase tracking-wide text-parchment/70">Bash it down</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {living.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => void attemptDoor(exit.id, 'bash', p.id)}
                    className={optionBtn}
                  >
                    {p.name} bashes (d6{bashBonus(p) ? ` +${bashBonus(p)}` : ''} vs L{info.level})
                  </button>
                ))}
              </div>
              <p className={note}>Repeatable — but a natural 1 attracts Wandering Monsters.</p>
            </div>
          )}
          {info.kind === 'iron' && (
            <div>
              <p className="text-xs uppercase tracking-wide text-parchment/70">Destroy it with a spell</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {casters.flatMap((c) =>
                  (['lightning', 'fireball'] as const)
                    .filter((s) => canCast(c, s))
                    .map((s) => (
                      <button
                        key={`${c.id}-${s}`}
                        onClick={() => void attemptDoor(exit.id, 'iron', c.id, s)}
                        className={optionBtn}
                      >
                        {c.name} casts {s} (spends the memorized spell)
                      </button>
                    )),
                )}
                {casters.every((c) => !canCast(c, 'lightning') && !canCast(c, 'fireball')) && (
                  <p className={note}>Nobody has Lightning or Fireball memorized.</p>
                )}
              </div>
            </div>
          )}
          {info.kind === 'sealed' && (
            <div>
              <p className="text-xs uppercase tracking-wide text-parchment/70">Break the seal</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {casters.length === 0 && <p className={note}>No wizard or elf in the party.</p>}
                {casters.map((c) => (
                  <button
                    key={c.id}
                    disabled={(info.attempts ?? 0) >= 1}
                    onClick={() => void attemptDoor(exit.id, 'sealed', c.id)}
                    className={optionBtn}
                  >
                    {c.name} rolls (d6 +{c.level} vs L{info.level})
                  </button>
                ))}
              </div>
              {(info.attempts ?? 0) >= 1 && <p className={note}>The one attempt is spent — the seal holds.</p>}
            </div>
          )}
          {info.kind === 'illusionary' && (
            <div>
              <button
                disabled={clues < 3}
                onClick={() => void attemptDoor(exit.id, 'illusionary')}
                className={optionBtn}
              >
                Spend 3 Clues ({clues} in pool)
              </button>
              <p className={note}>An illusionist could roll against it instead — this build has no illusionist class.</p>
            </div>
          )}
          {info.kind === 'trapped' && (
            <div>
              <p className="text-xs uppercase tracking-wide text-parchment/70">Disarm the trap</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {rogues.length === 0 && <p className={note}>No rogue in the party — opening it triggers the trap.</p>}
                {rogues.map((r) => (
                  <button
                    key={r.id}
                    disabled={info.disarmed}
                    onClick={() => void attemptDoor(exit.id, 'disarm', r.id)}
                    className={optionBtn}
                  >
                    {r.name} disarms (d6 +{lockpickBonus(r)} vs L{info.level})
                  </button>
                ))}
                <button onClick={() => void attemptDoor(exit.id, 'openTrapped')} className={optionBtn}>
                  Open it anyway — the leader Saves vs L{info.level} or loses 1 Life
                </button>
              </div>
            </div>
          )}
          {info.kind === 'lever' && (
            <div>
              <button
                disabled={clues < 1}
                onClick={() => void attemptDoor(exit.id, 'lever')}
                className={optionBtn}
              >
                Spend 1 Clue ({clues} in pool)
              </button>
              <p className={note}>
                A gnome gadget point would work too — this build has no gnome class.
              </p>
            </div>
          )}
        </div>
        <button onClick={closeDoorDialog} className="mt-3 text-xs text-parchment/70 underline">
          Leave the door for now
        </button>
      </div>
    </div>
  )
}
