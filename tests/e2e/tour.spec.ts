import { expect, test, type Page } from '@playwright/test';

const readTourDone = (page: Page) =>
  page.evaluate(async () => {
    const { progress } = await import('/assets/js/core/' + 'progress_store.js');
    return progress.getSetting('tourDone');
  });

test('spotlight tour walks all steps, navigates by hash and persists tourDone', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Spotlight tour runs in Chromium.');
  await page.goto('/index.html?tour=1#/today');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.getByRole('heading', { name: 'Kurzer Rundgang', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Rundgang schließen', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Tour starten', exact: true }).click();

  const next = dialog.getByRole('button', { name: 'Weiter', exact: true });
  await expect(dialog.getByRole('heading', { name: 'Alles in Reichweite', exact: true })).toBeVisible();
  await expect(page.getByText(/Schritt \d+ von 8/)).toBeVisible();
  await next.click();

  await expect(dialog.getByRole('heading', { name: 'Dein nächster Schritt', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Zurück', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Alles in Reichweite', exact: true })).toBeVisible();
  await next.click();
  await expect(dialog.getByRole('heading', { name: 'Dein nächster Schritt', exact: true })).toBeVisible();
  await next.click();

  await expect(dialog.getByRole('heading', { name: 'Dein Wochenplan', exact: true })).toBeVisible();
  await next.click();

  await expect(dialog.getByRole('heading', { name: 'Der Katalog', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#\/learn/);
  await next.click();

  await expect(dialog.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#\/review/);
  await next.click();

  await expect(dialog.getByRole('heading', { name: 'Fortschritt', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#\/progress/);
  await next.click();

  await expect(dialog.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#\/settings/);
  await dialog.getByRole('button', { name: 'Fertig', exact: true }).click();

  await expect(dialog).toBeHidden();
  expect(await readTourDone(page)).toBe(true);
});

test('spotlight tour escape closes the tour and persists tourDone', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Spotlight tour runs in Chromium.');
  await page.goto('/index.html?tour=1#/today');

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Kurzer Rundgang', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Tour starten', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Alles in Reichweite', exact: true })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await readTourDone(page)).toBe(true);
});

test('spotlight tour later button closes the intro and persists tourDone', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Spotlight tour runs in Chromium.');
  await page.goto('/index.html?tour=1#/today');

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Kurzer Rundgang', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Später', exact: true }).click();

  await expect(dialog).toBeHidden();
  expect(await readTourDone(page)).toBe(true);
});

test('settings replay restarts the tour and webdriver suppresses auto-start', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Spotlight tour runs in Chromium.');
  await page.goto('/index.html#/settings');

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Rundgang erneut starten', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Kurzer Rundgang', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Tour starten', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Alles in Reichweite', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Tour beenden', exact: true }).click();
  await expect(dialog).toBeHidden();
});
