import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

// Offline proof for the release service worker (tools/sw.js). The build
// precaches every app file except vendor/pyodide, so after the worker is
// active and the page reloaded once (no clients.claim → first load is not
// controlled) the app must boot with the network fully cut.

test.use({ serviceWorkers: 'allow' });

test('app boots offline after the service worker cached the build', async ({ page, context }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW !== '1', 'Der Offline-Cache existiert nur im Release-Build.');

  await page.goto('/index.html#/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();

  // Wait until install finished and the worker controls the next load.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    // install completes before ready resolves; the first load was uncontrolled
    // (no clients.claim), so reload once to be controlled.
  });
  await page.reload({ waitUntil: 'networkidle' });
  const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
  expect(controlled).toBe(true);

  await context.setOffline(true);
  const response = await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
  // The document itself came from the SW cache, not the network.
  expect(response?.fromServiceWorker()).toBe(true);
});

test('a waiting worker surfaces the update banner and reloads on demand', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW !== '1', 'Der Update-Pfad braucht den Release-Build mit Service Worker.');

  await page.goto('/index.html#/today');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  // First load must not show the banner: the initial install is no update.
  await expect(page.locator('.update-banner')).toHaveCount(0);

  // The update check fetches sw.js straight from the server, outside the
  // active worker and outside Playwright routing, so the served file itself
  // must change for registration.update() to install a waiting worker.
  const swPath = join(process.cwd(), 'build-next', 'sw.js');
  const originalSw = readFileSync(swPath, 'utf8');
  writeFileSync(swPath, `${originalSw}\n// newer release\n`);
  try {
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });

    const banner = page.locator('.update-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Neue Version verfügbar.');
    await banner.getByRole('button', { name: 'Neu laden' }).click();
    // SKIP_WAITING -> controllerchange -> one reload under the new worker.
    await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
    await expect(banner).toHaveCount(0);
  } finally {
    writeFileSync(swPath, originalSw);
  }
});
