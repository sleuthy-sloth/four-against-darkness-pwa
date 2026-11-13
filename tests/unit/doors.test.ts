import { describe, it, expect } from 'vitest'
import { Rng } from '../../src/engine/core/rng'
import {
  newDungeon,
  exploreThrough,
  generateSecretDoorTile,
  type PlacedExit,
  type PlacedTile,
} from '../../src/engine/dungeon/generate'
import {
  rollDoor,
  rollDoorsForTile,
  doorNeedsAction,
  doorGrantsBonusTreasure,
  lockpickBonus,
  bashBonus,
  attemptLockpick,
  attemptBash,
  attemptSealed,
  attemptDisarm,
  triggerDoorTrap,
} from '../../src/engine/dungeon/doors'
import { createParty } from '../../src/engine/characters/create'
import type { Character } from '../../src/rulesets/schema/character'

/** The tutorial party shape: warrior, cleric, wizard, rogue. */
function party(level = 1): Character[] {
  return createParty(
    [
      { classId: 'warrior', name: 'Torsten' },
      { classId: 'cleric', name: 'Anya' },
      { classId: 'wizard', name: 'Fen', spells: ['sleep', 'fireball', 'lightning'] },
      { classId: 'rogue', name: 'Joss', traitRolls: [4] }, // Delicate Touch
    ],
    new Rng(1481),
    'test-camp',
  )
}

function rogue(p: Character[]): Character {
  return p.find((c) => c.classId === 'rogue')!
}

function exitWith(kind: string, level = 3): PlacedExit {
  return {
    id: 'x1',
    cell: { row: 1, col: 1 },
    edge: 'N',
    door: true,
    toTileId: null,
    doorInfo: { kind: kind as never, level },
  }
}

describe('rollDoor (R129 door table)', () => {
  it('covers every kind across seeds and matches the 2d6 table shape', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 300; seed++) {
      seen.add(rollDoor(new Rng(seed), 1).kind)
    }
    expect([...seen].sort()).toEqual(
      ['illusionary', 'iron', 'lever', 'locked', 'sealed', 'trapped', 'unlocked'].sort(),
    )
  })
  it('iron/locked/trapped/sealed levels are HCL+d6; illusionary is HCL; lever is 0', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const d = rollDoor(new Rng(seed), 4)
      if (['iron', 'locked', 'trapped', 'sealed'].includes(d.kind)) {
        expect(d.level).toBeGreaterThanOrEqual(5)
        expect(d.level).toBeLessThanOrEqual(10)
      }
      if (d.kind === 'illusionary') expect(d.level).toBe(4)
      if (d.kind === 'lever') expect(d.level).toBe(0)
      if (d.kind === 'unlocked') expect(d.level).toBe(0)
    }
  })
  it('rolls only door exits, never plain openings', () => {
    const tile: PlacedTile = {
      id: 't1',
      shapeId: 14,
      transform: 0,
      origin: { row: 0, col: 0 },
      cells: [{ row: 0, col: 0 }],
      exits: [
        { id: 'x0', cell: { row: 0, col: 0 }, edge: 'N', door: true, toTileId: null },
        { id: 'x1', cell: { row: 0, col: 0 }, edge: 'S', door: false, toTileId: null },
      ],
      explored: true,
      contentRoll: null,
      content: null,
      searchRoll: null,
      searchResult: null,
    }
    rollDoorsForTile(tile, new Rng(7), 1)
    expect(tile.exits[0].doorInfo).toBeDefined()
    expect(tile.exits[1].doorInfo).toBeUndefined()
  })
  it('older exits with no doorInfo default to unlocked', () => {
    const plain: PlacedExit = { id: 'x1', cell: { row: 0, col: 0 }, edge: 'N', door: true, toTileId: null }
    expect(doorNeedsAction(plain)).toBe(false)
    expect(doorNeedsAction(exitWith('unlocked'))).toBe(false)
    expect(doorNeedsAction(exitWith('locked'))).toBe(true)
    expect(doorNeedsAction(exitWith('trapped'))).toBe(true)
    expect(doorNeedsAction({ ...exitWith('locked'), doorInfo: { kind: 'locked', level: 3, open: true } })).toBe(false)
    const opening: PlacedExit = { id: 'x1', cell: { row: 0, col: 0 }, edge: 'N', door: false, toTileId: null }
    expect(doorNeedsAction(opening)).toBe(false)
  })
  it('only sealed and iron doors grant +1 treasure', () => {
    expect(doorGrantsBonusTreasure({ kind: 'sealed', level: 3 })).toBe(true)
    expect(doorGrantsBonusTreasure({ kind: 'iron', level: 3 })).toBe(true)
    expect(doorGrantsBonusTreasure({ kind: 'locked', level: 3 })).toBe(false)
    expect(doorGrantsBonusTreasure(undefined)).toBe(false)
  })
})

describe('lockpicking (R131)', () => {
  it('rogue bonus is +L, +Tier with Delicate Touch', () => {
    const p = party()
    const r = rogue(p)
    expect(r.traits.some((t) => t.name === 'Delicate Touch')).toBe(true)
    // L1 rogue: +1 level, +Tier 1 (tierOf(1) = 1) = +2.
    expect(lockpickBonus(r)).toBe(2)
    const plain = { ...r, traits: [] }
    expect(lockpickBonus(plain)).toBe(1)
  })
  it('success opens the door; failure blocks further picks', () => {
    const p = party()
    const r = rogue(p)
    // Force a success: L1 door, rogue bonus +2 — any die >= 1 opens.
    const easy = exitWith('locked', 1)
    const ok = attemptLockpick(new Rng(1), r, easy)
    expect(ok.success).toBe(true)
    expect(easy.doorInfo!.open).toBe(true)
    // Force a failure: L20 door cannot be picked at L1.
    const hard = exitWith('locked', 20)
    const fail = attemptLockpick(new Rng(1), r, hard)
    expect(fail.success).toBe(false)
    expect(hard.doorInfo!.pickFailed).toBe(true)
    expect(hard.doorInfo!.open).toBeUndefined()
  })
})

describe('bashing (R130)', () => {
  it('barbarians and warriors add +L, others add nothing', () => {
    const p = party()
    expect(bashBonus(p.find((c) => c.classId === 'warrior')!)).toBe(1)
    expect(bashBonus(p.find((c) => c.classId === 'cleric')!)).toBe(0)
    expect(bashBonus(rogue(p))).toBe(0)
  })
  it('success opens; a natural 1 flags Wandering Monsters', () => {
    const p = party()
    const warrior = p.find((c) => c.classId === 'warrior')!
    const easy = exitWith('locked', 1)
    expect(attemptBash(new Rng(1), warrior, easy).success).toBe(true)
    expect(easy.doorInfo!.open).toBe(true)
    // Find a seed whose first d6 is 1, against a door that cannot open.
    let seed = 1
    while (new Rng(seed).d(6) !== 1) seed++
    const hard = exitWith('locked', 20)
    const fail = attemptBash(new Rng(seed), warrior, hard)
    expect(fail.die).toBe(1)
    expect(fail.success).toBe(false)
    expect(fail.wanderingMonsters).toBe(true)
  })
})

describe('sealed doors (R129)', () => {
  it('success opens; a natural 1 costs the caster 2 Life', () => {
    const p = party()
    const wiz = p.find((c) => c.classId === 'wizard')!
    const easy = exitWith('sealed', 1)
    expect(attemptSealed(new Rng(1), wiz, easy).success).toBe(true)
    expect(easy.doorInfo!.open).toBe(true)
    let seed = 1
    while (new Rng(seed).d(6) !== 1) seed++
    const hard = exitWith('sealed', 20)
    const before = wiz.currentLife
    const fail = attemptSealed(new Rng(seed), wiz, hard)
    expect(fail.die).toBe(1)
    expect(fail.success).toBe(false)
    expect(wiz.currentLife).toBe(before - 2)
    expect(hard.doorInfo!.attempts).toBe(1)
  })
})

describe('trapped doors (R129)', () => {
  it('a successful disarm opens the door safely', () => {
    const p = party()
    const r = rogue(p)
    const door = exitWith('trapped', 1)
    const ok = attemptDisarm(new Rng(1), r, door)
    expect(ok.success).toBe(true)
    expect(door.doorInfo!.disarmed).toBe(true)
    expect(door.doorInfo!.open).toBe(true)
  })
  it('opening without a disarm saves (leader) or costs 1 Life', () => {
    const p = party()
    const leader = p[0]
    const easy = exitWith('trapped', 1)
    const saved = triggerDoorTrap(new Rng(1), leader, easy)
    expect(saved.success).toBe(true)
    expect(easy.doorInfo!.open).toBe(true)
    expect(leader.currentLife).toBe(leader.maxLife)
    const hard = exitWith('trapped', 20)
    const before = leader.currentLife
    const hurt = triggerDoorTrap(new Rng(1), leader, hard)
    expect(hurt.success).toBe(false)
    expect(leader.currentLife).toBe(before - 1)
  })
})

describe('fog of war: explored means entered', () => {
  it('a normal explore enters the tile: explored stays true', () => {
    const rng = new Rng(11)
    const dungeon = newDungeon('camp-fog', rng, 1)
    const t1 = dungeon.tiles[0]
    const res = exploreThrough(dungeon, rng, t1.exits[0].id, 1)
    expect(res.state.tiles[1].explored).toBe(true)
  })
  it('a secret-door tile is placed unexplored, with no content leak in its events', () => {
    const rng = new Rng(11)
    const dungeon = newDungeon('camp-fog', rng, 1)
    const t1 = dungeon.tiles[0]
    exploreThrough(dungeon, rng, t1.exits[0].id, 1)
    const gen = generateSecretDoorTile(dungeon, rng, 1)
    const to = gen.state.tiles.find((t) => t.id === gen.toTileId)
    expect(to).toBeDefined()
    expect(to!.explored).toBe(false)
    expect(to!.viaSecretDoor).toBe(true)
    expect(gen.state.currentTileId).toBe(dungeon.tiles[1].id)
    const leaked = gen.events.filter(
      (e) => /Encounter:|FINAL BOSS|Cavern feature:|Beyond it:/.test(e),
    )
    expect(leaked).toEqual([])
  })
  it('door rolls happen at generation: the starting tile carries doorInfo', () => {
    let doors: PlacedExit[] = []
    for (let seed = 1; seed <= 50 && doors.length === 0; seed++) {
      const dungeon = newDungeon('camp-doors', new Rng(seed), 1)
      doors = dungeon.tiles[0].exits.filter((e) => e.door)
    }
    expect(doors.length).toBeGreaterThan(0)
    expect(doors.every((e) => e.doorInfo)).toBe(true)
  })
})
