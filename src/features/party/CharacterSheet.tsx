import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CORE_CLASSES } from '../../rulesets/expanded/coreClasses'
import { useCampaignStore } from '../../state/campaignStore'
import { BASIC_SPELLS } from '../../rulesets/expanded/coreClasses'

/** Detailed character sheet (PROJECT_SPEC §24): tap a party card to open. */
export default function CharacterSheet() {
  const { charId } = useParams()
  const navigate = useNavigate()
  const { party } = useCampaignStore()
  const character = party.find((c) => c.id === charId)
  if (!character) return <Navigate to="/party" replace />

  const def = CORE_CLASSES.find((c) => c.id === character.classId)!
  const hpPct = (character.currentLife / character.maxLife) * 100

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-6">
      <button onClick={() => navigate('/party')} className="mb-2 self-start text-xs text-parchment/50">
        ← Party
      </button>
      <h1 className="text-2xl text-torch">{character.name}</h1>
      <p className="text-sm text-parchment/70">
        {def.name} · Level {character.level} · {def.source}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-stone-800/60 p-3">
          <div className="text-2xl text-parchment">
            {character.currentLife}/{character.maxLife}
          </div>
          <div className="text-[10px] uppercase text-parchment/50">Life</div>
          <div className="mt-1 h-1 rounded bg-stone-700">
            <div className="h-1 rounded bg-ember" style={{ width: `${hpPct}%` }} />
          </div>
        </div>
        <div className="rounded-lg bg-stone-800/60 p-3">
          <div className="text-2xl text-parchment">{character.experience}</div>
          <div className="text-[10px] uppercase text-parchment/50">XP</div>
        </div>
        <div className="rounded-lg bg-stone-800/60 p-3">
          <div className="text-2xl text-parchment">{character.gold}</div>
          <div className="text-[10px] uppercase text-parchment/50">gp</div>
        </div>
      </div>

      {character.spells.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm uppercase tracking-wide text-parchment/50">Spells memorized</h2>
          <ul className="mt-1 space-y-1">
            {character.spells.map((s) => (
              <li key={s} className="rounded bg-stone-800/60 px-3 py-2 text-sm">
                {BASIC_SPELLS[s]?.name ?? s}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4">
        <h2 className="text-sm uppercase tracking-wide text-parchment/50">Traits</h2>
        <ul className="mt-1 space-y-1">
          {character.traits.map((t) => (
            <li key={t.roll} className="rounded bg-stone-800/60 px-3 py-2 text-sm">
              <span className="text-torch">{t.name}</span>
              <span className="block text-xs text-parchment/60">{t.effect}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4">
        <h2 className="text-sm uppercase tracking-wide text-parchment/50">Equipment</h2>
        <ul className="mt-1 flex flex-wrap gap-1">
          {character.equipment.map((e, i) => (
            <li key={i} className="rounded bg-stone-800/60 px-2 py-1 text-xs">
              {e}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4">
        <h2 className="text-sm uppercase tracking-wide text-parchment/50">Class abilities</h2>
        <ul className="mt-1 space-y-1">
          {def.abilities.map((a, i) => (
            <li key={i} className="text-xs text-parchment/60">
              · {a}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
