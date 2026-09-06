import test from 'node:test';
import { expectedPublicCounts } from './helpers/content_counts.mjs';
import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';
import { exportOpenCore, validateOpenCoreManifest } from '../tools/export_open_core.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function runInExport(cwd, args) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

function symlinks(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) out.push(path);
    else if (stat.isDirectory()) symlinks(path, out);
  }
  return out;
}

function sourceText(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = lstatSync(path);
    if (stat.isDirectory()) sourceText(path, out);
    else if (/\.(js|mjs|ts|tsx|json|md|txt|html|css|py)$/.test(path)) out.push(readFileSync(path, 'utf8'));
  }
  return out;
}

function filePaths(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '__pycache__') continue;
    const path = join(dir, name);
    const stat = lstatSync(path);
    if (stat.isDirectory()) filePaths(path, out);
    else out.push(path);
  }
  return out;
}

test('open-core export recompiles from filtered sources without private content', () => {
  const target = mkdtempSync(join(root, '.tmp-open-core-'));
  rmSync(target, { recursive: true, force: true });
  try {
    const result = exportOpenCore(root, target, { includeVendor: false });
    assert.ok(result.files > 50);
    const sourceTests = filePaths(join(root, 'tests'))
      .map((path) => relative(root, path).replaceAll('\\', '/'))
      .filter((path) => path !== 'tests/open_core_export.test.mjs')
      .sort();
    const exportedTests = filePaths(join(target, 'tests'))
      .map((path) => relative(target, path).replaceAll('\\', '/'))
      .filter((path) => path !== 'tests/open_core_content.test.mjs')
      .sort();
    assert.deepEqual(exportedTests, sourceTests);
    for (const path of [
      'assets/js/core/data_ml_generators.mjs',
      'assets/js/core/w18_w21_generators.mjs',
      'assets/js/core/w22_w26_generators.mjs',
      'assets/js/core/w27_w30_generators.mjs',
      'assets/js/core/w31_w39_generators.mjs',
      'tools/pyodide_contract_matrix.mjs',
      'docs/adr/0012-w06-w17-runtime.md',
      'docs/adr/0013-w18-w30-runtime-content-delivery.md',
      'docs/adr/0014-w31-w39-research-capstone.md',
    ]) assert.equal(existsSync(join(target, path)), true, path);
    assert.equal(existsSync(join(target, 'tests/index.js')), true);
    assert.equal(validateOpenCoreManifest(target).ok, true);
    assert.equal(existsSync(join(target, '.git')), false);
    assert.deepEqual(symlinks(target), []);
    const payloadText = ['content', 'src', 'assets', 'docs'].flatMap((path) => sourceText(join(target, path))).join('\n');
    assert.doesNotMatch(payloadText, /mml-book|murphy-pml|cs50p-psets-harvard|\bMML\b|\/Users\/no8/);
    const sources = JSON.parse(readFileSync(join(target, 'content/sources.json'), 'utf8'));
    assert.equal(sources.sources.every((source) => source.contentClass !== 'private'), true);
    const moduleProbe = `
      import { pathToFileURL } from 'node:url';
      const base = pathToFileURL(process.cwd() + '/');
      for (const path of [
        './assets/js/core/graders.js',
        './assets/js/core/legacy_exercise_adapter.mjs',
        './assets/js/runtime/pyodide_runner.js',
      ]) await import(new URL(path, base));
      const { createPublicLegacyContent } = await import(new URL('./tools/public_content.mjs', base));
      const marker = ['M', 'M', 'L'].join('') + ' §2.2';
      let rejected = false;
      try {
        createPublicLegacyContent({
          curriculum: {},
          sources: { sources: [] },
          exercisePacks: [{ exercises: [{ exerciseId: 'probe', prompt: marker, deterministicSeed: 1 }] }],
        });
      } catch { rejected = true; }
      if (!rejected) throw new Error('exported public marker gate is disabled');
    `;
    const child = runInExport(target, ['--input-type=module', '--eval', moduleProbe]);
    assert.equal(child.status, 0, child.stdout + child.stderr);
    const childTests = runInExport(target, ['--test', 'tests/generator_registry.test.mjs', 'tests/w31_w39_generators.test.mjs']);
    assert.equal(childTests.status, 0, childTests.stdout + childTests.stderr);
    const testCount = /(?:ℹ|#) tests (\d+)/.exec(childTests.stdout)?.[1];
    assert.ok(Number(testCount) > 0, childTests.stdout + childTests.stderr);
    const bundle = compileContent({ projectRoot: target, profile: 'public' });
    const expectedCounts = expectedPublicCounts(target);
    assert.equal(bundle.competencies.length, expectedCounts.competencies);
    assert.equal(bundle.lessons.length, expectedCounts.lessons);
    assert.equal(bundle.exerciseDefinitions.length, expectedCounts.exercises);
    assert.doesNotMatch(JSON.stringify(bundle), /library-private|private-extracts|\bMML\b|mml-book|murphy-pml/);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});
