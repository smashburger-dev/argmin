import { expect, test } from '@playwright/test';

test('onboarding setup runs once and persists the flag', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Onboarding flow runs in Chromium.');
  await page.goto('/index.html?fresh=1#/today');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { level: 1, name: 'Willkommen bei argmin' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Pfad wählen' }).click();
  await expect(dialog.getByRole('heading', { level: 1, name: 'Welchen Weg willst du gehen?' })).toBeVisible();
  await dialog.getByRole('radio', { name: /Applied AI Engineering/ }).click();
  await dialog.getByRole('button', { name: 'Weiter' }).click();
  await expect(dialog.getByRole('heading', { level: 1, name: 'Wie viel Zeit hast du pro Woche?' })).toBeVisible();
  await dialog.getByRole('radio', { name: '6 Std. / Woche' }).click();
  await dialog.getByRole('button', { name: "Los geht's" }).click();
  await expect(dialog).toBeHidden();
  const stored = await page.evaluate(async () => {
    const { progress } = await import('/assets/js/core/' + 'progress_store.js');
    return { done: await progress.getSetting('onboardingDone'), track: await progress.getSetting('primaryTrack'), minutes: await progress.getSetting('weeklyMinutes') };
  });
  expect(stored).toEqual({ done: true, track: 'applied-ai', minutes: 360 });
  await page.goto('/index.html#/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('onboarding skip keeps defaults and never returns', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Onboarding skip runs in Chromium.');
  await page.goto('/index.html?fresh=1#/today');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Überspringen' }).click();
  await expect(dialog).toBeHidden();
  await page.goto('/index.html#/learn');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
