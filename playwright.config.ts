import { defineConfig, devices } from '@playwright/test';

const builtPreview = process.env.PLAYWRIGHT_PREVIEW === '1';
const port = builtPreview ? 4174 : 4173;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
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
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
