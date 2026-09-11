// Procedural family optimize-sgd-step-pure-update: capsule gates.
// Run: node --test tests/procedural_sgd_step_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  SGD_CASES,
  SGD_CONTRACT,
  genSgdCase,
  generateSgdFamily,
  sgdCaseOk,
  solveSgdFamily,
} from '../assets/js/core/procedural/optimize-sgd-step-pure-update.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['pure-train-step', 'sgd-momentum-step'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-sgd-step-pure-update.json'), 'utf8'));
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
    const def = SGD_CASES[caseId];
    assert.equal(body.difficultyProfile, def.difficulty, `${caseId}: difficulty`);
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy sgdCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = SGD_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genSgdCase(seed, def);
      assert.ok(sgdCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      if (def.seededPrelude) {
        assert.ok(generated.parameters.tests.includes(def.seededPrelude), `${caseId}:${seed}: prelude emitted`);
      }
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const step = genSgdCase(seed, SGD_CASES['pure-train-step']);
    assert.equal(step.parameters.seedCases.length, 2, 'extraCount');
    for (const entry of step.parameters.seedCases) {
      assert.ok(entry.dataSeed >= 0 && entry.dataSeed <= 9999, 'dataSeed range');
      assert.ok(entry.n >= 12 && entry.n <= 24, 'n range');
      assert.ok([4, 6, 8].includes(entry.hidden), 'hidden bank');
      assert.ok([0.001, 0.005, 0.01, 0.02, 0.05].includes(entry.lr), 'lr bank');
    }
    const momentum = genSgdCase(seed, SGD_CASES['sgd-momentum-step']);
    assert.equal(momentum.parameters.seedCases.length, 2, 'extraCount');
    for (const entry of momentum.parameters.seedCases) {
      const wLen = entry.params.w.length;
      assert.ok(wLen >= 2 && wLen <= 3, 'w length');
      for (const dict of [entry.params, entry.grads, entry.velocity]) {
        assert.equal(dict.w.length, wLen, 'aligned w length');
        assert.equal(dict.b.length, 1, 'b length 1');
      }
      assert.ok(entry.params.w.every((v) => v >= -3 && v <= 3), 'params range');
      assert.ok(entry.params.b.every((v) => v >= -3 && v <= 3), 'params b range');
      assert.ok(entry.grads.w.every((v) => v >= -4 && v <= 4), 'grads range');
      assert.ok(entry.grads.b.every((v) => v >= -4 && v <= 4), 'grads b range');
      assert.ok(entry.velocity.w.every((v) => v >= -2 && v <= 2), 'velocity range');
      assert.ok(entry.velocity.b.every((v) => v >= -2 && v <= 2), 'velocity b range');
      assert.ok([0.05, 0.1, 0.2, 0.5].includes(entry.lr), 'lr bank');
      assert.ok([0.0, 0.5, 0.8, 0.9].includes(entry.momentum), 'momentum bank');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = SGD_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateSgdFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = SGD_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genSgdCase(seed, def), genSgdCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = SGD_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateSgdFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveSgdFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(SGD_CONTRACT.familyId, 'optimize-sgd-step-pure-update');
  assert.equal(SGD_CONTRACT.authorityMode, 'seeded');
  assert.equal(SGD_CONTRACT.activityType, 'python-code');
  assert.equal(SGD_CONTRACT.graderId, 'pyodide');
  assert.equal(SGD_CONTRACT.masteryEligible, true);
  assert.deepEqual(SGD_CONTRACT.difficultyProfiles, ['challenge', 'core', 'stretch']);
  assert.deepEqual(SGD_CONTRACT.competencyIds, ['c-dl-autograd', 'c-grad-regression']);
  assert.deepEqual(SGD_CONTRACT.caseTypes, [
    { caseId: 'pure-train-step', propertyTest: false },
    { caseId: 'sgd-momentum-step', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateSgdFamily);
  assert.equal(FAMILY_SPEC.solve, solveSgdFamily);
  assert.throws(() => generateSgdFamily({ seed: 0, caseId: 'pure-train-step', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateSgdFamily({ seed: 0, caseId: 'sgd-momentum-step', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateSgdFamily({ seed: 0, caseId: 'nope', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generateSgdFamily({ seed: 1.5, caseId: 'pure-train-step', difficulty: 'challenge' }), /Seed/);
  assert.throws(() => solveSgdFamily({}), /Kapselform/);
});
