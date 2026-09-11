// Procedural family optimize-backprop-gradient-check: capsule gates.
// Run: node --test tests/procedural_backprop_gradient_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BACKPROP_CASES,
  BACKPROP_CONTRACT,
  FAMILY_SPEC,
  backpropCaseOk,
  genBackpropCase,
  generateBackpropFamily,
  solveBackpropFamily,
} from '../assets/js/core/procedural/optimize-backprop-gradient-check.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['linear-mse-gradients', 'mlp-backprop-relu-mse'];

// JS mirror of the forward pre-activation used by the draw guard (kink-free
// ReLU domain). Only used for assertions — the emitted test block recomputes
// everything in Python.
const matVec = (X, W, b) => X.map((row) => (
  W[0].map((_, j) => row.reduce((sum, x, a) => sum + x * W[a][j], b[j]))
));

const intMat = (m, lo, hi) => m.every((row) => row.every((v) => Number.isInteger(v) && v >= lo && v <= hi));
const halfMat = (m, lo, hi) => m.every((row) => row.every((v) => v * 2 === Math.round(v * 2) && v >= lo && v <= hi));

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-backprop-gradient-check.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, CASE_IDS.length);
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
    const def = BACKPROP_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy backpropCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = BACKPROP_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genBackpropCase(seed, def, caseId);
      assert.ok(backpropCaseOk(generated.parameters, def, caseId), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded linear draws stay inside the declared domains', () => {
  const def = BACKPROP_CASES['linear-mse-gradients'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genBackpropCase(seed, def, 'linear-mse-gradients');
    for (const entry of generated.parameters.seedCases) {
      const n = entry.X.length;
      const d = entry.X[0].length;
      const k = entry.W[0].length;
      assert.ok(n >= 2 && n <= 4, 'n range');
      assert.ok(d >= 1 && d <= 3, 'd range');
      assert.ok(k >= 1 && k <= 2, 'k range');
      assert.ok(intMat(entry.X, -4, 4), 'X int range');
      assert.ok(entry.W.length === d && intMat(entry.W, -3, 3), 'W shape/range');
      assert.ok(entry.b.length === k && entry.b.every((v) => Number.isInteger(v) && v >= -2 && v <= 2), 'b range');
      assert.ok(entry.y.length === n && entry.y.every((row) => row.length === k) && intMat(entry.y, -4, 4), 'y shape/range');
    }
    assert.ok(generated.parameters.tests.includes('seeded dW 1'), 'linear seeded check emitted');
  }
});

test('seeded MLP draws stay inside the declared domains incl. kink-free guard', () => {
  const def = BACKPROP_CASES['mlp-backprop-relu-mse'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genBackpropCase(seed, def, 'mlp-backprop-relu-mse');
    for (const entry of generated.parameters.seedCases) {
      const n = entry.X.length;
      const d = entry.X[0].length;
      const hidden = entry.W1[0].length;
      const k = entry.W2[0].length;
      assert.ok(n >= 3 && n <= 5, 'n range');
      assert.ok(d >= 2 && d <= 3, 'd range');
      assert.ok(hidden >= 2 && hidden <= 4, 'hidden range');
      assert.ok(k >= 1 && k <= 2, 'k range');
      assert.ok(halfMat(entry.X, -2, 2), 'X half-int range');
      assert.ok(entry.W1.length === d && halfMat(entry.W1, -1.5, 1.5), 'W1 shape/range');
      assert.ok(entry.b1.length === hidden, 'b1 shape');
      assert.ok(entry.W2.length === hidden && halfMat(entry.W2, -1.5, 1.5), 'W2 shape/range');
      assert.ok(entry.b2.length === k, 'b2 shape');
      assert.ok(entry.y.length === n && entry.y.every((row) => row.length === k), 'y shape');
      // the kink-free guard must hold on every drawn fixture
      const pre = matVec(entry.X, entry.W1, entry.b1);
      assert.ok(pre.every((row) => row.every((v) => Math.abs(v) > 0.05)), 'kink-free pre-activations');
    }
    assert.ok(generated.parameters.tests.includes('__ref_mlp'), 'preamble emitted');
    assert.ok(generated.parameters.tests.includes('seeded dW1 1'), 'mlp seeded check emitted');
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = BACKPROP_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateBackpropFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = BACKPROP_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genBackpropCase(seed, def, caseId), genBackpropCase(seed, def, caseId), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = BACKPROP_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateBackpropFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveBackpropFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(BACKPROP_CONTRACT.familyId, 'optimize-backprop-gradient-check');
  assert.equal(BACKPROP_CONTRACT.familyGroup, 'optimize-update');
  assert.equal(BACKPROP_CONTRACT.authorityMode, 'seeded');
  assert.equal(BACKPROP_CONTRACT.activityType, 'python-code');
  assert.equal(BACKPROP_CONTRACT.graderId, 'pyodide');
  assert.equal(BACKPROP_CONTRACT.masteryEligible, true);
  assert.deepEqual(BACKPROP_CONTRACT.difficultyProfiles, ['core', 'stretch']);
  assert.equal(FAMILY_SPEC.generate, generateBackpropFamily);
  assert.equal(FAMILY_SPEC.solve, solveBackpropFamily);
  assert.throws(() => generateBackpropFamily({ seed: 0, caseId: 'linear-mse-gradients', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateBackpropFamily({ seed: 0, caseId: 'mlp-backprop-relu-mse', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateBackpropFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateBackpropFamily({ seed: 0.5, caseId: 'linear-mse-gradients', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveBackpropFamily({}), /Kapselform/);
});
