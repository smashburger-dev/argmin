import { defineConfig, devices } from '@playwright/test';

const builtPreview = process.env.PLAYWRIGHT_PREVIEW === '1';
const port = builtPreview ? 4174 : 4173;

// Firefox/Webkit laufen nur in CI oder explizit (PLAYWRIGHT_ALL_BROWSERS=1) —
// lokal duplizieren sie denselben Chromium-Lauf und brauchen zusaetzliche
// Browser-Binaries, die ein frischer Checkout nicht installiert.
const extraBrowsers = process.env.CI || process.env.PLAYWRIGHT_ALL_BROWSERS === '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 4 : '50%',
  forbidOnly: true,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: builtPreview ? 'npm run preview:next -- --port 4174' : 'npm run dev:next',
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env.CI && !builtPreview,
    timeout: 120000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(extraBrowsers
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
});
