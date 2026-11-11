# Four Against Darkness — Digital PWA
# Complete Product Specification & Hermes Implementation Instructions
# Project codename: 4AD Digital
# Target ruleset: Four Against Darkness — Expanded Edition
# Platform: iPhone-first Progressive Web Application
# Deployment: Cloudflare Pages / GitHub
# Primary domain: 4ad.stevenkoehl.com
# Game mode: Single-player, solo dungeon crawler
# Automation: Full mechanical automation
# Visual design: Top-down dungeon map
# Internet requirement: None during gameplay
# AI requirement: None for core gameplay
#

## PART I — PROJECT OBJECTIVES

### 1. Project Vision

Build a fully playable digital adaptation of Four Against Darkness that runs entirely in a mobile browser and can be installed on an iPhone as a PWA.

The application should reproduce the tabletop gameplay experience while automating the mechanical work.

The player controls a party of four adventurers and explores procedurally generated dungeons.

The application handles:

* Dungeon generation.
* Room generation.
* Corridor and door placement.
* Monster selection and placement.
* Encounter resolution.
* Dice rolls.
* Combat calculations.
* Character statistics.
* Spells and special abilities.
* Treasure generation.
* Traps and events.
* Experience and character progression.
* Inventory and equipment.
* Campaign persistence.
* Adventure completion.

The player retains control over meaningful decisions:

* Which doors to open.
* Where to explore.
* Which enemies to target.
* Which abilities to use.
* How to manage consumables.
* When to retreat.
* How to respond to encounters.

Core philosophy: The application handles the bookkeeping and mechanics. The player handles the adventure.

The finished application should feel like a standalone mobile dungeon crawler rather than a digital character sheet or collection of dice rollers.

### 2. Primary Objectives

1. Implement the Expanded Edition rules as accurately as possible.
2. Provide a complete, interactive dungeon map.
3. Automate room generation and encounter placement.
4. Automate all mechanical combat calculations.
5. Support the complete four-character party system.
6. Support persistent campaigns.
7. Operate entirely offline after installation.
8. Require no account or subscription.
9. Require no backend server for ordinary gameplay.
10. Provide an architecture that supports future supplements and additional content.

### 3. Non-Goals

Do not prioritize the following during initial development:

* Multiplayer.
* Online leaderboards.
* AI-generated adventures.
* AI-generated monster statistics.
* Online character accounts.
* Subscription features.
* Real-time multiplayer synchronization.
* 3D dungeon rendering.
* A social network.
* A complex backend.

These may be considered later, but they must not delay the core game.

## PART II — INITIAL EXECUTION INSTRUCTIONS

### 4. Hermes Operating Instructions

Before making changes, inspect the current environment.

Do not assume the project directory, repository, GitHub configuration, hosting configuration, or existing application state.

**Step 1: Environment inspection**

Determine:

* Current working directory.
* Available development tools.
* Node.js version.
* npm version.
* Git availability.
* GitHub authentication status.
* Cloudflare deployment availability.
* Existing repositories that might contain relevant project work.
* Whether a 4AD project already exists.

If an existing repository is found, inspect it before making changes.

Do not overwrite unrelated work.

**Step 2: Report initial status**

Produce a short report containing:

* Available tools.
* Relevant existing repositories.
* Existing project files.
* Hosting readiness.
* Missing dependencies.
* Recommended project location.
* Any blockers.

**Step 3: Establish the project**

If no appropriate repository exists:

* Create a repository named four-against-darkness-pwa.
* Use the GitHub account/repository access already available.
* Initialize the project with a README.
* Establish the directory structure specified below.
* Configure the development environment.

If an appropriate repository already exists, reuse it.

**Step 4: Create project documentation**

Create these documents before substantial implementation:

docs/
├── PROJECT_SPEC.md
├── ARCHITECTURE.md
├── GAME_RULES.md
├── RULES_VERIFICATION.md
├── DATA_MODEL.md
├── IMPLEMENTATION_ROADMAP.md
├── TESTING_STRATEGY.md
├── COPYRIGHT_AND_CONTENT.md
├── DEPLOYMENT.md
├── CHANGELOG.md
└── decisions/

The current implementation brief should be preserved as the project's main specification.

**Step 5: Maintain implementation status**

Maintain docs/IMPLEMENTATION_STATUS.md.

Update it whenever a milestone changes.

It must contain:

* Completed work.
* Current work.
* Pending work.
* Known bugs.
* Unverified mechanics.
* Failed tests.
* Outstanding dependencies.
* Next recommended task.

Do not report a feature as complete merely because code exists. It must pass its acceptance tests.

## PART III — RULES RESEARCH AND ACCURACY

### 5. Rules Research

This is the most important preliminary task.

Use a legitimately obtained copy of the Four Against Darkness Expanded Edition as the authoritative rules reference.

Do not assume that an online copy is authorized for reproduction or redistribution.

Do not invent missing rules.

Do not rely on memory or generic tabletop RPG conventions when the published rules specify something different.

**Research requirements**

Catalog the complete mechanics relevant to the Expanded Edition:

1. Character creation.
2. Character classes.
3. Character statistics.
4. Character traits.
5. Character advancement.
6. Party composition.
7. Dungeon generation.
8. Room generation.
9. Room dimensions.
10. Doors and corridors.
11. Environmental rules.
12. Encounter generation.
13. Monster statistics.
14. Monster quantities.
15. Monster special abilities.
16. Combat resolution.
17. Morale.
18. Spells.
19. Equipment.
20. Treasure.
21. Traps.
22. Events.
23. Special rooms.
24. Healing.
25. Death and recovery.
26. Adventure completion.
27. Campaign progression.

Verify the actual class roster, environment names, encounter tables, and exceptions against the book. Do not rely on summaries or assumed lists.

**Rules verification database**

For every mechanic, document:

|| Field | Purpose |
|| --- | --- |
|| Rule ID | Unique identifier |
|| Rule name | Descriptive name |
|| Source | Book and page reference |
|| Preconditions | When the rule applies |
|| Inputs | Required values |
|| Resolution | Calculation or procedure |
|| Outputs | Resulting changes |
|| Exceptions | Special cases |
|| Test cases | How to verify it |
|| Status | Unverified, verified, implemented |

Use these status values:

* UNVERIFIED
* RESEARCHED
* VERIFIED
* IMPLEMENTED
* TESTED

A mechanic must not be marked TESTED until automated tests verify its behavior.

**Rules research deliverable**

Create docs/RULES_VERIFICATION.md

This document must provide a complete inventory of required mechanics and their implementation status.

**Copyright requirements**

The project must distinguish game mechanics from copyrighted expression.

* Do not copy the book's prose into the application.
* Do not reproduce illustrations without permission.
* Do not redistribute scanned or extracted rulebook pages.
* Do not scrape and republish proprietary content.
* Write original interface descriptions.
* Use original artwork or properly licensed assets.
* Keep source references for verification.
* Obtain publisher permission before distributing protected content where necessary.

The public repository should contain independently authored code and data that we have the right to distribute.

Do not use official branding in a way that implies publisher endorsement.

## PART IV — TECHNICAL ARCHITECTURE

### 6. Technology Stack

Use the following stack unless an actual technical limitation justifies a change.

|| Component | Technology |
|| --- | --- |
|| Language | TypeScript |
|| Frontend | React |
|| Build system | Vite |
|| Styling | Tailwind CSS |
|| Map renderer | SVG |
|| Application state | Zustand |
|| Local database | IndexedDB |
|| Database library | Dexie.js |
|| Schema validation | Zod |
|| Unit testing | Vitest |
|| Browser testing | Playwright |
|| PWA support | vite-plugin-pwa |
|| Hosting | Cloudflare Pages |
|| Source control | GitHub |
|| CI/CD | GitHub Actions |

Use current stable, mutually compatible package versions at project initialization.

Record package versions in the lockfile.

Avoid unnecessary dependencies.

### 7. Architectural Principles

The application must use a modular architecture.

The game engine must be independent of React.

The interface must not contain game rules.

The game engine must not depend on browser APIs.

Use clear boundaries between:

* Presentation.
* Game mechanics.
* Rules data.
* Persistence.
* Random number generation.
* Application state.

**Game engine design**

The engine should use deterministic state transitions.

Conceptually:

```typescript
interface GameAction {
  type: string;
  payload: unknown;
}

interface GameEvent {
  id: string;
  type: string;
  timestamp: number;
  payload: unknown;
}

interface GameResult {
  newState: GameState;
  events: GameEvent[];
  messages: string[];
}

function resolveAction(
  state: GameState,
  action: GameAction,
  rules: Ruleset
): GameResult;
```

All game actions must pass through a defined game-engine interface.

The UI must never directly modify important game state.

**Event-based architecture**

Use game events to record important state changes.

Examples:

* ROOM_GENERATED
* DOOR_OPENED
* MONSTER_SPAWNED
* ENCOUNTER_STARTED
* ATTACK_RESOLVED
* DAMAGE_APPLIED
* CHARACTER_DEFEATED
* TREASURE_FOUND
* ITEM_COLLECTED
* SPELL_CAST
* EXPERIENCE_AWARDED
* ROOM_COMPLETED
* ADVENTURE_COMPLETED

Events must contain enough information to reconstruct the relevant history.

Use transactions when applying multi-step operations.

A failed operation must not leave the campaign in a partially updated state.

## PART V — GAME ENGINE

### 8. Random Number Generation

Implement a seeded pseudorandom number generator.

Requirements:

* Campaign-specific seed.
* Persisted generator state.
* Reproducible sequences.
* Dice rolling utilities.
* Roll history.
* Roll explanations.
* Testable random sources.
* No reliance on Math.random() inside game mechanics.

Use a well-tested seeded PRNG implementation or a clearly documented implementation.

Every random operation must be traceable.

Record:

* Roll identifier.
* Dice type.
* Number of dice.
* Modifier.
* Result.
* Reason.
* Associated game action.

Provide a developer-only option to replay an adventure using the same seed and initial state.

### 9. Character Engine

Implement a complete character management system.

Character data should include:

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

This is a conceptual schema. Adapt it to the actual rules and required data.

Requirements:

* Character creation.
* Character naming.
* Class selection.
* Class-specific statistics.
* Class abilities.
* Spell management.
* Equipment.
* Inventory.
* Experience.
* Level advancement.
* Health management.
* Conditions and status effects.
* Character death.
* Recovery where permitted.

**Party management**

Support four active characters.

The party interface should show:

* Name.
* Class.
* Level.
* Health.
* Experience.
* Status.
* Current equipment summary.

Selecting a character should open a detailed sheet.

Character data must persist across adventures where permitted by the rules.

### 10. Dungeon Generation Engine

This is the primary gameplay system.

Generate the dungeon incrementally as the party explores.

Do not reveal unexplored areas.

The map must be a visual representation of the actual game state.

**Dungeon requirements**

Support:

* Room generation.
* Room dimensions.
* Door generation.
* Corridor connections.
* Dungeon boundaries.
* Room classification.
* Special room conditions.
* Secret doors.
* Locked doors.
* Exits.
* Multiple levels if required.
* Exploration state.
* Encounter state.

All generation must follow the selected ruleset.

**Room data model**

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

Adapt this schema to the actual room-generation rules.

**Map representation**

Use a coordinate-based map.

Store room geometry independently from its rendered SVG representation.

The renderer must be able to redraw the map from saved game state.

**Map interaction**

Implement:

* Tap to inspect.
* Tap an available door to explore.
* Drag to pan.
* Pinch to zoom.
* Recenter on party.
* Show explored areas.
* Hide unexplored areas.
* Highlight available exits.
* Highlight active encounters.
* Display current party position.

Avoid accidental exploration caused by map dragging or zooming.

**Map rendering requirements**

Use SVG.

Each room, corridor, door and marker should have an identifiable game object.

Use original graphical assets or procedural shapes.

The map should resemble a traditional fantasy dungeon map rather than a modern tactical battlefield.

Prioritize legibility on small screens.

### 11. Encounter Engine

The encounter engine must implement the actual encounter-selection rules.

When a room requires an encounter:

1. Determine the applicable environment.
2. Determine the relevant encounter table.
3. Roll the required dice.
4. Select the result.
5. Determine monster quantity.
6. Apply encounter modifiers.
7. Generate the encounter.
8. Position monsters according to the game rules.
9. Record the encounter.
10. Start the appropriate game state.

Support:

* Standard monsters.
* Special monsters.
* Multiple monster types.
* Boss encounters where applicable.
* Encounter-specific rules.
* Special environmental interactions.

Do not use generic encounter probabilities when the published rules provide exact tables.

### 12. Monster Database

Monster records should be data-driven.

Conceptual structure:

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

The final schema must reflect the actual monster mechanics.

Each monster must support:

* Base statistics.
* Combat behavior.
* Special attacks.
* Special defenses.
* Status effects.
* Morale.
* Immunities.
* Encounter-specific rules.

Support additional monster packs without modifying the core engine.

### 13. Combat Engine

Combat should be fully automated mechanically.

The player makes tactical decisions, and the engine resolves the rules.

**Combat requirements**

* Target selection.
* Attack selection.
* Dice rolls.
* Attack resolution.
* Defense resolution.
* Damage calculation.
* Health updates.
* Special attacks.
* Special abilities.
* Spells.
* Consumables.
* Status effects.
* Morale.
* Monster defeat.
* Character defeat.
* Combat completion.
* Rewards.

Do not automatically select tactical actions for the player unless a specific rule requires automatic behavior.

**Combat flow**

1. Enter encounter.
2. Initialize encounter state.
3. Establish applicable combat order.
4. Display available player decisions.
5. Resolve selected action.
6. Apply game mechanics.
7. Process automatic enemy actions.
8. Update combat state.
9. Repeat until encounter ends.
10. Apply consequences and rewards.

The actual order and resolution must follow the source rules, not this generic workflow if the rules differ.

**Combat interface**

Display:

* Party health.
* Monster group.
* Monster health/status.
* Available attacks.
* Spells.
* Abilities.
* Consumables.
* Target selection.
* Combat log.

Provide a clear explanation for each automatic calculation.

**Combat log**

Every combat action must be recorded.

Example:

```
Fighter attacks Goblin.
Attack roll: [result]
Applicable modifiers: [details]
Outcome: [result]
Damage: [result]
Goblin health updated.
```

Use actual game rules for all values.

### 14. Treasure Engine

Implement treasure generation according to the relevant tables.

Support:

* Gold.
* Equipment.
* Consumables.
* Magical items.
* Special rewards.
* Treasure-specific conditions.

Automatically update:

* Party gold.
* Character inventory.
* Equipment.
* Campaign records.

Provide an explanation of where rewards came from.

### 15. Trap and Event Engine

Implement:

* Trap selection.
* Trap triggering.
* Detection where applicable.
* Trap resolution.
* Damage and effects.
* Special rooms.
* Random events.
* Environment-specific events.
* Quest events.
* Other rule-driven room effects.

All results must use the correct rules tables.

### 16. Magic and Abilities

Create a unified system for class abilities and spells.

Support:

* Availability requirements.
* Casting restrictions.
* Resource costs.
* Dice resolution.
* Target selection.
* Effects.
* Duration.
* Status changes.
* Special exceptions.

Avoid implementing spells individually inside React components.

Create reusable resolution handlers in the game engine.

## PART VI — CAMPAIGN SYSTEM

### 17. Campaign Management

Support multiple simultaneous campaigns.

Each campaign should include:

* Campaign ID.
* Campaign name.
* Ruleset.
* Party.
* Current adventure.
* Current dungeon.
* Campaign seed.
* Game history.
* Campaign statistics.
* Creation date.
* Last modified date.
* Save version.

**Campaign operations**

* New campaign.
* Continue campaign.
* Rename campaign.
* Duplicate campaign.
* Archive campaign.
* Delete campaign.
* Export campaign.
* Import campaign.

Require confirmation before destructive operations.

### 18. Persistence

Use IndexedDB with Dexie.js.

Automatically save after every completed game action.

Save operations must be transactional.

Store:

* Campaign metadata.
* Characters.
* Party.
* Dungeon map.
* Rooms.
* Encounters.
* Monster state.
* Inventory.
* Combat history.
* Event history.
* Random generator state.
* Ruleset version.

**Save checkpoints**

Provide:

* Automatic save.
* Manual checkpoint.
* Restore checkpoint.
* JSON export.
* JSON import.

**Data migration**

Every persisted save must include a schema version.

Implement migrations when the application data structure changes.

Never silently discard incompatible campaign data.

### 19. Undo System

Implement a transaction-based undo system.

Undo should reverse the entire last game action.

It must restore:

* Game state.
* Dice generator state.
* Health.
* Inventory.
* Monster status.
* Room status.
* Encounter state.
* Event history.

Only allow undo where it does not violate campaign or rules constraints.

Provide an explicit confirmation for undoing major actions.

## PART VII — USER INTERFACE

### 20. Visual Direction

The visual design should resemble a traditional fantasy dungeon crawler.

Use:

* Dark stone backgrounds.
* Muted parchment.
* Warm torchlight accents.
* Clear room boundaries.
* Simple map symbols.
* Readable typography.
* Subtle fantasy-inspired decoration.

Avoid excessive ornamentation.

The map must remain the visual centerpiece.

Prioritize usability over elaborate artwork.

### 21. Main Navigation

Use five primary areas:

1. Explore.
2. Party.
3. Journal.
4. Inventory.
5. Settings.

Keep navigation accessible on iPhone.

Do not let navigation consume excessive screen space.

### 22. Campaign Dashboard

Display:

* Active campaign.
* Party summary.
* Current adventure.
* Current dungeon.
* Party health.
* Last saved status.
* Continue button.
* New campaign button.
* Campaign history.

### 23. Dungeon Screen

This is the primary gameplay screen.

Requirements:

* Large map viewport.
* Interactive rooms.
* Visible doors.
* Corridor connections.
* Party position.
* Encounter indicators.
* Fog of war.
* Zoom and pan.
* Recenter control.
* Current room information.
* Available actions.

Use a collapsible bottom panel for secondary information.

Do not obscure the dungeon map with permanent menus.

### 24. Party Screen

Display four characters.

Each character card should show:

* Name.
* Class.
* Level.
* HP.
* XP.
* Status.
* Equipment summary.

Tapping a character opens their detailed character sheet.

### 25. Inventory Screen

Display:

* Party inventory.
* Character-specific equipment.
* Gold.
* Consumables.
* Magical items.
* Item descriptions.
* Item usage actions.

Enforce all equipment and inventory restrictions defined by the rules.

### 26. Journal Screen

Provide a chronological adventure history.

Record:

* Rooms explored.
* Doors opened.
* Monsters encountered.
* Combat results.
* Treasures found.
* Traps triggered.
* Events.
* Character deaths.
* Quest progression.
* Adventure completion.

Allow filtering by event category.

### 27. Settings

Include:

* Sound effects toggle.
* Music toggle, if implemented.
* Haptic feedback toggle.
* Animation settings.
* Map zoom preferences.
* Text size.
* Dice animation settings.
* Save management.
* Import/export.
* Ruleset selection where appropriate.
* Credits and licensing.

## PART VIII — PWA AND OFFLINE OPERATION

### 28. PWA Requirements

The application must be installable on iPhone through Safari's Add to Home Screen functionality.

Implement:

* Web app manifest.
* Application icons.
* Service worker.
* Offline asset caching.
* Application shell caching.
* Offline fallback.
* Version management.
* Cache updates.

Use vite-plugin-pwa.

**Offline requirements**

After initial installation and caching:

* The application launches without internet.
* Campaigns load.
* Characters load.
* Dungeon exploration works.
* Combat works.
* Random generation works.
* Saves work.
* Export works.
* Import works.

Do not make any core game feature depend on an external API.

**iPhone requirements**

Test:

* Safari browser.
* Installed home-screen PWA.
* Portrait orientation.
* Landscape orientation.
* Touch interactions.
* Safe-area insets.
* Virtual keyboard.
* Browser storage persistence.

Use responsive layouts.

Prevent accidental page scrolling during map interactions.

## PART IX — REPOSITORY STRUCTURE

### 29. Directory Layout

Use the following modular structure:

```
four-against-darkness-pwa/
│
├── public/
│   ├── icons/
│   ├── assets/
│   └── manifest.webmanifest
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── navigation.ts
│   │
│   ├── components/
│   │   ├── layout/
│   │   ├── buttons/
│   │   ├── dialogs/
│   │   └── common/
│   │
│   ├── features/
│   │   ├── campaign/
│   │   ├── party/
│   │   ├── character/
│   │   ├── dungeon/
│   │   ├── combat/
│   │   ├── inventory/
│   │   └── journal/
│   │
│   ├── engine/
│   │   ├── core/
│   │   ├── dice/
│   │   ├── rules/
│   │   ├── dungeon/
│   │   ├── encounters/
│   │   ├── combat/
│   │   ├── characters/
│   │   ├── monsters/
│   │   ├── treasure/
│   │   ├── events/
│   │   └── campaign/
│   │
│   ├── rulesets/
│   │   ├── schema/
│   │   ├── expanded/
│   │   └── custom/
│   │
│   ├── database/
│   │   ├── db.ts
│   │   ├── migrations/
│   │   └── repositories/
│   │
│   ├── state/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   └── styles/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── simulation/
│   └── e2e/
│
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── GAME_RULES.md
│   ├── RULES_VERIFICATION.md
│   ├── DATA_MODEL.md
│   ├── IMPLEMENTATION_ROADMAP.md
│   ├── TESTING_STRATEGY.md
│   ├── COPYRIGHT_AND_CONTENT.md
│   ├── DEPLOYMENT.md
│   └── IMPLEMENTATION_STATUS.md
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── README.md
└── LICENSE
```

Adjust the structure if technical needs justify it, but maintain separation between game mechanics, UI, and rules data.

## PART X — TESTING AND QUALITY CONTROL

### 30. Testing Strategy

Testing is a first-class development requirement.

Do not defer testing until the end.

**Unit tests**

Test:

* Dice rolling.
* Random number generation.
* Character statistics.
* Character progression.
* Combat calculations.
* Monster statistics.
* Encounter selection.
* Room generation.
* Door generation.
* Treasure generation.
* Trap resolution.
* Spell resolution.
* Inventory restrictions.

**Integration tests**

Test complete workflows:

1. Create campaign.
2. Create four characters.
3. Generate dungeon.
4. Explore a room.
5. Generate encounter.
6. Start combat.
7. Resolve combat.
8. Award rewards.
9. Update characters.
10. Save campaign.
11. Reload campaign.
12. Continue exploration.

**Simulation tests**

Run large batches of automated dungeon and encounter simulations.

Look for:

* Invalid dungeon connections.
* Impossible room configurations.
* Missing encounter outcomes.
* Incorrect monster quantities.
* Unexpected state transitions.
* Broken combat loops.
* Unreachable exits.
* Invalid character states.
* Save inconsistencies.

Use deterministic seeds to reproduce failures.

**Browser tests**

Use Playwright.

Test:

* Application launch.
* Campaign creation.
* Party creation.
* Map interactions.
* Door exploration.
* Combat.
* Inventory.
* Save and reload.
* Import and export.
* Mobile layouts.

**Rules verification**

Every implemented mechanic must have:

* A source reference.
* An implementation.
* A corresponding test.
* A verified result.

Never mark an entire ruleset complete when only its basic mechanics work.

## PART XI — IMPLEMENTATION ROADMAP

### 31. Phase 0: Research and Foundation

Priority: Highest

Tasks:

* Inspect the development environment.
* Inspect GitHub and Cloudflare access.
* Establish project repository.
* Obtain and inspect the legitimate Expanded Edition reference.
* Catalog game mechanics.
* Catalog character classes.
* Catalog environments.
* Catalog encounter rules.
* Catalog monster mechanics.
* Catalog combat rules.
* Catalog progression.
* Create rules verification documents.
* Create initial architecture documentation.
* Establish project status tracking.

Deliverables:

* GitHub repository.
* Project documentation.
* Rules inventory.
* Initial data model.
* Architecture plan.
* Development environment.

Acceptance criteria:

* The core rules inventory is documented.
* Unknown rules are identified.
* The data model has been reviewed.
* The project can be built locally.

Do not rush this phase.

### 32. Phase 1: PWA Foundation

Tasks:

* Initialize React.
* Configure TypeScript.
* Configure Vite.
* Configure Tailwind.
* Set up routing.
* Create navigation.
* Create responsive layout.
* Configure IndexedDB.
* Configure Zustand.
* Implement PWA manifest.
* Implement service worker.
* Configure automated testing.
* Create application icons.
* Establish initial design system.

Deliverables:

* Installable application shell.
* Working navigation.
* Local database.
* Initial settings.
* Basic offline functionality.

Acceptance criteria:

* Application builds.
* Application launches.
* Application installs on iPhone.
* Application can launch offline.
* Database persists across restarts.

### 33. Phase 2: Character System

Tasks:

* Create character schema.
* Implement class definitions.
* Implement character creation.
* Implement character naming.
* Implement statistics.
* Implement health.
* Implement abilities.
* Implement equipment.
* Implement inventory.
* Implement party management.
* Implement character persistence.

Deliverables:

* Functional party creation.
* Character sheets.
* Party dashboard.
* Character storage.

Acceptance criteria:

* Four characters can be created.
* Character data follows verified rules.
* Character information persists.
* Character data can be reloaded.

### 34. Phase 3: Dungeon Generation

Tasks:

* Implement seeded random engine.
* Implement coordinate system.
* Implement room generation.
* Implement room dimensions.
* Implement doors.
* Implement corridors.
* Implement connections.
* Implement map renderer.
* Implement fog of war.
* Implement exploration.
* Implement zoom.
* Implement pan.
* Implement party position.
* Implement room selection.

Deliverables:

* Interactive dungeon map.
* Incremental exploration.
* Room generation.

Acceptance criteria:

* Party can explore a generated dungeon.
* Rooms connect correctly.
* Doors are represented correctly.
* Map state persists.
* The map works on iPhone touchscreens.

### 35. Phase 4: Encounters and Combat

Tasks:

* Implement monster data schema.
* Implement encounter tables.
* Implement monster selection.
* Implement monster quantities.
* Implement encounter initialization.
* Implement combat order.
* Implement attack resolution.
* Implement damage.
* Implement special abilities.
* Implement spells.
* Implement morale.
* Implement status effects.
* Implement defeat.
* Implement combat log.

Deliverables:

* Automated encounter generation.
* Complete core combat system.

Acceptance criteria:

* Monsters spawn correctly.
* Combat resolves using verified rules.
* Character and monster states update correctly.
* Combat logs explain outcomes.
* Combat can be saved and restored.

### 36. Phase 5: Complete Adventure Mechanics

Tasks:

* Implement treasure.
* Implement equipment rewards.
* Implement traps.
* Implement events.
* Implement special rooms.
* Implement healing.
* Implement character progression.
* Implement adventure objectives.
* Implement adventure completion.
* Implement campaign transitions.

Deliverables:

* Complete adventure loop.

Acceptance criteria:

* Party can complete a full adventure.
* Rewards are applied correctly.
* Character progression works.
* Adventure completion is recorded.

### 37. Phase 6: Campaign and Offline Systems

Tasks:

* Implement multiple campaigns.
* Implement automatic saving.
* Implement save checkpoints.
* Implement undo.
* Implement export.
* Implement import.
* Implement database migrations.
* Implement recovery handling.
* Implement complete offline caching.

Deliverables:

* Persistent campaign system.
* Campaign backup tools.
* Reliable offline application.

Acceptance criteria:

* Campaigns survive application restarts.
* Campaigns can be exported.
* Campaigns can be imported.
* The application works offline.
* Interrupted saves do not corrupt campaign state.

### 38. Phase 7: Polish and Release

Tasks:

* Refine dungeon interface.
* Improve touch controls.
* Refine map presentation.
* Improve combat interface.
* Improve typography.
* Add sound effects if appropriate.
* Improve accessibility.
* Optimize performance.
* Complete rules verification.
* Complete browser testing.
* Test installed PWA.
* Prepare deployment.
* Write user documentation.

Deliverables:

* Release candidate.
* Public application.
* Documentation.
* Deployment instructions.

Acceptance criteria:

* Complete playable adventure.
* No known critical defects.
* All required mechanics tested.
* Offline play verified.
* Campaign persistence verified.
* Deployment successful.

## PART XII — RELEASE REQUIREMENTS

### 39. Release 0.1: Playable Prototype

Must include:

* Four-character party.
* Basic character sheets.
* Seeded dice engine.
* Dungeon environment.
* Interactive map.
* Room generation.
* Door generation.
* Monster encounters.
* Basic automated combat.
* Local saving.

The goal is a small, complete playable dungeon experience.

Do not expand the scope until this milestone works reliably.

### 40. Release 0.5: Complete Core Game

Must include:

* Expanded Edition class support.
* All supported environments.
* Complete verified encounter mechanics.
* Full combat rules.
* Spells.
* Abilities.
* Treasure.
* Equipment.
* Traps.
* Events.
* Character progression.
* Adventure completion.

### 41. Release 1.0: Full Application

Must include:

* Complete verified Expanded Edition implementation.
* Campaign management.
* Multiple saves.
* Import/export.
* Offline installation.
* Polished iPhone interface.
* Complete rules verification.
* Automated testing.
* Public deployment.
* Documentation.

## PART XIII — HOSTING AND DEPLOYMENT

### 42. Deployment Target

Use Cloudflare Pages.

Suggested address:

https://4ad.stevenkoehl.com

Use the existing GitHub and Cloudflare setup if available.

Do not create a new hosting subscription.

**Deployment architecture**

```
GitHub Repository
       |
       v
GitHub Actions
       |
       v
Run Tests
       |
       v
Build Application
       |
       v
Cloudflare Pages
       |
       v
4ad.stevenkoehl.com
       |
       v
iPhone PWA
```

**Deployment tasks**

* Configure production build.
* Configure GitHub Actions.
* Configure Cloudflare Pages.
* Configure custom domain.
* Configure HTTPS.
* Verify static asset paths.
* Verify SPA routing.
* Verify service worker.
* Verify application updates.
* Verify offline operation.

The application must work correctly from its custom subdomain.

Do not assume root-domain deployment.

Pay particular attention to Vite's base-path configuration.

**Release process**

Every production release should:

1. Pass tests.
2. Build successfully.
3. Update version information.
4. Update changelog.
5. Deploy.
6. Verify production.
7. Test PWA installation.
8. Test offline functionality.

Never deploy a known broken build.

## PART XIV — FUTURE EXPANSION

### 43. Additional Content

Design the ruleset system to support additional content without rewriting the game engine.

Future possibilities:

* Additional official supplements, subject to content permissions.
* Additional environments.
* Custom monster packs.
* Custom equipment.
* Custom adventures.
* User-created encounters.
* Additional character classes.
* Custom campaigns.
* Alternative compatible rulesets.

**Ruleset architecture**

Separate:

1. Core game engine.
2. Ruleset definitions.
3. Content packs.
4. Campaign data.

Each content pack should have:

* ID.
* Name.
* Version.
* Compatibility requirements.
* Content manifest.
* Validation schema.
* Licensing information.

Do not make content packs capable of executing arbitrary JavaScript.

Use validated data and explicitly supported rule handlers.

### 44. Future Enhancements

Consider these only after Release 1.0:

| Feature | Priority |
| --- | --- |
| Additional content packs | High |
| Custom adventures | High |
| Multiple save slots | High |
| Campaign statistics | Medium |
| Sound effects | Low |
| Music | Low |
| More detailed monster artwork | Low |
| Optional cloud backup | Medium |
| Additional language support | Low |
| Optional AI narration | Low |

AI narration must never control mechanical game outcomes.

## PART XV — HERMES DEVELOPMENT WORKFLOW

### 45. Implementation Rules for Hermes

Follow these instructions throughout development.

**Rule 1: Work incrementally**

Implement one coherent subsystem at a time.

Do not generate the entire application in a single coding operation.

**Rule 2: Test continuously**

Every new engine mechanic needs tests.

Every new feature needs acceptance criteria.

Run tests after changes.

**Rule 3: Keep documentation current**

Update IMPLEMENTATION_STATUS.md, CHANGELOG.md, GAME_RULES.md, ARCHITECTURE.md when relevant.

**Rule 4: Do not invent game rules**

If a rule is missing or unclear:

* Mark it unverified.
* Document the question.
* Identify the source needed.
* Avoid silently substituting generic RPG logic.

Continue with unrelated work where possible.

**Rule 5: Protect existing work**

Before modifying important files:

* Inspect their contents.
* Understand their dependencies.
* Preserve existing functionality.
* Use Git commits.
* Avoid destructive operations.

**Rule 6: Avoid unnecessary complexity**

Prefer:

* Simple modules.
* Clear interfaces.
* Typed data.
* Reusable components.
* Small dependencies.
* Testable functions.

Avoid unnecessary abstractions.

**Rule 7: Never fake completion**

A button that does nothing is not a completed feature.

A mock encounter is not a working encounter engine.

A static dungeon map is not procedural exploration.

A save button that only updates UI state is not persistence.

All features must function.

**Rule 8: No placeholders in production**

Temporary development placeholders are acceptable when clearly documented.

Do not ship:

* Fake monster statistics.
* Random invented rules.
* Placeholder encounter tables.
* Incomplete character classes presented as complete.
* Buttons without functionality.
* Mock campaign saves.

**Rule 9: Preserve reproducibility**

Use deterministic seeds and repeatable tests.

When a test fails, preserve the failing seed and reproduction steps.

**Rule 10: Keep the application usable throughout development**

Each milestone should leave the project in a buildable state.

Do not leave the main branch broken while working on unrelated features.

## PART XVI — FIRST EXECUTION TASK

### 46. Begin Development

Start by performing the following tasks in order.

**Task 1: Inspect** — Inspect the current development environment, GitHub, available tools, and existing repositories.

**Task 2: Report** — Produce the initial environment and project readiness report.

**Task 3: Establish** — Create or identify the correct repository.

**Task 4: Document** — Create the project documentation and implementation status files.

**Task 5: Research** — Begin the Expanded Edition rules inventory. Identify every mechanic needed for the first playable prototype.

**Task 6: Architect** — Create the architecture and data model. Document major technical decisions.

**Task 7: Implement** — Begin Phase 1 only after the architecture and project foundation are established.

Do not attempt to implement all game mechanics before the underlying structure is ready.

### 47. Initial Progress Report Format

After the initial inspection, provide:

```
PROJECT: Four Against Darkness Digital

ENVIRONMENT
- Working directory:
- Node version:
- npm version:
- Git status:
- GitHub access:
- Cloudflare access:

EXISTING WORK
- Relevant repositories:
- Existing project files:
- Existing hosting:

PROJECT READINESS
- Dependencies:
- Blockers:
- Required access:

IMPLEMENTATION
- Documentation:
- Rules research:
- Architecture:
- First milestone:

NEXT ACTION
- Specific next task:
```

### 48. Definition of Success

The project is successful when the owner can:

1. Open 4ad.stevenkoehl.com on my iPhone.
2. Install it to my home screen.
3. Launch it without an internet connection.
4. Create a campaign.
5. Create a party of four adventurers.
6. Start an adventure.
7. Explore an automatically generated dungeon.
8. Open doors and generate rooms.
9. Encounter automatically selected monsters.
10. Fight using fully automated mechanics.
11. Collect treasure.
12. Manage characters and equipment.
13. Complete an adventure.
14. Save campaign progress.
15. Close the application.
16. Return later and continue exactly where I left off.

The application should provide a complete digital solo dungeon-crawling experience without requiring physical dice, paper, a pencil, a separate rules reference, or an external game server.

## FINAL INSTRUCTION

Treat this document as the authoritative product specification.

The job is to build the application, not simply produce a technical proposal.

Start with environment inspection and project readiness. Then establish the repository, documentation, rules inventory and architecture.

Proceed through the implementation roadmap in order.

Work autonomously on tasks that do not require additional user input. Do not stop after producing plans or mockups.

When a blocker requires user action, explain exactly what is needed and continue with independent tasks.

Prioritize functional gameplay, rules accuracy, offline operation, and mobile usability over visual polish.

Keep the project buildable and tested throughout development.

Do not claim that a feature or milestone is complete until its acceptance criteria pass.

The ultimate goal is a complete, self-contained, iPhone-first Four Against Darkness dungeon crawler that the owner can host on their own domain and play entirely from a phone.