import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('glossary lists terms and filters by term, english and definition', async ({ page }) => {
  await page.goto('/index.html#/glossary');
  await expect(page.getByRole('heading', { level: 1, name: 'Lexikon' })).toBeVisible();
  await page.getByLabel('Begriffe filtern').fill('Form');
  const entry = page.locator('article#glossary-form');
  await expect(entry).toBeVisible();
  await expect(entry.getByRole('heading', { name: 'Form' })).toBeVisible();
  await expect(entry.getByRole('link', { name: /Matrizen und Matrixprodukte/ })).toHaveAttribute('href', '#/lesson/l-linalg-matrices');
  await page.getByLabel('Begriffe filtern').fill('gibtsnicht');
  await expect(page.getByText(/Kein Begriff passt zu/)).toBeVisible();
});

test('glossary term route highlights and focuses the entry', async ({ page }) => {
  await page.goto('/index.html#/glossary/form');
  const entry = page.locator('article#glossary-form');
  await expect(entry).toHaveClass(/is-target/);
  await expect(entry.getByRole('heading', { name: 'Form' })).toBeFocused();
});

test('lesson glossary link opens a popover without navigating', async ({ page }) => {
  await page.goto('/index.html#/lesson/l-ml-logistic');
  const link = page.locator('.lesson-prose a[href="#/glossary/skalarprodukt"]').first();
  await expect(link).toBeVisible();
  await link.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Im Lexikon öffnen')).toBeVisible();
  expect(page.url()).toContain('#/lesson/l-ml-logistic');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(link).toBeFocused();
});

test('glossary popover anchors to the link at 1440px without scrolling the page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html#/lesson/l-ml-logistic');
  const link = page.locator('.lesson-prose a[href="#/glossary/skalarprodukt"]').first();
  await link.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const scrollBefore = await page.evaluate(() => document.scrollingElement!.scrollTop);
  await link.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(200); // let the open animation settle before measuring
  const scrollAfter = await page.evaluate(() => document.scrollingElement!.scrollTop);
  expect(scrollAfter).toBe(scrollBefore);
  const box = await dialog.boundingBox();
  const linkBox = await link.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(900);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(1440);
  const below = Math.abs(box!.y - linkBox!.y - linkBox!.height) <= 24;
  const above = Math.abs(linkBox!.y - box!.y - box!.height) <= 24;
  expect(below || above).toBe(true);
});

test('glossary popover stays inside the viewport at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/index.html#/lesson/l-ml-logistic');
  const link = page.locator('.lesson-prose a[href="#/glossary/skalarprodukt"]').first();
  await link.scrollIntoViewIfNeeded();
  await link.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(200); // let the open animation settle before measuring
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(700);
  const close = await page.getByRole('button', { name: 'Schließen' }).boundingBox();
  const head = await dialog.locator('h2').boundingBox();
  const overlapX = Math.min(close!.x + close!.width, head!.x + head!.width) - Math.max(close!.x, head!.x);
  const overlapY = Math.min(close!.y + close!.height, head!.y + head!.height) - Math.max(close!.y, head!.y);
  expect(overlapX <= 0 || overlapY <= 0).toBe(true);
});

test('search shows a Begriffe group linking into the glossary', async ({ page }) => {
  await page.goto('/index.html#/search');
  await page.getByPlaceholder(/Begriff eingeben/).fill('Skalarprodukt');
  await expect(page.getByRole('heading', { name: 'Begriffe' })).toBeVisible();
  await expect(page.locator('a[href="#/glossary/skalarprodukt"]')).toBeVisible();
});

test('glossary view and open popover have no serious accessibility violations', async ({ page }) => {
  await page.goto('/index.html#/glossary');
  await expect(page.getByRole('heading', { level: 1, name: 'Lexikon' })).toBeVisible();
  const glossaryAudit = await new AxeBuilder({ page }).analyze();
  expect(glossaryAudit.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);

  await page.goto('/index.html#/lesson/l-ml-logistic');
  await page.locator('.lesson-prose a[href="#/glossary/skalarprodukt"]').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const popoverAudit = await new AxeBuilder({ page }).analyze();
  expect(popoverAudit.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});
