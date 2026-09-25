// Procedural case separate-error-kinds (aggregate-validate-and-count-records):
// capsule gates for the seeded fixture draw that replaced the nine authored
// variants. Run: node --test tests/procedural_separate_error_kinds_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateValidateCountFamily, solveValidateCount, VALIDATE_COUNT_CONTRACT } from '../assets/js/core/foundations_construct_families.mjs';
import './helpers/register_static_cases.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/aggregate-validate-and-count-records.json'), 'utf8'));
const CASE_ID = 'separate-error-kinds';
const body = doc.cases.find((entry) => entry.caseId === CASE_ID);
const RETRIEVAL = ['ok', 'leer'];
const ANTWORT = ['ok', 'kein_treffer', 'blockiert'];
const ARMS = ['empty', 'all-clean', 'retrieval-only', 'answer-only', 'all-kinds', 'mixed'];
const categoryOf = (entry) => (
  entry.retrieval === 'leer' ? 'retrieval_fehler' : entry.antwort === 'ok' ? 'sauber' : 'antwort_fehler'
);

const gen = (seed, difficulty = 'stretch') => generateValidateCountFamily({ seed, caseId: CASE_ID, difficulty });

test('anchor: authored body stays byte-identical, variants removed', () => {
  assert.equal(doc.contract, null);
  assert.deepEqual(doc.cases.map((entry) => entry.caseId), [CASE_ID]);
  assert.equal(body.variants, undefined, 'variants entfernt');
  assert.equal(body.difficultyProfile, 'stretch');
  assert.equal(body.activityType, 'python-code');
  assert.equal(body.graderId, 'pyodide');
  assert.equal(body.expected.kind, 'reference-solver');
  assert.ok(body.parameters.tests.includes('__check'), 'base tests erhalten');
  assert.ok(!body.parameters.tests.includes('__want'), 'keine toten Orakel mehr');
  assert.ok(body.parameters.starterCode.includes('def trenne_fehler'), 'starter authored');
  assert.ok(body.expected.referenceSolver.includes('def trenne_fehler'), 'referenz authored');
  const spec = VALIDATE_COUNT_CONTRACT.caseTypes.find((entry) => entry.caseId === CASE_ID);
  assert.equal(spec.propertyTest, false, 'propertyTest bleibt false (nur curated placement)');
});

test('integer guard: non-integer seeds fail closed', () => {
  for (const bad of [0.5, Number.NaN, 'x', undefined, Infinity]) {
    assert.throws(() => gen(bad), /ganze Zahl/, `seed ${String(bad)}`);
  }
});

test('determinism: same seed reproduces identical instance, negative seeds valid', () => {
  for (let seed = -10; seed < 20; seed += 1) {
    assert.deepEqual(gen(seed), gen(seed), `seed ${seed}`);
    assert.deepEqual(gen(seed, 'core'), gen(seed, 'core'), `seed ${seed} core`);
  }
});

test('generated tests: base block verbatim prefix + __ref oracle + seeded checks', () => {
  for (let seed = 0; seed < 60; seed += 1) {
    const g = gen(seed);
    const p = g.parameters;
    assert.ok(p.tests.startsWith(body.parameters.tests), `seed ${seed}: base tests verbatim`);
    assert.ok(p.tests.includes('# seeded extra cases'), `seed ${seed}: seeded marker`);
    assert.ok(p.tests.includes('def __ref_trenne_fehler('), `seed ${seed}: __ref_ oracle vorhanden`);
    assert.ok(p.tests.includes('== __ref_trenne_fehler('), `seed ${seed}: oracle check`);
    assert.ok(!p.tests.includes('__want'), `seed ${seed}: kein totes Orakel`);
    assert.equal(p.starterCode, body.parameters.starterCode, `seed ${seed}: starter verbatim`);
    assert.deepEqual(p.packages, body.parameters.packages, `seed ${seed}: packages verbatim`);
    assert.deepEqual(g.expected, body.expected, `seed ${seed}: expected verbatim`);
    assert.equal(p.caseId, CASE_ID);
    assert.equal(g.activityType, 'python-code');
    assert.equal(g.graderId, 'pyodide');
    assert.equal(g.masteryEligible, true);
    assert.deepEqual(g.competencyIds, ['c-capstone-pipeline', 'c-genai-security']);
    assert.ok(g.prompt.startsWith(body.prompt), `seed ${seed}: prompt-Praefix authored`);
    assert.ok(g.prompt.includes('Gezogene Liste:'), `seed ${seed}: draw-note im prompt`);
    assert.ok(ARMS.includes(p.seedArm), `seed ${seed}: bekannte Arm-ID ${p.seedArm}`);
    for (const entry of p.seedFixtures) {
      assert.ok(RETRIEVAL.includes(entry.retrieval) && ANTWORT.includes(entry.antwort), `seed ${seed}: Domänen-Record ${JSON.stringify(entry)}`);
    }
  }
});

test('draw arms: edge arms covered over 200 seeds', () => {
  const seen = new Set();
  for (let seed = 0; seed < 200; seed += 1) seen.add(gen(seed).parameters.seedArm);
  for (const arm of ARMS) assert.ok(seen.has(arm), `Arm ${arm} nicht gezogen`);
  const empties = [];
  const allClean = [];
  for (let seed = 0; seed < 200; seed += 1) {
    const fixtures = gen(seed).parameters.seedFixtures;
    if (fixtures.length === 0) empties.push(seed);
    if (fixtures.length >= 2 && fixtures.every((entry) => categoryOf(entry) === 'sauber')) allClean.push(seed);
  }
  assert.ok(empties.length > 0, 'leere Liste kommt vor');
  assert.ok(allClean.length > 0, 'alle sauber kommt vor');
});

test('distinct floor: at least 40 distinct fixtures over 200 seeds', () => {
  const seen = new Set();
  for (let seed = 0; seed < 200; seed += 1) seen.add(JSON.stringify(gen(seed).parameters.seedFixtures));
  assert.ok(seen.size >= 40, `nur ${seen.size} distinct`);
});

test('capsule shape: seedFixtures rebuild the emitted test block; solve yields referenceCode', () => {
  for (let seed = 0; seed < 60; seed += 1) {
    const g = gen(seed);
    const solved = solveValidateCount(g.parameters);
    assert.equal(solved.referenceCode, body.expected.referenceSolver, `seed ${seed}: solver`);
    const tampered = JSON.parse(JSON.stringify(g.parameters));
    tampered.tests = `${tampered.tests}\n# tampered`;
    assert.throws(() => solveValidateCount(tampered), /Unbekannter Fall/, `seed ${seed}: tamper fail-closed`);
    const forged = JSON.parse(JSON.stringify(g.parameters));
    forged.seedFixtures = [{ retrieval: 'ok', antwort: 'ok' }];
    assert.throws(() => solveValidateCount(forged), /Unbekannter Fall/, `seed ${seed}: fixture mismatch fail-closed`);
  }
});

const PYTHON_HARNESS = `
import json, sys
payload = json.load(sys.stdin)
report = []
def __check(label, cond, detail=''):
    report.append({'label': label, 'passed': bool(cond)})
for b in payload['bundles']:
    report.clear()
    ns = {'__check': __check}
    error = None
    try:
        exec(b['ref'], ns)
        exec(b['tests'], ns)
    except Exception as e:
        error = '%s: %s' % (type(e).__name__, e)
    print(json.dumps({'seed': b['seed'], 'arm': b['arm'], 'error': error, 'checks': list(report)}))
    report.clear()
`;

test('python authority: reference passes every seeded bundle across arms', () => {
  const bundles = [];
  const wanted = new Set(ARMS);
  for (let seed = 0; seed < 400 && wanted.size; seed += 1) {
    const g = gen(seed);
    if (!wanted.has(g.parameters.seedArm)) continue;
    wanted.delete(g.parameters.seedArm);
    bundles.push({ seed, arm: g.parameters.seedArm, ref: body.expected.referenceSolver, tests: g.parameters.tests });
  }
  assert.deepEqual([...wanted], [], `Arme ohne Python-Lauf: ${[...wanted].join(', ')}`);
  let out = '';
  try {
    out = execFileSync('python3', ['-c', PYTHON_HARNESS], {
      input: JSON.stringify({ bundles }),
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    assert.fail('python3 fehlt: Code-Familie braucht die ausführbare Autorität.');
  }
  for (const line of out.trim().split('\n')) {
    const report = JSON.parse(line);
    assert.equal(report.error, null, `seed ${report.seed} (${report.arm}): Bündel läuft fehlerfrei`);
    const failed = report.checks.filter((check) => !check.passed);
    assert.deepEqual(failed, [], `seed ${report.seed} (${report.arm}): alle ${report.checks.length} Prüfungen bestehen`);
  }
});
