import { expect, test } from '@playwright/test';

test('week plan translates small mouse-wheel ticks into horizontal scroll', async ({ page }) => {
  await page.goto('/index.html#/today');
  const track = page.getByRole('list', { name: 'Wochenplan-Tage' });
  await expect(track).toBeVisible();
  await track.scrollIntoViewIfNeeded();
  await track.hover();
  const start = await track.evaluate((element) => element.scrollLeft);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(60);
  }
  await expect.poll(async () => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(start + 200);
  // Snap-Settle pollt bis zur Ruhe — fester Timeout flake't unter CI-Last.
  await expect.poll(async () => track.evaluate((element) => {
    const slide = element.querySelector<HTMLElement>(':scope > *');
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
    const step = (slide?.offsetWidth ?? element.clientWidth) + gap;
    const mod = element.scrollLeft % step;
    return Math.min(mod, step - mod);
  })).toBeLessThan(3);
});

test('week plan hands vertical scroll back to the page at its right edge', async ({ page }) => {
  await page.goto('/index.html#/today');
  const track = page.getByRole('list', { name: 'Wochenplan-Tage' });
  await expect(track).toBeVisible();
  await track.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  await track.hover();
  const pageStart = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 400);
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(pageStart);
});
