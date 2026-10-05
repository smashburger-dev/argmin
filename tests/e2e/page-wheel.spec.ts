import { expect, test, type Page } from '@playwright/test';

async function openScrollablePage(page: Page) {
  await page.goto('/index.html#/today');
  await expect(page.getByRole('list', { name: 'Wochenplan-Tage' })).toBeVisible();
  await page.evaluate(async () => {
    const space = document.createElement('div');
    space.style.height = '4000px';
    document.body.append(space);
    window.scrollTo(0, 300);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
}

test('a trackpad gesture stays native as its pixel deltas grow and shrink', async ({ page }) => {
  await openScrollablePage(page);
  const intercepted = await page.evaluate(() => [4, 12, 24, 60, 120, 24, 4].map((deltaY) => {
    const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  }));
  expect(intercepted).toEqual([false, false, false, false, false, false, false]);
});

test('precision classification lasts for the whole gesture, then releases the mouse wheel', async ({ page }) => {
  await openScrollablePage(page);
  const result = await page.evaluate(async () => {
    const wheel = (deltaY: number) => {
      const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true });
      document.body.dispatchEvent(event);
      return event.defaultPrevented;
    };
    const gesture = [wheel(4)];
    for (let i = 0; i < 8; i++) {
      await new Promise((resolve) => setTimeout(resolve, 60));
      gesture.push(wheel(120));
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { gesture, mouse: wheel(120) };
  });
  expect(result.gesture).toEqual(Array(9).fill(false));
  expect(result.mouse).toBe(true);
});

test('small native wheel movements land precisely without an extra tail', async ({ page }) => {
  await openScrollablePage(page);
  await page.mouse.move(1270, 600);
  const start = await page.evaluate(() => window.scrollY);
  for (const delta of [4, 12, 24]) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(40);
  }
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(start + 40);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.scrollY)).toBe(start + 40);
});

test('a notched mouse wheel still eases toward its exact target', async ({ page }) => {
  await openScrollablePage(page);
  const result = await page.evaluate(async () => {
    const start = window.scrollY;
    const event = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    await new Promise(requestAnimationFrame);
    return { start, firstFrame: window.scrollY, intercepted: event.defaultPrevented };
  });
  expect(result.intercepted).toBe(true);
  expect(result.firstFrame).toBeGreaterThan(result.start);
  expect(result.firstFrame).toBeLessThan(result.start + 120);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(result.start + 120);
});

test('reduced motion keeps mouse-wheel scrolling native', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openScrollablePage(page);
  const intercepted = await page.evaluate(() => {
    const event = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(intercepted).toBe(false);
});

test('zoom, shift, diagonal and non-cancelable input stay native', async ({ page }) => {
  await openScrollablePage(page);
  const intercepted = await page.evaluate(() => [
    { deltaY: 120, ctrlKey: true },
    { deltaY: 120, shiftKey: true },
    { deltaY: 120, cancelable: false },
    { deltaY: 120, deltaX: 2 },
  ].map((options) => {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...options });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  }));
  expect(intercepted).toEqual([false, false, false, false]);
});

test('fractional trackpad deltas stay native even above the old cutoff', async ({ page }) => {
  await openScrollablePage(page);
  const intercepted = await page.evaluate(() => {
    const event = new WheelEvent('wheel', { deltaY: 48.5, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(intercepted).toBe(false);
});

test('precision input cancels an outstanding mouse-wheel glide', async ({ page }) => {
  await openScrollablePage(page);
  const positions = await page.evaluate(async () => {
    const wheel = (deltaY: number) => document.body.dispatchEvent(
      new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }),
    );
    wheel(120);
    await new Promise(requestAnimationFrame);
    wheel(2);
    const start = window.scrollY;
    for (let i = 0; i < 20; i++) await new Promise(requestAnimationFrame);
    return { start, end: window.scrollY };
  });
  expect(positions.end).toBe(positions.start);
});

test('vertical trackpad gestures over the week plan are not redirected horizontally', async ({ page }) => {
  await openScrollablePage(page);
  const track = page.getByRole('list', { name: 'Wochenplan-Tage' });
  const intercepted = await track.evaluate((element) => [2, 24, 80, 2].map((deltaY) => {
    const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  }));
  expect(intercepted).toEqual([false, false, false, false]);
});
