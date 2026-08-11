import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    /* The overlays arrive in a short staggered entrance (docs/DESIGN.md). A
     * box measured while its element is still animating can come back a
     * fraction under its own size — enough for the 44px touch-target sweep in
     * `mobile.spec.ts` to fail on a control that is exactly 44px — and which
     * spec sees it depends on machine speed. Running the suite the way a
     * visitor who asked for less motion sees it removes the race, and holds
     * the app to honouring that preference at the same time: every animation
     * here is switched off under it. */
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
