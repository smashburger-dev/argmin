#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { delimiter, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = 4400;
const VIEWPORTS = [{ width: 1440, height: 1000 }, { width: 375, height: 1400 }];
const THEMES = ['light', 'dark'];
const MOTIONS = ['no-preference', 'reduce'];
const STAGE = '[aria-roledescription="Figur"]';
const HINT_CASES = [
  ['classify-rank-solution-case', 'echelon-read-rank-case'],
  ['classify-rank-solution-case', 'rank-system-authored'],
  ['formula-det2-independence', 'det2-seeded-columns'],
  ['transform-rank-dependence-rowops', 'rank-3x3-staircase'],
  ['optimize-gradient-update-rule', 'sign-and-scale-of-update'],
  ['optimize-sgd-step-pure-update', 'pure-train-step'],
  ['classify-training-curve', 'training-curve-diagnosis'],
  ['classify-training-curve', 'training-curve-overfit'],
  ['classify-training-curve', 'training-curve-underfit'],
];
const BASE_OUT = join(ROOT, 'docs/figuren-completion/ui-acceptance');
const RAW_OUT = join(BASE_OUT, 'raw');
const CHILD_ENV = {
  ...process.env,
  PATH: ['/Applications/Xcode.app/Contents/Developer/usr/bin', process.env.PATH]
    .filter(Boolean).join(delimiter),
};

function option(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function requireGo() {
  if (!process.argv.includes('--go')) {
    throw new Error('Absichtlich nicht gestartet: erst nach explizitem Koordinator-GO mit --go ausführen.');
  }
}

async function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: ROOT, env: CHILD_ENV, stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (part) => { stdout += part; });
    child.stderr?.on('data', (part) => { stderr += part; });
    child.once('error', reject);
    child.once('close', (code) => resolvePromise({ code, stdout, stderr }));
  });
}

async function gitEvidence() {
  const [head, status] = await Promise.all([
    run('git', ['rev-parse', 'HEAD']),
    run('git', ['status', '--porcelain=v1']),
  ]);
  if (head.code !== 0 || status.code !== 0) throw new Error('Git-Evidenz konnte nicht gelesen werden.');
  return { head: head.stdout.trim(), status: status.stdout.trim().split('\n').filter(Boolean) };
}

async function hashFile(path) {
  if (!existsSync(path)) return null;
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

function relativeToRoot(path) {
  return path.slice(ROOT.length + 1);
}

async function walkFiles(directory) {
  const found = [];
  async function visit(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) found.push(path);
    }
  }
  if (existsSync(directory)) await visit(directory);
  return found;
}

async function walkJson(directory) {
  const found = [];
  async function visit(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.endsWith('.json')) found.push(path);
    }
  }
  if (existsSync(directory)) await visit(directory);
  return found;
}

async function loadLessons(contentRoot) {
  const lessons = [];
  for (const path of await walkJson(join(contentRoot, 'lessons'))) {
    if (path.endsWith('.fig.json')) continue;
    try {
      const lesson = JSON.parse(await readFile(path, 'utf8'));
      if (Array.isArray(lesson.blocks)) lessons.push(lesson);
    } catch { /* Non-lesson JSON is ignored; exact referenced specs are checked below. */ }
  }
  return lessons;
}

function sceneLesson(contentRoot, lessons, sceneFile) {
  const lesson = lessons.find((item) => item.blocks.some((block) => block.contentRef?.endsWith(sceneFile)));
  if (!lesson) throw new Error(`Lektion für ${sceneFile} fehlt im ${contentRoot}`);
  const path = join(contentRoot, lesson.blocks.find((block) => block.contentRef?.endsWith(sceneFile)).contentRef);
  return { id: lesson.lessonId, path };
}

async function findTraceRoute(contentRoot) {
  const familyFiles = await walkJson(join(contentRoot, 'families'));
  let fallback = null;
  for (const path of familyFiles) {
    const doc = JSON.parse(await readFile(path, 'utf8'));
    const found = findTraceRouteInFamily(doc, path);
    if (found?.preferred) return found.preferred;
    fallback ??= found?.fallback ?? null;
  }
  if (fallback) return fallback;
  throw new Error(`Kein tag-after-line/v1-Fall in ${contentRoot}`);
}

function findTraceRouteInFamily(doc, sourcePath) {
  const isTraceFamily = doc.taskArchetype === 'tag-after-line' || doc.familyId === 'trace-tag-after-line';
  let fallback = null;
  for (const item of doc.cases ?? []) {
    if (!isTraceFamily && item.expectedAnswer?.kind !== 'tag-after-line') continue;
    const route = { familyId: doc.familyId, caseId: item.caseId, difficulty: item.difficultyProfile ?? 'core', sourcePath };
    if (item.caseId === 'bouncer-short-circuit') return { preferred: route };
    fallback ??= route;
  }
  return { fallback };
}

async function readJsonFiles(directory) {
  return Promise.all((await walkJson(directory)).map(async (path) => JSON.parse(await readFile(path, 'utf8'))));
}

function findPlacement(modules, familyId, caseId) {
  return modules.flatMap((module) => module.placements.map((placement) => ({ module, placement })))
    .find(({ placement }) => placement.familyId === familyId && placement.caseId === caseId);
}

async function discoverContent(contentRoot) {
  const lessons = await loadLessons(contentRoot);
  const traceRoute = await findTraceRoute(contentRoot);
  const modulePath = join(contentRoot, 'modules/lm-ml-svm-pca.json');
  const moduleDoc = JSON.parse(await readFile(modulePath, 'utf8'));
  const rate = moduleDoc.placements.find((item) => item.familyId === 'pick-learning-rate');
  if (!rate) throw new Error('F7-Platzierung pick-learning-rate fehlt.');
  const modules = await readJsonFiles(join(contentRoot, 'modules'));
  const tracePlacement = findPlacement(modules, traceRoute.familyId, traceRoute.caseId);
  const hintRoutes = await discoverHintRoutes(contentRoot, modules);
  return {
    pcaLesson: sceneLesson(contentRoot, lessons, 'pca-shadow.fig.json'),
    kmeansLesson: sceneLesson(contentRoot, lessons, 'kmeans-pizza.fig.json'),
    exploreLesson: sceneLesson(contentRoot, lessons, 'mse-landscape.fig.json'),
    compareLesson: sceneLesson(contentRoot, lessons, 'rubber-band-coefficients.fig.json'),
    hintRoutes,
    traceLessons: [
      ['name-tags', 'name-tags.fig.json'], ['bouncer', 'bouncer.fig.json'],
      ['vending-frame', 'vending-frame.fig.json'], ['ledger', 'ledger.fig.json'],
      ['two-tags-one-list', 'two-tags-one-list.fig.json'], ['smoke-detector', 'smoke-detector.fig.json'],
    ].map(([label, file]) => ({ label, ...sceneLesson(contentRoot, lessons, file) })),
    sourcePaths: [
      ...['pca-shadow.fig.json', 'kmeans-pizza.fig.json', 'mse-landscape.fig.json', 'rubber-band-coefficients.fig.json']
        .map((file) => join(contentRoot, 'lessons', 'data-ml', file)),
      traceRoute.sourcePath,
      modulePath,
      ...hintRoutes.flatMap((route) => [route.familySource, route.moduleSource].filter(Boolean)),
    ],
    rateRoute: { familyId: rate.familyId, caseId: rate.caseId, seed: rate.seed ?? 0, difficulty: rate.difficulty, module: moduleDoc.moduleId },
    traceRoute: {
      ...traceRoute,
      seed: tracePlacement?.placement.seed ?? 0,
      difficulty: tracePlacement?.placement.difficulty ?? traceRoute.difficulty,
      module: tracePlacement?.module.moduleId,
    },
  };
}

async function discoverHintRoutes(contentRoot, modules) {
  const hintRoutes = [];
  for (const [familyId, caseId] of HINT_CASES) {
    const found = findPlacement(modules, familyId, caseId);
    const familySource = join(contentRoot, 'families', `${familyId}.json`);
    const family = JSON.parse(await readFile(familySource, 'utf8'));
    if (!(family.cases ?? []).some((item) => item.caseId === caseId)) throw new Error(`Hinweis-Fall ${familyId}/${caseId} fehlt in ${contentRoot}`);
    hintRoutes.push({ familyId, caseId, seed: found?.placement.seed ?? 0,
      difficulty: found?.placement.difficulty ?? 'core', module: found?.module.moduleId,
      familySource, moduleSource: found ? join(contentRoot, 'modules', `${found.module.moduleId}.json`) : null });
  }
  return hintRoutes;
}

async function assertFreePort() {
  await new Promise((resolvePromise, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error(`Port ${PORT} ist bereits belegt; fremden Server nicht wiederverwenden.`)));
    probe.listen(PORT, '127.0.0.1', () => probe.close((error) => error ? reject(error) : resolvePromise()));
  });
}

async function waitServer(child, baseUrl, logPath) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server endete vorzeitig; Log: ${logPath}`);
    try {
      const response = await fetch(`${baseUrl}/index.html`);
      if (response.ok) return;
    } catch { /* Wait for Vite's listener. */ }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`Server auf Port ${PORT} startete nicht; Log: ${logPath}`);
}

async function startServer(mode, logsDirectory) {
  await assertFreePort();
  const vite = join(ROOT, 'node_modules/vite/bin/vite.js');
  const args = mode === 'source'
    ? [vite, '--host', '127.0.0.1', '--port', String(PORT), '--strictPort']
    : [vite, 'preview', '--outDir', 'build-next', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'];
  const logPath = join(logsDirectory, `${mode}-server.log`);
  const log = await import('node:fs').then(({ createWriteStream }) => createWriteStream(logPath, { flags: 'w' }));
  const child = spawn(process.execPath, args, { cwd: ROOT, detached: true, stdio: ['ignore', log, log] });
  try {
    await waitServer(child, `http://127.0.0.1:${PORT}`, logPath);
    return { child, logPath, baseUrl: `http://127.0.0.1:${PORT}` };
  } catch (error) {
    await stopServer(child);
    throw error;
  }
}

async function stopServer(child) {
  if (!child) return;
  try { process.kill(-child.pid, 'SIGINT'); } catch { return; }
  let timer;
  await Promise.race([
    new Promise((resolvePromise) => child.exitCode !== null ? resolvePromise() : child.once('close', resolvePromise)),
    new Promise((resolvePromise) => { timer = setTimeout(resolvePromise, 5000); }),
  ]);
  clearTimeout(timer);
  try { process.kill(-child.pid, 0); process.kill(-child.pid, 'SIGKILL'); } catch { /* No server process remains. */ }
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
}

function saveFailure(errors, message) {
  errors.push(String(message));
}

async function waitSettled(stage) {
  await expect(stage).toHaveAttribute('data-settled', 'true', { timeout: 25_000 });
}

async function openLesson(page, baseUrl, lessonId) {
  await page.goto(`${baseUrl}/index.html#/lesson/${typeof lessonId === 'string' ? lessonId : lessonId.id}`);
  const cards = page.locator('.figure-card');
  await cards.first().waitFor({ state: 'visible', timeout: 25_000 });
  for (let index = 0; index < await cards.count(); index += 1) {
    const stage = cards.nth(index).locator(STAGE);
    await stage.scrollIntoViewIfNeeded();
    await stage.waitFor({ state: 'visible', timeout: 25_000 });
    await waitSettled(stage);
  }
  return cards;
}

async function capture(page, mode, state, viewport, theme, motion, evidence) {
  const file = `${safeName(mode)}-${viewport.width}-${theme}-${motion}-${safeName(state)}.png`;
  const path = join(RAW_OUT, mode, file);
  await mkdir(join(RAW_OUT, mode), { recursive: true });
  await page.screenshot({ path, animations: 'disabled' });
  evidence.screenshots.push({ state, mode, viewport: viewport.width, theme, motion, rawPath: path, sha256: await hashFile(path) });
}

async function captureHintDom(page, mode, label, evidence) {
  const snapshot = await page.evaluate(() => {
    const roots = [...document.querySelectorAll('.hint-stack, .figure-hint-card')];
    return roots.map((root) => ({
      selector: root.matches('.figure-hint-card') ? '.figure-hint-card' : '.hint-stack',
      text: root.textContent ?? '',
      html: root.outerHTML,
      nodes: [...root.querySelectorAll('*')].map((node) => ({
        tag: node.tagName.toLowerCase(),
        text: node.children.length ? '' : (node.textContent ?? ''),
        attributes: Object.fromEntries([...node.attributes].map(({ name, value }) => [name, value])),
        box: (() => { const { x, y, width, height } = node.getBoundingClientRect(); return { x, y, width, height }; })(),
      })),
    }));
  });
  const rootLocator = page.locator('.hint-stack, .figure-hint-card');
  for (let index = 0; index < snapshot.length; index += 1) {
    snapshot[index].ariaSnapshot = await rootLocator.nth(index).ariaSnapshot();
  }
  const serialized = JSON.stringify(snapshot);
  if (/data-(?:correct|answer|solution)|hiddenItems|expectedAnswer/i.test(serialized)) {
    throw new Error(`${label}: Antwortmetadaten im gerenderten Hinweis-DOM`);
  }
  const path = join(BASE_OUT, 'hints', `${safeName(mode)}-${safeName(label)}.json`);
  await mkdir(join(BASE_OUT, 'hints'), { recursive: true });
  await writeFile(path, JSON.stringify({ label, mode, snapshot }, null, 2) + '\n');
  evidence.hintSnapshots.push({ label, mode, path, sha256: await hashFile(path), roots: snapshot.length });
}

async function assertNoOverflow(page, label, errors) {
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (dimensions.scroll > dimensions.client + 1) saveFailure(errors, `${label}: horizontal overflow ${dimensions.scroll}/${dimensions.client}`);
}

async function checkPage(page, label, errors) {
  await assertNoOverflow(page, label, errors);
  const stage = page.locator(STAGE).first();
  if (await stage.count()) {
    const settled = await stage.getAttribute('data-settled');
    if (settled !== 'true') saveFailure(errors, `${label}: Figur nicht stabil`);
  }
}

async function checkSpatialKeyboard(page, stage, label, errors, states) {
  if (await stage.getAttribute('data-view-mode') !== 'spatial') return;
  const azimuth = Number(await stage.getAttribute('data-azimuth'));
  await stage.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await waitSettled(stage);
  const rotated = Number(await stage.getAttribute('data-azimuth'));
  if (!Number.isFinite(rotated) || Math.abs(Math.abs(rotated - azimuth) - 15) > 1) saveFailure(errors, `${label}: Tastatur-Drehung`);
  await page.keyboard.press('Home');
  await waitSettled(stage);
  const reset = Number(await stage.getAttribute('data-azimuth'));
  if (Math.abs(reset - azimuth) > 0.5) saveFailure(errors, `${label}: Home setzt die Ansicht nicht zurück`);
  states.push(`${label}: Tastatur-Drehung + Home`);
}

async function advanceLessonBeats(page, card, stage, label, mode, title, viewport, theme, motion, evidence, errors, states) {
  const beatLabel = await card.locator('.figure-step').getAttribute('aria-label');
  const beatCount = Number(beatLabel?.match(/von (\d+)/i)?.[1] ?? 1);
  for (let beat = 1; beat < beatCount; beat += 1) {
    const skip = card.getByRole('button', { name: 'Überspringen', exact: true });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    const next = card.getByRole('button', { name: 'Weiter', exact: true });
    if (!await next.isEnabled()) {
      saveFailure(errors, `${label}: Beat ${beat + 1} kann nicht erreicht werden`);
      break;
    }
    if (viewport.width <= 500) {
      const box = await next.boundingBox();
      if (box) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      else await next.click();
      states.push(`${label}: touchscreen.tap Weiter`);
    } else {
      await next.click();
      states.push(`${label}: click Weiter`);
    }
    await waitSettled(stage);
    await capture(page, `${label}-${title}-beat-${beat + 1}`, mode, viewport, theme, motion, evidence);
  }
}

async function restartLessonCard(card, stage, label, errors, states) {
  const restart = card.getByRole('button', { name: 'Von vorn', exact: true });
  if (!await restart.isEnabled().catch(() => false)) return;
  await restart.click();
  await waitSettled(stage);
  if (Number(await stage.getAttribute('data-beat')) !== 0) saveFailure(errors, `${label}: Von vorn kehrt nicht zum ersten Beat zurück`);
  states.push(`${label}: Beat-Neustart`);
}

async function runLessonCard(page, card, index, mode, label, viewport, theme, motion, evidence, errors, states) {
  const title = safeName((await card.locator('.figure-head strong').innerText()).trim());
  const stage = card.locator(STAGE);
  await stage.scrollIntoViewIfNeeded();
  await capture(page, `${label}-${title}-start`, mode, viewport, theme, motion, evidence);
  if (index === 0) await checkSpatialKeyboard(page, stage, label, errors, states);
  await advanceLessonBeats(page, card, stage, label, mode, title, viewport, theme, motion, evidence, errors, states);
  await restartLessonCard(card, stage, label, errors, states);
}

async function lessonFlow(page, baseUrl, lessonId, mode, label, viewport, theme, motion, evidence, errors, states) {
  const cards = await openLesson(page, baseUrl, lessonId);
  await checkPage(page, label, errors);
  const count = await cards.count();
  if (!count) throw new Error(`${label}: keine Figurenkarten gefunden`);
  for (let index = 0; index < count; index += 1) {
    await runLessonCard(page, cards.nth(index), index, mode, label, viewport, theme, motion, evidence, errors, states);
  }
}

async function exploreFlow(page, baseUrl, route, mode, label, viewport, theme, motion, evidence, errors, states) {
  await openLesson(page, baseUrl, route);
  const card = page.locator('.figure-card').filter({ hasText: 'MSE-Landschaft' }).first();
  const field = card.locator('input[name="parameter"]');
  await field.waitFor({ state: 'visible' });
  await field.fill('0.004');
  await card.getByRole('button', { name: 'Übernehmen' }).click();
  if (!await card.getByRole('alert').count()) saveFailure(errors, `${label}: ungültiger Explore-Wert ohne Fehlermeldung`);
  await capture(page, `${label}-explore-invalid`, mode, viewport, theme, motion, evidence);
  await field.fill('0.1');
  await card.getByRole('button', { name: 'Übernehmen' }).click();
  await card.locator('[aria-invalid="true"]').count().then((count) => { if (count) saveFailure(errors, `${label}: gültiger Explore-Wert bleibt ungültig`); });
  const key = await page.evaluate(() => Object.keys(sessionStorage).find((item) => item.startsWith('argmin:figure:') && item.includes('mse-landscape')));
  if (!key) saveFailure(errors, `${label}: Explore-Wert nicht in der Figure-Session gesichert`);
  await page.reload();
  await card.locator('input[name="parameter"]').waitFor({ state: 'visible' });
  const restored = await card.locator('input[name="parameter"]').inputValue();
  if (Math.abs(Number(restored) - 0.1) > 1e-8) saveFailure(errors, `${label}: Explore-Wert nach Reload nicht wiederhergestellt`);
  states.push(`${label}: ungültige Eingabe, gültige Eingabe und Reload`);
  await capture(page, `${label}-explore-restored`, mode, viewport, theme, motion, evidence);
  const stage = card.locator(STAGE);
  await stage.focus();
  await page.keyboard.press('ArrowRight');
  await waitSettled(stage);
  await page.keyboard.press('Shift+ArrowRight');
  await waitSettled(stage);
  await page.keyboard.press('Home');
  await waitSettled(stage);
  states.push(`${label}: Tastatur-Schritt, Kameradrehung und Zurücksetzen`);
}

async function compareFlow(page, baseUrl, route, mode, label, viewport, theme, motion, evidence, errors, states) {
  await openLesson(page, baseUrl, route);
  const card = page.locator('.figure-card').filter({ hasText: 'Ridge und Lasso' }).first();
  const stage = card.locator(STAGE);
  await card.getByRole('button', { name: /A: Ridge/ }).click();
  await stage.waitFor({ state: 'visible' });
  await waitSettled(stage);
  await stage.scrollIntoViewIfNeeded();
  const ridgeCamera = Number(await stage.getAttribute('data-azimuth'));
  await capture(page, `${label}-ridge`, mode, viewport, theme, motion, evidence);
  await card.getByRole('button', { name: /B: Lasso/ }).click();
  await waitSettled(stage);
  const lassoCamera = Number(await stage.getAttribute('data-azimuth'));
  if (Math.abs(ridgeCamera - lassoCamera) > 0.5) saveFailure(errors, `${label}: Ridge/Lasso-Kamera unterscheidet sich`);
  await capture(page, `${label}-lasso`, mode, viewport, theme, motion, evidence);
  states.push(`${label}: Ridge/Lasso-Kameravergleich`);
}

async function openTask(page, baseUrl, route, mode, label, viewport, theme, motion, evidence, errors) {
  const moduleQuery = route.module ? `?module=${encodeURIComponent(route.module)}` : '';
  const url = `${baseUrl}/index.html#/family/${route.familyId}/${route.caseId}/${route.seed ?? 0}/${route.difficulty ?? 'core'}${moduleQuery}`;
  await page.goto(url);
  await page.getByRole('heading', { name: /Variante wird geladen/ }).waitFor({ state: 'hidden', timeout: 25_000 }).catch(() => {});
  const stage = page.locator(STAGE).first();
  await stage.waitFor({ state: 'visible', timeout: 25_000 });
  await waitSettled(stage);
  await checkPage(page, label, errors);
  await stage.scrollIntoViewIfNeeded();
  await capture(page, `${label}-initial`, mode, viewport, theme, motion, evidence);
}

async function configureRateTask(page, label, errors, states) {
  const select = page.getByLabel('Lernrate η');
  await select.waitFor({ state: 'visible' });
  const candidates = await select.locator('option').evaluateAll((items) => items.map((item) => item.value).filter(Boolean));
  if (candidates.length < 2) saveFailure(errors, `${label}: weniger als zwei Lernraten`);
  if (candidates.length) {
    await select.selectOption(candidates.at(-1));
    await page.getByRole('button', { name: 'Von vorn', exact: true }).click();
    if (await select.inputValue() !== candidates[0]) saveFailure(errors, `${label}: Zurücksetzen stellt die Start-Lernrate nicht her`);
    states.push(`${label}: Antwortformular zurückgesetzt`);
  }
  return candidates;
}

async function chooseSelectFirstOption(select) {
  await select.focus();
  await select.press('ArrowDown');
  await select.press('Enter');
}

async function checkLegacyTraceScene(page, card, label, viewport, errors, states, evidence) {
  const stage = card.locator(STAGE);
  const selection = card.locator('.figure-selection [role="group"][aria-label="Auswahl"] button');
  const count = await selection.count();
  if (!count) {
    return 0;
  }
  for (let index = 0; index < count; index += 1) {
    await measureAndUseLegacyTarget(page, stage, selection.nth(index), label, viewport, errors, evidence);
  }
  const first = selection.first();
  await first.focus();
  await page.keyboard.press('Enter');
  if (await first.getAttribute('aria-pressed') !== 'true') saveFailure(errors, `${label}: Tastatur-Auswahl nicht wirksam`);
  states.push(`${label}: echte Szenenauswahl, SVG-Trefferflächen, Tastatur${viewport.width <= 500 ? ' und Touch' : ''}`);
  return count;
}

async function measureAndUseLegacyTarget(page, stage, button, label, viewport, errors, evidence) {
  const target = (await button.innerText()).trim();
  const buttonBox = await button.boundingBox();
  if (!buttonBox || buttonBox.height < 44 || buttonBox.width < 44) saveFailure(errors, `${label}: Auswahlziel „${target}“ kleiner als 44 px`);
  await button.click();
  const selected = stage.locator('[data-selected="true"]').first();
  if (!await selected.count()) {
    recordLegacyTargetBox({ target, label, itemId: null, prim: null, box: null, viewport, errors, evidence });
    return;
  }
  const box = await selected.boundingBox();
  const prim = await selected.getAttribute('data-prim').catch(() => null);
  const itemId = await selected.evaluate((node) => node.closest('[data-item]')?.getAttribute('data-item')).catch(() => null);
  recordLegacyTargetBox({ target, label, itemId, prim, box, viewport, errors, evidence });
  await clickLegacyTarget(page, button, target, box, label, viewport, errors);
}

function recordLegacyTargetBox({ target, label, itemId, prim, box, viewport, errors, evidence }) {
  if (!box || !prim) saveFailure(errors, `${label}: Auswahl „${target}“ verweist auf kein sichtbares SVG-Primitiv`);
  else if (box.width < 44 || box.height < 44) saveFailure(errors,
    `${label}: SVG-Trefferfläche ${prim} für „${target}“ ist ${box.width.toFixed(1)}×${box.height.toFixed(1)} px, unter 44 px`);
  evidence.traceTargetMeasurements.push({ label, target, itemId, prim,
    width: box?.width ?? 0, height: box?.height ?? 0, viewport: viewport.width });
}

async function clickLegacyTarget(page, button, target, box, label, viewport, errors) {
  if (!box) return;
  if (viewport.width <= 500) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  if (await button.getAttribute('aria-pressed') !== 'true') saveFailure(errors, `${label}: SVG-Trefferfläche „${target}“ wählt das Ziel nicht aus`);
}

async function checkLegacyTraceLessons(page, baseUrl, content, mode, variant, evidence, errors, states) {
  for (const lesson of content.traceLessons) {
    const cards = await openLesson(page, baseUrl, lesson.id);
    const card = cards.first();
    const stage = card.locator(STAGE).first();
    await stage.scrollIntoViewIfNeeded();
    const beatLabel = await card.locator('.figure-step').getAttribute('aria-label');
    const beatCount = Number(beatLabel?.match(/von (\d+)/i)?.[1] ?? 1);
    let targetsFound = 0;
    for (let beat = 0; beat < beatCount; beat += 1) {
      await waitSettled(stage);
      const label = `${mode}-${variant.viewport.width}-${variant.theme}-${variant.motion}-${lesson.label}-beat-${beat + 1}`;
      targetsFound += await checkLegacyTraceScene(page, card, label, variant.viewport, errors, states, evidence);
      await capture(page, `${lesson.label}-trace-selection-beat-${beat + 1}`, mode, variant.viewport, variant.theme, variant.motion, evidence);
      if (beat + 1 < beatCount) {
        await card.getByRole('button', { name: 'Weiter', exact: true }).click();
        await waitSettled(stage);
      }
    }
    if (!targetsFound) saveFailure(errors, `${mode}-${lesson.label}: über alle Szenenbeats fehlen Auswahlziele`);
  }
}

async function resetTraceTask(page, label, errors, states) {
  await page.getByRole('button', { name: 'Von vorn', exact: true }).click();
  if (await page.locator('.trace-tag-form select').count()) saveFailure(errors, `${label}: Zurücksetzen leert die Auswahl nicht`);
  const add = page.getByRole('button', { name: 'Bindung ergänzen' }).first();
  if (!await add.count()) {
    saveFailure(errors, `${label}: Bindung ergänzen fehlt nach dem Zurücksetzen`);
    return;
  }
  await add.click();
  const selects = page.locator('.trace-tag-form select');
  if (await selects.count() < 2) {
    saveFailure(errors, `${label}: Antwortfelder fehlen nach dem Zurücksetzen`);
    return;
  }
  await chooseSelectFirstOption(selects.first());
  await chooseSelectFirstOption(selects.nth(1));
  states.push(`${label}: Antwortformular zurückgesetzt und wieder befüllt`);
}

async function configureTraceTask(page, label, viewport, errors, states) {
  const add = page.getByRole('button', { name: 'Bindung ergänzen' });
  if (await add.count()) await add.first().click();
  const selectors = page.locator('.trace-tag-form select');
  if (await selectors.count() < 2) saveFailure(errors, `${label}: Name/Objekt-Auswahl fehlt`);
  const optionSets = await selectors.evaluateAll((items) => items.map((select) => ({
    label: select.labels?.[0]?.innerText.replace(/\s+/g, ' ').trim(),
    values: [...select.options].map((option) => option.value).filter(Boolean),
  })));
  validateTraceOptions(optionSets, label, errors);
  if (await selectors.count() < 2) return;
  await chooseSelectFirstOption(selectors.first());
  await chooseSelectFirstOption(selectors.nth(1));
  await checkTraceFormInteraction(page, selectors, label, viewport, errors);
  states.push(`${label}: getrennte Name-/Objekt-Auswahl mit Tastatur${viewport.width <= 500 ? ' und Touch' : ''}`);
  await resetTraceTask(page, label, errors, states);
}

async function checkTraceFormInteraction(page, selectors, label, viewport, errors) {
  for (let index = 0; index < Math.min(await selectors.count(), 2); index += 1) {
    const select = selectors.nth(index);
    const box = await select.boundingBox();
    if (!box || box.height < 44) saveFailure(errors, `${label}: Name/Objekt-Auswahl ist kleiner als 44 px`);
    await select.focus();
    await select.press('ArrowDown');
    await select.press('Enter');
    if (!await select.inputValue()) saveFailure(errors, `${label}: Tastatur-Auswahl blieb leer`);
    if (viewport.width <= 500 && box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      const values = await select.locator('option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
      if (values.length) await select.selectOption(values.at(-1));
      if (!await select.inputValue()) saveFailure(errors, `${label}: Touch-Auswahl blieb leer`);
    }
  }
}

function validateTraceOptions(optionSets, label, errors) {
  const names = optionSets.find((item) => item.label?.startsWith('Name'))?.values ?? [];
  const objects = optionSets.find((item) => item.label?.startsWith('Objekt'))?.values ?? [];
  if (!names.length || !objects.length) saveFailure(errors, `${label}: Auswahlziele nicht getrennt`);
  if (new Set(names).size !== names.length || new Set(objects).size !== objects.length
      || names.some((id) => objects.includes(id))) saveFailure(errors, `${label}: Aliase/Namen und Objekt-IDs sind nicht unabhängig auswählbar`);
}

async function showTaskHint(page, mode, label, taskKind, viewport, theme, motion, evidence, errors) {
  await page.getByRole('button', { name: 'Hinweis 1/', exact: false }).click();
  const hintText = (await page.locator('.hint-stack').innerText().catch(() => '')).trim();
  if (!hintText) saveFailure(errors, `${label}: Hint wurde nicht angezeigt`);
  if (await page.locator('[data-correct], [data-answer], [data-solution]').count()) saveFailure(errors, `${label}: Antwortmarker vor Abgabe sichtbar`);
  const figureHintButton = page.getByRole('button', { name: 'Hinweis als Figur' });
  if (await figureHintButton.isVisible().catch(() => false)) {
    await figureHintButton.click();
    await page.locator('.figure-hint-card').waitFor({ state: 'visible', timeout: 20_000 });
  }
  await captureHintDom(page, mode, label, evidence);
  await capture(page, `${label}-hint`, mode, viewport, theme, motion, evidence);
}

async function hintCaseFlow(page, baseUrl, route, mode, variant, evidence, errors, states) {
  const label = `${variant.viewport.width}-${variant.theme}-${variant.motion}-hint-${route.familyId}-${route.caseId}`;
  await openTask(page, baseUrl, route, mode, label, variant.viewport, variant.theme, variant.motion, evidence, errors);
  await showTaskHint(page, mode, label, 'family', variant.viewport, variant.theme, variant.motion, evidence, errors);
  states.push(`${label}: echter Registry-Fall und gerenderter Hinweis`);
}

async function checkRateAnswers(page, label, candidates, errors) {
  const accepted = [];
  for (const [index, candidate] of candidates.entries()) {
    if (index > 0) {
      await page.reload();
      await page.locator(STAGE).first().waitFor({ state: 'visible', timeout: 25_000 });
    }
    await page.getByLabel('Lernrate η').selectOption(candidate);
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await page.locator('.feedback-title').waitFor({ state: 'visible', timeout: 20_000 });
    if (await page.locator('.feedback-box.correct').count()) accepted.push(candidate);
  }
  if (accepted.length < 2) saveFailure(errors, `${label}: weniger als zwei Lernraten werden akzeptiert`);
}

async function showTaskFeedback(page, label, taskKind, candidates, errors, mode, viewport, theme, motion, evidence) {
  if (taskKind === 'rate') await checkRateAnswers(page, label, candidates, errors);
  else {
    const route = evidence.contentByMode[mode].traceRoute;
    const expected = await page.evaluate(async ({ familyId, caseId, seed, difficulty }) => {
      const { PROCEDURAL_FAMILY_SPECS } = await import('/assets/js/domain/procedural_registry.mjs');
      const family = PROCEDURAL_FAMILY_SPECS.find((item) => item.familyId === familyId);
      if (!family) throw new Error(`Public family registry entry missing: ${familyId}`);
      const instance = family.generate({ seed, caseId, difficulty });
      if (!instance?.expected) throw new Error(`Public family did not generate an authoritative answer: ${caseId}`);
      return instance.expected;
    }, route);
    const sections = page.locator('.trace-tag-state');
    if (await sections.count() !== expected.states.length) saveFailure(errors, `${label}: Antwortzustände weichen von der Registry ab`);
    for (const [index, state] of expected.states.entries()) {
      const section = sections.nth(index);
      if (await section.locator('h4').count() === 0) saveFailure(errors, `${label}: Zustand ${state.lineId} fehlt`);
      const add = section.getByRole('button', { name: 'Bindung ergänzen' });
      while (await section.locator('.trace-tag-row').count() < state.bindings.length) await add.click();
      const rows = section.locator('.trace-tag-row');
      for (const [bindingIndex, binding] of state.bindings.entries()) {
        const selects = rows.nth(bindingIndex).locator('select');
        await selects.nth(0).selectOption(binding.name);
        await selects.nth(1).selectOption(binding.objectId);
      }
    }
    const firstCorrect = expected.states[0]?.bindings[0];
    const firstObject = page.locator('.trace-tag-row select').nth(1);
    const alternatives = await firstObject.locator('option').evaluateAll((items) => items.map((item) => item.value).filter(Boolean));
    const wrongObject = alternatives.find((value) => value !== firstCorrect?.objectId);
    if (firstCorrect && wrongObject) {
      await firstObject.selectOption(wrongObject);
      await page.getByRole('button', { name: 'Antwort prüfen' }).click();
      await page.locator('.feedback-box.incorrect').waitFor({ state: 'visible', timeout: 20_000 });
      await capture(page, `${label}-incorrect-feedback`, mode, viewport, theme, motion, evidence);
      await firstObject.selectOption(firstCorrect.objectId);
    }
    await page.getByRole('button', { name: 'Antwort prüfen' }).click();
    await page.locator('.feedback-box.correct').waitFor({ state: 'visible', timeout: 20_000 });
  }
  await capture(page, `${label}-feedback`, mode, viewport, theme, motion, evidence);
}

async function returnFromTask(page, label, states) {
  await page.reload();
  await page.locator(STAGE).first().waitFor({ state: 'visible', timeout: 25_000 });
  await waitSettled(page.locator(STAGE).first());
  states.push(`${label}: Hinweis, Bewertung und Antwort-Rückkehr nach Reload`);
  const back = page.getByRole('link', { name: /Zurück zur Lektion|Zum Modul|Zum Lernen/ }).first();
  if (!await back.count()) return;
  await back.click();
  await page.waitForURL(/#\/(lesson|module)\//);
  states.push(`${label}: Rückkehr aus der Antwort`);
}

async function taskFlow(page, baseUrl, route, mode, label, viewport, theme, motion, evidence, errors, states, taskKind) {
  await openTask(page, baseUrl, route, mode, label, viewport, theme, motion, evidence, errors);
  let rateCandidates = [];
  if (taskKind === 'rate') rateCandidates = await configureRateTask(page, label, errors, states);
  else await configureTraceTask(page, label, viewport, errors, states);
  await showTaskHint(page, mode, label, taskKind, viewport, theme, motion, evidence, errors);
  await showTaskFeedback(page, label, taskKind, rateCandidates, errors, mode, viewport, theme, motion, evidence);
  await returnFromTask(page, label, states);
}

async function baselineSmoothieHintFlow(page, baseUrl, mode, label, viewport, theme, motion, evidence, errors, states) {
  await page.goto(`${baseUrl}/index.html#/family/classify-column-combination/column-coefficients-double/42/core`);
  await page.getByRole('button', { name: 'Hinweis als Figur' }).click();
  const card = page.locator('.figure-hint-card');
  await card.waitFor({ state: 'visible', timeout: 20_000 });
  const stage = card.locator(STAGE);
  await stage.waitFor({ state: 'visible', timeout: 20_000 });
  await waitSettled(stage);
  const itemIds = await stage.locator('[data-item]').evaluateAll((items) => items.map((item) => item.getAttribute('data-item')));
  for (const expected of ['mixer-liquid', 'oats-bin', 'berries-jar']) {
    if (!itemIds.includes(expected)) saveFailure(errors, `${label}: Smoothie-Hinweis enthält Szeneelement ${expected} nicht`);
  }
  await capture(page, `${label}-baseline-smoothie-hint`, mode, viewport, theme, motion, evidence);
  states.push(`${label}: Baseline-Smoothie-Familienhinweis rendert seine echte Szene`);
}

async function runVariant(browser, mode, baseUrl, variant, content, evidence) {
  const context = await browser.newContext({
    viewport: variant.viewport,
    colorScheme: variant.theme,
    reducedMotion: variant.motion,
    isMobile: variant.viewport.width <= 500,
    hasTouch: variant.viewport.width <= 500,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  const states = [];
  page.on('pageerror', (error) => saveFailure(errors, `pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') saveFailure(errors, `console: ${message.text()}`); });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(baseUrl)) saveFailure(errors, `request failed: ${request.url()} ${request.failure()?.errorText}`);
  });
  const suffix = `${mode}-${variant.viewport.width}-${variant.theme}-${variant.motion}`;
  try {
    await page.addInitScript((theme) => localStorage.setItem('ki-lernplattform:theme', theme), variant.theme);
    const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (reduced !== (variant.motion === 'reduce')) saveFailure(errors, `${suffix}: Bewegungspräferenz stimmt nicht`);
    await lessonFlow(page, baseUrl, content.pcaLesson.id, mode, `${suffix}-pca`, variant.viewport, variant.theme, variant.motion, evidence, errors, states);
    await lessonFlow(page, baseUrl, content.kmeansLesson.id, mode, `${suffix}-kmeans`, variant.viewport, variant.theme, variant.motion, evidence, errors, states);
    await exploreFlow(page, baseUrl, content.exploreLesson.id, mode, `${suffix}-explore`, variant.viewport, variant.theme, variant.motion, evidence, errors, states);
    await compareFlow(page, baseUrl, content.compareLesson.id, mode, `${suffix}-compare`, variant.viewport, variant.theme, variant.motion, evidence, errors, states);
    await taskFlow(page, baseUrl, content.rateRoute, mode, `${suffix}-f7`, variant.viewport, variant.theme, variant.motion, evidence, errors, states, 'rate');
    await taskFlow(page, baseUrl, content.traceRoute, mode, `${suffix}-f1`, variant.viewport, variant.theme, variant.motion, evidence, errors, states, 'trace');
    await checkLegacyTraceLessons(page, baseUrl, content, mode, variant, evidence, errors, states);
    for (const route of content.hintRoutes) await hintCaseFlow(page, baseUrl, route, mode, variant, evidence, errors, states);
    await baselineSmoothieHintFlow(page, baseUrl, mode, `${suffix}-baseline-smoothie`, variant.viewport, variant.theme, variant.motion, evidence, errors, states);
    await page.goto(`${baseUrl}/index.html#/family/${content.rateRoute.familyId}/missing-case/0/core`);
    await page.getByRole('alert').waitFor({ state: 'visible', timeout: 20_000 });
    await capture(page, `${suffix}-invalid-family`, mode, variant.viewport, variant.theme, variant.motion, evidence);
    states.push(`${suffix}: ungültige Familie geschlossen angezeigt`);
    evidence.variants.push({ mode, viewport: variant.viewport, theme: variant.theme, motion: variant.motion, states, errors });
    if (errors.length) throw new Error(errors.join('\n'));
  } finally {
    await context.close();
  }
}

async function writeContactSheet(mode, evidence, browser) {
  const shots = evidence.screenshots.filter((shot) => shot.mode === mode);
  const representative = (shot) => (shot.viewport === 1440 && shot.theme === 'light' && shot.motion === 'no-preference')
    || (shot.viewport === 375 && shot.theme === 'dark' && shot.motion === 'reduce');
  const mainStates = shots.filter((shot) => /pca/.test(shot.state)
    || (representative(shot) && /-(?:kmeans|explore|compare|f7|f1|baseline-smoothie|invalid-family)|trace-selection|hint-/.test(shot.state)));
  const body = mainStates.map((shot) => {
    const imagePath = relative(BASE_OUT, shot.rawPath).split(sep).join('/');
    return `<figure><img src="${imagePath}" alt="${shot.state}"><figcaption>${shot.state} · ${shot.viewport}px · ${shot.theme} · ${shot.motion}</figcaption></figure>`;
  }).join('\n');
  const htmlPath = join(BASE_OUT, `contact-${mode}.html`);
  const html = `<!doctype html><meta charset="utf-8"><title>${mode} UI-Abnahme</title><style>body{font:14px system-ui;margin:20px;background:#eee}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px}figure{margin:0;padding:10px;background:white;border:1px solid #bbb}img{width:100%;height:auto;object-fit:contain}figcaption{overflow-wrap:anywhere;padding-top:6px}</style><h1>${mode} UI-Abnahme</h1><main>${body}</main>`;
  await writeFile(htmlPath, html);
  if (browser && mainStates.length) {
    const page = await browser.newPage({ viewport: { width: 1560, height: 1100 }, deviceScaleFactor: 1 });
    try {
      await page.goto(pathToFileURL(htmlPath).href);
      const pngPath = join(BASE_OUT, `contact-${mode}.png`);
      await page.screenshot({ path: pngPath, fullPage: true });
      evidence.contactSheets.push({ mode, htmlPath, pngPath, sha256: await hashFile(pngPath), states: mainStates.map((shot) => shot.state) });
    } finally { await page.close(); }
  }
}

async function discoverModes(targetModes) {
  const contentByMode = {};
  for (const target of targetModes) {
    const contentRoot = target === 'source' ? join(ROOT, 'content') : join(ROOT, 'build-next/content');
    if (target === 'release' && !existsSync(contentRoot)) throw new Error('Release-Content fehlt. Der Runner baut nicht selbst.');
    contentByMode[target] = await discoverContent(contentRoot);
  }
  return contentByMode;
}

async function addSourceHashes(evidence, contentByMode) {
  const relevant = [
    'src/figures/FigureRuntime.tsx', 'src/figures/engine.ts', 'src/figures/painter.ts',
    'src/figures/FigureInputs.tsx', 'src/figures/FigureSelection.tsx', 'src/ui/FigureBlock.tsx',
    'src/ui/App.tsx', 'src/ui/LessonView.tsx', 'src/ui/ModuleView.tsx', 'src/ui/exercise-context.tsx',
    'src/ui/SceneBuildControls.tsx', 'src/ui/scene-build-state.ts', 'src/ui/FamilyExerciseView.tsx',
    'assets/js/core/figure_answer_graders.mjs', 'assets/js/core/scene_build_grader.mjs',
    'assets/js/core/python_trace_task.mjs', 'assets/js/core/procedural/pick-learning-rate.mjs',
    'assets/js/core/procedural/trace-tag-after-line.mjs', 'assets/js/figures/kit/hints.mjs',
    'assets/js/domain/procedural_registry.mjs', 'assets/js/figures/objects/python-traces-v1.json',
    'assets/js/figures/scenes/pca-shadow.mjs', 'assets/js/figures/scenes/kmeans-pizza.mjs',
    'assets/js/figures/scenes/python-trace-tag.mjs', 'content/lessons/data-ml/ml-svm-pca.json',
    'tools/compile_content.mjs', 'content/figure-hints.json',
    'content/families/trace-tag-after-line.json', 'content/families/pick-learning-rate.json',
  ];
  for (const [familyId] of HINT_CASES) relevant.push(`assets/js/core/procedural/${familyId}.mjs`);
  for (const scene of ['bouncer', 'ledger', 'name-tags', 'vending-frame', 'two-tags-one-list', 'smoke-detector']) {
    relevant.push(`assets/js/figures/scenes/${scene}.mjs`);
  }
  for (const path of relevant) evidence.sourceHashes[path] = await hashFile(join(ROOT, path));
  for (const item of Object.values(contentByMode)) {
    for (const path of item.sourcePaths) evidence.sourceHashes[relativeToRoot(path)] = await hashFile(path);
  }
}

async function addReleaseHashes(evidence) {
  for (const path of ['build-next/content/content-bundle.json', 'build-next/index.html']) {
    evidence.releaseHashes[path] = await hashFile(join(ROOT, path));
  }
  for (const path of await walkFiles(join(ROOT, 'build-next/assets'))) {
    if (path.endsWith('.js')) evidence.releaseHashes[relativeToRoot(path)] = await hashFile(path);
  }
}

async function createEvidence(targetModes) {
  const git = await gitEvidence();
  const contentByMode = await discoverModes(targetModes);
  await mkdir(BASE_OUT, { recursive: true });
  await mkdir('/tmp/figuren-completion', { recursive: true });
  const evidence = {
    timestamp: new Date().toISOString(),
    requestedModel: 'gpt-6-luna medium (runtime identity not independently verified)',
    budgetStatus: 'Size and latency targets remain open by explicit user waiver; this runner does not measure performance.',
    head: git.head, gitStatus: git.status, port: PORT, browser: null, contentByMode,
    sourceHashes: {}, releaseHashes: {}, screenshots: [], hintSnapshots: [], traceTargetMeasurements: [], contactSheets: [], variants: [],
  };
  await addSourceHashes(evidence, contentByMode);
  if (targetModes.includes('release')) {
    await addReleaseHashes(evidence);
  }
  return evidence;
}

async function runTarget(browser, target, evidence) {
  let server;
  try {
    server = await startServer(target, '/tmp/figuren-completion');
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        for (const motion of MOTIONS) {
          await runVariant(browser, target, server.baseUrl, { viewport, theme, motion }, evidence.contentByMode[target], evidence);
        }
      }
    }
  } finally {
    if (server) {
      await stopServer(server.child);
      await assertFreePort();
    }
  }
}

async function runAcceptance(targetModes, evidence) {
  let browser;
  let failure = null;
  try {
    browser = await chromium.launch({ headless: true });
    evidence.browser = { name: 'Chromium', version: browser.version() };
    for (const target of targetModes) await runTarget(browser, target, evidence);
  } catch (error) {
    failure = error;
    evidence.failure = error instanceof Error ? error.stack : String(error);
  } finally {
    for (const target of targetModes) {
      if (evidence.screenshots.some((shot) => shot.mode === target)) await writeContactSheet(target, evidence, browser);
    }
    if (browser) await browser.close();
    await writeEvidence(evidence);
  }
  return failure;
}

async function writeEvidence(evidence) {
  const summaryPath = join(BASE_OUT, 'evidence.json');
  await writeFile(summaryPath, JSON.stringify(evidence, null, 2) + '\n');
}

async function main() {
  requireGo();
  const mode = option('mode', 'both');
  if (!['source', 'release', 'both'].includes(mode)) throw new Error('--mode muss source, release oder both sein.');
  const targetModes = mode === 'both' ? ['source', 'release'] : [mode];
  const evidence = await createEvidence(targetModes);
  const failure = await runAcceptance(targetModes, evidence);
  if (failure) throw failure;
  console.log(JSON.stringify({ summaryPath: join(BASE_OUT, 'evidence.json'), screenshots: evidence.screenshots.length, variants: evidence.variants.length, head: evidence.head }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
