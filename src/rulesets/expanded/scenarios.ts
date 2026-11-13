import { z } from 'zod'
import { CORE_CLASSES } from './coreClasses'
import { SHOP_STOCK } from './features'

/**
 * Prepared campaigns (Milestone 4): pre-formed parties on fixed seeds, each
 * with an original backstory (no book text) and an honest goal.
 *
 * HOOKS — READ BEFORE ADDING ONE: quests are offered at random by the Lady
 * in White (FADEE p.153) and cannot be chosen. Quest types 3 (subdue
 * alive) and 4 (retrieve an item) are implemented in Release 0.5 — subdual
 * capture with a rope, and a 1-in-6 retrieval roll per Major Foe slain.
 * So no scenario promises a quest. The mechanical goal of every tale is
 * the dungeon's own Final Boss: slay it and leave the dungeon alive
 * (FADEE pp.104-105). The backstory is the reason to go down; the Boss is
 * what stands between the party and it.
 *
 * SEEDS — verified with a deterministic breadth-first exploration scan
 * (tests/unit, temporary; the scan replicates the real store flow:
 * `new Rng(seed)` → createParty → newDungeon → exploreThrough, trying each
 * unexplored exit in order). Depth is what matters — the step machine
 * triggers on first occurrence, so exact tile order may vary with the
 * player's exit choices, but the dungeon is roomy in every case:
 *   - learn-to-play (1481): 13 tiles; empty, vermin (Giant Centipedes x3
 *     L2), specialFeature, empty, empty, treasureTrapped, ... — the first
 *     fight room has 1 door, and Torsten carries 4 bags of nails, so the
 *     party can rest in any room it reaches (a tile has at most 4 doors).
 *   - sunken-chapel (1004): 12 tiles; first encounter tile 2, Skeletons
 *     or Zombies x4 L3.
 *   - missing-scout (1003): 12 tiles; first encounter tile 4, Orcs x3 L4.
 *   - cursed-vault (1002): 11 tiles; first encounter tile 3, Vampire
 *     Bats x7 L1.
 * No scenario has a boss in its first 10 tiles, so the Final Boss stays a
 * late-dungeon goal.
 */

const ScenarioPartyMember = z.object({
  classId: z.string(),
  name: z.string().min(1).max(24),
  /**
   * Extra supplied kit beyond the class starting list. The tutorial party
   * carries bags of nails so resting (FADEE p.114, one bag per door) is
   * actually doable in the guided delve — no class starts with any, and a
   * tile has at most 4 doors, so 4 bags rest the party anywhere.
   */
  extraEquipment: z.array(z.string()).optional(),
})

export const ScenarioDef = z.object({
  id: z.string(),
  name: z.string(),
  /** Original flavor text, 2–3 sentences; logged as the first journal entry. */
  backstory: z.string().min(40),
  /** The mechanical goal, in the tale's voice; always the Final Boss. */
  goal: z.string().min(20),
  seed: z.number().int().min(1),
  party: z.array(ScenarioPartyMember).length(4),
  /** The "Learn to play" scenario — runs the tutorial step machine. */
  tutorial: z.boolean().optional(),
  /**
   * Clues in the party pool at the start of the delve (FADEE p.108).
   * The tutorial party starts with 3: a door that answers only to a
   * Clue (lever 1, illusionary 3) would otherwise strand a new party
   * on a tile whose exits it cannot open — and Clues are only earned by
   * searching, which is the lesson the party is trying to reach. Three
   * opens any single Clue-door.
   */
  startingClues: z.number().int().min(0).optional(),
})

export type ScenarioDef = z.infer<typeof ScenarioDef>

export const TUTORIAL_SCENARIO_ID = 'learn-to-play'

export const SCENARIOS: ScenarioDef[] = [
  {
    id: TUTORIAL_SCENARIO_ID,
    name: 'Learn to play — The First Delve',
    backstory:
      'Every delver remembers their first descent: four adventurers, one torch, three leads worth following, and a dungeon that does not care that you are new. This is a guided first delve — the dungeon is real, the dice are real, and a patient voice will walk you through it, one step at a time.',
    goal: 'Learn the delve — explore, fight, search, and rest — then slay the Final Boss and leave alive. When the last lesson lands, the training wheels come off and the campaign is yours.',
    seed: 1481,
    tutorial: true,
    startingClues: 3,
    party: [
      { classId: 'warrior', name: 'Torsten', extraEquipment: ['bag of nails', 'bag of nails', 'bag of nails', 'bag of nails', 'torch'] },
      { classId: 'cleric', name: 'Anya' },
      { classId: 'wizard', name: 'Fen' },
      { classId: 'rogue', name: 'Joss' },
    ],
  },
  {
    id: 'sunken-chapel',
    name: 'The Sunken Chapel',
    backstory:
      'Beneath the town of Millbrook, the old chapel of Saint Anselm sank into the floodwaters a generation ago, and the townsfolk sealed the stair rather than mourn it. The saint\u2019s relic — a small silver lantern said to burn without oil — still glows down in the dark, and the chapel\u2019s drowned dead do not rest. Bring the lantern back up, and the town will remember its saint.',
    goal: 'Slay the Final Boss of this delve — the guardian of the chapel\u2019s depths — and leave the dungeon alive. The lantern is why you went down; the Boss is what stands between you and it.',
    seed: 1004,
    party: [
      { classId: 'cleric', name: 'Odessa' },
      { classId: 'warrior', name: 'Bram' },
      { classId: 'wizard', name: 'Pell' },
      { classId: 'rogue', name: 'Tamsin' },
    ],
  },
  {
    id: 'missing-scout',
    name: 'The Missing Scout',
    backstory:
      'Elara Voss was the best scout the guild ever sent below — she mapped three delves and came home from all of them. Four days ago she went down after a raider band and never returned; her last signal, a white ribbon tied to a doorframe, was found at the mouth of the deep halls. Find what happened to her, and bring her home if she still lives.',
    goal: 'Slay the Final Boss of this delve — whatever took Elara — and leave the dungeon alive. The deep halls keep their own ledger; the Boss is its last page.',
    seed: 1003,
    party: [
      { classId: 'halfling', name: 'Pip' },
      { classId: 'rogue', name: 'Sable' },
      { classId: 'elf', name: 'Lirael' },
      { classId: 'warrior', name: 'Dain' },
    ],
  },
  {
    id: 'cursed-vault',
    name: 'The Cursed Vault',
    backstory:
      'The tomb-vault of King Morvain has stood sealed for two hundred years, its doors shut by a curse that turns every would-be thief\u2019s luck black. The guild\u2019s sages say the curse can only be broken the old way: go in, face what guards the king\u2019s rest, and come out alive. The vault has never been opened. The curse has never been broken.',
    goal: 'Slay the Final Boss of this delve — what guards the king\u2019s rest — and leave the dungeon alive. Break the curse the old way: face it, and come out alive.',
    seed: 1002,
    party: [
      { classId: 'barbarian', name: 'Korg' },
      { classId: 'dwarf', name: 'Borin' },
      { classId: 'cleric', name: 'Mira' },
      { classId: 'wizard', name: 'Vex' },
    ],
  },
]

export function getScenario(id: string): ScenarioDef | undefined {
  return SCENARIOS.find((s) => s.id === id)
}

/** The three prepared tales — everything but the tutorial scenario. */
export function getTales(): ScenarioDef[] {
  return SCENARIOS.filter((s) => !s.tutorial)
}

/**
 * Structural validation for the scenario table: every scenario has 4
 * distinct, real classes, a seed, a backstory, and — for any supplied kit —
 * items the game actually sells. Throws on the first problem; the unit test
 * runs this over the whole table.
 */
export function validateScenarios(scenarios: readonly ScenarioDef[] = SCENARIOS): void {
  const knownClasses = new Set(CORE_CLASSES.map((c) => c.id))
  const seeds = new Set<number>()
  for (const s of scenarios) {
    ScenarioDef.parse(s)
    if (seeds.has(s.seed)) throw new Error(`scenario ${s.id}: seed ${s.seed} is reused`)
    seeds.add(s.seed)
    const classes = s.party.map((m) => m.classId)
    if (new Set(classes).size !== 4) {
      throw new Error(`scenario ${s.id}: party must have 4 distinct classes`)
    }
    for (const m of s.party) {
      if (!knownClasses.has(m.classId)) {
        throw new Error(`scenario ${s.id}: unknown class ${m.classId}`)
      }
      for (const item of m.extraEquipment ?? []) {
        if (!(SHOP_STOCK as readonly string[]).includes(item)) {
          throw new Error(`scenario ${s.id}: extra equipment ${item} is not sold anywhere`)
        }
      }
    }
  }
}
