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

test('module card counts curated placements and credits a solved case', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Progress roundtrip runs in Chromium.');
  const card = page.locator('.learn-rail a.module-card-link[href="#/module/lm-foundations-python-state"]');
  await page.goto('/index.html#/learn');
  await expect(card).toContainText('3 Aufgaben');
  await page.goto('/index.html#/family/trace-assignment-state/reassign-two-variables-print/7/intro');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Variante wird geladen' })).toHaveCount(0);
  const table = await page.evaluate(async () => {
    const { EXERCISE_FAMILIES } = await import('/assets/js/domain/' + 'exercise_registry.mjs') as {
      EXERCISE_FAMILIES: { instantiate: (familyId: string, seed: number, difficulty: string, caseId: string) => { traceTable: { expectedStates: Array<Record<string, string>> } } };
    };
    return EXERCISE_FAMILIES.instantiate('trace-assignment-state', 7, 'intro', 'reassign-two-variables-print').traceTable;
  });
  for (const [row, state] of table.expectedStates.entries()) {
    for (const [name, value] of Object.entries(state)) {
      if (value !== '') await page.getByLabel(`Zeile ${row + 1}, ${name}`).fill(String(value));
    }
  }
  await page.getByRole('button', { name: 'Tabelle prüfen' }).click();
  await expect(page.getByText(/Richtig/)).toBeVisible();
  await page.goto('/index.html#/learn');
  await expect(card).toContainText('1 von 3 Aufgaben');
});

test('history collects opened lessons and modules', async ({ page }) => {
  await page.goto('/index.html#/lesson/l-foundations-algebra');
  await expect(page.getByRole('heading', { level: 1, name: 'Algebra als überprüfbare Umformung' })).toBeVisible();
  await page.goto('/index.html#/learn');
  await expect(page.locator('.history-card')).toHaveCount(2);
  const kickers = await page.locator('.history-card .card-kicker').allTextContents();
  expect([...kickers].sort()).toEqual(['Lektion', 'Modul']);
});
