import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import type { Character } from '../../src/rulesets/schema/character'
import {
  newDungeon,
  exploreThrough,
  currentTile,
  rollEncounter,
  resolveHiddenTreasureComplication,
  rollHiddenTreasure,
  searchTile,
} from '../../src/engine/dungeon/generate'
import { D66_TILES, STARTING_TILES } from '../../src/rulesets/expanded/tiles'
import { rollDoor } from '../../src/engine/dungeon/doors'
import {
  resolveTrap,
  resolveEnvTrap,
  attemptTrapDisarm,
  trapLevelFor,
} from '../../src/engine/features/resolve'
import {
  applyFinalBossBuff,
  makeEnemy,
  startCombat,
} from '../../src/engine/combat/combat'
import { profileFor } from '../../src/rulesets/expanded/monsters'
import { rollMagicTreasure } from '../../src/engine/treasure/loot'
import {
  computeLight,
  darknessPenalty,
  DARKVISION_CLASSES,
} from '../../src/engine/light'

/**
 * Section B verification tests (Rules Verification Parts 8, 9, 10):
 * dungeon generation, tiles, doors, light, traps, environments, rest
 * prerequisites, madness-adjacent mechanics, and the Final Boss buff.
 * Each test pins a ledger number that was wrong or missing before this
 * pass; see docs/RULES_VERIFICATION_SECTION_B.md.
 */

function pc(cls: string, id: string, level = 1, equipment: string[] = ['hand weapon']): Character {
  return {
    id,
    name: id,
    classId: cls,
    level,
    currentLife: 5,
    maxLife: 5,
    experience: 0,
    gold: 0,
    traits: [],
    spells: [],
    equipment: [...equipment],
    conditions: [],
    status: 'active',
    createdAt: 0,
  }
}

/** Deterministic dice: d() and roll() consume the fed faces in order. */
class StubRng {
  private dice: number[]
  private i = 0
  constructor(dice: number[]) {
    this.dice = dice
  }
  d(sides: number): number {
    const v = this.dice[this.i++ % this.dice.length]
    return ((v - 1) % sides) + 1
  }
  roll(count: number, sides: number, modifier = 0): number {
    let total = modifier
    for (let k = 0; k < count; k++) total += this.d(sides)
    return total
  }
  d3(): number {
    return Math.ceil(this.d(6) / 2)
  }
  d66(): number {
    return this.d(6) * 10 + this.d(6)
  }
  formula(expr: string): number {
    const s = expr.trim()
    if (/^-?\d+$/.test(s)) return parseInt(s, 10)
    const m = /^(\d*)d(\d+)([+-]\d+)?$/.exec(s)
    if (!m) throw new Error(`invalid dice formula: ${expr}`)
    const count = m[1] ? parseInt(m[1], 10) : 1
    return this.roll(count, parseInt(m[2], 10), m[3] ? parseInt(m[3], 10) : 0)
  }
}
const asRng = (s: StubRng) => s as unknown as Rng

describe('dungeon traps (Part 10, p.164)', () => {
  it('dart: Defense vs HCL+1, not HCL (a 4 vs HCL 3 is a hit)', () => {
    const victim = pc('warrior', 'w')
    resolveTrap(asRng(new StubRng([1, 4])), [victim], 'dart', 3, 0)
    // d(1000)=1 picks the only PC; d6=4 vs L4: 4 does not exceed 4.
    expect(victim.currentLife).toBe(4)
  })

  it('dart: full Defense bonus applies — heavy armor + shield dodge on a 2', () => {
    const victim = pc('warrior', 'w', 1, ['hand weapon', 'heavy armor', 'shield'])
    resolveTrap(asRng(new StubRng([1, 2])), [victim], 'dart', 3, 0)
    // 2 + 3 (armor + shield) = 5 > L4: dodges.
    expect(victim.currentLife).toBe(5)
  })

  it('dart: a halfling rerolls a failed Defense once', () => {
    const victim = pc('halfling', 'h')
    resolveTrap(asRng(new StubRng([1, 2, 6])), [victim], 'dart', 3, 0)
    // 2 fails vs L4; reroll 6 dodges.
    expect(victim.currentLife).toBe(5)
  })

  it('spears: two targets roll Defense with armor vs HCL+4', () => {
    const a = pc('warrior', 'a', 1, ['hand weapon', 'heavy armor', 'shield'])
    const b = pc('warrior', 'b', 1, ['hand weapon', 'heavy armor', 'shield'])
    resolveTrap(asRng(new StubRng([1, 1, 5, 5])), [a, b], 'spears', 3, 0)
    // 5 + 3 = 8 > L7 for both: nobody is hit.
    expect(a.currentLife).toBe(5)
    expect(b.currentLife).toBe(5)
  })
})

describe('trap disarm (R132)', () => {
  it('trap levels match each trap’s own Save/Defense target', () => {
    expect(trapLevelFor('dart', 3)).toBe(4)
    expect(trapLevelFor('poisonGas', 3)).toBe(5)
    expect(trapLevelFor('trapdoor', 3)).toBe(6)
    expect(trapLevelFor('spears', 3)).toBe(7)
    expect(trapLevelFor('stalactite', 3)).toBe(5)
    expect(trapLevelFor('swingingLog', 3)).toBe(3)
    expect(trapLevelFor('sleepSpores', 3)).toBe(3)
    expect(trapLevelFor('cordyceps', 3)).toBe(6)
  })

  it('a rogue disarms on d6+L vs trap L; failure lets the trap fire', () => {
    const rogue = pc('rogue', 'r')
    expect(attemptTrapDisarm(asRng(new StubRng([2])), rogue, 3).success).toBe(true) // 2+1=3
    expect(attemptTrapDisarm(asRng(new StubRng([1])), rogue, 3).success).toBe(false) // 1+1=2
  })
})

describe('cavern traps (Part 10, p.165)', () => {
  it('halflings reroll a failed stalactite Save', () => {
    const h = pc('halfling', 'h')
    // d(1000)=1 picks the halfling; Save 1 fails vs L5, reroll 6 passes.
    resolveEnvTrap(asRng(new StubRng([1, 1, 6])), [h], 'stalactite', 'caverns', 3, 0)
    expect(h.currentLife).toBe(5)
  })

  it('halflings reroll a failed rockslide Save', () => {
    const h = pc('halfling', 'h')
    resolveEnvTrap(asRng(new StubRng([1, 6])), [h], 'rockslide', 'caverns', 3, 0)
    expect(h.currentLife).toBe(5)
  })

  it('halflings reroll a failed swinging-log Save', () => {
    const h = pc('halfling', 'h')
    resolveEnvTrap(asRng(new StubRng([1, 6])), [h], 'swingingLog', 'caverns', 3, 0)
    expect(h.currentLife).toBe(5)
  })
})

describe('fungal traps (Part 10, p.166)', () => {
  it('sleep spores: a cleric is NOT immune', () => {
    const c = pc('cleric', 'c')
    // HCL 10: the Save cannot pass; the lone cleric sleeps and the party dies.
    resolveEnvTrap(asRng(new StubRng([1, 1])), [c], 'sleepSpores', 'fungal', 10, 0)
    expect(c.conditions).toContain('asleep-spores')
    expect(c.status).toBe('dead')
  })

  it('sleep spores: the released cloud can put the whole party to sleep', () => {
    const a = pc('warrior', 'a')
    const b = pc('warrior', 'b')
    // Pick a (d1000=1); a fails (1 < 10); b fails the cloud Save (1 < 10).
    resolveEnvTrap(asRng(new StubRng([1, 1, 1])), [a, b], 'sleepSpores', 'fungal', 10, 0)
    expect(a.conditions).toContain('asleep-spores')
    expect(b.conditions).toContain('asleep-spores')
    expect(a.status).toBe('dead')
    expect(b.status).toBe('dead')
  })

  it('sleep spores: a kukla (artificial) is immune', () => {
    const k = pc('kukla', 'k')
    resolveEnvTrap(asRng(new StubRng([1, 1])), [k], 'sleepSpores', 'fungal', 10, 0)
    expect(k.conditions).not.toContain('asleep-spores')
    expect(k.status).toBe('active')
  })

  it('spore cloud: two Saves — pass the second and take no damage', () => {
    const w = pc('warrior', 'w')
    // First Save 1 fails vs HCL+1=4; second Save 6 passes vs HCL+3=6.
    resolveEnvTrap(asRng(new StubRng([1, 1, 6])), [w], 'sporeCloud', 'fungal', 3, 0)
    expect(w.currentLife).toBe(5)
    expect(w.conditions).not.toContain('coughing')
  })

  it('spore cloud: failing both Saves costs 1 Life and coughing; 1-in-6 WM', () => {
    const w = pc('warrior', 'w')
    const r = resolveEnvTrap(asRng(new StubRng([1, 1, 1, 1])), [w], 'sporeCloud', 'fungal', 3, 0)
    expect(w.currentLife).toBe(4)
    expect(w.conditions).toContain('coughing')
    expect(r.wanderingMonsters).toBe(true)
    const w2 = pc('warrior', 'w2')
    const r2 = resolveEnvTrap(asRng(new StubRng([1, 1, 1, 2])), [w2], 'sporeCloud', 'fungal', 3, 0)
    expect(w2.currentLife).toBe(4)
    expect(r2.wanderingMonsters).toBeUndefined()
  })

  it('spore cloud: a kukla is immune', () => {
    const k = pc('kukla', 'k')
    resolveEnvTrap(asRng(new StubRng([1, 1])), [k], 'sporeCloud', 'fungal', 3, 0)
    expect(k.currentLife).toBe(5)
    expect(k.conditions).not.toContain('coughing')
  })

  it('slime patch: a fall rolls 1-in-6 Wandering Monsters', () => {
    const w = pc('warrior', 'w')
    const r = resolveEnvTrap(asRng(new StubRng([1, 1])), [w], 'slimePatch', 'fungal', 3, 0)
    expect(w.conditions).toContain('slimed')
    expect(r.wanderingMonsters).toBe(true)
    const w2 = pc('warrior', 'w2')
    const r2 = resolveEnvTrap(asRng(new StubRng([1, 2])), [w2], 'slimePatch', 'fungal', 3, 0)
    expect(r2.wanderingMonsters).toBeUndefined()
  })

  it('shrieking mushroom: modifiers REDUCE the 4-in-6 call (d6+mod on 3+)', () => {
    // Warrior (mod 0): 2 = no call, 3 = call.
    expect(resolveEnvTrap(asRng(new StubRng([2])), [pc('warrior', 'w')], 'shriekingMushroom', 'fungal', 1, 0).wanderingMonsters).toBeUndefined()
    expect(resolveEnvTrap(asRng(new StubRng([3])), [pc('warrior', 'w')], 'shriekingMushroom', 'fungal', 1, 0).wanderingMonsters).toBe(true)
    // Halfling (mod -2): 4 = 2, no call; 5 = 3, call.
    expect(resolveEnvTrap(asRng(new StubRng([4])), [pc('halfling', 'h')], 'shriekingMushroom', 'fungal', 1, 0).wanderingMonsters).toBeUndefined()
    expect(resolveEnvTrap(asRng(new StubRng([5])), [pc('halfling', 'h')], 'shriekingMushroom', 'fungal', 1, 0).wanderingMonsters).toBe(true)
    // Rogue (mod -1): 3 = 2, no call; 4 = 3, call.
    expect(resolveEnvTrap(asRng(new StubRng([3])), [pc('rogue', 'r')], 'shriekingMushroom', 'fungal', 1, 0).wanderingMonsters).toBeUndefined()
    expect(resolveEnvTrap(asRng(new StubRng([4])), [pc('rogue', 'r')], 'shriekingMushroom', 'fungal', 1, 0).wanderingMonsters).toBe(true)
  })

  it('cordyceps: no halfling/barbarian +L (none is named in the ledger)', () => {
    const h = pc('halfling', 'h', 4)
    // HCL 3 → L6. A 3 with the old phantom +4 would have passed (7); now it fails.
    resolveEnvTrap(asRng(new StubRng([1, 3])), [h], 'cordyceps', 'fungal', 3, 0)
    expect(h.conditions).toContain('cordyceps:6')
  })
})

describe('search: 4 counts as 5 only outside the dungeon (R123/R143/R144)', () => {
  function dungeonIn(env: 'dungeon' | 'caverns' | 'fungal'): { d: ReturnType<typeof newDungeon>; tileId: string } {
    const d = newDungeon('c', new Rng(1))
    d.environment = env
    const tile = d.tiles.find((t) => t.id === d.currentTileId)!
    tile.environment = env
    return { d, tileId: tile.id }
  }

  it('dungeon: a rogue rolling 4 finds nothing', () => {
    const { d, tileId } = dungeonIn('dungeon')
    const r = searchTile(d, asRng(new StubRng([4])), tileId, ['rogue'])
    expect(r.result).toBe('The tile is truly empty.')
  })

  it('caverns: a rogue rolling 4 finds (clue or Listen)', () => {
    const { d, tileId } = dungeonIn('caverns')
    const r = searchTile(d, asRng(new StubRng([4])), tileId, ['rogue'])
    expect(r.result).toBe('find')
    expect(r.detail).toBe('clue|listen')
  })

  it('fungal: a rogue rolling 4 finds nothing; a halfling rolling 4 finds', () => {
    const { d, tileId } = dungeonIn('fungal')
    const r = searchTile(d, asRng(new StubRng([4])), tileId, ['rogue'])
    expect(r.result).toBe('The tile is truly empty.')
    const d2 = newDungeon('c', new Rng(1))
    d2.environment = 'fungal'
    const t2 = d2.tiles.find((t) => t.id === d2.currentTileId)!
    t2.environment = 'fungal'
    const r2 = searchTile(d2, asRng(new StubRng([4])), t2.id, ['halfling'])
    expect(r2.result).toBe('find')
    expect(r2.detail).toBe('clue|rare-mushroom')
  })
})

describe('hidden treasure complications (R127)', () => {
  it('trap: a rogue disarms vs HCL+1; failure falls through to a random PC Save', () => {
    const rogue = pc('rogue', 'r')
    const ok = resolveHiddenTreasureComplication(asRng(new StubRng([6])), [rogue], 2, 3)
    expect(ok.text).toMatch(/disarms the trap/)
    expect(rogue.currentLife).toBe(5)
    const rogue2 = pc('rogue', 'r2')
    const w = pc('warrior', 'w')
    // Disarm 1+1=2 < 3 fails; random pick d1000=1 → rogue; Save 1 → 2 Life.
    const bad = resolveHiddenTreasureComplication(asRng(new StubRng([1, 1, 1])), [rogue2, w], 2, 3)
    expect(bad.text).toMatch(/fails to disarm/)
    expect(rogue2.currentLife).toBe(3)
  })

  it('trap: with no rogue, a random PC Saves vs HCL+1 (fail 1 Life, natural 1 = 2)', () => {
    const w = pc('warrior', 'w')
    const fail1 = resolveHiddenTreasureComplication(asRng(new StubRng([1, 1])), [w], 2, 4)
    expect(w.currentLife).toBe(3) // natural 1 → 2 Life
    expect(fail1.text).toMatch(/loses 2 Life/)
    const w2 = pc('warrior', 'w2')
    const saved = resolveHiddenTreasureComplication(asRng(new StubRng([1, 3])), [w2], 2, 5)
    expect(w2.currentLife).toBe(5)
    expect(saved.text).toMatch(/Saves/)
  })

  it('ghost: a cleric Saves vs HCL to banish; fail or no cleric costs all 1 Life', () => {
    const c = pc('cleric', 'c')
    const w = pc('warrior', 'w')
    const banished = resolveHiddenTreasureComplication(asRng(new StubRng([6])), [c, w], 2, 6)
    expect(banished.text).toMatch(/banishes it/)
    expect(c.currentLife).toBe(5)
    expect(w.currentLife).toBe(5)
    const c2 = pc('cleric', 'c2')
    const w2 = pc('warrior', 'w2')
    const failed = resolveHiddenTreasureComplication(asRng(new StubRng([1])), [c2, w2], 2, 6)
    expect(failed.text).toMatch(/fails to banish/)
    expect(c2.currentLife).toBe(4)
    expect(w2.currentLife).toBe(4)
    const w3 = pc('warrior', 'w3')
    resolveHiddenTreasureComplication(asRng(new StubRng([])), [w3], 2, 6)
    expect(w3.currentLife).toBe(4)
  })

  it('alarm: flags Wandering Monsters for the caller to start', () => {
    const w = pc('warrior', 'w')
    const r = resolveHiddenTreasureComplication(asRng(new StubRng([])), [w], 2, 1)
    expect(r.wanderingMonsters).toBe(true)
  })

  it('rollHiddenTreasure still rolls (2d6+HCL)^2 gold with a party', () => {
    const state = newDungeon('x', new Rng(55))
    const party = [pc('warrior', 'a'), pc('cleric', 'b'), pc('rogue', 'c'), pc('wizard', 'd')]
    const r = rollHiddenTreasure(state, new Rng(55), 2, party)
    expect(r.gold).toBeGreaterThanOrEqual((2 + 2) ** 2)
    expect(r.gold).toBeLessThanOrEqual((12 + 2) ** 2)
    expect(r.complication).toBeDefined()
  })
})

describe('Final Boss determination (R117) and buff (R118)', () => {
  it('gremlin meetings count toward the Final Boss tally (incl. gremlins)', () => {
    const state = newDungeon('x', new Rng(1))
    const events: string[] = []
    const enc = rollEncounter(state, asRng(new StubRng([6])), profileFor('weird', 6), 1, events)
    expect(enc.monster.name).toBe('Invisible Gremlins')
    expect(state.majorFoesMet).toBe(1)
    expect(enc.isFinalBoss).toBeUndefined()
  })

  it('a Wandering Monsters Major never logs a false Final Boss reveal', () => {
    const state = newDungeon('x', new Rng(1))
    const events: string[] = []
    // d6=6 would reveal the boss if the roll were made; WM skips the roll.
    const enc = rollEncounter(state, asRng(new StubRng([6])), profileFor('boss', 1), 1, events, { canBeFinalBoss: false })
    expect(enc.isFinalBoss).toBeUndefined()
    expect(events.join(' ')).not.toMatch(/FINAL BOSS/)
    expect(state.majorFoesMet).toBe(1) // the meeting still counts
    // The same roll as a room encounter DOES reveal the boss.
    const state2 = newDungeon('x', new Rng(1))
    const events2: string[] = []
    const enc2 = rollEncounter(state2, asRng(new StubRng([6])), profileFor('boss', 1), 1, events2)
    expect(enc2.isFinalBoss).toBe(true)
    expect(events2.join(' ')).toMatch(/FINAL BOSS/)
  })

  it('Final Boss gains +1 Life (applyFinalBossBuff)', () => {
    const enemy = makeEnemy(profileFor('boss', 1), 'boss', 5, 1, 9)
    applyFinalBossBuff(enemy)
    expect(enemy.life).toBe(10)
    expect(enemy.maxLife).toBe(10)
  })

  it('Final Boss Reaction is forced to Fight to the Death — no roll, no bribe', () => {
    const party = [pc('warrior', 'w', 3), pc('cleric', 'c', 3), pc('rogue', 'r', 3), pc('wizard', 'z', 3)]
    const enemy = makeEnemy(profileFor('boss', 6), 'boss', 6, 1, 10)
    enemy.isFinalBossFlag = true
    const state = startCombat('t1', party, [enemy], new Rng(1), { partyWaits: true })
    expect(state.log.some((l) => l.text.includes('fights to the death'))).toBe(true)
    expect(state.log.some((l) => l.text.includes('Reaction (d6='))).toBe(false)
    expect(state.pendingBribe).toBeNull()
    expect(state.phase).toBe('pcTurn')
  })

  it('rollMagicTreasure always returns a magic-table item', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = rollMagicTreasure(new Rng(seed))
      expect(r.item.length).toBeGreaterThan(0)
      expect(r.magic.roll).toBeGreaterThanOrEqual(1)
      expect(r.magic.roll).toBeLessThanOrEqual(6)
      expect(r.text).toMatch(/^Treasure:/)
    }
  })
})

describe('door table probabilities (R129)', () => {
  it('2d6 outcomes land in the book’s proportions across seeds', () => {
    const counts: Record<string, number> = {}
    for (let seed = 1; seed <= 600; seed++) {
      const k = rollDoor(new Rng(seed), 1).kind
      counts[k] = (counts[k] ?? 0) + 1
    }
    // Expected of 600 (2d6: 2→1/36, 3→2/36, 4→3/36, 5–6→9/36, 7–10→18/36,
    // 11→2/36, 12→1/36): sealed ~33, iron ~50, illusionary ~67, locked ~150,
    // unlocked ~300, trapped ~33, lever ~17. Bands are ±4σ, deliberately wide.
    expect(counts.sealed).toBeGreaterThanOrEqual(11)
    expect(counts.sealed).toBeLessThanOrEqual(56)
    expect(counts.iron).toBeGreaterThanOrEqual(23)
    expect(counts.iron).toBeLessThanOrEqual(77)
    expect(counts.illusionary).toBeGreaterThanOrEqual(36)
    expect(counts.illusionary).toBeLessThanOrEqual(98)
    expect(counts.locked).toBeGreaterThanOrEqual(108)
    expect(counts.locked).toBeLessThanOrEqual(192)
    expect(counts.unlocked).toBeGreaterThanOrEqual(251)
    expect(counts.unlocked).toBeLessThanOrEqual(349)
    expect(counts.trapped).toBeGreaterThanOrEqual(11)
    expect(counts.trapped).toBeLessThanOrEqual(56)
    expect(counts.lever).toBeGreaterThanOrEqual(1)
    expect(counts.lever).toBeLessThanOrEqual(33)
  })
})

describe('cavern openings have no doors (R141)', () => {
  it('tiles generated in the caverns carry no door exits', () => {
    const rng = new Rng(99)
    const state = newDungeon('c', rng)
    state.environment = 'caverns'
    const tile = currentTile(state)
    const exits = tile.exits.filter(
      (e) =>
        (e.edge === 'N' && e.cell.row > 2) ||
        (e.edge === 'S' && e.cell.row < 28 - 1) ||
        (e.edge === 'W' && e.cell.col > 2) ||
        (e.edge === 'E' && e.cell.col < 20 - 1),
    )
    expect(exits.length).toBeGreaterThan(0)
    const res = exploreThrough(state, rng, exits[0].id, 1)
    const grown = res.state.tiles.at(-1)!
    expect(grown.environment).toBe('caverns')
    expect(grown.exits.every((e) => e.door === false)).toBe(true)
  })
})

describe('light and darkvision (R093/R094)', () => {
  it('no class is treated as darkvision-exempt: the list is empty by design', () => {
    expect(DARKVISION_CLASSES).toEqual([])
  })

  it('a torch burns 6 rooms: lit at 5, out at 6', () => {
    const party = [pc('warrior', 'w', 1, ['hand weapon', 'torch'])]
    const lit = computeLight(party, { torchLit: true, torchRooms: 5, lanternDropped: false })
    expect(lit.hasLight).toBe(true)
    expect(lit.source).toBe('torch')
    const out = computeLight(party, { torchLit: true, torchRooms: 6, lanternDropped: false })
    expect(out.hasLight).toBe(false)
    expect(darknessPenalty(out)).toBe(-2)
  })

  it('a dropped lantern leaves the party in darkness', () => {
    const party = [pc('warrior', 'w', 1, ['hand weapon', 'lantern'])]
    const lit = computeLight(party, { torchLit: false, torchRooms: 0, lanternDropped: false })
    expect(lit.hasLight).toBe(true)
    expect(lit.source).toBe('lantern')
    const dropped = computeLight(party, { torchLit: false, torchRooms: 0, lanternDropped: true })
    expect(dropped.hasLight).toBe(false)
    expect(darknessPenalty(dropped)).toBe(-2)
    expect(darknessPenalty(lit)).toBe(0)
  })
})

describe('OQ-2 tile-shape confidence (pp.149-151)', () => {
  it('low-confidence d66 tiles are exactly 32 and 35', () => {
    expect(D66_TILES.filter((t) => t.confidence === 'low').map((t) => t.id)).toEqual([32, 35])
  })

  it('low-confidence starting tiles are exactly 4 and 5 (diagonal approximations)', () => {
    expect(STARTING_TILES.filter((t) => t.confidence === 'low').map((t) => t.id)).toEqual([4, 5])
  })
})
