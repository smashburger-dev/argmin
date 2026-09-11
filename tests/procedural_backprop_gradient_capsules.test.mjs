// Procedural family optimize-backprop-gradient-check: capsule gates.
// Run: node --test tests/procedural_backprop_gradient_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/optimize-backprop-gradient-check.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

// genBackpropCase/backpropCaseOk take the canonical caseId-in-the-middle
// arity from the shared case-family kit ((seed, caseId, def) /
// (parameters, caseId, def)). The case defs do not carry `packages`; the
// JSON anchors pin it to ['numpy'].
const suiteMod = {
  ...mod,
  BACKPROP_CASES: Object.fromEntries(
    Object.entries(mod.BACKPROP_CASES).map(([id, def]) => [id, { ...def, packages: ['numpy'] }]),
  ),
};

codeCapsuleSuite('optimize-backprop-gradient-check', suiteMod, [
  { caseId: 'linear-mse-gradients', difficulty: 'core' },
  { caseId: 'mlp-backprop-relu-mse', difficulty: 'stretch' },
], { familyGroup: 'optimize-update', difficultyProfiles: ['core', 'stretch'] });

// JS mirror of the forward pre-activation used by the draw guard (kink-free
// ReLU domain). Only used for assertions — the emitted test block recomputes
// everything in Python.
const matVec = (X, W, b) => X.map((row) => (
  W[0].map((_, j) => row.reduce((sum, x, a) => sum + x * W[a][j], b[j]))
));

const intMat = (m, lo, hi) => m.every((row) => row.every((v) => Number.isInteger(v) && v >= lo && v <= hi));
const halfMat = (m, lo, hi) => m.every((row) => row.every((v) => v * 2 === Math.round(v * 2) && v >= lo && v <= hi));

test('seeded linear draws stay inside the declared domains', () => {
  const def = mod.BACKPROP_CASES['linear-mse-gradients'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = mod.genBackpropCase(seed, 'linear-mse-gradients', def);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
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
  const def = mod.BACKPROP_CASES['mlp-backprop-relu-mse'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = mod.genBackpropCase(seed, 'mlp-backprop-relu-mse', def);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
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
