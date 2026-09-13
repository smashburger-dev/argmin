import { expect, test } from '@playwright/test';

// Challenge-UI spec (plan: .agents/plans/2026-09-09-challenge.md).
// The catalog ships 23 challengeEligible cases (pilot flagging), but a
// fresh browser has no touched module — the pool stays empty and the view
// renders its "no active module" state. Card/window assertions land once
// a spec seeds module activity. No e2e spec mocks the clock — determinism
// is asserted structurally (same state across reload), matching
// today-resume.spec.ts conventions.

test('challenge route renders its empty state deterministically across reload', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Challenge view runs in Chromium; the markup is browser-independent Preact.');
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/index.html#/challenge');
  await expect(page.getByRole('heading', { level: 1, name: 'Challenge' })).toBeVisible();
  // No module touched yet → "no active module" state (b), distinct from
  // the catalog-empty state (a).
  await expect(page.getByRole('heading', { name: 'Kein aktives Modul' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Challenge' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kein aktives Modul' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('challenge is reachable via secondary nav and the mobile-more link', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Nav roundtrip runs in Chromium.');
  await page.goto('/index.html#/today');
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  const navLink = nav.getByRole('link', { name: 'Challenge' });
  await expect(navLink).toHaveAttribute('href', '#/challenge');
  await navLink.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Challenge' })).toBeVisible();
  // Secondary entries hide on mobile; the mobile-more footer carries the link.
  await expect(page.locator('.mobile-more a[href="#/challenge"]')).toHaveCount(1);
});

test('today teaser stays hidden while the pool is empty and no streak exists', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Teaser check runs in Chromium.');
  await page.goto('/index.html#/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
  // Pool is empty (no challengeEligible cases) and no challenge attempts
  // exist, so the quadrant card must not render.
  await expect(page.locator('.challenge-teaser')).toHaveCount(0);
});

test('?from=challenge keeps the exercise in challenge context', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Stay-in-challenge flow runs in Chromium.');
  // No challengeEligible content yet — a regular difficulty with the
  // ?from=challenge suffix exercises the same code path (context tagging,
  // back target, next-challenge CTA).
  await page.goto('/index.html#/family/classify-git-operation/diff-unstaged/7/intro?from=challenge');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const back = page.getByRole('link', { name: 'Zur Challenge' });
  await expect(back).toHaveAttribute('href', '#/challenge');
  const rightId = await page.evaluate(async () => {
    const { instantiate } = await import('/assets/js/domain/' + 'exercise_registry.mjs') as {
      instantiate: (familyId: string, seed: number, difficulty: string, caseId: string) => { choices: Array<{ id: string; correct: boolean }> };
    };
    return instantiate('classify-git-operation', 7, 'intro', 'diff-unstaged').choices.find((choice) => choice.correct === true)?.id;
  });
  await page.getByRole('radio', { name: /.+/ }).first().waitFor();
  await page.locator(`input[type="radio"][value="${rightId}"]`).check();
  await page.getByRole('button', { name: 'Antwort prüfen' }).click();
  await expect(page.getByText(/Richtig/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nächste Challenge' })).toHaveAttribute('href', '#/challenge');
  const stored = await page.evaluate(async () => {
    const { progress } = await import('/assets/js/core/' + 'progress_store.js');
    const attempts = await progress.allOf('attempts') as Array<{ definitionId: string; correct: boolean; context?: string }>;
    return attempts.at(-1);
  });
  expect(stored).toMatchObject({ definitionId: 'classify-git-operation:diff-unstaged', correct: true, context: 'challenge' });
});

test('challenge cards render once a module is touched', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Pool check runs in Chromium.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  // Opening the module records moduleTouch → its flagged cases enter the pool.
  await page.goto('/index.html#/module/lm-linalg-numpy-shape-contracts');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // moduleTouch is an async IndexedDB write — wait for it before navigating.
  await expect.poll(async () => page.evaluate(async () => {
    const { progress } = await import('/assets/js/core/' + 'progress_store.js') as { progress: { getSetting: (key: string) => Promise<Record<string, number> | undefined> } };
    const touch = await progress.getSetting('moduleTouch');
    return Boolean(touch && Object.keys(touch).length);
  }), { timeout: 10000 }).toBe(true);
  await page.goto('/index.html#/challenge');
  await expect(page.getByRole('heading', { level: 1, name: 'Challenge' })).toBeVisible();
  const cards = page.locator('.challenge-card');
  await expect(cards.first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('link', { name: 'Challenge öffnen' }).first()).toHaveAttribute('href', /#\/family\/.+\/challenge\?from=challenge/);
  expect(errors).toEqual([]);
});

test('family route without ?from= keeps the default back target', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Default-context check runs in Chromium.');
  await page.goto('/index.html#/family/classify-git-operation/diff-unstaged/7/intro');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zur Challenge' })).toHaveCount(0);
});
