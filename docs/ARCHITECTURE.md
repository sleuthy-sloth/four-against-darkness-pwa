# Architecture

## Overview

This document describes the technical architecture for the Four Against Darkness Digital PWA.

## Architectural Principles

The application follows these core principles:

1. **Modular Architecture**: The codebase is split into independent modules with clear boundaries.

2. **Separation of Concerns**: 
   - Presentation (React components) is separate from game mechanics (engine)
   - Game rules are data-driven, not embedded in components
   - All state changes flow through defined interfaces

3. **Deterministic Engine**: Game logic uses seeded random number generation for reproducibility

4. **Offline-First**: No external API dependencies for core gameplay

5. **iPhone-First Design**: Responsive layout optimized for portrait mobile screens

## System Layers

### 1. Presentation Layer (UI)
- **Location**: `src/components/`, `src/features/`
- **Technology**: React + Tailwind CSS
- **Responsibility**: User interface, navigation, visual feedback
- **State**: Read-only consumption of game state, emits actions

### 2. Application State Layer
- **Location**: `src/state/`, `src/hooks/`
- **Technology**: Zustand
- **Responsibility**: Centralized state management
- **Pattern**: Unidirectional data flow

### 3. Game Engine Layer
- **Location**: `src/engine/`
- **Technology**: TypeScript functions, deterministic logic
- **Responsibility**: Core game mechanics, action resolution
- **Pattern**: Functional, pure functions with explicit inputs/outputs

### 4. Rules Layer
- **Location**: `src/rulesets/`
- **Technology**: JSON data files
- **Responsibility**: Game rules data (classes, monsters, encounters, etc.)
- **Pattern**: Data-driven configuration

### 5. Persistence Layer
- **Location**: `src/database/`
- **Technology**: Dexie.js (IndexedDB wrapper)
- **Responsibility**: Save/load game state, transaction management

## Data Flow

```
User Action -> UI Component -> Zustand Action -> Game Engine -> State Update -> UI Re-render
```

All game actions pass through the engine:

1. UI emits a `GameAction` (type + payload)
2. Zustand dispatches to engine's `resolveAction()`
3. Engine validates, processes, and returns `GameResult`
4. Result updates state, triggers events, produces messages
5. UI re-renders with new state

## Key Components

### App Shell
- `src/app/App.tsx` - Main application component
- `src/app/router.tsx` - React Router configuration
- `src/app/navigation.ts` - Navigation constants and helpers

### State Management
- Zustand stores: campaign, party, dungeon, combat, inventory, journal
- Each store follows the same pattern: state + actions
- Actions always go through game engine when modifying game state

### Game Engine
- `src/engine/core/` - Action resolution, event system
- `src/engine/dice/` - Seeded PRNG, dice utilities
- `src/engine/dungeon/` - Room/dungeon generation
- `src/engine/encounters/` - Monster selection, encounter generation
- `src/engine/combat/` - Combat resolution
- `src/engine/characters/` - Character management
- `src/engine/monsters/` - Monster database
- `src/engine/treasure/` - Treasure generation
- `src/engine/events/` - Trap and event handling

### Database
- `src/database/db.ts` - Dexie schema definition
- `src/database/migrations/` - Schema version migrations
- `src/database/repositories/` - Data access patterns

## PWA Features

- Service worker via `vite-plugin-pwa`
- Web app manifest for installability
- Pre-cached assets for offline operation
- IndexedDB for persistent game saves

## Mobile Considerations

- Responsive design with Tailwind breakpoints
- Touch-friendly button sizes (min 44px)
- Safe area insets for iPhone notch
- Single-column layout in portrait
- Collapsible panels for information density