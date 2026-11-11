import { z } from 'zod'

/** Quest Table (FADEE p.161) and Epic Rewards Table (FADEE p.162-163), as data. */

export const QUEST_TABLE = [
  'Bring me its head! Kill a specific Boss Monster and bring its head to the Quest-giver\u2019s tile.',
  'Bring me Gold! Bring the required gold to the Quest-giver\u2019s tile.',
  'I want it alive! Subdue the target Foe (Sleep/subdual) and bring it, bound with a rope, to the Quest-giver.',
  'Bring me that! Retrieve a rare item and bring it, unused, to the Quest-giver.',
  'Let peace be your way! Complete 3 encounters non-violently (bribes, help, Sleep defeats). No return needed.',
  'Slay all the Foes! Explore the whole dungeon and slay its occupants (no return needed).',
] as const

export const QUEST_SOURCES: Record<number, string> = {
  1: 'FADEE p.161',
  2: 'FADEE p.161',
  3: 'FADEE p.161',
  4: 'FADEE p.161',
  5: 'FADEE p.161',
  6: 'FADEE p.161-162',
}

export const EpicRewardRoll = z.number().int().min(1).max(6)
export type EpicRewardRoll = z.infer<typeof EpicRewardRoll>

export const EPIC_REWARDS: Array<{ roll: number; name: string; text: string; source: string }> = [
  {
    roll: 1,
    name: 'Book of Skalitos',
    text: 'Counts as 1 scroll of each of the 6 basic wizard spells. Tearing a page yields that scroll; destroyed if the carrier dies to dragon breath; sellable unused for 650gp.',
    source: 'FADEE p.162',
  },
  {
    roll: 2,
    name: 'Gold of Kerrak Dar',
    text: 'When you Search a tile, you may spend 1 Clue to find a chest with 500gp.',
    source: 'FADEE p.162',
  },
  {
    roll: 3,
    name: 'Enchanted weapon',
    text: 'One of the party\u2019s weapons rolls 2 attack dice and keeps the best; hits Foes hit only by magic. Lasts until the end of the adventure.',
    source: 'FADEE p.162',
  },
  {
    roll: 4,
    name: 'Shield of Warning',
    text: 'Magic shield: its protection counts even when surprised, fleeing, or vs. shield-ignoring Foes. Permanent; resale 200gp.',
    source: 'FADEE p.162',
  },
  {
    roll: 5,
    name: 'Arrow of slaying',
    text: 'Automatically inflicts 3 damage on its destined Major Foe (rolled at grant time). Needs a bow; breaks after use; sellable unused for 3d6×15gp.',
    source: 'FADEE p.162-163',
  },
  {
    roll: 6,
    name: 'Holy symbol of healing',
    text: 'A cleric using it adds +2 Life to each Healing prayer. Resale 700gp (temple resurrection story effects pending).',
    source: 'FADEE p.163',
  },
]
