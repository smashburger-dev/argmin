// Procedural family fit-forward-layer-chain-contract: capsule gates.
// Run: node --test tests/procedural_forward_layer_chain_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/fit-forward-layer-chain-contract.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

// The case defs do not carry `packages`; the JSON anchors pin it to ['numpy'],
// so the suite surface adds it for the verbatim anchor check.
const suiteMod = {
  ...mod,
  FORWARD_CASES: Object.fromEntries(
    Object.entries(mod.FORWARD_CASES).map(([id, def]) => [id, { ...def, packages: ['numpy'] }]),
  ),
};

codeCapsuleSuite('fit-forward-layer-chain-contract', suiteMod, [
  { caseId: 'linear-forward-contract', difficulty: 'core' },
  { caseId: 'mlp-forward-relu', difficulty: 'stretch' },
  { caseId: 'deep-forward-chain', difficulty: 'challenge' },
], { difficultyProfiles: ['core', 'stretch', 'challenge'] });

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const linear = mod.genForwardCase(seed, 'linear-forward-contract', mod.FORWARD_CASES['linear-forward-contract']);
    assert.ok(linear.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    for (const entry of linear.parameters.seedCases) {
      assert.ok(entry.n >= 2 && entry.n <= 4, 'n range');
      assert.ok(entry.d >= 2 && entry.d <= 4, 'd range');
      assert.ok(entry.h >= 2 && entry.h <= 4, 'h range');
      assert.equal(entry.X.length, entry.n);
      assert.equal(entry.X[0].length, entry.d, 'X cols = d');
      assert.equal(entry.W.length, entry.d, 'W rows = d');
      assert.equal(entry.W[0].length, entry.h, 'W cols = h');
      assert.equal(entry.b.length, entry.h, 'b len = h');
      assert.ok(entry.badRows >= 1 && entry.badRows !== entry.d, 'bad W rows break contract');
    }
    const mlp = mod.genForwardCase(seed, 'mlp-forward-relu', mod.FORWARD_CASES['mlp-forward-relu']);
    assert.ok(mlp.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    for (const entry of mlp.parameters.seedCases) {
      assert.ok(entry.d >= 2 && entry.d <= 5, 'd range');
      assert.ok(entry.h1 >= 2 && entry.h1 <= 5, 'h1 range');
      assert.equal(entry.W1.length, entry.d);
      assert.equal(entry.W2.length, entry.h1, 'W2 rows = h1');
      assert.equal(entry.W2[0].length, entry.h2, 'W2 cols = h2');
      assert.equal(entry.b2.length, entry.h2, 'b2 len = h2');
      assert.equal(entry.sizes.length, 3, 'sizes triple');
      assert.ok(entry.sizes.every((s) => s >= 2 && s <= 6), 'sizes range');
      assert.ok(entry.badRows >= 1 && entry.badRows !== entry.h1, 'bad W2 rows break contract');
    }
    const deep = mod.genForwardCase(seed, 'deep-forward-chain', mod.FORWARD_CASES['deep-forward-chain']);
    assert.ok(deep.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    for (const entry of deep.parameters.seedCases) {
      assert.ok(entry.depth >= 1 && entry.depth <= 4, 'depth range');
      assert.equal(entry.sizes.length, entry.depth + 1, 'sizes = depth + 1');
      assert.ok(entry.sizes.every((s) => s >= 2 && s <= 5), 'sizes range');
      assert.equal(entry.X[0].length, entry.sizes[0], 'X cols = d_in');
      assert.equal(entry.weights.length, entry.depth);
      assert.equal(entry.biases.length, entry.depth);
      entry.weights.forEach((w, i) => {
        assert.equal(w.length, entry.sizes[i], `W${i} rows`);
        assert.equal(w[0].length, entry.sizes[i + 1], `W${i} cols`);
      });
      entry.biases.forEach((b, i) => assert.equal(b.length, entry.sizes[i + 1], `b${i} len`));
      assert.ok(['short-biases', 'flat-x'].includes(entry.violation), 'violation kind');
    }
  }
});

test('family extras: contract competencies and case types', () => {
  assert.deepEqual(mod.FORWARD_CONTRACT.competencyIds, ['c-dl-tensors', 'c-numpy-basics', 'c-linalg-matrices']);
  assert.deepEqual(mod.FORWARD_CONTRACT.caseTypes, [
    { caseId: 'linear-forward-contract', propertyTest: false },
    { caseId: 'mlp-forward-relu', propertyTest: false },
    { caseId: 'deep-forward-chain', propertyTest: false },
  ]);
});
