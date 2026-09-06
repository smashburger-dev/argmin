import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __longTasks?: number[];
  }
}

test('primary routes #/progress and #/review render their real views', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Route smoke runs in Chromium; the views are browser-independent Preact markup.');
  await page.goto('/index.html#/progress');
  await expect(page.getByRole('heading', { level: 1, name: 'Fortschritt' })).toBeVisible();
  await expect(page.locator('.stat-grid')).toContainText('Lernereignisse');

  await page.goto('/index.html#/review');
  await expect(page.getByRole('heading', { level: 1, name: 'Review' })).toBeVisible();
  await expect(page.getByText('Keine Aufgaben-Reviews fällig')).toBeVisible();
});

test('cold start of #/today loads a bounded number of requests', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'The cold-start request baseline is measured in Chromium.');
  // The <= 8 budget guards the shipped bundle (preview server, baseline 5).
  // Vite dev serves every module as its own request, so dev needs its own
  // ceiling above that infrastructure overhead.
  const requestBudget = process.env.PLAYWRIGHT_PREVIEW === '1' ? 8 : 60;
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/index.html#/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
  await page.waitForTimeout(1000);
  test.info().annotations.push({ type: 'request-count', description: `${requests.length} (budget ${requestBudget})` });
  expect(requests.length).toBeLessThanOrEqual(requestBudget);
});

test('first exercise route stays free of long main-thread tasks', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'The longtask PerformanceObserver entry type is Chromium-only.');
  await page.addInitScript(() => {
    const tasks: number[] = [];
    window.__longTasks = tasks;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) tasks.push(entry.duration);
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      // Unsupported entry type leaves the bucket empty; the route still loads.
    }
  });
  await page.goto('/index.html#/exercise/f-git-next-action-01');
  await expect(page.getByRole('radio').first()).toBeVisible();
  await page.waitForTimeout(1500);
  const longTasks = await page.evaluate<number[]>(() => window.__longTasks ?? []);
  test.info().annotations.push({ type: 'longtask-count', description: String(longTasks.length) });
  expect(longTasks.length).toBeLessThanOrEqual(2);
  for (const duration of longTasks) expect(duration).toBeLessThan(100);
});
