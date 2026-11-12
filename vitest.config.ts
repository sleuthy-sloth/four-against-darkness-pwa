import { defineConfig } from 'vitest/config'

/**
 * Unit tests run in plain node (no DOM) for engine/rules logic.
 * Browser-level Playwright suites come later per TESTING_STRATEGY.md.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/simulation/**/*.test.ts',
      // Release 0.5 fixture generator — regenerates tests/e2e-05/fixtures/
      // on every run, so the Playwright suite never depends on /tmp.
      'tests/e2e-05/make-fixtures.test.ts',
    ],
  },
})
