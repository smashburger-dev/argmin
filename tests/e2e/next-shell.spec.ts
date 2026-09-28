import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const allSources = JSON.parse(readFileSync(join(process.cwd(), 'content/sources.json'), 'utf8')).sources;
const expectedPublicSources = allSources.filter((source: { contentClass: string }) => ['open', 'generated', 'link-only'].includes(source.contentClass)).length;

test('removed week routes render the default view without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  for (const route of ['#/roadmap', '#/exercise/w01-e1']) {
    await page.goto(`/index.html${route}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Nicht gefunden' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('next shell exposes the primary learning flow without serious accessibility violations', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/index.html#/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Dein Wochenplan' })).toBeVisible();
  await page.getByRole('link', { name: 'Lernen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Dein Lernpfad:/ })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
  expect(errors).toEqual([]);
});

test('competency and lesson routes expose family activities', async ({ page }) => {
  await page.goto('/index.html#/competency/c-algebra-basics');
  await expect(page.getByRole('heading', { level: 1, name: 'Algebra-Grundlagen' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aufgabe öffnen' }).first()).toHaveAttribute('href', /^#\/family\//);
  await page.goto('/index.html#/lesson/l-foundations-algebra');
  await expect(page.getByRole('heading', { level: 1, name: 'Algebra als überprüfbare Umformung' })).toBeVisible();
});

test('lesson tasks link only the curated placements of that lesson', async ({ page }) => {
  await page.goto('/index.html#/lesson/l-foundations-python-state');
  await expect(page.getByRole('heading', { level: 1, name: 'Python-Zustand statt Code-Raten' })).toBeVisible();
  const tasks = page.locator('.lesson-tasks');
  await expect(tasks.locator('.lesson-cta')).toHaveAttribute('href', '#/family/trace-assignment-state/reassign-two-variables-print/7/intro');
  const cardLinks = tasks.locator('.side-card a');
  await expect(cardLinks).toHaveCount(2);
  await expect(cardLinks.nth(0)).toHaveAttribute('href', '#/family/trace-assignment-state/accumulate-reassign-print/11/core');
  await expect(cardLinks.nth(1)).toHaveAttribute('href', '#/family/trace-assignment-state/chain3-overwrite-print/17/stretch');
  const hrefs = await tasks.locator('a[href^="#/family/"]').evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  expect(hrefs.every((href) => href.startsWith('#/family/trace-assignment-state/'))).toBe(true);
  expect(hrefs.some((href) => /slice|split/.test(href))).toBe(false);
});

test('algebra transformations lesson shows its own curated task', async ({ page }) => {
  await page.goto('/index.html#/lesson/l-foundations-algebra-transformations');
  await expect(page.getByRole('heading', { level: 1, name: 'Terme strukturiert umformen' })).toBeVisible();
  await expect(page.locator('.lesson-tasks .lesson-cta')).toHaveAttribute('href', /^#\/family\/transform-expression-simplify-canonical\//);
});

test('public sources and modern module route render', async ({ page }) => {
  await page.goto('/index.html#/sources');
  await expect(page.getByRole('heading', { level: 1, name: 'Lektüren' })).toBeVisible();
  await expect(page.locator('.source-card')).toHaveCount(expectedPublicSources);
  await page.goto('/index.html#/module/lm-linalg-matrices');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
