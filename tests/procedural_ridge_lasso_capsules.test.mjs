// Procedural family formula-ridge-lasso-closed-form: capsule gates.
// Run: node --test tests/procedural_ridge_lasso_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  RIDGE_LASSO_CASES,
  RIDGE_LASSO_CONTRACT,
  genRidgeLassoCase,
  generateRidgeLassoFamily,
  solveRidgeLassoFamily,
  ridgeLassoCaseOk,
} from '../assets/js/core/procedural/formula-ridge-lasso-closed-form.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['ridge-normal-equation', 'lasso-soft-threshold'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/formula-ridge-lasso-closed-form.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 2);
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
    const def = RIDGE_LASSO_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy ridgeLassoCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = RIDGE_LASSO_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genRidgeLassoCase(seed, def, caseId);
      assert.ok(ridgeLassoCaseOk(generated.parameters, def, caseId), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const core = genRidgeLassoCase(seed, RIDGE_LASSO_CASES['ridge-normal-equation'], 'ridge-normal-equation');
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.X.length >= 3 && entry.X.length <= 4, 'core n range');
      assert.ok(entry.X[0].length >= 1 && entry.X[0].length <= 2, 'core d range');
      assert.equal(entry.y.length, entry.X.length, 'core y matches n');
      assert.ok(entry.lam > 0 && entry.lam <= 3.0, 'core lam positive (pd system)');
      assert.ok(entry.clam > 0, 'core lasso lam positive');
      assert.ok(entry.X.flat().every((v) => v >= -2 && v <= 3), 'core X range');
    }
    const stretch = genRidgeLassoCase(seed, RIDGE_LASSO_CASES['lasso-soft-threshold'], 'lasso-soft-threshold');
    for (const entry of stretch.parameters.seedCases) {
      assert.ok(entry.X.length >= 3 && entry.X.length <= 5, 'stretch n range');
      assert.equal(entry.y.length, entry.X.length, 'stretch y matches n');
      assert.ok(entry.lams.length >= 2 && entry.lams.length <= 3, 'stretch lams length');
      assert.ok(entry.lams.every((v) => v > 0 && v <= 4.0), 'stretch lams positive');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = RIDGE_LASSO_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateRidgeLassoFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = RIDGE_LASSO_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genRidgeLassoCase(seed, def, caseId), genRidgeLassoCase(seed, def, caseId), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = RIDGE_LASSO_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateRidgeLassoFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveRidgeLassoFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(RIDGE_LASSO_CONTRACT.familyId, 'formula-ridge-lasso-closed-form');
  assert.equal(RIDGE_LASSO_CONTRACT.authorityMode, 'seeded');
  assert.equal(RIDGE_LASSO_CONTRACT.activityType, 'python-code');
  assert.equal(RIDGE_LASSO_CONTRACT.graderId, 'pyodide');
  assert.equal(RIDGE_LASSO_CONTRACT.masteryEligible, true);
  assert.deepEqual(RIDGE_LASSO_CONTRACT.difficultyProfiles, ['core', 'stretch']);
  assert.throws(() => generateRidgeLassoFamily({ seed: 0, caseId: 'ridge-normal-equation', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateRidgeLassoFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannt/);
  assert.throws(() => generateRidgeLassoFamily({ seed: 0.5, caseId: 'ridge-normal-equation', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveRidgeLassoFamily({}), /Kapselform/);
  assert.equal(FAMILY_SPEC.familyId, 'formula-ridge-lasso-closed-form');
});
