# Testing Strategy

## Philosophy

Testing is a first-class development requirement. Every new engine mechanic needs tests before integration. No feature is complete without acceptance criteria and passing tests.

## Test Layers

### 1. Unit Tests (Vitest)
**Location**: `tests/unit/`
**Coverage**: Engine mechanics, utilities, pure functions

Test targets:
- Dice rolling utilities
- Seeded PRNG
- Character statistics calculations
- Combat calculations
- Room generation algorithms
- Door placement logic
- Treasure generation
- Trap resolution
- Spell resolution
- Inventory restrictions

Run: `npm run test:unit`

### 2. Integration Tests (Vitest)
**Location**: `tests/integration/`
**Coverage**: Complete workflows

Test workflows:
1. Create campaign → Create party → Generate dungeon → Explore room → Generate encounter → Start combat → Resolve combat → Award rewards → Update characters → Save → Reload → Continue

Run: `npm run test:integration`

### 3. Simulation Tests (Vitest)
**Location**: `tests/simulation/`
**Coverage**: Large-scale automated simulations

Test for:
- Invalid dungeon connections
- Impossible room configurations
- Missing encounter outcomes
- Incorrect monster quantities
- Unexpected state transitions
- Broken combat loops
- Unreachable exits
- Invalid character states
- Save inconsistencies

Use deterministic seeds for reproducibility.

Run: `npm run test:simulation`

### 4. Browser Tests (Playwright)
**Location**: `tests/e2e/`
**Coverage**: User-facing flows

Test:
- Application launch
- Campaign creation
- Party creation
- Map interactions
- Door exploration
- Combat interface
- Inventory management
- Save and reload
- Import and export
- Mobile layouts (iPhone portrait/landscape)
- Offline launch

Run: `npm run test:e2e`

### 5. Rules Verification Tests
**Location**: `tests/rules/`
**Coverage**: Every implemented mechanic

Each mechanic must have:
- Source reference (book page)
- Implementation
- Corresponding test
- Verified result

Never mark ruleset complete when only basic mechanics work.

## Test Organization

```
tests/
├── unit/
│   ├── dice/
│   ├── character/
│   ├── combat/
│   ├── dungeon/
│   ├── encounters/
│   ├── treasure/
│   ├── traps/
│   ├── spells/
│   └── inventory/
├── integration/
│   └── full-adventure.test.ts
├── simulation/
│   ├── dungeon-generation.test.ts
│   ├── encounter-generation.test.ts
│   └── combat-simulation.test.ts
├── e2e/
│   ├── app-launch.spec.ts
│   ├── campaign-flow.spec.ts
│   ├── dungeon-exploration.spec.ts
│   ├── combat.spec.ts
│   ├── inventory.spec.ts
│   ├── persistence.spec.ts
│   └── mobile-layout.spec.ts
└── rules/
    └── verification.test.ts
```

## Running Tests

```bash
# All unit tests
npm run test:unit

# Specific test file
npm run test:unit -- tests/unit/dice/dice.test.ts

# Watch mode
npm run test:unit -- --watch

# Coverage
npm run test:unit -- --coverage

# E2E tests
npm run test:e2e

# E2E headed (for debugging)
npm run test:e2e -- --headed
```

## CI Integration

GitHub Actions runs:
1. Unit tests on every push
2. Integration tests on PR
3. E2E tests on release branches
4. Simulation tests on schedule

## Test Data

- Use Zod schemas for test data validation
- Deterministic seeds for reproducible failures
- Fixtures in `tests/fixtures/`
- Mock rules data for testing without book access

## Rules Accuracy

Tests must verify against actual Expanded Edition rules:
- When book is available, tests assert exact rule values
- Until then, tests verify engine behavior with placeholder data
- Mark all tests as `unverified` until rules are confirmed