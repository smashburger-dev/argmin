import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const contentBundle = JSON.parse(readFileSync(join(process.cwd(), '.content-build/public/content-bundle.json'), 'utf8'));
const gitModule = contentBundle.learningModules.find((module: { moduleId: string }) => module.moduleId === 'lm-git-basics');

test('golden path 1: git module is reachable without a week route', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Golden Path 1 runs in Chromium; the view is browser-independent Preact markup.');
  await page.goto('/index.html#/module/lm-git-basics');
  await expect(page.getByRole('heading', { level: 1, name: 'Git als überprüfbares Arbeitsprotokoll' })).toBeVisible();
  await expect(page.getByText(`${gitModule.derivedMinutes} Min.`)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Lektionen' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Aufgaben & Üben' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aufgabe öffnen' }).first()).toBeVisible();
  await page.getByRole('link', { name: /(?:Aufgabe|Variante) öffnen/ }).first().click();
  await expect(page).toHaveURL(/#\/(?:exercise|family)\//);
});

test('module shows lessons and exercises together without toggling', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Module section behavior runs in Chromium.');
  await page.goto('/index.html#/module/lm-git-basics');
  await expect(page.getByRole('heading', { level: 2, name: 'Lektionen' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Aufgaben & Üben' })).toBeVisible();
  await expect(page.locator('.module-sections .lesson-list a').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aufgabe öffnen' }).first()).toBeVisible();
});

test('learn path modules advance with side arrows', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Carousel arrows run in Chromium; the markup is browser-independent.');
  await page.goto('/index.html#/learn');
  const track = page.getByRole('list', { name: 'Module in diesem Pfad' });
  await expect(track).toBeVisible();
  const rail = page.locator('.learn-rail');
  const next = rail.getByRole('button', { name: 'Weitere Module' });
  await expect(next).toBeVisible();
  await expect(rail.getByRole('button', { name: 'Vorherige Module' })).toBeDisabled();
  const start = await track.evaluate((element) => element.scrollLeft);
  await next.click();
  await expect.poll(async () => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(start);
  await expect(rail.getByRole('button', { name: 'Vorherige Module' })).toBeEnabled();
});
