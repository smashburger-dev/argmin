// Keeps committed derived artifacts in step with content and family sources.
//
// Two kinds of artifacts live in the repo:
// - Mechanical: fully determined by the sources (coverage matrix, LLM
//   benchmark pin). A stale copy is a forgotten regeneration, never a bug,
//   so this tool rewrites them.
// - Behavior pins: the family golden corpus exists to catch unintended
//   behavior changes. A stale copy can be an intended change or a real
//   regression, so this tool only reports it and writes it on explicit
//   --accept-golden.
//
// Usage:
//   node tools/sync_derived.mjs                  rewrite mechanical artifacts, report golden drift
//   node tools/sync_derived.mjs --check          change nothing, exit 1 on any drift
//   node tools/sync_derived.mjs --accept-golden  also rewrite the golden corpus
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PIN_FILE, buildFixture, fixturePin } from './build_llm_benchmark.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN_TEST = 'tests/family_golden_corpus.test.mjs';

const runNode = (args) => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });

function syncCoverage(check) {
  const result = runNode(['tools/build_coverage_matrix.mjs', '--check']);
  if (result.status === 0) return { name: 'Coverage-Matrix', state: 'aktuell' };
  if (check) return { name: 'Coverage-Matrix', state: 'veraltet', fix: 'npm run sync:derived' };
  const write = runNode(['tools/build_coverage_matrix.mjs']);
  if (write.status !== 0) throw new Error(`Coverage-Matrix nicht baubar:\n${write.stderr}`);
  return { name: 'Coverage-Matrix', state: 'neu geschrieben' };
}

async function syncBenchmarkPin(check) {
  const path = join(root, 'tests/fixtures', PIN_FILE);
  const expected = `${JSON.stringify(fixturePin(await buildFixture(root)), null, 2)}\n`;
  if (readFileSync(path, 'utf8') === expected) return { name: 'Benchmark-Pin', state: 'aktuell' };
  if (check) return { name: 'Benchmark-Pin', state: 'veraltet', fix: 'npm run sync:derived' };
  writeFileSync(path, expected);
  return { name: 'Benchmark-Pin', state: 'neu geschrieben' };
}

function changedGoldenFamilies() {
  const result = runNode(['--test', GOLDEN_TEST]);
  if (result.status === 0) return [];
  const match = /families with changed golden digest: ([^\n'"]+)/.exec(result.stdout);
  if (!match) throw new Error(`Golden-Korpus-Test scheitert aus anderem Grund:\n${result.stdout}`);
  return match[1].split(',').map((familyId) => familyId.trim()).filter(Boolean);
}

// Hint only: a family whose own JSON changed on this branch probably changed
// on purpose; one whose JSON did not change points at shared code.
function changedFamilySources() {
  try {
    const base = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { cwd: root, encoding: 'utf8' }).trim();
    const diff = execFileSync('git', ['diff', '--name-only', base, '--', 'content/families'], { cwd: root, encoding: 'utf8' });
    return new Set(diff.split('\n').filter(Boolean));
  } catch {
    return null;
  }
}

function describeFamily(familyId, sources) {
  if (!sources) return `  ${familyId}`;
  const touched = sources.has(`content/families/${familyId}.json`);
  return touched
    ? `  ${familyId}: Familien-JSON auf diesem Branch geändert, Änderung vermutlich gewollt`
    : `  ${familyId}: Familien-JSON unverändert, Verhalten kam aus geteiltem Code, genau prüfen`;
}

function syncGolden(accept) {
  const changed = changedGoldenFamilies();
  if (changed.length === 0) return { name: 'Golden-Korpus', state: 'aktuell' };
  if (!accept) {
    const sources = changedFamilySources();
    return {
      name: 'Golden-Korpus',
      state: 'Verhalten geändert, Entscheidung nötig',
      detail: changed.map((familyId) => describeFamily(familyId, sources)).join('\n'),
      fix: 'gewollt: npm run sync:derived -- --accept-golden, sonst den Code korrigieren',
    };
  }
  const write = runNode([GOLDEN_TEST, '--write-family-golden']);
  if (write.status !== 0) throw new Error(`Golden-Korpus nicht schreibbar:\n${write.stdout}`);
  return { name: 'Golden-Korpus', state: `neu geschrieben (${changed.join(', ')})` };
}

function report(results) {
  for (const { name, state, detail, fix } of results) {
    console.log(`${name}: ${state}`);
    if (detail) console.log(detail);
    if (fix) console.log(`  -> ${fix}`);
  }
}

async function main() {
  const check = process.argv.includes('--check');
  const accept = process.argv.includes('--accept-golden') && !check;
  const results = [syncCoverage(check), await syncBenchmarkPin(check), syncGolden(accept)];
  report(results);
  const blocking = results.filter(({ state }) => state === 'veraltet' || state.startsWith('Verhalten'));
  if (blocking.length > 0) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
