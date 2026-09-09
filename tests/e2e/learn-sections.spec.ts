import { expect, test } from '@playwright/test';

test('learn shows the active track, history and rest sections', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/index.html#/learn');
  await expect(page.getByRole('heading', { level: 1, name: /Dein Lernpfad:/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Zuletzt geöffnet' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Erkunde die restlichen Lernpfade' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Andere Lernpfade' }).getByRole('button')).toHaveCount(3);
  await expect(page.locator('.learn-rail .module-card-link').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('rest pill filters the rest modules without touching the track', async ({ page }) => {
  await page.goto('/index.html#/learn');
  const chip = page.getByRole('group', { name: 'Andere Lernpfade' }).getByRole('button', { name: 'Mathematical Foundations' });
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  const before = await page.locator('.learn-rest .module-card-link').count();
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { level: 1, name: /Dein Lernpfad: Gemeinsamer KI-Kern/ })).toBeVisible();
  const after = await page.locator('.learn-rest .module-card-link').count();
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThan(before);
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.learn-rest .module-card-link')).toHaveCount(before);
});

test('history collects opened lessons and modules', async ({ page }) => {
  await page.goto('/index.html#/lesson/l-foundations-algebra');
  await expect(page.getByRole('heading', { level: 1, name: 'Algebra als überprüfbare Umformung' })).toBeVisible();
  await page.goto('/index.html#/learn');
  await expect(page.locator('.history-card')).toHaveCount(2);
  const kickers = await page.locator('.history-card .card-kicker').allTextContents();
  expect([...kickers].sort()).toEqual(['Lektion', 'Modul']);
});
