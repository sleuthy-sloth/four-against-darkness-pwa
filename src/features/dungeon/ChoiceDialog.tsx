import { useDungeonStore } from '../../state/dungeonStore'
import { useCampaignStore } from '../../state/campaignStore'
import { EVENT_INFO } from '../../rulesets/expanded/features'

/**
 * Player-choice dialog for special features and events
 * (FADEE pp.152-153): temple blessing, statue, puzzle box, ghost fallout,
 * wandering healer, wandering alchemist.
 */
export function ChoiceDialog() {
  const { dungeon, chooseTemple, statueTouch, puzzleAttempt, ghostPick, healerHeal, alchemistBuy } =
    useDungeonStore()
  const { party } = useCampaignStore()
  const choice = dungeon?.pendingChoice
  if (!choice) return null
  const living = party.filter((p) => p.status !== 'dead')

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60 px-3 pb-16">
      <div className="w-full rounded-lg border border-torch/40 bg-stone-900 p-4">
        <p className="text-sm text-torch">{choice.prompt}</p>
        <p className="mt-1 text-[10px] text-parchment/50">{choice.source}</p>
        <div className="mt-3 space-y-2">
          {choice.kind === 'temple' && (
            <div className="flex flex-wrap gap-2">
              {living.map((p) => (
                <button
                  key={p.id}
                  onClick={() => void chooseTemple(p.id)}
                  className="rounded border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-parchment"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {choice.kind === 'statue' && (
            <div className="flex gap-2">
              <button
                onClick={() => void statueTouch(true)}
                className="rounded border border-torch/40 bg-torch/10 px-3 py-2 text-sm text-torch"
              >
                Touch it
              </button>
              <button
                onClick={() => void statueTouch(false)}
                className="rounded border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-parchment"
              >
                Leave it alone
              </button>
            </div>
          )}
          {choice.kind === 'puzzle' && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {living.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => void puzzleAttempt(p.id, true)}
                    className="rounded border border-torch/40 bg-torch/10 px-3 py-2 text-sm text-torch"
                  >
                    {p.name} tries
                  </button>
                ))}
              </div>
              <button
                onClick={() => void puzzleAttempt('', false)}
                className="rounded border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-parchment"
              >
                Leave it alone
              </button>
            </div>
          )}
          {choice.kind === 'ghost' && (
            <div className="space-y-3">
              {(choice.pcIds ?? []).map((id) => {
                const pc = party.find((p) => p.id === id)
                if (!pc) return null
                return (
                  <div key={id} className="rounded bg-stone-800/70 p-2">
                    <p className="text-xs text-parchment/80">{pc.name} failed the Save vs. L4 fear:</p>
                    <div className="mt-1 flex gap-2">
                      <button
                        onClick={() => void ghostPick(id, false)}
                        className="rounded bg-stone-700 px-3 py-1.5 text-sm text-parchment"
                      >
                        Lose 1 Life
                      </button>
                      <button
                        onClick={() => void ghostPick(id, true)}
                        className="rounded bg-stone-700 px-3 py-1.5 text-sm text-parchment"
                      >
                        Gain 1 Madness
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {choice.kind === 'healer' && (
            <div className="space-y-2">
              {living.map((p) => {
                const affordable = Math.min(
                  Math.floor(p.gold / 10),
                  p.maxLife - p.currentLife,
                )
                return (
                  <div key={p.id} className="flex items-center gap-2 rounded bg-stone-800/70 px-2 py-1.5">
                    <span className="text-sm text-parchment">
                      {p.name} ({p.currentLife}/{p.maxLife}, {p.gold}gp)
                    </span>
                    {affordable > 0 && (
                      <button
                        onClick={() => void healerHeal(p.id, affordable)}
                        className="ml-auto rounded bg-stone-700 px-2.5 py-1 text-xs text-parchment"
                      >
                        Heal {affordable} ({affordable * 10}gp)
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {choice.kind === 'alchemist' && (
            <div className="space-y-2">
              {living.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 rounded bg-stone-800/70 px-2 py-1.5">
                  <span className="text-sm text-parchment">
                    {p.name} ({p.gold}gp)
                  </span>
                  {p.gold >= 50 && (
                    <button
                      onClick={() => void alchemistBuy(p.id, 'healing potion')}
                      className="ml-auto rounded bg-stone-700 px-2.5 py-1 text-xs text-parchment"
                    >
                      Potion (50gp)
                    </button>
                  )}
                  {p.gold >= 30 && (
                    <button
                      onClick={() => void alchemistBuy(p.id, 'blade poison')}
                      className="rounded bg-stone-700 px-2.5 py-1 text-xs text-parchment"
                    >
                      Poison (30gp)
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Info text for an event roll (journal helper). */
export function eventText(roll: number): string {
  const key = ['ghost', 'wanderingMonsters', 'ladyInWhite', 'trap', 'healer', 'alchemist'][roll - 1]
  const info = EVENT_INFO[key as keyof typeof EVENT_INFO]
  return info ? `${info.text} (${info.source})` : ''
}
