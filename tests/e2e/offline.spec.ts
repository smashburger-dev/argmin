import { expect, test } from '@playwright/test';

// Offline proof for the release service worker (tools/sw.js). The build
// precaches every app file except vendor/pyodide, so after the worker is
// active and the page reloaded once (no clients.claim → first load is not
// controlled) the app must boot with the network fully cut.

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
