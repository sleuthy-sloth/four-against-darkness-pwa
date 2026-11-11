# Data Model

This document describes the data structures used in the Four Against Darkness Digital PWA.

## Core Types

### Character
```typescript
interface Character {
  id: string;
  name: string;
  classId: string;
  level: number;
  experience: number;
  currentHP: number;
  maximumHP: number;
  attributes: Record<string, number>;
  abilities: string[];
  spells: string[];
  equipment: string[];
  inventory: string[];
  conditions: string[];
  status: "active" | "incapacitated" | "dead";
}
```

### DungeonRoom
```typescript
interface DungeonRoom {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  environment: string;
  doors: Door[];
  contents: RoomContent[];
  explored: boolean;
  cleared: boolean;
}
```

### Door
```typescript
interface Door {
  id: string;
  x: number;
  y: number;
  direction: "north" | "south" | "east" | "west";
  type: "standard" | "secret" | "locked";
  open: boolean;
  explored: boolean;
}
```

### Monster
```typescript
interface Monster {
  id: string;
  name: string;
  category: string;
  statistics: Record<string, number>;
  specialAbilities: string[];
  immunities: string[];
  vulnerabilities: string[];
  moraleRules: string[];
  sourceReference: string;
}
```

## Campaign Data

### Campaign
```typescript
interface Campaign {
  id: string;
  name: string;
  rulesetCode: string;
  party: Character[];
  currentAdventure: number;
  dungeonState: DungeonState;
  seed: string;
  gameHistory: GameEvent[];
  campaignStats: CampaignStats;
  createdAt: number;
  updatedAt: number;
  version: string;
}
```

### GameEvent
```typescript
interface GameEvent {
  id: string;
  type: string;
  timestamp: number;
  payload: unknown;
}
```

### DungeonState
```typescript
interface DungeonState {
  currentLevel: number;
  rooms: DungeonRoom[];
  exploredCount: number;
  clearedCount: number;
}
```

## Rules Data

Rules are stored as JSON data files in `src/rulesets/expanded/`:

### Class Definitions
```typescript
interface ClassDefinition {
  id: string;
  name: string;
  hitDice: string;
  baseStats: Record<string, number>;
  abilities: string[];
  equipmentSlots: string[];
  spellProgression?: Record<number, string[]>;
}
```

### Ruleset
```typescript
interface Ruleset {
  id: string;
  name: string;
  version: string;
  classes: ClassDefinition[];
  environments: EnvironmentDefinition[];
  encounterTables: EncounterTable[];
  monsterDatabase: Monster[];
}
```

## Database Schema (Dexie)

### Tables
- `campaigns` - Campaign metadata and state
- `characters` - Character records
- `dungeons` - Dungeon room and connection data
- `monsters` - Monster instances in encounters
- `events` - Game event log
- `settings` - User preferences

### Version History
- Version 1: Initial schema (planned)

## Data Flow

1. Events are recorded chronologically
2. State is derived from events (event sourcing pattern)
3. Database stores snapshots for performance
4. IndexedDB provides offline persistence