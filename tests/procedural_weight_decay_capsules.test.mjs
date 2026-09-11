// Procedural family fit-weight-decay-ablation: capsule gates (python-code).
// Run: node --test tests/procedural_weight_decay_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/fit-weight-decay-ablation.mjs';
import {
  WEIGHT_DECAY_CASES,
  WEIGHT_DECAY_CONTRACT,
  genWeightDecayCase,
  weightDecayCaseOk,
} from '../assets/js/core/procedural/fit-weight-decay-ablation.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_ID = 'weight-decay-ablation';
const CASE_DEF = WEIGHT_DECAY_CASES[CASE_ID];
const draw = (seed) => genWeightDecayCase(seed, CASE_ID, CASE_DEF);

codeCapsuleSuite('fit-weight-decay-ablation', mod, [
  { caseId: 'weight-decay-ablation', difficulty: 'challenge' },
], { familyGroup: 'fit-model', difficultyProfiles: ['challenge'] });

test('anchor extras: difficulty profile stays pinned to the JSON case', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/fit-weight-decay-ablation.json'), 'utf8'));
  const body = doc.cases.find((item) => item.caseId === CASE_ID);
  assert.equal(body.difficultyProfile, 'challenge');
});

test('capsule extras: seeded block marker, packages and shape on negative seeds', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = draw(seed);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.deepEqual(generated.parameters.packages, ['numpy']);
    assert.equal(generated.fullSolution, CASE_DEF.fullSolution);
  }
  for (let seed = -20; seed < 20; seed += 1) {
    assert.ok(weightDecayCaseOk(draw(seed).parameters, CASE_ID, CASE_DEF), `${seed}: shape`);
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

test('family extras: contract archetype, competencies and case types', () => {
  assert.equal(WEIGHT_DECAY_CONTRACT.taskArchetype, 'code-tests');
  assert.deepEqual(WEIGHT_DECAY_CONTRACT.competencyIds, ['c-dl-regularization', 'c-ml-cv']);
  assert.deepEqual(WEIGHT_DECAY_CONTRACT.caseTypes.map((item) => item.caseId), [CASE_ID]);
});
