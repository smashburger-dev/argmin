import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Axe coverage for the modal layers: the route-level axe runs never see them
// because webdriver suppresses auto-start (?fresh / ?tour force them open).
const seriousViolations = async (page: Page) => {
  const accessibility = await new AxeBuilder({ page }).analyze();
  return accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''));
};

test('onboarding dialog passes serious and critical axe checks', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Dialog axe checks run in Chromium.');
  await page.goto('/index.html?fresh=1#/today');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { level: 1, name: 'Willkommen bei argmin' })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test('spotlight tour passes serious and critical axe checks', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Dialog axe checks run in Chromium.');
  await page.goto('/index.html?tour=1#/today');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Kurzer Rundgang', exact: true })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  await dialog.getByRole('button', { name: 'Tour starten', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Alles in Reichweite', exact: true })).toBeVisible();
  // The card re-anchors only after the target scrolled into view and the
  // glow rect was measured; sampling earlier can catch them overlapping.
  await page.waitForSelector('.tour-glow');
  await page.waitForTimeout(300);
  expect(await seriousViolations(page)).toEqual([]);
});

test('sponsor modal passes serious and critical axe checks', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Dialog axe checks run in Chromium.');
  await page.goto('/index.html#/today');
  await page.getByRole('button', { name: 'Werde Sponsor' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});
