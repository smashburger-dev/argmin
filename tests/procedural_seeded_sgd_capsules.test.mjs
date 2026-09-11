// Procedural family fit-seeded-split-sgd-linear: capsule gates.
// Run: node --test tests/procedural_seeded_sgd_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  SEEDED_SGD_CASES,
  SEEDED_SGD_CONTRACT,
  genSeededSgdCase,
  generateSeededSgdFamily,
  seededSgdCaseOk,
  solveSeededSgdFamily,
} from '../assets/js/core/procedural/fit-seeded-split-sgd-linear.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['seeded-split-sgd-linear'];

// Declared draw banks (mirrored from the module header comment).
const SPLIT_FRACTIONS = [0.15, 0.2, 0.25, 0.3, 0.35];
const BAD_FRACTIONS = [0.0, 1.0, -0.2, 1.5];
const NOISE_LEVELS = [0.02, 0.05, 0.1];
const LEARNING_RATES = [0.02, 0.03, 0.05, 0.08];
const EPOCH_BANK = [200, 250, 300, 400];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/fit-seeded-split-sgd-linear.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 1);
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
    const def = SEEDED_SGD_CASES[caseId];
    assert.deepEqual(body.parameters.packages, ['numpy'], `${caseId}: packages`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy seededSgdCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = SEEDED_SGD_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genSeededSgdCase(seed, def);
      assert.ok(seededSgdCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.deepEqual(generated.parameters.packages, ['numpy']);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('__ref_train_linear_sgd'), `${caseId}:${seed}: ref copy embedded`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
      assert.equal(generated.fullSolution, def.fullSolution);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genSeededSgdCase(seed, SEEDED_SGD_CASES['seeded-split-sgd-linear']);
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

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = SEEDED_SGD_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateSeededSgdFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = SEEDED_SGD_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genSeededSgdCase(seed, def), genSeededSgdCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = SEEDED_SGD_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateSeededSgdFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveSeededSgdFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(SEEDED_SGD_CONTRACT.familyId, 'fit-seeded-split-sgd-linear');
  assert.equal(SEEDED_SGD_CONTRACT.authorityMode, 'seeded');
  assert.equal(SEEDED_SGD_CONTRACT.taskArchetype, 'code-tests');
  assert.equal(SEEDED_SGD_CONTRACT.activityType, 'python-code');
  assert.equal(SEEDED_SGD_CONTRACT.graderId, 'pyodide');
  assert.equal(SEEDED_SGD_CONTRACT.masteryEligible, true);
  assert.deepEqual(SEEDED_SGD_CONTRACT.difficultyProfiles, ['stretch']);
  assert.deepEqual(SEEDED_SGD_CONTRACT.competencyIds, ['c-dl-training', 'c-grad-regression']);
  assert.deepEqual(SEEDED_SGD_CONTRACT.caseTypes, [
    { caseId: 'seeded-split-sgd-linear', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateSeededSgdFamily);
  assert.equal(FAMILY_SPEC.solve, solveSeededSgdFamily);
  assert.throws(() => generateSeededSgdFamily({ seed: 0, caseId: 'seeded-split-sgd-linear', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateSeededSgdFamily({ seed: 0, caseId: 'nope', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateSeededSgdFamily({ seed: 0.5, caseId: 'seeded-split-sgd-linear', difficulty: 'stretch' }), /Seed/);
  assert.throws(() => solveSeededSgdFamily({}), /Kapselform/);
});
