import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const TASK = '/#/family/transform-system-2x2-elimination/system-w05-e6/0/core';
const LESSON = '/#/lesson/l-linalg-systems';
const RUN_STARTED = Date.now();
test.afterAll(async ({ browser }, testInfo) => {
  if (process.env.FIGURE_SHOTS !== '1' || testInfo.workerIndex !== 0) return;
  testInfo.setTimeout(60_000);
  const files = [1440, 375].flatMap((width) => ['light', 'dark'].map((theme) => `.figure-shots/s2/task-${width}-${theme}.png`));
  await expect.poll(() => files.every((path) => { try { return statSync(path).mtimeMs >= RUN_STARTED; } catch { return false; } })).toBe(true);
  const cards = [1440, 375].flatMap((width) => ['light', 'dark'].map((theme) =>
    `<figure><figcaption>${width} px · ${theme}</figcaption><img src="task-${width}-${theme}.png"></figure>`)).join('');
  writeFileSync('.figure-shots/s2/kontaktbogen.html', `<!doctype html><html lang="de"><meta charset="utf-8"><title>S2 Aufgabenansicht</title><style>body{font:16px system-ui;background:#d8d0c4;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:16px}figure{margin:0}img{width:100%;vertical-align:top}figcaption{padding:8px}</style>${cards}</html>`);
  const page = await browser.newPage({ viewport: { width: 1800, height: 1200 } });
  await page.goto(`http://127.0.0.1:${process.env.E2E_PORT ?? 4401}/.figure-shots/s2/kontaktbogen.html`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '.figure-shots/s2/kontaktbogen.png', fullPage: true, animations: 'disabled', timeout: 20_000 });
  await page.close();
});
async function hint(page: Page) {
  await page.goto(TASK);
  const input = page.getByRole('textbox').first();
  await input.fill('(9, 9)');
  await page.getByRole('button', { name: 'Hinweis als Figur', exact: true }).click();
  await expect(input).toHaveValue('(9, 9)');
  await input.fill('');
  const card = page.locator('.figure-hint-card');
  await expect(card.locator('.figure-stage')).toHaveAttribute('data-settled', 'true');
  return card;
}

for (const width of [1440, 375]) {
  for (const theme of ['light', 'dark']) {
    test(`hint task ${width} ${theme}: placement, one hint, axe, contact sheet`, async ({ page }) => {
      const height = width === 375 ? 812 : 900;
      await page.setViewportSize({ width, height });
      await page.addInitScript((theme) => localStorage.setItem('ki-lernplattform:theme', theme), theme);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const card = await hint(page);
      await expect(page.locator('.hint-stack p')).toHaveCount(1);
      await expect(card.locator('.figure-controls button')).toHaveCount(4);
      await expect(card.locator('.figure-predict')).toHaveCount(0);
      const parent = width === 1440 ? '.exercise-side-stack' : '.exercise-main';
      await expect(page.locator(`${parent} .figure-hint-card`)).toHaveCount(1);
      await card.getByRole('button', { name: 'Weiter', exact: true }).click();
      await card.getByRole('button', { name: 'Weiter', exact: true }).click();
      await expect(card.locator('.figure-stage')).toHaveAttribute('data-settled', 'true');
      await page.evaluate(() => document.fonts.ready);
      const metrics = await card.evaluate((el) => {
        const texts = [...el.querySelectorAll<SVGTextElement>('g[data-item="board-face"] text')];
        return { height: el.getBoundingClientRect().height, font: Math.min(...texts.map((t) => Number(t.getAttribute('font-size')) * Math.hypot(t.getScreenCTM()!.a, t.getScreenCTM()!.b))) };
      });
      expect(metrics.font).toBeGreaterThanOrEqual(14);
      if (width === 375) expect(metrics.height).toBeLessThanOrEqual(height * 0.7 + 1);
      if (width === 375) {
        const cardBox = (await card.boundingBox())!;
        const answerBox = (await page.locator('.exercise-answer').boundingBox())!;
        expect(answerBox.y - cardBox.y - cardBox.height).toBeLessThanOrEqual(25);
      }
      const bad = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
      expect(bad.map((v) => v.id)).toEqual([]);
      if (process.env.FIGURE_SHOTS === '1') {
        mkdirSync('.figure-shots/s2', { recursive: true });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `.figure-shots/s2/task-${width}-${theme}.png`, fullPage: true });
        writeFileSync(`.figure-shots/s2/metrics-${width}-${theme}.json`, JSON.stringify(metrics));
      }
      await card.getByRole('button', { name: 'Figur ausblenden' }).click();
      await page.getByRole('button', { name: 'Hinweis als Figur', exact: true }).click();
      await expect(page.locator('.hint-stack p')).toHaveCount(1);
      await expect(page.locator('.figure-hint-card')).toHaveCount(1);
      // Text was already opened by the same level, so figure reopening never adds an event.
      const usage = await page.evaluate(async () => {
        const request = indexedDB.open('ki-lernplattform');
        return new Promise<Array<{ eventType: string; hintsUsed: number }>>((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const rows = db.transaction('attempts').objectStore('attempts').getAll();
            rows.onsuccess = () => { resolve(rows.result); db.close(); };
          };
        });
      });
      const hints = usage.filter((event) => event.eventType === 'hint-used');
      expect(hints).toHaveLength(1);
      expect(hints[0]!.hintsUsed).toBe(1);
    });
  }
}

test('text then figure share hint level and the successful attempt remains eligible', async ({ page }) => {
  await page.goto(TASK);
  await page.getByRole('button', { name: /Hinweis 1\// }).click();
  await page.getByRole('button', { name: 'Hinweis als Figur', exact: true }).click();
  await expect(page.locator('.hint-stack p')).toHaveCount(1);
  await page.getByRole('textbox').first().fill('(1, 3)');
  await page.getByRole('button', { name: 'Antwort prüfen', exact: true }).click();
  await expect(page.locator('.exercise-feedback')).toContainText('Kann als Kompetenzbeleg zählen.');
  await page.reload();
  await page.getByRole('textbox').first().fill('(1, 3)');
  await page.getByRole('button', { name: 'Antwort prüfen', exact: true }).click();
  await expect(page.locator('.exercise-feedback')).toContainText('Kann als Kompetenzbeleg zählen.');
});

test('session restores beat and first-use view hint; forced colors and print stay readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(LESSON);
  const card = page.locator('.figure-card').first();
  await card.getByRole('button', { name: 'Weiter', exact: true }).click();
  await card.getByRole('button', { name: 'Ansicht', exact: true }).click();
  await page.reload();
  await expect(card.locator('.figure-stage')).toHaveAttribute('data-beat', '1');
  await expect(card.locator('.figure-drag-hint')).toHaveCount(0);
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await card.locator('svg text').first().evaluate((e) => getComputedStyle(e).fill)).toBe('rgb(0, 0, 0)');
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await expect(card.locator('.figure-controls')).toBeHidden();
  await expect(card.locator('.figure-stage')).toHaveAttribute('data-beat', '5');
  await expect(card.locator('.figure-transcript li').first()).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(card.locator('.figure-stage')).toHaveAttribute('data-beat', '1');
});

test('adaptive calm after thirty slow frames persists; explicit cuts fade for 150 ms', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'Uses the development engine entry point.');
  await page.goto('/#/learn');
  const result = await page.evaluate(async () => {
    const load = new Function('url', 'return import(url)');
    const { FigureEngine } = await load('/src/figures/engine.ts');
    const requestFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = () => 0;
    sessionStorage.removeItem('argmin:figure:calm');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    const scene = { beatIds: ['overview', 'reading'], beatDuration: () => 1, build: () => [], ground: () => null,
      pose: (_m: object, beat: number) => ({ camera: beat === 0 ? 'overview' : 'reading' }),
      cameraFor: (_m: object, p: { camera: string }, vp: { width: number }) => ({ azimuth: p.camera === 'overview' ? 0.5 : 0, elevation: 0, zoom: vp.width / 343, target: [0, 0, 0] }),
      describe: () => 'Testfigur', readout: () => 'Testfigur' };
    let calmCalls = 0;
    const engine = new FigureEngine({ svg, halo, readout: document.createElement('p'), scene, model: {}, style: 'a1', viewport: { width: 343, height: 343 }, onCalm: () => { calmCalls += 1; }, cuts: ['reading'] });
    try {
      engine.setViewport({ width: 686, height: 343 });
      const resizedZoom = engine.cam.zoom.x;
      engine.replay();
      const now = performance.now();
      for (let i = 0; i < 32; i += 1) engine.tick(now + i * 30);
      const persisted = sessionStorage.getItem('argmin:figure:calm');
      engine.next();
      const opacity = svg.style.opacity;
      engine.setVisible(false);
      engine.fadeUntil = performance.now() - 1;
      engine.setVisible(true);
      const resumedOpacity = svg.style.opacity;
      engine.tick(performance.now() + 170);
      return { calmCalls, persisted, opacity, endOpacity: svg.style.opacity, camera: engine.cam.az.x, resizedZoom, resumedOpacity };
    } finally { engine.dispose(); window.requestAnimationFrame = requestFrame; }
  });
  expect(result).toEqual({ calmCalls: 1, persisted: '1', opacity: '0', endOpacity: '1', camera: 0, resizedZoom: 2, resumedOpacity: '1' });
});

test('smoothie screenshot references: overview, reading surface and last beat', async ({ page, browserName }, testInfo) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'Lab is development-only.');
  test.skip(browserName !== 'chromium', 'Reference images use Chromium.');
  testInfo.snapshotSuffix = '';
  for (const width of [1440, 375]) for (const theme of ['light', 'dark']) for (const beat of [0, 4, 5]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('about:blank');
    await page.addInitScript((t) => localStorage.setItem('ki-lernplattform:theme', t), theme);
    await page.goto(`/#/figurenlabor?beat=${beat}`);
    const stage = page.locator('.figure-stage').first();
    await expect(stage).toHaveAttribute('data-settled', 'true');
    await page.evaluate(() => document.fonts.ready);
    await expect(stage).toHaveScreenshot(`smoothie-${width}-${theme}-${beat}.png`, { maxDiffPixelRatio: 0.002, animations: 'disabled' });
  }
});

test('200 percent text at 640 px keeps stage and controls inside the card', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 1000 });
  await page.goto(LESSON);
  const card = page.locator('.figure-card').first();
  await expect(card.locator('.figure-stage')).toHaveAttribute('data-settled', 'true');
  await page.addStyleTag({ content: 'html { font-size: 200%; } .figure-runtime { font-size: 200%; }' });
  const layout = await card.evaluate((el) => {
    const bounds = el.getBoundingClientRect();
    const buttons = [...el.querySelectorAll('.figure-controls button')].map((button) => button.getBoundingClientRect());
    const stage = el.querySelector('.figure-stage')!.getBoundingClientRect();
    return { overflow: el.scrollWidth - el.clientWidth, left: Math.min(...buttons.map((r) => r.left)) - bounds.left,
      right: Math.max(...buttons.map((r) => r.right)) - bounds.right, ratio: stage.width / stage.height };
  });
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(0);
  expect([1, 4 / 3].some((ratio) => Math.abs(ratio - layout.ratio) < 0.01)).toBe(true);
});

test('static parts open their explanation; inline has no controls and stays under 160 px', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'Mounts the development runtime directly.');
  await page.goto('/#/learn');
  await page.evaluate(async () => {
    const load = new Function('url', 'return import(url)');
    const preactUrl = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/preact\.js\?/.test(url));
    if (!preactUrl) throw new Error('Preact runtime resource missing');
    const [{ h, render }, { default: Runtime }, scene, { default: base }] = await Promise.all([
      load(preactUrl), load('/src/figures/FigureRuntime.tsx'),
      load('/assets/js/figures/scenes/smoothie.mjs'), load('/content/lessons/linear-algebra/smoothie.fig.json?import'),
    ]);
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const single = { ...base, beats: [base.beats[0]], predict: undefined };
    render(h('div', {}, h(Runtime, { scene, spec: { ...single, kind: 'static' } }), h(Runtime, { scene, spec: { ...single, kind: 'inline' } })), root);
  });
  const staticFigure = page.locator('[data-kind="static"]');
  await expect(staticFigure.locator('.figure-stage')).toHaveAttribute('data-settled', 'true');
  await staticFigure.locator('.figure-stage').focus();
  await page.keyboard.press('Enter');
  await expect(staticFigure.locator('.figure-part-card')).toBeVisible();
  await staticFigure.getByRole('button', { name: 'Erklärung schließen' }).click();
  await expect(staticFigure.locator('.figure-part-card')).toHaveCount(0);
  await staticFigure.locator('g[data-item="board-face"]').dispatchEvent('click');
  await expect(staticFigure.locator('.figure-part-card')).toBeVisible();
  const inline = page.locator('[data-kind="inline"]');
  await expect(inline.locator('.figure-controls')).toHaveCount(0);
  expect((await inline.locator('.figure-stage').boundingBox())!.height).toBeLessThanOrEqual(160);
  await expect(inline.locator('.figure-stage')).not.toHaveAttribute('tabindex');
});
