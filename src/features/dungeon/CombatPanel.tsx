import { useEffect, useRef, useState } from 'react'
import { useDungeonStore } from '../../state/dungeonStore'
import { useCampaignStore } from '../../state/campaignStore'
import { canLeaveCombat, describeEnemies, clericPrayersLeft, attackBonusFor } from '../../engine/combat/combat'
import { canUseWand, canUseStaff, hasRing, hasFoolsGold } from '../../engine/items/magicItems'
import { stripCitations } from '../common/stripCitations'
import { LogDie } from '../common/Die'
import FragIcon from '../common/FragIcon'
import { ClassIcon } from '../common/ClassIcon'
import { familyFrag } from './foeIcons'
import { MonsterPortrait } from './MonsterPortrait'
import { feedbackTargetName, latestKindIndex } from './combatFeedback'
import { hapticBuzz } from '../common/motion'

/** Life-bar fill colour by remaining Life (Stream 3): warm brass while
    healthy, oxblood when hurt, bright wax when critical. The same helper
    lives in PartyScreen.tsx — keep the thresholds in step. */
function lifeFillClass(current: number, max: number): string {
  const pct = max > 0 ? (current / max) * 100 : 0
  if (pct <= 0) return 'bg-stone-700'
  if (pct <= 25) return 'bg-ember'
  if (pct <= 50) return 'bg-torch'
  return 'bg-brassInk'
}

/**
 * Combat interface (PROJECT_SPEC §13): party health, enemy group, actions,
 * target selection, and the full combat log. Mechanics resolve in the engine;
 * the player picks targets, waits for reactions, pays bribes, or flees.
 *
 * Milestone 5 (D3/E): foes show their family icon + count + level (not a
 * generic sphere); every numeral is tabular JetBrains Mono; the single
 * animate-pulse became a real feedback set — hit flash on the foe, a shake
 * on a failed defense, a slump when foes break morale, and a wax-stamp
 * Victory / Fallen. All motion is gated by prefers-reduced-motion (CSS).
 */
export default function CombatPanel() {
  const { dungeon, combatAttack, combatAttackSubdue, combatCast, combatCastScroll, combatHeal, combatPotion, combatWait, combatPayBribe, combatFlee, leaveCombat, spendXpRoll, spendLevelUp, pendingXp, combatUseWand, combatUseStaff, combatUseRing, combatUseFoolsGold, combatUseSmokebomb, combatUseXicthul, combatUseRedDeath, combatUseMorel, combatPickupLantern } =
    useDungeonStore()
  const { party } = useCampaignStore()
  const [targetId, setTargetId] = useState<string | null>(null)
  const [showLog, setShowLog] = useState(true)

  const combat = dungeon?.combat
  // Haptics (E): a buzz on victory / defeat, behind the Settings toggle.
  const prevPhase = useRef(combat?.phase)
  useEffect(() => {
    if (combat && prevPhase.current !== combat.phase) {
      if (combat.phase === 'won') hapticBuzz(10)
      if (combat.phase === 'lost') hapticBuzz([10, 60, 10])
      prevPhase.current = combat.phase
    }
  }, [combat?.phase])

  if (!combat) return null
  const active = combat.enemies.find((e) => !e.fled && e.count > 0 && e.life > 0)
  const bribe = combat.pendingBribe
  const living = party.filter((p) => p.status !== 'dead')
  // The Attack button strikes with ONE PC. The party array comes back
  // from Dexie in primary-key order (alphabetical by class), so
  // living[0] is the cleric after a reload — the weakest attacker, who
  // can barely hit a L5 foe. Attack with the best attacker instead
  // (highest class attack bonus; ties keep party order). A human player
  // suffers the same trap, so this is a game fix, not a test nicety.
  const bestAttacker = [...living].sort(
    (a, b) => attackBonusFor(b).bonus - attackBonusFor(a).bonus,
  )[0]

  // Feedback channels (D3, polish pass): hit, defense-fail, and morale
  // are separate channels with separate targets — a hit must not be
  // swallowed by the foes-turn block that follows it in the same update,
  // nor by a defense result elsewhere on the screen. Each channel scans
  // back (bounded, last 8 lines) for its most recent line.
  const logTexts = combat.log.map((l) => l.text)
  const hitIdx = latestKindIndex(logTexts, 'hit')
  const defIdx = latestKindIndex(logTexts, 'defense-fail')
  const moraleIdx = latestKindIndex(logTexts, 'morale')
  const hitTarget =
    hitIdx !== null
      ? feedbackTargetName(combat.log[hitIdx].text, combat.enemies.map((e) => e.profile.name))
      : null

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-3 pb-4">
      <div className="mb-2 flex items-baseline justify-between">
        {combat.phase === 'won' ? (
          <div className="victory-stamp" role="status">Victory</div>
        ) : combat.phase === 'lost' ? (
          <div className="victory-stamp" role="status">Fallen</div>
        ) : (
          <h2 className="text-lg text-ember">
            {combat.phase === 'fled' && 'You fled'}
            {combat.phase === 'foesTurn' && 'Foes attack!'}
            {combat.phase === 'pcTurn' && 'Your turn'}
            {combat.phase === 'opening' && 'Encounter!'}
          </h2>
        )}
        <span className="num-tabular font-mono text-xs text-parchment/70">round {combat.round}</span>
      </div>

      {/* Darkness (R093): −2 Attack/Defense while the party has no light. */}
      {(combat.darknessPenalty ?? 0) < 0 && (
        <p className="mb-2 text-xs text-ember">Darkness — −2 Attack/Defense, no ranged weapons. Light a torch or pick up the lantern.</p>
      )}
      {combat.lanternDropped && combat.phase === 'pcTurn' && (
        <button
          onClick={() => void combatPickupLantern(living[0].id)}
          className="mb-2 w-full rounded border border-torch/40 bg-torch/10 px-3 py-2 text-sm text-torch"
        >
          Pick up the dropped lantern (1 turn)
        </button>
      )}

      {/* enemies: family icon + count + level, tabular numerals */}
      <div className="mb-2 space-y-1">
        {combat.enemies.map((e) => {
          const dead = e.fled || e.count === 0 || e.life === 0
          const hitFlash = hitIdx !== null && hitTarget === e.profile.name
          const moraleSlump = moraleIdx !== null && e.fled
          return (
            <button
              key={e.id}
              disabled={dead || combat.phase !== 'pcTurn'}
              onClick={() => setTargetId(e.id)}
              className={`block w-full rounded border px-2 py-1.5 text-left text-sm transition-shadow duration-150 hover:shadow-raised ${
                dead
                  ? 'border-stone-800 bg-stone-900 text-parchment/30'
                  : targetId === e.id || (!targetId && active?.id === e.id)
                    ? 'border-ember bg-ember/15 text-parchment'
                    : 'border-stone-700 bg-stone-800/60 text-parchment'
              } ${moraleSlump ? 'combat-morale-slump' : ''}`}
            >
              {/* The hit flash lives on this inner span (keyed by the hit
                  line's index, so a new hit replays it) — not on the
                  button, so remounting it never steals the button's focus. */}
              <span
                key={hitFlash ? `hit-${hitIdx}` : 'no-hit'}
                className={`-mx-2 -my-1.5 flex items-center gap-2 rounded px-2 py-1.5 ${
                  hitFlash ? 'combat-hit-flash' : ''
                }`}
              >
                <FragIcon frag={familyFrag(e.profile.family)} size={20} label={e.profile.name} />
                {/* Stream 3: the small ink portrait for the foe's family,
                    beside the existing family icon. It inherits the row's
                    text colour, so a dead foe's portrait dims with it.
                    Engine families without a portrait (demon, beast,
                    construct, boss) get the generic threshold-arch mark. */}
                <MonsterPortrait family={e.profile.family} width={28} />
                <span className="font-medium">{e.profile.name}</span>
                <span className="num-tabular ml-1 font-mono text-xs text-parchment/70">
                  {e.profile.major
                    ? `L${e.level} · Life ${e.life}/${e.maxLife}${e.isFinalBossFlag ? ' · FINAL BOSS' : ''}`
                    : `L${e.level} · ${e.count} left`}
                  {e.fled && ' · fled'}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* party: small roundel portraits, Life numerals tabular, and a Life
          bar that shifts colour as Life drops (Stream 3). A dead PC's
          portrait greys out and the bar empties, so who is hurt and who
          is down reads at a glance. The grid remounts (key) on a new
          defense-fail so the shake replays; its cells hold no focus. */}
      <div
        key={`def-${defIdx ?? 'none'}`}
        className={`mb-2 grid grid-cols-4 gap-1 ${defIdx !== null ? 'combat-defense-shake' : ''}`}
      >
        {party.map((p) => {
          const dead = p.status === 'dead'
          const hpPct = (p.currentLife / p.maxLife) * 100
          return (
            <div key={p.id} className="rounded bg-stone-800/60 px-1.5 py-1 text-center">
              <span
                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-900/60 p-0.5 ${
                  dead ? 'opacity-40 grayscale' : ''
                }`}
              >
                <ClassIcon classId={p.classId} className="h-full w-full shrink-0" />
              </span>
              <div className="mt-0.5 truncate text-[11px] text-parchment">{p.name}</div>
              <div className={`num-tabular font-mono text-xs ${dead ? 'text-ember' : 'text-parchment/70'}`}>
                {p.currentLife}/{p.maxLife}
              </div>
              <div className="mt-1 h-1 rounded bg-stone-700">
                <div
                  className={`life-bar-fill h-1 rounded ${lifeFillClass(p.currentLife, p.maxLife)}`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* pending bribe */}
      {bribe && combat.phase === 'opening' && (
        <div className="mb-2 rounded border border-torch/40 bg-torch/10 p-2 text-sm">
          <p className="text-parchment">They demand a bribe: {bribe.amount} gp.</p>
          <div className="mt-1 flex gap-1">
            <button onClick={() => void combatPayBribe()} className="rounded bg-torch/20 px-3 py-1 text-torch">
              Pay
            </button>
            {hasFoolsGold(party) && (
              <button onClick={() => void combatUseFoolsGold()} className="rounded bg-torch/20 px-3 py-1 text-torch">
                Fools' Gold (auto-satisfies the bribe)
              </button>
            )}
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
              const pc = bestAttacker
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
              const pc = bestAttacker
              if (pc) void combatAttack(pc.id, targetId ?? active!.id)
            }}
            className="w-full rounded border border-torch/40 bg-torch/10 px-3 py-2 text-torch disabled:opacity-40"
          >
            Attack {targetId ?? active?.profile.name ?? '— pick a target'}
          </button>
          {/* Subdual (R089/R155): quest type 3 — attack at −1; at 0 Life the
              Boss is subdued alive instead of slain. Only the quest target. */}
          {dungeon.quest?.roll === 3 &&
            dungeon.quest.target &&
            (targetId ?? active?.id) &&
            combat.enemies.find((e) => e.id === (targetId ?? active!.id))?.profile.name === dungeon.quest.target && (
              <button
                onClick={() => {
                  const pc = bestAttacker
                  if (pc) void combatAttackSubdue(pc.id, targetId ?? active!.id)
                }}
                className="w-full rounded border border-ember/50 bg-ember/10 px-3 py-2 text-ember"
              >
                Subdue {dungeon.quest.target} alive (−1 Attack, quest)
              </button>
            )}
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
          {/* Magic items & special items (R151-R154): wand, staff, ring,
              smokebomb, caps and crusher — only the PCs who can use them. */}
          <div className="flex flex-wrap gap-1">
            {living
              .filter((p) => canUseWand(p))
              .map((p) => (
                <button
                  key={`wand-${p.id}`}
                  disabled={!targetId && !active}
                  onClick={() => void combatUseWand(p.id, targetId ?? active!.id)}
                  className="rounded bg-ember/20 px-2 py-1 text-xs text-parchment"
                >
                  {p.name}: Wand of Sleep
                </button>
              ))}
            {living
              .filter((p) => canUseStaff(p))
              .map((p) => (
                <button
                  key={`staff-${p.id}`}
                  disabled={!targetId && !active}
                  onClick={() => void combatUseStaff(p.id, targetId ?? active!.id)}
                  className="rounded bg-ember/20 px-2 py-1 text-xs text-parchment"
                >
                  {p.name}: Fireball Staff
                </button>
              ))}
            {living
              .filter((p) => hasRing(p))
              .map((p) => (
                <button
                  key={`ring-${p.id}`}
                  onClick={() => void combatUseRing(p.id)}
                  className="rounded bg-ember/20 px-2 py-1 text-xs text-parchment"
                >
                  {p.name}: Ring of Teleportation (leave combat)
                </button>
              ))}
            {living
              .filter((p) => p.equipment.includes('Puffball Smokebomb'))
              .map((p) => (
                <button
                  key={`smoke-${p.id}`}
                  onClick={() => void combatUseSmokebomb(p.id)}
                  className="rounded bg-stone-800 px-2 py-1 text-xs text-parchment"
                >
                  {p.name}: Puffball Smokebomb (flee unattacked)
                </button>
              ))}
            {living
              .filter((p) => p.equipment.includes("Xicthul's Cap"))
              .map((p) => (
                <button
                  key={`xic-${p.id}`}
                  disabled={!targetId && !active}
                  onClick={() => void combatUseXicthul(p.id, targetId ?? active!.id)}
                  className="rounded bg-stone-800 px-2 py-1 text-xs text-parchment"
                >
                  {p.name}: throw Xicthul's Cap (d3)
                </button>
              ))}
            {living
              .filter((p) => p.equipment.includes('Red Death'))
              .map((p) => (
                <button
                  key={`red-${p.id}`}
                  disabled={!targetId && !active}
                  onClick={() => void combatUseRedDeath(p.id, targetId ?? active!.id, 'damage')}
                  className="rounded bg-stone-800 px-2 py-1 text-xs text-parchment"
                >
                  {p.name}: throw Red Death (1 damage)
                </button>
              ))}
            {living
              .filter((p) => p.equipment.includes('Morel Crusher'))
              .map((p) => (
                <button
                  key={`morel-${p.id}`}
                  onClick={() => void combatUseMorel(p.id)}
                  className="rounded bg-stone-800 px-2 py-1 text-xs text-parchment"
                >
                  {p.name}: Morel Crusher (Morale −1)
                </button>
              ))}
          </div>
          <button
            onClick={() => void combatFlee()}
            className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-parchment/80"
          >
            Flee! (each Foe strikes once)
          </button>
        </div>
      )}

      {combat.phase === 'foesTurn' && (
        <p className="mb-2 text-sm text-ember">The Foes attack — defense rolls resolve below…</p>
      )}

      {/* outcome: the XP-roll prompt is a proper folio card (D3) */}
      {combat.phase === 'won' && pendingXp && (
        <div className="card-folio mb-2 p-3">
          <p className="font-display text-sm text-torch">Spoils of victory</p>
          <p className="num-tabular text-sm text-parchment">
            XP earned: {pendingXp.major > 0 && `${pendingXp.major} Major Foe roll(s) `}
            {pendingXp.minor && '1 Minor encounter '}
            {pendingXp.boss && '+ FINAL BOSS bonus'}
          </p>
          <p className="text-xs text-parchment/70">Assign each XP roll to one adventurer:</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {living.map((p) => (
              <button
                key={p.id}
                onClick={() => void spendXpRoll(p.id)}
                className="btn-cartouche px-2 py-1 text-xs"
              >
                {p.name} (L{p.level})
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Slow and Sure (R172): the Level is assigned HERE, on the victory
          screen — the tile panel (which also shows this card) is hidden
          while combat is open, and "Back to the room" stays disabled until
          the Level is assigned, so the card must be reachable here. */}
      {combat.phase === 'won' && (dungeon.pendingLevelUps ?? 0) > 0 && (
        <div className="card-folio mb-2 p-3">
          <p className="font-display text-sm text-torch">Slow and Sure: {dungeon.pendingLevelUps} Level{dungeon.pendingLevelUps === 1 ? '' : 's'} to assign</p>
          <p className="text-xs text-parchment/70">Pick a surviving adventurer — the Level applies at once.</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {living.map((p) => (
              <button
                key={p.id}
                onClick={() => void spendLevelUp(p.id)}
                className="btn-cartouche px-2 py-1 text-xs"
              >
                {p.name} (L{p.level})
              </button>
            ))}
          </div>
        </div>
      )}
      {(combat.phase === 'won' || combat.phase === 'lost') && (
        <p className="mb-2 text-xs text-parchment/70">
          {pendingXp
            ? 'Assign your XP rolls above before leaving — each roll goes to one adventurer.'
            : (dungeon.pendingLevelUps ?? 0) > 0
              ? 'A Level is waiting to be assigned (see the room panel) before leaving.'
              : 'Leave via a map exit — loot was rolled on victory and the Journal has the record.'}
        </p>
      )}

      {/* The victory panel must never trap the player: without a dismiss,
          the tile actions (Rest, Search) stay replaced by this panel and
          the only way out is leaving the room via a map exit. A roll
          earned here holds the party in the room until it is assigned
          — the button stays visible but disabled so the
          reason is in plain sight, and the store guards both exits. */}
      {canLeaveCombat(combat.phase) && (
        <button
          onClick={() => void leaveCombat()}
          disabled={!!pendingXp || (dungeon.pendingLevelUps ?? 0) > 0}
          aria-disabled={!!pendingXp || (dungeon.pendingLevelUps ?? 0) > 0}
          className="btn-wax mb-2 w-full px-4 py-2 text-sm disabled:opacity-50"
        >
          Back to the room
        </button>
      )}

      {/* log */}
      <button
        onClick={() => setShowLog((s) => !s)}
        className="mb-1 self-start text-xs uppercase tracking-wide text-parchment/70"
      >
        Combat log {showLog ? '▾' : '▴'}
      </button>
      {showLog && (
        <ul className="num-tabular space-y-0.5 text-[11px] leading-relaxed text-parchment/70">
          {combat.log.slice(-14).map((l) => (
            <li key={`${l.ts}-${l.text}`} className="log-line">
              <LogDie text={l.text} />
              · {stripCitations(l.text)}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[10px] text-parchment/70">{describeEnemies(combat.enemies)}</p>
    </div>
  )
}
