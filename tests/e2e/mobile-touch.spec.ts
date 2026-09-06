import AxeBuilder from '@axe-core/playwright';
import { devices, expect, test, type Page } from '@playwright/test';

const overflowRoutes: Array<{ hash: string; ready: (page: Page) => Promise<void> }> = [
  { hash: '/today', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible(); } },
  { hash: '/exercise/w01-e1', ready: async (page) => { await expect(page.getByRole('textbox', { name: 'Antwort als ganze Zahl' })).toBeVisible(); } },
  { hash: '/lab/w05-e8', ready: async (page) => { await expect(page.getByRole('textbox', { name: 'Python-Codeeditor' })).toBeVisible(); } },
  { hash: '/settings', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible(); } },
  { hash: '/project/p-foundations-data-checker', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'CLI-Datenprüfer' })).toBeVisible(); } },
  { hash: '/tools', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Werkzeuge' })).toBeVisible(); } },
  { hash: '/visualization/w05-viz1', ready: async (page) => { await expect(page.locator('#w05-column-board svg')).toBeVisible({ timeout: 15_000 }); } },
  { hash: '/roadmap', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Roadmap' })).toBeVisible(); } },
  { hash: '/sources', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Lektüren' })).toBeVisible(); } },
  { hash: '/lesson/l-linalg-systems', ready: async (page) => { await expect(page.getByRole('heading', { level: 1, name: 'Gleichungssysteme als Spaltenbild lesen' })).toBeVisible(); } },
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
  await expect(page.getByRole('heading', { level: 1, name: 'Lernen' })).toBeVisible();
  await nav.getByRole('link', { name: 'Einstellungen' }).tap();
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
  await nav.getByRole('link', { name: 'Heute', exact: true }).tap();
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
}

async function parsonsTouchFlow(page: Page): Promise<void> {
  await page.goto('/index.html#/exercise/f-git-parsons-01');
  await expect(page.getByRole('heading', { level: 1, name: 'Sicheren Bugfix-Ablauf ordnen' })).toBeVisible();
  const list = page.locator('.parsons-control ol');
  const distractor = list.locator('li').filter({ hasText: 'fehlschlagenden Test löschen' });
  await expect(list.locator('li')).toHaveCount(6);
  await page.getByRole('button', { name: 'p2 nach oben' }).tap();
  await expect(list.locator('li').first()).toContainText('kleinsten Fix schreiben');
  await distractor.getByRole('button', { name: 'Aussortieren' }).tap();
  await expect(list.locator('li')).toHaveCount(5);
  const excluded = page.locator('.excluded-lines');
  const restore = excluded.getByRole('button', { name: /Zurückholen/ }).filter({ hasText: 'fehlschlagenden Test löschen' });
  await restore.tap();
  await expect(list.locator('li')).toHaveCount(6);
  await expect(list.locator('li').filter({ hasText: 'fehlschlagenden Test löschen' })).toHaveCount(1);
  await expect(excluded).toHaveCount(0);
}

async function numericAnswerTap(page: Page): Promise<void> {
  await page.goto('/index.html#/exercise/w01-e1');
  const input = page.getByRole('textbox', { name: 'Antwort als ganze Zahl' });
  await input.tap();
  await input.fill('7');
  await page.getByRole('button', { name: 'Antwort prüfen' }).tap();
  await expect(page.getByRole('heading', { name: /Richtig/ })).toBeVisible();
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
  test('parsons lines move, exclude and restore by tap', async ({ page }) => parsonsTouchFlow(page));
  test('numeric answer grades after tap input', async ({ page }) => numericAnswerTap(page));
  test('progress JSON import rejects invalid and accepts exported files', async ({ page }) => progressImport(page));

  test('a failed MathLive module falls back to a usable plain input', async ({ page }) => {
    await page.route(/vendor\/mathlive\/mathlive\.min\.mjs/, async (route) => route.abort('failed'));
    await page.goto('/index.html#/exercise/w01-e2');
    const fallback = page.getByRole('textbox', { name: 'Mathematischer Term' });
    await expect(fallback).toHaveAttribute('placeholder', 'x^2+x-6');
    await fallback.fill('2x+7');
    await expect(fallback).toHaveValue('2x+7');
    await expect(page.locator('math-field')).toHaveCount(0);
  });

  test('CodeMirror preserves Tab and Shift+Tab focus without running Python', async ({ page }) => {
    await page.goto('/index.html#/lab/w05-e8');
    const editor = page.getByRole('textbox', { name: 'Python-Codeeditor' });
    const runButton = page.getByRole('button', { name: 'Code ausführen' });
    await editor.press('Tab');
    await expect(runButton).toBeFocused();
    await runButton.press('Shift+Tab');
    await expect(editor).toBeFocused();
    await expect(page.locator('.output-content pre')).toHaveCount(0);
  });

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
    for (const hash of ['#/today', '#/exercise/w01-e1', '#/settings']) {
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
  test('parsons lines move, exclude and restore by tap', async ({ page }) => parsonsTouchFlow(page));
  test('numeric answer grades after tap input', async ({ page }) => numericAnswerTap(page));
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
    for (const hash of ['#/today', '#/exercise/w01-e1', '#/settings']) {
      await page.goto(`/index.html${hash}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
    }
  });
});
