// Procedural family fit-predict-metrics: capsule gates (python-code).
// Run: node --test tests/procedural_predict_metrics_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/fit-predict-metrics.mjs';
import {
  PREDICT_METRICS_CASES,
  PREDICT_METRICS_CONTRACT,
  genPredictMetricsCase,
} from '../assets/js/core/procedural/fit-predict-metrics.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const CASE_IDS = ['baseline-experiment-report', 'linear-fit-lstsq', 'regression-report'];

const isIntList = (v) => Array.isArray(v) && v.length > 0 && v.every(Number.isInteger);
const inRange = (v, lo, hi) => v.every((x) => x >= lo && x <= hi);
const nonConstant = (v) => new Set(v).size >= 2;

codeCapsuleSuite('fit-predict-metrics', mod, [
  { caseId: 'baseline-experiment-report', difficulty: 'stretch' },
  { caseId: 'linear-fit-lstsq', difficulty: 'core', competencyIds: ['c-ml-linear', 'c-numpy-basics'] },
  { caseId: 'regression-report', difficulty: 'stretch', competencyIds: ['c-ml-linear'] },
], { difficultyProfiles: ['core', 'stretch'] });

test('capsule extras: seeded block marker and packages stay emitted', () => {
  for (const caseId of CASE_IDS) {
    const def = PREDICT_METRICS_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genPredictMetricsCase(seed, caseId, def);
      assert.deepEqual(generated.parameters.packages, ['numpy']);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.fullSolution, def.fullSolution);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const baseline = genPredictMetricsCase(seed, 'baseline-experiment-report', PREDICT_METRICS_CASES['baseline-experiment-report']);
    for (const entry of baseline.parameters.seedCases) {
      assert.ok(entry.n >= 8 && entry.n <= 20, `baseline n: ${entry.n}`);
      assert.ok(isIntList(entry.X) && entry.X.length === entry.n && inRange(entry.X, -10, 20), 'baseline X');
      assert.ok(isIntList(entry.y) && entry.y.length === entry.n && inRange(entry.y, -15, 35), 'baseline y');
      assert.ok(nonConstant(entry.y), 'baseline y non-constant');
      assert.ok(Number.isInteger(entry.seed) && entry.seed >= 0 && entry.seed <= 99, `baseline seed: ${entry.seed}`);
    }
    const lstsq = genPredictMetricsCase(seed, 'linear-fit-lstsq', PREDICT_METRICS_CASES['linear-fit-lstsq']);
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
    const report = genPredictMetricsCase(seed, 'regression-report', PREDICT_METRICS_CASES['regression-report']);
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

test('family extras: contract archetype, competencies and case types', () => {
  assert.equal(PREDICT_METRICS_CONTRACT.taskArchetype, 'code-tests');
  assert.deepEqual(PREDICT_METRICS_CONTRACT.competencyIds, ['c-ml-baseline']);
  assert.deepEqual(PREDICT_METRICS_CONTRACT.caseTypes, [
    { caseId: 'baseline-experiment-report', propertyTest: false },
    { caseId: 'linear-fit-lstsq', propertyTest: false },
    { caseId: 'regression-report', propertyTest: false },
  ]);
});
