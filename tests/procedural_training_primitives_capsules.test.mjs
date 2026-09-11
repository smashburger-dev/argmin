// Procedural family optimize-training-primitive-contract: capsule gates (python-code).
// Run: node --test tests/procedural_training_primitives_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/optimize-training-primitive-contract.mjs';
import {
  PRIM_CASES,
  PRIM_CONTRACT,
  genPrimCase,
} from '../assets/js/core/procedural/optimize-training-primitive-contract.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['loss-and-batch-primitives', 'dropout-weight-decay-primitives'];

codeCapsuleSuite('optimize-training-primitive-contract', mod, [
  { caseId: 'loss-and-batch-primitives', difficulty: 'core' },
  { caseId: 'dropout-weight-decay-primitives', difficulty: 'core' },
], { difficultyProfiles: ['core'] });

test('anchor extras: difficulty profiles stay pinned to the JSON cases', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-training-primitive-contract.json'), 'utf8'));
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.equal(body.difficultyProfile, PRIM_CASES[caseId].difficulty, `${caseId}: difficulty`);
  }
});

test('capsule extras: seeded block marker stays emitted', () => {
  for (const caseId of CASE_IDS) {
    const def = PRIM_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genPrimCase(seed, caseId, def);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const loss = genPrimCase(seed, 'loss-and-batch-primitives', PRIM_CASES['loss-and-batch-primitives']);
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
    const reg = genPrimCase(seed, 'dropout-weight-decay-primitives', PRIM_CASES['dropout-weight-decay-primitives']);
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

test('family extras: contract archetype, competencies and case types', () => {
  assert.equal(PRIM_CONTRACT.taskArchetype, 'code-tests');
  assert.deepEqual(PRIM_CONTRACT.competencyIds, ['c-dl-training', 'c-dl-regularization', 'c-grad-regression', 'c-numpy-basics']);
  assert.deepEqual(PRIM_CONTRACT.caseTypes, [
    { caseId: 'loss-and-batch-primitives', propertyTest: false },
    { caseId: 'dropout-weight-decay-primitives', propertyTest: false },
  ]);
});
