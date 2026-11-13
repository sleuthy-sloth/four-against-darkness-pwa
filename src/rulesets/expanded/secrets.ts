import { z } from 'zod'

/**
 * Secrets (FADEE pp.122-123): 3 Clues reveal one; the discovering PC gains
 * 1 XP and picks a Secret. This pack implements the secrets with purely
 * mechanical effects; story-driven ones arrive with the supplements
 * milestone (no silent substitution).
 */

export const SecretId = z.enum([
  'weakness',
  'terrifying',
  'treasure-location',
  'item-location',
])
export type SecretId = z.infer<typeof SecretId>

export const SECRET_INFO: Record<SecretId, { text: string; source: string }> = {
  weakness: {
    text: 'Weakness of a Foe: pick a Major Foe species — every PC attacks it at +2 for whole combats.',
    source: 'FADEE p.122',
  },
  terrifying: {
    text: 'Terrifying Secret: once, a group of Foes automatically fails its Morale roll.',
    source: 'FADEE p.123',
  },
  'treasure-location': {
    text: 'Location of a hidden treasure: speak the password in any empty room (not the entrance) — 3d6×10 gp.',
    source: 'FADEE p.122',
  },
  'item-location': {
    text: 'Location of a magic item: any dungeon room (not the first) — gain 1 magic item of your choice.',
    source: 'FADEE p.122',
  },
}

/** Major Foe species available for Weakness of a Foe (R051, FADEE p.122: a Major Foe species, not Minors). */
export const WEAKNESS_TARGETS = [
  'Mummy',
  'Orc Brute',
  'Ogre',
  'Medusa',
  'Chaos Lord',
  'Young Dragon',
  'Minotaur',
  'Iron Eater',
  'Chimera',
  'Catoblepas',
  'Giant Spider',
] as const

export function encodeSecret(id: SecretId, arg?: string): string {
  return arg ? `${id}:${arg}` : id
}

export function parseSecret(s: string): { id: SecretId; arg?: string } {
  const [id, arg] = s.split(':')
  return { id: id as SecretId, arg }
}
