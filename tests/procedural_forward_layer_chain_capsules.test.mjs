// Procedural family fit-forward-layer-chain-contract: capsule gates.
// Run: node --test tests/procedural_forward_layer_chain_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  FORWARD_CASES,
  FORWARD_CONTRACT,
  forwardCaseOk,
  genForwardCase,
  generateForwardFamily,
  solveForwardFamily,
} from '../assets/js/core/procedural/fit-forward-layer-chain-contract.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['linear-forward-contract', 'mlp-forward-relu', 'deep-forward-chain'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/fit-forward-layer-chain-contract.json'), 'utf8'));
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
    const def = FORWARD_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy forwardCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = FORWARD_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genForwardCase(seed, def);
      assert.ok(forwardCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const linear = genForwardCase(seed, FORWARD_CASES['linear-forward-contract']);
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
    const mlp = genForwardCase(seed, FORWARD_CASES['mlp-forward-relu']);
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
    const deep = genForwardCase(seed, FORWARD_CASES['deep-forward-chain']);
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

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = FORWARD_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateForwardFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = FORWARD_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genForwardCase(seed, def), genForwardCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = FORWARD_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateForwardFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveForwardFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(FORWARD_CONTRACT.familyId, 'fit-forward-layer-chain-contract');
  assert.equal(FORWARD_CONTRACT.authorityMode, 'seeded');
  assert.equal(FORWARD_CONTRACT.activityType, 'python-code');
  assert.equal(FORWARD_CONTRACT.graderId, 'pyodide');
  assert.equal(FORWARD_CONTRACT.masteryEligible, true);
  assert.deepEqual(FORWARD_CONTRACT.difficultyProfiles, ['core', 'stretch', 'challenge']);
  assert.deepEqual(FORWARD_CONTRACT.competencyIds, ['c-dl-tensors', 'c-numpy-basics', 'c-linalg-matrices']);
  assert.deepEqual(FORWARD_CONTRACT.caseTypes, [
    { caseId: 'linear-forward-contract', propertyTest: false },
    { caseId: 'mlp-forward-relu', propertyTest: false },
    { caseId: 'deep-forward-chain', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateForwardFamily);
  assert.equal(FAMILY_SPEC.solve, solveForwardFamily);
  assert.throws(() => generateForwardFamily({ seed: 0, caseId: 'linear-forward-contract', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateForwardFamily({ seed: 0, caseId: 'mlp-forward-relu', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateForwardFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateForwardFamily({ seed: 1.5, caseId: 'linear-forward-contract', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveForwardFamily({}), /Kapselform/);
});
