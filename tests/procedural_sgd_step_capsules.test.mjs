// Procedural family optimize-sgd-step-pure-update: capsule gates (python-code).
// Run: node --test tests/procedural_sgd_step_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/optimize-sgd-step-pure-update.mjs';
import {
  SGD_CASES,
  SGD_CONTRACT,
  genSgdCase,
} from '../assets/js/core/procedural/optimize-sgd-step-pure-update.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['pure-train-step', 'sgd-momentum-step'];

codeCapsuleSuite('optimize-sgd-step-pure-update', mod, [
  { caseId: 'pure-train-step', difficulty: 'challenge' },
  { caseId: 'sgd-momentum-step', difficulty: 'challenge' },
], { difficultyProfiles: ['challenge', 'core', 'stretch'] });

test('anchor extras: difficulty profiles stay pinned to the JSON cases', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-sgd-step-pure-update.json'), 'utf8'));
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.equal(body.difficultyProfile, SGD_CASES[caseId].difficulty, `${caseId}: difficulty`);
  }
});

test('capsule extras: seeded block marker and prelude stay emitted', () => {
  for (const caseId of CASE_IDS) {
    const def = SGD_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genSgdCase(seed, caseId, def);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      if (def.seededPrelude) {
        assert.ok(generated.parameters.tests.includes(def.seededPrelude), `${caseId}:${seed}: prelude emitted`);
      }
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const step = genSgdCase(seed, 'pure-train-step', SGD_CASES['pure-train-step']);
    assert.equal(step.parameters.seedCases.length, 2, 'extraCount');
    for (const entry of step.parameters.seedCases) {
      assert.ok(entry.dataSeed >= 0 && entry.dataSeed <= 9999, 'dataSeed range');
      assert.ok(entry.n >= 12 && entry.n <= 24, 'n range');
      assert.ok([4, 6, 8].includes(entry.hidden), 'hidden bank');
      assert.ok([0.001, 0.005, 0.01, 0.02, 0.05].includes(entry.lr), 'lr bank');
    }
    const momentum = genSgdCase(seed, 'sgd-momentum-step', SGD_CASES['sgd-momentum-step']);
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

test('family extras: contract archetype, competencies and case types', () => {
  assert.equal(SGD_CONTRACT.taskArchetype, 'code-tests');
  assert.deepEqual(SGD_CONTRACT.competencyIds, ['c-dl-autograd', 'c-grad-regression']);
  assert.deepEqual(SGD_CONTRACT.caseTypes, [
    { caseId: 'pure-train-step', propertyTest: false },
    { caseId: 'sgd-momentum-step', propertyTest: false },
  ]);
});
