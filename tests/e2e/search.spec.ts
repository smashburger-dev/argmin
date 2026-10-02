import { expect, test } from '@playwright/test';

test('search is reachable via nav, filters the catalog and links to real routes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/index.html#/today');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Suche' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Suche' })).toBeVisible();
  const box = page.getByRole('searchbox');
  await box.fill('a');
  await expect(page.getByText(/Mindestens zwei Zeichen/)).toBeVisible();
  await box.fill('Spaltenbild');
  const lessonHit = page.locator('a[href="#/lesson/l-linalg-systems"]');
  await expect(lessonHit).toBeVisible();
  await lessonHit.click();
  await expect(page).toHaveURL(/#\/lesson\/l-linalg-systems/);
  await expect(page.getByRole('heading', { level: 1, name: 'Gleichungssysteme als Spaltenbild lesen' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('search reports an honest empty state', async ({ page }) => {
  await page.goto('/index.html#/search');
  await page.getByRole('searchbox').fill('xyzzy');
  await expect(page.getByRole('heading', { level: 2, name: 'Keine Treffer' })).toBeVisible();
});
