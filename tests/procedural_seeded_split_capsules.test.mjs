// Procedural family reproduce-seeded-split: capsule gates (python-code).
// Run: node --test tests/procedural_seeded_split_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/reproduce-seeded-split.mjs';
import {
  SPLIT_CASES,
  genSplitCase,
} from '../assets/js/core/procedural/reproduce-seeded-split.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('reproduce-seeded-split', mod, [
  { caseId: 'deterministic-split-numpy', difficulty: 'core', competencyIds: ['c-ml-baseline', 'c-numpy-basics'] },
  { caseId: 'kfold-indices-numpy', difficulty: 'core', competencyIds: ['c-ml-cv', 'c-numpy-basics'] },
], { familyGroup: 'reproduce-hash', difficultyProfiles: ['core'] });

test('capsule extras: seeded block marker stays emitted', () => {
  for (const caseId of ['deterministic-split-numpy', 'kfold-indices-numpy']) {
    const def = SPLIT_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genSplitCase(seed, caseId, def);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
    }
  }
});

test('seeded split draws stay inside the declared domains', () => {
  const def = SPLIT_CASES['deterministic-split-numpy'];
  let tieSeen = 0;
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genSplitCase(seed, 'deterministic-split-numpy', def);
    for (const entry of generated.parameters.seedCases) {
      assert.ok(Number.isInteger(entry.n) && entry.n >= 8 && entry.n <= 15, 'n range');
      assert.ok(Number.isInteger(entry.seed) && entry.seed >= 0, 'split seed int');
      assert.ok([0.2, 0.25, 0.3, 0.4, 0.5].includes(entry.frac), 'frac from bank');
      assert.ok(entry.y.length >= 4 && entry.y.length <= 9, 'y length');
      assert.ok(entry.y.every((v) => Number.isInteger(v) || typeof v === 'string'), 'y labels int|string');
      if (entry.y.length === 4 && entry.y.filter((v) => v === entry.y[0]).length === 2
        && new Set(entry.y).size === 2) tieSeen += 1;
    }
    assert.ok(generated.parameters.tests.includes('__ref_deterministic_split'), 'ref copy emitted');
    assert.ok(generated.parameters.tests.includes('seeded split perm 1'), 'split seeded check emitted');
    assert.ok(generated.parameters.tests.includes('seeded majority 1'), 'majority seeded check emitted');
  }
  assert.ok(tieSeen > 0, 'tie-shaped label draws exercised');
});

test('seeded fold draws stay inside the declared domains', () => {
  const def = SPLIT_CASES['kfold-indices-numpy'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genSplitCase(seed, 'kfold-indices-numpy', def);
    for (const entry of generated.parameters.seedCases) {
      assert.ok(Number.isInteger(entry.n) && entry.n >= 6 && entry.n <= 15, 'n range');
      assert.ok(Number.isInteger(entry.k) && entry.k >= 2 && entry.k <= 5 && entry.k <= entry.n, 'k range');
      assert.ok(Number.isInteger(entry.seed) && entry.seed >= 0, 'fold seed int');
      assert.equal(entry.y.length, entry.n, 'y length matches n');
      assert.ok(entry.y.every((v) => v === 0 || v === 1), 'y binary');
      assert.equal(new Set(entry.y).size, 2, 'y carries both classes');
      assert.ok(entry.kBad > entry.n && entry.kBad <= entry.n + 3, 'kBad out of range');
    }
    assert.ok(generated.parameters.tests.includes('__ref_kfold_indices'), 'ref copy emitted');
    assert.ok(generated.parameters.tests.includes('__ref_cv_scores'), 'cv ref copy emitted');
    assert.ok(generated.parameters.tests.includes('__cv_model'), 'cv model helper emitted');
    assert.ok(generated.parameters.tests.includes('seeded fold perm 1'), 'fold seeded check emitted');
    assert.ok(generated.parameters.tests.includes('seeded k guard 1'), 'ValueError path check emitted');
  }
});
