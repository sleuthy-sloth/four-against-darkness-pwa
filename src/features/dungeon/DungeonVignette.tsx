/**
 * Dungeon scene art for the dungeon tab: a torch-lit corridor vignette
 * while the party explores, and a sunlit-steps vignette for the win state.
 * Both are original ink line art in the Delver style (parchment with
 * oxblood accents), shipped as WebP in public/art/.
 */

export type DungeonVignetteKind = 'entrance' | 'victory'

const ART: Record<DungeonVignetteKind, { file: string; alt: string }> = {
  entrance: {
    file: 'art/dungeon-corridor.webp',
    alt: 'A hooded delver with a raised torch at the mouth of a dark dungeon corridor',
  },
  victory: {
    file: 'art/dungeon-victory.webp',
    alt: 'The delver climbs sunlit steps out of the dungeon, torch raised, treasure spilled at the foot of the stairs',
  },
}

export function DungeonVignette({
  kind,
  className = '',
}: {
  kind: DungeonVignetteKind
  className?: string
}) {
  const art = ART[kind]
  return (
    <img
      src={`${import.meta.env.BASE_URL}${art.file}`}
      alt={art.alt}
      className={`block w-full max-w-lg rounded-lg object-cover ${className}`}
    />
  )
}

export default DungeonVignette
