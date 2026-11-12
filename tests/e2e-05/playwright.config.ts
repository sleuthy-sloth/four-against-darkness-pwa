import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/four-against-darkness-pwa/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
