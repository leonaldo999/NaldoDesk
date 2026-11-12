import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  timeout: 45000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    video: 'on',
    trace: 'retain-on-failure',
  },
})
