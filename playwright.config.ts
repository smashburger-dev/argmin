import { defineConfig, devices } from '@playwright/test';

const builtPreview = process.env.PLAYWRIGHT_PREVIEW === '1';
// E2E_PORT lets parallel worktrees run side by side. A running server is
// reused only on explicit opt-in (E2E_REUSE_SERVER=1): a dev server from a
// different checkout on the same port would otherwise serve foreign code.
const port = Number(process.env.E2E_PORT) || (builtPreview ? 4174 : 4173);

// Firefox/Webkit laufen nur in CI oder explizit (PLAYWRIGHT_ALL_BROWSERS=1) —
// lokal duplizieren sie denselben Chromium-Lauf und brauchen zusaetzliche
// Browser-Binaries, die ein frischer Checkout nicht installiert.
const extraBrowsers = process.env.CI || process.env.PLAYWRIGHT_ALL_BROWSERS === '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 4 : '50%',
  forbidOnly: true,
  // CI only: a browser that dies before the test body (see chromium project)
  // gets one retry in a fresh worker and shows up as "flaky", not red.
  retries: process.env.CI ? 1 : 0,
  // Kalter vite-dev-Transform des lazy Familien-/Modul-Chunks kann in CI
  // unter 4 Workern >5s dauern — Assertions auf echten Inhalt brauchen Puffer.
  expect: { timeout: 15000 },
  reporter: 'line',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: builtPreview
      ? `npm run preview:next -- --port ${port} --strictPort`
      : `npm run dev:next -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // GitHub runners have no GPU; chrome-headless-shell intermittently
        // segfaults (SEGV_MAPERR 0x1b0) while starting its SwiftShader GPU
        // process during browser.newContext. The app uses no WebGL.
        ...(process.env.CI ? { launchOptions: { args: ['--disable-gpu'] } } : {}),
      },
    },
    ...(extraBrowsers
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
});
