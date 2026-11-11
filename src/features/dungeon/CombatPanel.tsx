import { useState } from 'react'
import { useDungeonStore } from '../../state/dungeonStore'
import { useCampaignStore } from '../../state/campaignStore'
import { describeEnemies, clericPrayersLeft } from '../../engine/combat/combat'

/**
 * Combat interface (PROJECT_SPEC §13): party health, enemy group, actions,
 * target selection, and the full combat log. Mechanics resolve in the engine;
 * the player picks targets, waits for reactions, pays bribes, or flees.
 */
export default function CombatPanel() {
  const { dungeon, combatAttack, combatCast, combatCastScroll, combatHeal, combatPotion, combatWait, combatPayBribe, combatFlee, spendXpRoll, pendingXp } =
    useDungeonStore()
  const { party } = useCampaignStore()
  const [targetId, setTargetId] = useState<string | null>(null)
  const [showLog, setShowLog] = useState(true)

  const combat = dungeon?.combat
  if (!combat) return null
  const active = combat.enemies.find((e) => !e.fled && e.count > 0 && e.life > 0)
  const bribe = combat.pendingBribe
  const living = party.filter((p) => p.status !== 'dead')

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-3 pb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-lg text-ember">
          {combat.phase === 'won' && '⚔ Victory!'}
          {combat.phase === 'lost' && '☠ The party has fallen'}
          {combat.phase === 'fled' && 'You fled'}
          {combat.phase === 'foesTurn' && '⚔ Foes attack!'}
          {combat.phase === 'pcTurn' && '⚔ Your turn'}
          {combat.phase === 'opening' && '⚔ Encounter!'}
        </h2>
        <span className="text-xs text-parchment/50">round {combat.round}</span>
      </div>

      {/* enemies */}
      <div className="mb-2 space-y-1">
        {combat.enemies.map((e) => {
          const dead = e.fled || e.count === 0 || e.life === 0
          return (
            <button
              key={e.id}
              disabled={dead || combat.phase !== 'pcTurn'}
              onClick={() => setTargetId(e.id)}
              className={`block w-full rounded border px-2 py-1.5 text-left text-sm ${
                dead
                  ? 'border-stone-800 bg-stone-900 text-parchment/30'
                  : targetId === e.id || (!targetId && active?.id === e.id)
                    ? 'border-ember bg-ember/15 text-parchment'
                    : 'border-stone-700 bg-stone-800/60 text-parchment'
              }`}
            >
              <span className="font-medium">{e.profile.name}</span>
              <span className="ml-1 text-xs text-parchment/60">
                {e.profile.major
                  ? `L${e.level} · Life ${e.life}/${e.maxLife}${e.isFinalBossFlag ? ' · FINAL BOSS' : ''}`
                  : `L${e.level} · ${e.count} left`}
                {e.fled && ' · fled'}
              </span>
            </button>
          )
        })}
      </div>

      {/* party */}
      <div className="mb-2 grid grid-cols-4 gap-1">
        {party.map((p) => (
          <div key={p.id} className="rounded bg-stone-800/60 px-1.5 py-1 text-center">
            <div className="truncate text-[11px] text-parchment">{p.name}</div>
            <div className={`text-xs ${p.status === 'dead' ? 'text-ember' : 'text-parchment/70'}`}>
              {p.currentLife}/{p.maxLife}
            </div>
          </div>
        ))}
      </div>

      {/* pending bribe */}
      {bribe && combat.phase === 'opening' && (
        <div className="mb-2 rounded border border-torch/40 bg-torch/10 p-2 text-sm">
          <p className="text-parchment">They demand a bribe: {bribe.amount} gp.</p>
          <div className="mt-1 flex gap-1">
            <button onClick={() => void combatPayBribe()} className="rounded bg-torch/20 px-3 py-1 text-torch">
              Pay
            </button>
            <button
              onClick={() => void combatWait()}
              className="rounded border border-stone-700 bg-stone-800 px-3 py-1 text-parchment/80"
            >
              Refuse (fight)
            </button>
          </div>
        </div>
      )}

      {/* actions */}
      {combat.phase === 'opening' && !bribe && (
        <div className="mb-2 flex gap-2">
          <button
            disabled={!targetId && !active}
            onClick={() => {
              const pc = living[0]
              if (pc) void combatAttack(pc.id, targetId ?? active!.id)
            }}
            className="flex-1 rounded border border-torch/40 bg-torch/10 px-3 py-2 text-torch disabled:opacity-40"
          >
            Attack immediately
          </button>
          <button
            onClick={() => void combatWait()}
            className="flex-1 rounded border border-stone-700 bg-stone-800 px-3 py-2 text-parchment/80"
          >
            Wait for Reactions
          </button>
        </div>
      )}

      {combat.phase === 'pcTurn' && (
        <div className="mb-2 space-y-2">
          <div className="flex gap-1 overflow-x-auto">
            {living.map((p) => (
              <span key={p.id} className="shrink-0 rounded bg-stone-800 px-2 py-1 text-xs text-parchment">
                {p.name}
              </span>
            ))}
          </div>
          <button
            disabled={!targetId && !active}
            onClick={() => {
              const pc = living[0]
              if (pc) void combatAttack(pc.id, targetId ?? active!.id)
            }}
            className="w-full rounded border border-torch/40 bg-torch/10 px-3 py-2 text-torch disabled:opacity-40"
          >
            Attack {targetId ?? active?.profile.name ?? '— pick a target'}
          </button>
          {/* spellcaster actions (FADEE pp.67-69) */}
          {(() => {
            const casters = living.filter(
              (p) => (p.classId === 'wizard' || p.classId === 'elf') && p.spells.length > 0,
            )
            const cleric = living.find((p) => p.classId === 'cleric')
            const wounded = [...living].sort((a, b) => a.currentLife - b.currentLife)[0]
            if (!casters.length && !cleric) return null
            return (
              <div className="flex flex-wrap gap-1">
                {casters.map((p) =>
                  p.spells.map((s) => (
                    <button
                      key={`${p.id}-${s}`}
                      disabled={s === 'protection' || s === 'escape' ? false : !targetId && !active}
                      onClick={() => {
                        void combatCast(
                          p.id,
                          s as 'sleep' | 'fireball' | 'lightning' | 'protection' | 'escape',
                          s === 'protection' || s === 'escape' ? null : (targetId ?? active!.id),
                        )
                      }}
                      className="rounded bg-stone-800 px-2 py-1 text-xs text-parchment"
                    >
                      {p.name}: {s}
                    </button>
                  )),
                )}
                {cleric && clericPrayersLeft(cleric).healing > 0 && wounded && (
                  <button
                    onClick={() => void combatHeal(cleric.id, wounded.id)}
                    className="rounded bg-stone-800 px-2 py-1 text-xs text-parchment"
                  >
                    {cleric.name}: Healing ({clericPrayersLeft(cleric).healing} left)
                  </button>
                )}
                {/* Scroll casts (FADEE p.75): any PC but barbarians, +1 turn */}
                {living
                  .filter((p) => p.equipment.some((e) => e.startsWith('scroll of ')))
                  .flatMap((p) =>
                    p.equipment
                      .filter((e) => e.startsWith('scroll of '))
                      .map((e) => ({ p, spell: e.replace('scroll of ', '') })),
                  )
                  .map(({ p, spell }) => (
                    <button
                      key={`${p.id}-${spell}`}
                      disabled={spell !== 'blessing' && spell !== 'escape' && spell !== 'protection' ? !targetId && !active : false}
                      onClick={() => {
                        void combatCastScroll(
                          p.id,
                          spell,
                          ['blessing', 'escape', 'protection'].includes(spell)
                            ? null
                            : (targetId ?? active!.id),
                        )
                      }}
                      className="rounded bg-ember/20 px-2 py-1 text-xs text-parchment"
                    >
                      {p.name}: scroll {spell}
                    </button>
                  ))}
                {/* Healing potion: free action, 1/PC/adventure (p.83) */}
                {living
                  .filter((p) => p.equipment.includes('healing potion') && !p.conditions.includes('potion-drunk'))
                  .map((p) => (
                    <button
                      key={`pot-${p.id}`}
                      onClick={() => void combatPotion(p.id)}
                      className="rounded bg-stone-800 px-2 py-1 text-xs text-parchment"
                    >
                      {p.name}: potion (free)
                    </button>
                  ))}
              </div>
            )
          })()}
          <button
            onClick={() => void combatFlee()}
            className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-parchment/80"
          >
            Flee! (each Foe strikes once — FADEE p.97)
          </button>
        </div>
      )}

      {combat.phase === 'foesTurn' && (
        <p className="mb-2 animate-pulse text-sm text-ember">The Foes attack — defense rolls resolve below…</p>
      )}

      {/* outcome */}
      {combat.phase === 'won' && pendingXp && (
        <div className="mb-2 rounded border border-torch/40 bg-torch/10 p-2 text-sm">
          <p className="text-parchment">
            XP earned: {pendingXp.major > 0 && `${pendingXp.major} Major Foe roll(s) `}
            {pendingXp.minor && '1 Minor encounter '}
            {pendingXp.boss && '+ FINAL BOSS bonus'}
          </p>
          <p className="text-xs text-parchment/60">Assign each XP roll to one adventurer (FADEE p.117):</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {living.map((p) => (
              <button
                key={p.id}
                onClick={() => void spendXpRoll(p.id)}
                className="rounded bg-stone-800 px-2 py-1 text-xs text-parchment"
              >
                {p.name} (L{p.level})
              </button>
            ))}
          </div>
        </div>
      )}
      {(combat.phase === 'won' || combat.phase === 'lost') && (
        <p className="mb-2 text-xs text-parchment/50">
          Leave via a map exit — loot was rolled on victory and the Journal has the record.
        </p>
      )}

      {/* log */}
      <button
        onClick={() => setShowLog((s) => !s)}
        className="mb-1 self-start text-xs uppercase tracking-wide text-parchment/50"
      >
        Combat log {showLog ? '▾' : '▴'}
      </button>
      {showLog && (
        <ul className="space-y-0.5 text-[11px] leading-relaxed text-parchment/70">
          {combat.log.slice(-14).map((l, i) => (
            <li key={i}>· {l.text}</li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[10px] text-parchment/40">{describeEnemies(combat.enemies)}</p>
    </div>
  )
}
