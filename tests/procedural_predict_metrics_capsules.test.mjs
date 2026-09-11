// Procedural family fit-predict-metrics: capsule gates.
// Run: node --test tests/procedural_predict_metrics_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  PREDICT_METRICS_CASES,
  PREDICT_METRICS_CONTRACT,
  genPredictMetricsCase,
  generatePredictMetricsFamily,
  predictMetricsCaseOk,
  solvePredictMetricsFamily,
} from '../assets/js/core/procedural/fit-predict-metrics.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['baseline-experiment-report', 'linear-fit-lstsq', 'regression-report'];

const isIntList = (v) => Array.isArray(v) && v.length > 0 && v.every(Number.isInteger);
const inRange = (v, lo, hi) => v.every((x) => x >= lo && x <= hi);
const nonConstant = (v) => new Set(v).size >= 2;

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/fit-predict-metrics.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.ok(body, `${caseId}: anchor missing`);
    assert.ok(body.parameters.tests.includes('__check'), `${caseId}: base tests preserved`);
    assert.equal(body.expected.kind, 'reference-solver');
    assert.ok(body.expected.referenceSolver.length > 50, `${caseId}: reference solver preserved`);
  }
  // base test blocks and prompts must equal the module constants verbatim
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    const def = PREDICT_METRICS_CASES[caseId];
    assert.deepEqual(body.parameters.packages, ['numpy'], `${caseId}: packages`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy predictMetricsCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = PREDICT_METRICS_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genPredictMetricsCase(seed, def);
      assert.ok(predictMetricsCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.deepEqual(generated.parameters.packages, ['numpy']);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
      assert.equal(generated.fullSolution, def.fullSolution);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const baseline = genPredictMetricsCase(seed, PREDICT_METRICS_CASES['baseline-experiment-report']);
    for (const entry of baseline.parameters.seedCases) {
      assert.ok(entry.n >= 8 && entry.n <= 20, `baseline n: ${entry.n}`);
      assert.ok(isIntList(entry.X) && entry.X.length === entry.n && inRange(entry.X, -10, 20), 'baseline X');
      assert.ok(isIntList(entry.y) && entry.y.length === entry.n && inRange(entry.y, -15, 35), 'baseline y');
      assert.ok(nonConstant(entry.y), 'baseline y non-constant');
      assert.ok(Number.isInteger(entry.seed) && entry.seed >= 0 && entry.seed <= 99, `baseline seed: ${entry.seed}`);
    }
    const lstsq = genPredictMetricsCase(seed, PREDICT_METRICS_CASES['linear-fit-lstsq']);
    for (const entry of lstsq.parameters.seedCases) {
      assert.ok(entry.n >= 4 && entry.n <= 8, `lstsq n: ${entry.n}`);
      assert.ok(isIntList(entry.X) && entry.X.length === entry.n && inRange(entry.X, -6, 10), 'lstsq X');
      assert.ok(nonConstant(entry.X), 'lstsq X non-constant (rank)');
      assert.ok(isIntList(entry.y) && entry.y.length === entry.n && inRange(entry.y, -15, 35), 'lstsq y');
      assert.ok(isIntList(entry.yv) && isIntList(entry.yh), 'lstsq yv/yh ints');
      assert.ok(entry.yv.length === entry.yh.length && entry.yv.length >= 3 && entry.yv.length <= 6, 'lstsq yv/yh length');
      assert.ok(inRange(entry.yv, -15, 35) && inRange(entry.yh, -15, 35), 'lstsq yv/yh range');
      assert.ok(nonConstant(entry.yv), 'lstsq yv non-constant (ss_tot)');
    }
    const report = genPredictMetricsCase(seed, PREDICT_METRICS_CASES['regression-report']);
    for (const entry of report.parameters.seedCases) {
      assert.ok(isIntList(entry.X) && entry.X.length >= 4 && entry.X.length <= 8 && inRange(entry.X, -6, 10), 'report X');
      assert.ok(nonConstant(entry.X), 'report X non-constant (rank)');
      assert.ok(isIntList(entry.y) && entry.y.length === entry.X.length && inRange(entry.y, -15, 35), 'report y');
      assert.ok(nonConstant(entry.y), 'report y non-constant');
      assert.ok(isIntList(entry.Xt) && entry.Xt.length >= 2 && entry.Xt.length <= 3 && inRange(entry.Xt, -6, 12), 'report Xt');
      assert.ok(isIntList(entry.yt) && entry.yt.length === entry.Xt.length && inRange(entry.yt, -15, 35), 'report yt');
      assert.ok(nonConstant(entry.yt), 'report yt non-constant');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = PREDICT_METRICS_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generatePredictMetricsFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = PREDICT_METRICS_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genPredictMetricsCase(seed, def), genPredictMetricsCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = PREDICT_METRICS_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generatePredictMetricsFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solvePredictMetricsFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(PREDICT_METRICS_CONTRACT.familyId, 'fit-predict-metrics');
  assert.equal(PREDICT_METRICS_CONTRACT.authorityMode, 'seeded');
  assert.equal(PREDICT_METRICS_CONTRACT.taskArchetype, 'code-tests');
  assert.equal(PREDICT_METRICS_CONTRACT.activityType, 'python-code');
  assert.equal(PREDICT_METRICS_CONTRACT.graderId, 'pyodide');
  assert.equal(PREDICT_METRICS_CONTRACT.masteryEligible, true);
  assert.deepEqual(PREDICT_METRICS_CONTRACT.difficultyProfiles, ['core', 'stretch']);
  assert.deepEqual(PREDICT_METRICS_CONTRACT.competencyIds, ['c-ml-baseline']);
  assert.deepEqual(PREDICT_METRICS_CONTRACT.caseTypes, [
    { caseId: 'baseline-experiment-report', propertyTest: false },
    { caseId: 'linear-fit-lstsq', propertyTest: false },
    { caseId: 'regression-report', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generatePredictMetricsFamily);
  assert.equal(FAMILY_SPEC.solve, solvePredictMetricsFamily);
  assert.throws(() => generatePredictMetricsFamily({ seed: 0, caseId: 'linear-fit-lstsq', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generatePredictMetricsFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generatePredictMetricsFamily({ seed: 0.5, caseId: 'linear-fit-lstsq', difficulty: 'core' }), /Seed/);
  assert.throws(() => solvePredictMetricsFamily({}), /Kapselform/);
});
