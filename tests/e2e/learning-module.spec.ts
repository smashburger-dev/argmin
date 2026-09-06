import { expect, test } from '@playwright/test';

test('golden path 1: git module is reachable without a week route', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Golden Path 1 runs in Chromium; the view is browser-independent Preact markup.');
  await page.goto('/index.html#/module/lm-git-basics');
  await expect(page.getByRole('heading', { level: 1, name: 'Git als überprüfbares Arbeitsprotokoll' })).toBeVisible();
  await expect(page.getByText('59 Min.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Lektionen' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Aufgaben dieser Lektüre' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Familien-Varianten' })).toBeVisible();
  await page.getByRole('link', { name: 'Aufgabe öffnen' }).first().click();
  await expect(page).toHaveURL(/#\/exercise\//);
});
