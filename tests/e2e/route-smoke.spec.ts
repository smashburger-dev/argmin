import { expect, test } from '@playwright/test';

test('modern family route renders without page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/index.html#/family/formula-scalar-product/column-vector-authored/0/core');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('review route renders archived entries without crashing', async ({ page }) => {
  await page.goto('/index.html#/review');
  await expect(page.getByRole('heading', { level: 1, name: 'Review' })).toBeVisible();
});
