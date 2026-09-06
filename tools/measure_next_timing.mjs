#!/usr/bin/env node
// Timing and transfer measurement for the next shell (ADR-0013).
//
// Usage: node tools/measure_next_timing.mjs <base-url> [runs]
//
// Measures, per run (fresh browser context = cold, reload = warm):
//   - #/today: milliseconds to visible H1, to usable navigation,
//     transferred bytes for document + JS/CSS/JSON
//   - first lesson open (#/lesson/l-foundations-algebra)
//   - first exercise open (#/exercise/f-collections-choice-01)
//   - external (non-same-origin) request count (must stay 0)
// Reports median and spread (min/max) across runs as JSON on stdout.

import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://127.0.0.1:8971';
const runs = Number(process.argv[3] || 7);

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const spread = (values) => ({ min: Math.min(...values), max: Math.max(...values) });

async function measureRun(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  let externalRequests = 0;
  let transferredBytes = 0;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(base).origin) externalRequests += 1;
  });
  page.on('response', async (response) => {
    const url = new URL(response.url());
    if (url.origin !== new URL(base).origin) return;
    if (!/\.(js|css|json|wasm|zip|whl)$/.test(url.pathname)) return;
    try { transferredBytes += (await response.body()).length; } catch { /* body gone */ }
  });

  const started = Date.now();
  await page.goto(`${base}/index.html#/today`, { waitUntil: 'domcontentloaded' });
  const h1 = await page.locator('main h1').first().waitFor({ state: 'visible' });
  const todayH1Ms = Date.now() - started;
  await page.locator('nav.main-nav a').first().waitFor({ state: 'visible' });
  const todayNavMs = Date.now() - started;
  await h1;

  const lessonStart = Date.now();
  await page.goto(`${base}/index.html#/lesson/l-foundations-algebra`);
  await page.locator('.lesson-block').first().waitFor({ state: 'visible' });
  const lessonMs = Date.now() - lessonStart;

  const exerciseStart = Date.now();
  await page.goto(`${base}/index.html#/exercise/f-collections-choice-01`);
  await page.locator('main h1').first().waitFor({ state: 'visible' });
  const exerciseMs = Date.now() - exerciseStart;

  // Warm reload of #/today within the same (primed) context.
  const warmStart = Date.now();
  await page.goto(`${base}/index.html#/today`);
  await page.locator('main h1').first().waitFor({ state: 'visible' });
  const warmTodayH1Ms = Date.now() - warmStart;

  const initialBytes = transferredBytes;
  await context.close();
  return { todayH1Ms, todayNavMs, lessonMs, exerciseMs, warmTodayH1Ms, initialBytes, externalRequests };
}

const browser = await chromium.launch();
const samples = [];
for (let index = 0; index < runs; index += 1) samples.push(await measureRun(browser));
await browser.close();

const keys = Object.keys(samples[0]);
const report = { base, runs, median: {}, spread: {} };
for (const key of keys) {
  report.median[key] = median(samples.map((sample) => sample[key]));
  report.spread[key] = spread(samples.map((sample) => sample[key]));
}
if (samples.some((sample) => sample.externalRequests > 0)) {
  console.error('EXTERNAL REQUESTS DETECTED');
  process.exitCode = 1;
}
console.log(JSON.stringify(report, null, 2));
