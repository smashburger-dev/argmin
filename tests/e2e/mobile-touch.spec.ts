import AxeBuilder from '@axe-core/playwright';
import { devices, expect, test, type Page } from '@playwright/test';

const overflowRoutes: Array<{ hash: string; ready: (page: Page) => Promise<void> }> = [
  { hash: '/today', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible(); } },
  { hash: '/settings', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible(); } },
  { hash: '/project/p-foundations-data-checker', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'CLI-Datenprüfer' })).toBeVisible(); } },
  { hash: '/tools', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Werkzeuge' })).toBeVisible(); } },
  { hash: '/visualization/column-picture', ready: async (page) => { await expect(page.locator('#viz-column-picture svg')).toBeVisible({ timeout: 15_000 }); } },
  { hash: '/sources', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Lektüren' })).toBeVisible(); } },
  { hash: '/lesson/l-linalg-systems', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Gleichungssysteme als Spaltenbild lesen' })).toBeVisible(); } },
  { hash: '/module/lm-linalg-matrices', ready: async (page) => { await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); } },
  { hash: '/family/formula-scalar-product/column-vector-authored/0/core', ready: async (page) => { await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); } },
  { hash: '/review', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Review' })).toBeVisible(); } },
  { hash: '/diagnostic', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Diagnose' })).toBeVisible(); } },
];

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    offenders: [...document.querySelectorAll<HTMLElement>('body *')]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.right > window.innerWidth + 0.5 || rect.left < -0.5)
      .slice(0, 10)
      .map(({ element, rect }) => ({
        tag: element.tagName.toLowerCase(),
        className: element.className,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
      })),
    scrollOffenders: [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((element) => element.scrollWidth > element.clientWidth + 0.5)
      .slice(0, 10)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: element.className,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        overflowX: getComputedStyle(element).overflowX,
      })),
  }));
  expect(layout.overflow, JSON.stringify({ offenders: layout.offenders, scrollOffenders: layout.scrollOffenders })).toBeLessThanOrEqual(0);
}

async function tapNavigation(page: Page): Promise<void> {
  await page.goto('/index.html#/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await nav.getByRole('link', { name: 'Lernen' }).tap();
  await expect(page.getByRole('heading', { level: 1, name: /Dein Lernpfad:/ })).toBeVisible();
  await nav.getByRole('link', { name: 'Einstellungen' }).tap();
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
  await nav.getByRole('link', { name: 'Heute', exact: true }).tap();
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
}

async function progressImport(page: Page): Promise<void> {
  await page.goto('/index.html#/settings');
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('#progress-import').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  });
  await expect(page.getByRole('status')).toHaveText('Die Datei enthält kein gültiges JSON.');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON exportieren' }).click();
  const path = await (await downloadPromise).path();
  expect(path).not.toBeNull();
  page.once('dialog', (dialog) => void dialog.accept());
  const buffer = await (await import('node:fs/promises')).readFile(path as string);
  await page.locator('#progress-import').setInputFiles({ name: 'fortschritt.json', mimeType: 'application/json', buffer });
  await expect(page.getByRole('status')).toHaveText('Import abgeschlossen.');
}

const { defaultBrowserType: _androidBrowser, ...android } = devices['Galaxy S5'];
const { defaultBrowserType: _iphoneBrowser, ...iphone } = devices['iPhone SE'];

test.describe('mobile touch emulation, small Android Chromium', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Android emulation runs on Chromium only.');
  test.use(android);

  test('tap navigation switches the primary routes', async ({ page }) => tapNavigation(page));
  test('progress JSON import rejects invalid and accepts exported files', async ({ page }) => progressImport(page));

  for (const route of overflowRoutes) {
    test(`320px viewport reflows ${route.hash} without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(`/index.html#${route.hash}`);
      await route.ready(page);
      await expectNoHorizontalOverflow(page);
    });
  }

  test('mobile focus starts at the route heading and proceeds into main', async ({ page }) => {
    await page.goto('/index.html#/today');
    const heading = page.getByRole('heading', { level: 1, name: 'Heute' });
    await expect(heading).toBeFocused();
    const firstTabbable = await page.evaluate(() => document.querySelector<HTMLElement>('a[href], button, input, select, textarea')?.className || '');
    expect(firstTabbable).toContain('skip-link');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('main')))).toBe(true);
  });

  test('mobile routes pass serious and critical axe checks', async ({ page }) => {
    for (const hash of ['#/today', '#/learn', '#/settings']) {
      await page.goto(`/index.html${hash}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
    }
  });
});

test.describe('mobile touch emulation, small iPhone WebKit', () => {
  test.skip(({ browserName }) => browserName !== 'webkit', 'iPhone emulation runs on WebKit only.');
  test.use(iphone);

  test('tap navigation switches the primary routes', async ({ page }) => tapNavigation(page));
  test('progress JSON import rejects invalid and accepts exported files', async ({ page }) => progressImport(page));

  for (const route of overflowRoutes) {
    test(`320px viewport reflows ${route.hash} without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(`/index.html#${route.hash}`);
      await route.ready(page);
      await expectNoHorizontalOverflow(page);
    });
  }

  test('mobile routes pass serious and critical axe checks', async ({ page }) => {
    for (const hash of ['#/today', '#/learn', '#/settings']) {
      await page.goto(`/index.html${hash}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
    }
  });
});
