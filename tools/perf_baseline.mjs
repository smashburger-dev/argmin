// Release-build load baseline: node tools/perf_baseline.mjs <base-url> [route]
// Serve build-next first, e.g. python3 -m http.server 4799 -d build-next
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://127.0.0.1:4799/';
const routes = [
  ['home', ''],
  ['module', '#/module/lm-foundations-algebra'],
  ['family-seeded', '#/family/transform-linear-equation-isolate/two-step-seeded-retrieval/5/intro'],
  ['family-python', '#/family/reproduce-pipeline-status-report/pipeline-status-report/0/challenge'],
];

const visible = () => (document.querySelector('main')?.innerText.trim().length || 0) > 50;

async function load(page, hash, label, files) {
  files.length = 0;
  const t0 = Date.now();
  await page.goto('about:blank');
  await page.goto(base + hash, { waitUntil: 'commit' });
  await page.waitForFunction(visible, undefined, { timeout: 60000, polling: 50 });
  const tView = Date.now() - t0;
  const bytes = files.reduce((s, [, n]) => s + n, 0);
  const big = [...files].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([u, s]) => `${u.split('/').pop().split('?')[0]}=${(s / 1024).toFixed(0)}K`).join(' ');
  return `${label} view=${tView}ms bytes=${(bytes / 1024 / 1024).toFixed(2)}MB [${big}]`;
}

async function measure(route, hash, cpu) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const files = [];
  page.on('response', async (r) => { try { const b = await r.body(); files.push([r.url().replace(base, ''), b.length]); } catch {} });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const cold = await load(page, hash, 'cold', files);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  const warm = await load(page, hash, 'warm', files);
  let py = '';
  if (route === 'family-python') {
    const t = await page.evaluate(() => new Promise((res) => { const t = performance.now(); const w = new Worker('assets/js/runtime/pyodide_worker.mjs', { type: 'module' }); w.onmessage = (e) => { if (e.data.type === 'ready') res(Math.round(performance.now() - t)); if (e.data.type === 'error') res('ERR:' + e.data.message); }; w.onerror = (e) => res('WERR:' + e.message); w.postMessage({ type: 'init' }); }));
    py = `  pyodide-ready(cold)=${t}ms`;
  }
  console.log(`${route.padEnd(14)} cpu=${cpu}x  ${cold}  |  ${warm}${py}`);
  await browser.close();
}

for (const [route, hash] of routes.filter(([r]) => process.argv[3] ? r === process.argv[3] : true)) {
  await measure(route, hash, 1);
  await measure(route, hash, 4);
}
