import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Opt-in frame budget measurement (research doc §5: script time per frame
// under 4x CPU throttling below 4 ms). Run:
//   FIGURE_PERF=1 E2E_PORT=4391 npx playwright test tests/e2e/figures-perf.spec.ts --project=chromium
// Writes .figure-shots/perf.json. Not a CI gate: timings depend on the machine.
const STYLES = ['a1', 'a2', 'a3', 'a4'] as const;
const THROTTLE = 4;

type Sample = { style: string; ms: number; build: number; sort: number; paint: number; faces: number };
type Scenario = 'beat' | 'drag' | 'board';
interface Result {
  style: string;
  viewport: string;
  scenario: Scenario;
  ticks: number;
  frames: number;
  scriptMedian: number;
  scriptP95: number;
  scriptMax: number;
  buildMedian: number;
  sortMedian: number;
  paintMedian: number;
  faces: number;
  frameMedian: number;
  frameP95: number;
  longFrames: number;
}

const quantile = (values: number[], q: number) => {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
};
const round = (value: number) => Math.round(value * 100) / 100;

async function startRecording(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __argminFigurePerf: unknown[]; __frames: number[]; __long: number; __stopFrames: boolean; __longObserver?: PerformanceObserver };
    w.__argminFigurePerf = [];
    w.__frames = [];
    w.__long = 0;
    w.__stopFrames = false;
    const tick = (now: number) => {
      w.__frames.push(now);
      if (!w.__stopFrames) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    w.__longObserver?.disconnect();
    if (PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame')) {
      w.__longObserver = new PerformanceObserver((list) => { w.__long += list.getEntries().length; });
      w.__longObserver.observe({ type: 'long-animation-frame' });
    }
  });
}

async function stopRecording(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __argminFigurePerf: Sample[]; __frames: number[]; __long: number; __stopFrames: boolean; __longObserver?: PerformanceObserver };
    w.__stopFrames = true;
    w.__longObserver?.disconnect();
    const intervals = w.__frames.slice(1).map((t, i) => t - w.__frames[i]!);
    return { samples: w.__argminFigurePerf.slice(), intervals, longFrames: w.__long };
  });
}

function summarize(style: string, viewport: string, scenario: Scenario, data: { samples: Sample[]; intervals: number[]; longFrames: number }): Result {
  const ms = data.samples.map((sample) => sample.ms);
  return {
    style,
    viewport,
    scenario,
    ticks: ms.length,
    frames: data.intervals.length + 1,
    scriptMedian: round(quantile(ms, 0.5)),
    scriptP95: round(quantile(ms, 0.95)),
    scriptMax: round(Math.max(...ms)),
    buildMedian: round(quantile(data.samples.map((s) => s.build), 0.5)),
    sortMedian: round(quantile(data.samples.map((s) => s.sort), 0.5)),
    paintMedian: round(quantile(data.samples.map((s) => s.paint), 0.5)),
    faces: Math.max(...data.samples.map((s) => s.faces)),
    frameMedian: round(quantile(data.intervals, 0.5)),
    frameP95: round(quantile(data.intervals, 0.95)),
    longFrames: data.longFrames,
  };
}

async function openFigure(page: Page, style: string, beat: number) {
  await page.goto(`/index.html#/figurenlabor?stil=${style}&beat=${beat}`);
  const stage = page.locator('[aria-roledescription="Figur"]').first();
  await expect(stage).toBeVisible({ timeout: 20_000 });
  await stage.scrollIntoViewIfNeeded();
  // Let fonts, defs and the first settle finish before measuring.
  await page.waitForTimeout(1500);
  return stage;
}

async function measureBeat(page: Page, style: string, viewport: string) {
  await openFigure(page, style, 0);
  await startRecording(page);
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.waitForTimeout(3000);
  return summarize(style, viewport, 'beat', await stopRecording(page));
}

async function measureDrag(page: Page, style: string, viewport: string) {
  const stage = await openFigure(page, style, 3);
  const box = await stage.locator('svg').first().boundingBox();
  if (!box) throw new Error('figure svg has no box');
  const y = box.y + box.height * 0.5;
  const x0 = box.x + box.width * 0.3;
  await startRecording(page);
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= 60; i += 1) {
    await page.mouse.move(x0 + (box.width * 0.4 * i) / 60, y);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(800);
  return summarize(style, viewport, 'drag', await stopRecording(page));
}

async function measureBoardMove(page: Page, style: string, viewport: string) {
  await openFigure(page, style, 3);
  await startRecording(page);
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.waitForTimeout(3000);
  return summarize(style, viewport, 'board', await stopRecording(page));
}

test.describe('figure frame budget (opt-in)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium' || process.env.FIGURE_PERF !== '1', 'Set FIGURE_PERF=1; CDP throttling needs Chromium.');
  test.setTimeout(240_000);

  for (const [label, size] of [['1440', { width: 1440, height: 900 }], ['375', { width: 375, height: 812 }]] as const) {
    test(`script time per frame at ${label} px under ${THROTTLE}x CPU throttling`, async ({ page }) => {
      await page.setViewportSize(size);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
      const results: Result[] = [];
      for (const style of STYLES) {
        results.push(await measureBeat(page, style, label));
        results.push(await measureDrag(page, style, label));
        results.push(await measureBoardMove(page, style, label));
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      mkdirSync('.figure-shots', { recursive: true });
      writeFileSync(`.figure-shots/perf-${label}.json`, JSON.stringify({ throttle: THROTTLE, results }, null, 2));
      console.table(results);
      for (const result of results) {
        expect(result.ticks, `${result.style}/${result.scenario} produced no ticks`).toBeGreaterThan(10);
        // One tick per animation frame: more ticks than frames means the loop
        // ran outside rAF or two loops were mounted.
        expect(result.ticks, `${result.style}/${result.scenario} ran more than one tick per frame`)
          .toBeLessThanOrEqual(result.frames + 1);
      }
    });
  }
});
