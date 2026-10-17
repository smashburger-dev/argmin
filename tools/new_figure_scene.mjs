#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KINDS = ['beats', 'explore', 'compare', 'static', 'inline', 'hint', 'task'];

export function scaffoldFigure(id, { world, kind, root = ROOT }) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id ?? '')) throw new Error('ID muss ein slug sein');
  if (!world || !KINDS.includes(kind)) throw new Error('--world und --kind erforderlich');
  const files = figureFiles(id, world, kind);
  for (const path of Object.keys(files)) if (existsSync(resolve(root, path))) throw new Error(`Datei existiert: ${path}`);
  const registries = registryFiles(root, id);
  for (const [path, source] of Object.entries(files)) {
    mkdirSync(dirname(resolve(root, path)), { recursive: true });
    writeFileSync(resolve(root, path), source, { flag: 'wx' });
  }
  for (const [path, source] of Object.entries(registries)) writeFileSync(resolve(root, path), source);
  return Object.keys(files);
}

function figureFiles(id, world, kind) {
  const still = ['static', 'inline'].includes(kind);
  const ids = still ? ['overview'] : ['overview', 'reading', 'limits'];
  const spec = {
    schemaVersion: 1, kind, engine: 'argmin-figure', scene: id,
    title: world, caption: 'Ein Modell zum Weiterbauen.', hint: 'Ansicht und Schritte lassen sich mit der Tastatur bedienen.',
    params: { value: 2 }, beats: ids.map((id) => ({ id, caption: caption(id) })),
    ...(['beats', 'task'].includes(kind) ? { predict: { beat: 'reading', prompt: 'Welcher Wert steht im Modell?', input: 'numeric', expected: 2 } } : {}),
    ...(kind === 'explore' ? { explore: { parameter: 'value', min: 0, max: 10, step: 1, input: 'number' } } : {}),
    ...(kind === 'compare' ? { compare: { a: { value: 2 }, b: { value: 3 } } } : {}),
  };
  return {
    [`assets/js/figures/scenes/${id}.mjs`]: sceneSource(id, world, ids),
    [`content/figures/${id}.fig.json`]: JSON.stringify(spec, null, 2) + '\n',
    [`tests/figures_${id.replaceAll('-', '_')}.test.mjs`]: nodeSource(id, ids),
    [`tests/e2e/figures-${id}.spec.ts`]: browserSource(id),
  };
}

function caption(id) {
  return { overview: 'Lies den Wert am Gegenstand ab.', reading: 'Vergleiche den Wert mit deiner Vorhersage.', limits: 'Wo der Vergleich hinkt: Das Modell zeigt nur einen Ausschnitt.' }[id];
}

function sceneSource(id, world, ids) {
  return `// Welt: ${JSON.stringify(world)}. Replace this reference model with the lesson mechanism.
export const id = ${JSON.stringify(id)};
export const beatIds = ${JSON.stringify(ids)};
export const hintBeatIds = beatIds;
export const validateParams = (p) => { if (!Number.isFinite(p?.value)) throw new Error('value must be finite'); };
export const model = (p) => { validateParams(p); return { value: p.value }; };
export const beatDuration = () => 1;
export const pose = (_m, beat, t, mode = 'lesson') => ({ beat, t, mode, camera: 'overview', state: {} });
const items = new WeakMap();
export function build(m, _p, mode = 'lesson') {
  let cached = items.get(m);
  if (!cached) { cached = {}; items.set(m, cached); }
  return cached[mode] ??= [{ kind: 'plane', id: 'reading-surface', origin: [-10, 0, 8], ex: [1, 0, 0], ey: [0, 0, -1], normal: [0, -1, 0], size: [20, 16], tone: 'board', prims: [{ t: 'text', key: 'value', x: 10, y: 8, size: 2, tone: 'lit', runs: [{ text: mode === 'hint' ? '?' : String(m.value) }] }] }];
}
export const cameraFor = (_m, _p, vp) => ({ azimuth: 0, elevation: 0, zoom: Math.min(vp.width / 22, vp.height / 18), target: [0, 0, 0] });
export const ground = () => null;
export const readout = (m, _p, mode) => mode === 'hint' ? 'Wert gesucht' : String(m.value);
export const describe = (_m, beat) => ${JSON.stringify(ids.map(caption))}[beat];
export const answerValues = (m) => [m.value];
export const predictValue = (m) => m.value;
export const displayNumbers = (m) => [m.value];
export const hintParams = (_familyId, parameters) => Number.isFinite(parameters?.value) ? { value: parameters.value } : null;
`;
}

function nodeSource(id, ids) {
  return `import test from 'node:test';
import assert from 'node:assert/strict';
import * as scene from '../assets/js/figures/scenes/${id}.mjs';
import { paintOrderErrors } from '../assets/js/figures/kit/depth.mjs';
test('${id}: reference value, stable topology, depth and text size', () => {
  const m = scene.model({ value: 2 });
  assert.equal(scene.predictValue(m), 2);
  const signatures = new Set();
  for (let beat = 0; beat < ${ids.length}; beat += 1) {
    const p = scene.pose(m, beat, 1);
    const items = scene.build(m, p);
    signatures.add(items.map((item) => item.id).join('|'));
    const vp = { width: 343, height: 343 };
    const cam = scene.cameraFor(m, p, vp);
    assert.deepEqual(paintOrderErrors(items, cam, vp), []);
    assert.ok(items[0].prims[0].size * cam.zoom >= 14);
  }
  assert.equal(signatures.size, 1);
});
`;
}

function browserSource(id) {
  return `import { expect, test } from '@playwright/test';
test('${id}: browser module and reading surface', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'Connect the figure to its lesson before release acceptance.');
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const load = new Function('url', 'return import(url)');
    const scene = await load('/assets/js/figures/scenes/${id}.mjs');
    const m = scene.model({ value: 2 });
    const p = scene.pose(m, 0, 1);
    const items = scene.build(m, p);
    return { text: scene.describe(m, 0), prims: items.flatMap((item: any) => item.prims ?? []).length };
  });
  expect(result.text.length).toBeGreaterThan(0);
  expect(result.prims).toBeGreaterThan(0);
});
`;
}

function registryFiles(root, id) {
  const purePath = 'assets/js/figures/scenes/index.mjs';
  const uiPath = 'src/figures/registry.ts';
  const pure = readFileSync(resolve(root, purePath), 'utf8');
  const ui = readFileSync(resolve(root, uiPath), 'utf8');
  if (pure.includes(`'./${id}.mjs'`) || ui.includes(`'${id}':`)) throw new Error('Szene bereits registriert');
  const name = 'scene_' + id.replaceAll('-', '_');
  const imports = [...pure.matchAll(/^import \* as (\w+) from '([^']+)';$/gm)].map((m) => ({ name: m[1], path: m[2] }));
  imports.push({ name, path: `./${id}.mjs` });
  imports.sort((a, b) => a.path.localeCompare(b.path));
  const pureSource = pure.slice(0, pure.indexOf('import *')) + imports.map((e) => `import * as ${e.name} from '${e.path}';`).join('\n')
    + '\n\nexport const scenes = {\n' + imports.map((e) => `  [${e.name}.id]: ${e.name},`).join('\n') + '\n};\n';
  const uiLines = ui.split('\n');
  const line = `  '${id}': () => import('../../assets/js/figures/scenes/${id}.mjs'),`;
  const insertion = uiLines.findIndex((s) => /^ {2}'/.test(s) && s.localeCompare(line) > 0);
  const end = uiLines.findIndex((s) => s === '};');
  if (end < 0) throw new Error('Unbekanntes Registry-Format');
  uiLines.splice(insertion >= 0 ? insertion : end, 0, line);
  return { [purePath]: pureSource, [uiPath]: uiLines.join('\n') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const [id, ...args] = process.argv.slice(2);
    const option = (name) => args[args.indexOf(name) + 1];
    const files = scaffoldFigure(id, { world: option('--world'), kind: option('--kind') });
    console.log(files.join('\n'));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
