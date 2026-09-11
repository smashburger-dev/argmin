// Procedural family fit-seeded-split-sgd-linear: capsule gates (python-code).
// Run: node --test tests/procedural_seeded_sgd_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/fit-seeded-split-sgd-linear.mjs';
import {
  SEEDED_SGD_CASES,
  SEEDED_SGD_CONTRACT,
  genSeededSgdCase,
} from '../assets/js/core/procedural/fit-seeded-split-sgd-linear.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const CASE_IDS = ['seeded-split-sgd-linear'];

// Declared draw banks (mirrored from the module header comment).
const SPLIT_FRACTIONS = [0.15, 0.2, 0.25, 0.3, 0.35];
const BAD_FRACTIONS = [0.0, 1.0, -0.2, 1.5];
const NOISE_LEVELS = [0.02, 0.05, 0.1];
const LEARNING_RATES = [0.02, 0.03, 0.05, 0.08];
const EPOCH_BANK = [200, 250, 300, 400];

codeCapsuleSuite('fit-seeded-split-sgd-linear', mod, [
  { caseId: 'seeded-split-sgd-linear', difficulty: 'stretch' },
], { difficultyProfiles: ['stretch'] });

test('capsule extras: seeded block marker, ref copy and packages stay emitted', () => {
  const def = SEEDED_SGD_CASES['seeded-split-sgd-linear'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genSeededSgdCase(seed, 'seeded-split-sgd-linear', def);
    assert.deepEqual(generated.parameters.packages, ['numpy']);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(generated.parameters.tests.includes('__ref_train_linear_sgd'), `${seed}: ref copy embedded`);
    assert.equal(generated.fullSolution, def.fullSolution);
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genSeededSgdCase(seed, 'seeded-split-sgd-linear', SEEDED_SGD_CASES['seeded-split-sgd-linear']);
    for (const entry of generated.parameters.seedCases) {
      const { split, run } = entry;
      assert.ok(split.n >= 20 && split.n <= 60, `split n: ${split.n}`);
      assert.ok(SPLIT_FRACTIONS.includes(split.f), `split f: ${split.f}`);
      assert.ok(BAD_FRACTIONS.includes(split.badF), `split badF: ${split.badF}`);
      assert.ok(Number.isInteger(split.seed) && split.seed >= 0 && split.seed <= 99, `split seed: ${split.seed}`);
      const k = Math.round(split.n * split.f);
      assert.ok(k >= 1 && k <= split.n - 1, `split k inside 1..n-1: ${k}`);
      const badK = Math.round(split.n * split.badF);
      assert.ok(badK < 1 || badK > split.n - 1, `badF violates the k guard: ${badK}`);
      assert.ok(Number.isInteger(run.dataSeed) && run.dataSeed >= 0 && run.dataSeed <= 9999, `dataSeed: ${run.dataSeed}`);
      assert.ok(run.n >= 60 && run.n <= 120, `run n: ${run.n}`);
      assert.ok(run.d === 2 || run.d === 3, `run d: ${run.d}`);
      assert.equal(run.wTrue.length, run.d, 'wTrue length matches d');
      for (const w of run.wTrue) {
        assert.ok(Math.abs(w) >= 0.4 && Math.abs(w) <= 1.5, `wTrue magnitude: ${w}`);
      }
      assert.ok(NOISE_LEVELS.includes(run.noise), `noise: ${run.noise}`);
      assert.ok(LEARNING_RATES.includes(run.lr), `lr: ${run.lr}`);
      assert.ok(EPOCH_BANK.includes(run.epochs), `epochs: ${run.epochs}`);
      assert.ok(Number.isInteger(run.seed) && run.seed >= 0 && run.seed <= 99, `run seed: ${run.seed}`);
    }
  }
});

test('family extras: contract archetype, competencies and case types', () => {
  assert.equal(SEEDED_SGD_CONTRACT.taskArchetype, 'code-tests');
  assert.deepEqual(SEEDED_SGD_CONTRACT.competencyIds, ['c-dl-training', 'c-grad-regression']);
  assert.deepEqual(SEEDED_SGD_CONTRACT.caseTypes, [
    { caseId: 'seeded-split-sgd-linear', propertyTest: false },
  ]);
});
