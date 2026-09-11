// Procedural family optimize-training-primitive-contract: capsule gates.
// Run: node --test tests/procedural_training_primitives_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  PRIM_CASES,
  PRIM_CONTRACT,
  genPrimCase,
  generatePrimFamily,
  primCaseOk,
  solvePrimFamily,
} from '../assets/js/core/procedural/optimize-training-primitive-contract.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['loss-and-batch-primitives', 'dropout-weight-decay-primitives'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-training-primitive-contract.json'), 'utf8'));
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
    const def = PRIM_CASES[caseId];
    assert.equal(body.difficultyProfile, def.difficulty, `${caseId}: difficulty`);
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy primCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = PRIM_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genPrimCase(seed, def);
      assert.ok(primCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const loss = genPrimCase(seed, PRIM_CASES['loss-and-batch-primitives']);
    assert.equal(loss.parameters.seedCases.length, 2, 'extraCount');
    for (const entry of loss.parameters.seedCases) {
      assert.ok(entry.yHat.length >= 3 && entry.yHat.length <= 5, 'yHat length');
      assert.equal(entry.y.length, entry.yHat.length, 'y aligned');
      assert.ok(entry.yHat.every((v) => v >= -4 && v <= 6), 'yHat range');
      assert.ok(entry.y.every((v) => v >= -4 && v <= 6), 'y range');
      assert.ok(entry.p.length >= 2 && entry.p.length <= 4, 'p length');
      assert.ok(entry.p.every((v) => v >= 0.05 && v <= 0.95), 'p in [0.05, 0.95]');
      assert.equal(entry.t.length, entry.p.length, 't aligned');
      assert.ok(entry.t.every((v) => v === 0 || v === 1), 't binary');
      assert.ok(entry.n >= 5 && entry.n <= 120, 'n range');
      assert.ok(entry.batch >= 1 && entry.batch <= 30, 'batch range');
    }
    const reg = genPrimCase(seed, PRIM_CASES['dropout-weight-decay-primitives']);
    assert.equal(reg.parameters.seedCases.length, 2, 'extraCount');
    for (const entry of reg.parameters.seedCases) {
      const cols = entry.x[0].length;
      assert.ok(cols >= 2 && cols <= 3, 'x cols');
      assert.equal(entry.x.length, 2, 'x rows = 2');
      assert.ok(entry.x.every((row) => row.length === cols && row.every((v) => v >= -6 && v <= 8)), 'x dims+range');
      assert.equal(entry.mask.length, 2, 'mask rows = 2');
      assert.ok(entry.mask.every((row) => row.length === cols && row.every((v) => typeof v === 'boolean')), 'mask dims+bool');
      assert.ok([0.5, 0.6, 0.75, 0.8, 1.0].includes(entry.p), 'p bank');
      const wLen = entry.w.length;
      assert.ok(wLen >= 2 && wLen <= 3, 'w length');
      assert.equal(entry.g.length, wLen, 'g aligned');
      assert.ok(entry.w.every((v) => v >= -4 && v <= 4), 'w range');
      assert.ok(entry.g.every((v) => v >= -4 && v <= 4), 'g range');
      assert.ok([0.1, 0.2, 0.5].includes(entry.lr), 'lr bank');
      assert.ok([0.0, 0.1, 0.2, 0.5].includes(entry.lam), 'lam bank');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = PRIM_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generatePrimFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = PRIM_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genPrimCase(seed, def), genPrimCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = PRIM_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generatePrimFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solvePrimFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(PRIM_CONTRACT.familyId, 'optimize-training-primitive-contract');
  assert.equal(PRIM_CONTRACT.authorityMode, 'seeded');
  assert.equal(PRIM_CONTRACT.activityType, 'python-code');
  assert.equal(PRIM_CONTRACT.graderId, 'pyodide');
  assert.equal(PRIM_CONTRACT.masteryEligible, true);
  assert.deepEqual(PRIM_CONTRACT.difficultyProfiles, ['core']);
  assert.deepEqual(PRIM_CONTRACT.competencyIds, ['c-dl-training', 'c-dl-regularization', 'c-grad-regression', 'c-numpy-basics']);
  assert.deepEqual(PRIM_CONTRACT.caseTypes, [
    { caseId: 'loss-and-batch-primitives', propertyTest: false },
    { caseId: 'dropout-weight-decay-primitives', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generatePrimFamily);
  assert.equal(FAMILY_SPEC.solve, solvePrimFamily);
  assert.throws(() => generatePrimFamily({ seed: 0, caseId: 'loss-and-batch-primitives', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generatePrimFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generatePrimFamily({ seed: 1.5, caseId: 'loss-and-batch-primitives', difficulty: 'core' }), /Seed/);
  assert.throws(() => solvePrimFamily({}), /Kapselform/);
});
