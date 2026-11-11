import { defineConfig } from 'vitest/config'

/**
 * Unit tests run in plain node (no DOM) for engine/rules logic.
 * Browser-level Playwright suites come later per TESTING_STRATEGY.md.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
  },
})
