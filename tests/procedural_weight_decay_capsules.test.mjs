// Procedural family fit-weight-decay-ablation: capsule gates.
// Run: node --test tests/procedural_weight_decay_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  WEIGHT_DECAY_CASES,
  WEIGHT_DECAY_CONTRACT,
  genWeightDecayCase,
  generateWeightDecayFamily,
  solveWeightDecayFamily,
  weightDecayCaseOk,
} from '../assets/js/core/procedural/fit-weight-decay-ablation.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_ID = 'weight-decay-ablation';
const CASE_DEF = WEIGHT_DECAY_CASES[CASE_ID];
const draw = (seed) => generateWeightDecayFamily({ seed, caseId: CASE_ID, difficulty: 'challenge' });

test('anchor: contract null, case fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/fit-weight-decay-ablation.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 1);
  const body = doc.cases.find((item) => item.caseId === CASE_ID);
  assert.ok(body, `${CASE_ID}: anchor missing`);
  assert.equal(body.difficultyProfile, 'challenge');
  assert.ok(body.parameters.tests.includes('__check'), 'base tests preserved');
  assert.equal(body.expected.kind, 'reference-solver');
  assert.equal(body.parameters.starterCode, CASE_DEF.starterCode, 'starter verbatim');
  assert.equal(body.parameters.tests, CASE_DEF.baseTests, 'base tests verbatim');
  assert.equal(body.expected.referenceSolver, CASE_DEF.referenceSolver, 'solver verbatim');
  assert.equal(body.prompt, CASE_DEF.prompt, 'prompt verbatim');
  assert.equal(body.fullSolution, CASE_DEF.fullSolution, 'solution verbatim');
});

test('capsule shape: generated parameters satisfy weightDecayCaseOk over 200 seeds', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = draw(seed);
    assert.ok(weightDecayCaseOk(generated.parameters, CASE_DEF), `${seed}: shape`);
    assert.ok(generated.parameters.tests.startsWith(CASE_DEF.baseTests), `${seed}: base block kept`);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.deepEqual(generated.parameters.packages, ['numpy']);
    assert.equal(generated.expected.referenceSolver, CASE_DEF.referenceSolver);
    assert.equal(generated.prompt, CASE_DEF.prompt);
    assert.equal(generated.fullSolution, CASE_DEF.fullSolution);
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = draw(seed);
    assert.equal(generated.parameters.seedCases.length, CASE_DEF.extraCount, `${seed}: extra count`);
    for (const entry of generated.parameters.seedCases) {
      assert.ok(Number.isInteger(entry.dataSeed) && entry.dataSeed >= 1 && entry.dataSeed <= 9999, 'dataSeed range');
      assert.ok(entry.n >= 80 && entry.n <= 220, 'n range');
      assert.ok(entry.d >= 2 && entry.d <= 5, 'd range');
      assert.ok(entry.lam >= 0.04 && entry.lam <= 0.1, 'lam range');
      assert.ok(entry.lamSmall > 0 && entry.lamSmall < entry.lam, 'lamSmall below lam');
      assert.ok(entry.lr >= 0.01 && entry.lr <= 0.05, 'lr range');
      assert.ok(entry.epochs >= 300 && entry.epochs <= 500, 'epochs range');
      assert.ok(Number.isInteger(entry.trainSeed) && entry.trainSeed >= 1, 'trainSeed range');
      assert.ok(entry.altSeed > entry.trainSeed, 'altSeed differs');
      assert.equal(entry.wTrue.length, entry.d, 'wTrue matches d');
      assert.ok(entry.wTrue.every((v) => v !== 0 && Math.abs(v) <= 2), 'wTrue nonzero half-steps');
    }
    // the emitted checks stay inside the contract: determinism, lam=0 plain
    // run equality, float results and the shrinkage claim
    const tests = generated.parameters.tests;
    assert.ok(tests.includes('seeded determinismus'), `${seed}: determinism arm`);
    assert.ok(tests.includes('seeded lam0 plain'), `${seed}: lam=0 arm`);
    assert.ok(tests.includes('seeded decay schrumpft'), `${seed}: shrinkage arm`);
    assert.ok(tests.includes('seeded kleiner lambda'), `${seed}: small-lambda arm`);
  }
});

test('distinct floor: at least 40 distinct parameter sets over 200 seeds', () => {
  const seen = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    seen.add(JSON.stringify(draw(seed).parameters));
  }
  assert.ok(seen.size >= 40, `only ${seen.size} distinct`);
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (let seed = -20; seed < 20; seed += 1) {
    assert.deepEqual(genWeightDecayCase(seed, CASE_DEF), genWeightDecayCase(seed, CASE_DEF), `${seed}`);
    assert.ok(weightDecayCaseOk(genWeightDecayCase(seed, CASE_DEF).parameters, CASE_DEF), `${seed}: shape`);
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (let seed = 0; seed < 50; seed += 1) {
    assert.deepEqual(solveWeightDecayFamily(draw(seed).parameters), { referenceCode: CASE_DEF.referenceSolver });
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(WEIGHT_DECAY_CONTRACT.familyId, 'fit-weight-decay-ablation');
  assert.equal(WEIGHT_DECAY_CONTRACT.familyGroup, 'fit-model');
  assert.equal(WEIGHT_DECAY_CONTRACT.authorityMode, 'seeded');
  assert.equal(WEIGHT_DECAY_CONTRACT.activityType, 'python-code');
  assert.equal(WEIGHT_DECAY_CONTRACT.graderId, 'pyodide');
  assert.equal(WEIGHT_DECAY_CONTRACT.masteryEligible, true);
  assert.deepEqual(WEIGHT_DECAY_CONTRACT.difficultyProfiles, ['challenge']);
  assert.deepEqual(WEIGHT_DECAY_CONTRACT.caseTypes.map((item) => item.caseId), [CASE_ID]);
  assert.deepEqual(WEIGHT_DECAY_CONTRACT.competencyIds, ['c-dl-regularization', 'c-ml-cv']);
  assert.equal(FAMILY_SPEC.generate, generateWeightDecayFamily);
  assert.equal(FAMILY_SPEC.solve, solveWeightDecayFamily);
  assert.throws(() => generateWeightDecayFamily({ seed: 0, caseId: CASE_ID, difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateWeightDecayFamily({ seed: 0, caseId: 'nope', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generateWeightDecayFamily({ seed: 0.5, caseId: CASE_ID, difficulty: 'challenge' }), /Seed/);
  assert.throws(() => solveWeightDecayFamily({}), /Kapselform/);
});
