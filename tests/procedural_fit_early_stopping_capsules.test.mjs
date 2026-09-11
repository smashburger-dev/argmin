// Procedural family fit-early-stopping-roundtrip: capsule gates.
// Run: node --test tests/procedural_fit_early_stopping_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  EARLY_STOP_CASES,
  EARLY_STOP_CONTRACT,
  earlyStopCaseOk,
  genEarlyStopCase,
  generateEarlyStopFamily,
  solveEarlyStopFamily,
} from '../assets/js/core/procedural/fit-early-stopping-roundtrip.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['early-stopping-roundtrip', 'early-stopping-min-delta-roundtrip'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/fit-early-stopping-roundtrip.json'), 'utf8'));
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
    const def = EARLY_STOP_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy earlyStopCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = EARLY_STOP_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genEarlyStopCase(seed, def);
      assert.ok(earlyStopCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('__ref_early_stop'), `${caseId}:${seed}: ref copy embedded`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const roundtrip = genEarlyStopCase(seed, EARLY_STOP_CASES['early-stopping-roundtrip']);
    for (const entry of roundtrip.parameters.seedCases) {
      assert.ok(entry.curve.length >= 5 && entry.curve.length <= 9, 'curve length');
      assert.ok(entry.curve.every((v) => v >= 0.3 && v <= 3.0), 'curve range');
      assert.ok(entry.patience >= 0 && entry.patience <= 3, 'patience range');
      assert.deepEqual(Object.keys(entry.model), ['W1', 'b1', 'W2', 'b2'], 'model keys');
      assert.ok(entry.model.W1.length >= 2 && entry.model.W1.length <= 4, 'W1 rows');
      assert.equal(entry.model.b1.length, entry.model.W1[0].length, 'b1 matches W1 cols');
      assert.equal(entry.model.W2.length, entry.model.W1[0].length, 'W2 rows match hidden');
      assert.equal(entry.model.b2.length, 1, 'b2 scalar');
    }
    const minDelta = genEarlyStopCase(seed, EARLY_STOP_CASES['early-stopping-min-delta-roundtrip']);
    for (const entry of minDelta.parameters.seedCases) {
      assert.ok(entry.curve.length >= 5 && entry.curve.length <= 9, 'curve length');
      assert.ok(entry.patience >= 1 && entry.patience <= 3, 'patience range');
      assert.ok(entry.minDelta >= 0.005 && entry.minDelta <= 0.05, 'min_delta range');
      assert.deepEqual(Object.keys(entry.model), ['w', 'b'], 'model keys');
      assert.equal(entry.model.w.length, 1, 'w single row');
      assert.equal(entry.model.b.length, 1, 'b scalar');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = EARLY_STOP_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateEarlyStopFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = EARLY_STOP_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genEarlyStopCase(seed, def), genEarlyStopCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = EARLY_STOP_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateEarlyStopFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveEarlyStopFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(EARLY_STOP_CONTRACT.familyId, 'fit-early-stopping-roundtrip');
  assert.equal(EARLY_STOP_CONTRACT.authorityMode, 'seeded');
  assert.equal(EARLY_STOP_CONTRACT.activityType, 'python-code');
  assert.equal(EARLY_STOP_CONTRACT.graderId, 'pyodide');
  assert.equal(EARLY_STOP_CONTRACT.masteryEligible, true);
  assert.deepEqual(EARLY_STOP_CONTRACT.difficultyProfiles, ['stretch', 'core']);
  assert.deepEqual(EARLY_STOP_CONTRACT.competencyIds, ['c-dl-regularization', 'c-ml-cv']);
  assert.deepEqual(EARLY_STOP_CONTRACT.caseTypes, [
    { caseId: 'early-stopping-roundtrip', propertyTest: false },
    { caseId: 'early-stopping-min-delta-roundtrip', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateEarlyStopFamily);
  assert.equal(FAMILY_SPEC.solve, solveEarlyStopFamily);
  assert.throws(() => generateEarlyStopFamily({ seed: 0, caseId: 'early-stopping-roundtrip', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateEarlyStopFamily({ seed: 0, caseId: 'nope', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateEarlyStopFamily({ seed: 0.5, caseId: 'early-stopping-roundtrip', difficulty: 'stretch' }), /Seed/);
  assert.throws(() => solveEarlyStopFamily({}), /Kapselform/);
});
