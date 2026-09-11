// Procedural family fit-mlp-val-curve-argmin: capsule gates.
// Run: node --test tests/procedural_mlp_val_curve_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  VAL_CURVE_CASES,
  VAL_CURVE_CONTRACT,
  genValCurveCase,
  generateValCurveFamily,
  solveValCurveFamily,
  valCurveCaseOk,
} from '../assets/js/core/procedural/fit-mlp-val-curve-argmin.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['mlp-val-curve-argmin'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/fit-mlp-val-curve-argmin.json'), 'utf8'));
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
    const def = VAL_CURVE_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy valCurveCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = VAL_CURVE_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genValCurveCase(seed, def);
      assert.ok(valCurveCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const def = VAL_CURVE_CASES['mlp-val-curve-argmin'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genValCurveCase(seed, def);
    assert.equal(generated.parameters.seedCases.length, 2, 'extraCount');
    for (const [i, entry] of generated.parameters.seedCases.entries()) {
      assert.ok(Number.isInteger(entry.dataSeed) && entry.dataSeed >= 1 && entry.dataSeed <= 9999, 'dataSeed range');
      assert.ok(Number.isInteger(entry.n) && entry.n >= 120 && entry.n <= 260, 'n range');
      assert.ok(Number.isInteger(entry.d) && entry.d >= 2 && entry.d <= 5, 'd range');
      assert.ok(Number.isInteger(entry.hidden) && entry.hidden >= 4 && entry.hidden <= 12, 'hidden range');
      assert.ok(entry.lr >= 0.005 && entry.lr <= 0.02, 'lr range');
      assert.ok(Number.isInteger(entry.epochs) && entry.epochs >= 40 && entry.epochs <= 80, 'epochs range');
      assert.ok(Number.isInteger(entry.trainSeed) && entry.trainSeed >= 1 && entry.trainSeed <= 9999, 'trainSeed range');
      assert.ok(entry.altSeed - entry.trainSeed >= 1 && entry.altSeed - entry.trainSeed <= 9, 'altSeed offset');
      assert.ok(entry.badFraction === 0.0 || entry.badFraction === 1.0, 'badFraction boundary');
      // the drawn literals are baked into the test block
      const index = i + 1;
      assert.ok(generated.parameters.tests.includes(`np.random.default_rng(${entry.dataSeed})`), `${seed}:${index}: dataSeed literal`);
      assert.ok(
        generated.parameters.tests.includes(`${entry.hidden}, ${entry.lr}, ${entry.epochs}, ${entry.trainSeed}`),
        `${seed}:${index}: call args literal`,
      );
      assert.ok(generated.parameters.tests.includes(`val_fraction=${entry.badFraction}.0`), `${seed}:${index}: badFraction literal`);
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = VAL_CURVE_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateValCurveFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = VAL_CURVE_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genValCurveCase(seed, def), genValCurveCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = VAL_CURVE_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateValCurveFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveValCurveFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(VAL_CURVE_CONTRACT.familyId, 'fit-mlp-val-curve-argmin');
  assert.equal(VAL_CURVE_CONTRACT.familyGroup, 'fit-model');
  assert.equal(VAL_CURVE_CONTRACT.authorityMode, 'seeded');
  assert.equal(VAL_CURVE_CONTRACT.activityType, 'python-code');
  assert.equal(VAL_CURVE_CONTRACT.graderId, 'pyodide');
  assert.equal(VAL_CURVE_CONTRACT.masteryEligible, true);
  assert.deepEqual(VAL_CURVE_CONTRACT.difficultyProfiles, ['challenge']);
  assert.deepEqual(VAL_CURVE_CONTRACT.competencyIds, ['c-dl-training', 'c-dl-autograd']);
  assert.deepEqual(VAL_CURVE_CONTRACT.caseTypes, [
    { caseId: 'mlp-val-curve-argmin', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateValCurveFamily);
  assert.equal(FAMILY_SPEC.solve, solveValCurveFamily);
  assert.throws(() => generateValCurveFamily({ seed: 0, caseId: 'mlp-val-curve-argmin', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateValCurveFamily({ seed: 0, caseId: 'nope', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generateValCurveFamily({ seed: 0.5, caseId: 'mlp-val-curve-argmin', difficulty: 'challenge' }), /Seed/);
  assert.throws(() => solveValCurveFamily({}), /Kapselform/);
});
