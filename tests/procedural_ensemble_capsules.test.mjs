// Procedural family construct-ensemble-predictor-comparison: capsule gates.
// Run: node --test tests/procedural_ensemble_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/construct-ensemble-predictor-comparison.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

// The case defs do not carry `packages`; the JSON anchors pin it to ['numpy'],
// so the suite surface adds it for the verbatim anchor check.
const suiteMod = {
  ...mod,
  ENSEMBLE_CASES: Object.fromEntries(
    Object.entries(mod.ENSEMBLE_CASES).map(([id, def]) => [id, { ...def, packages: ['numpy'] }]),
  ),
};

codeCapsuleSuite('construct-ensemble-predictor-comparison', suiteMod, [
  { caseId: 'voting-tree-linear-rmse', difficulty: 'stretch' },
  { caseId: 'voting-tie-and-tree', difficulty: 'challenge' },
], { familyGroup: 'construct-program', difficultyProfiles: ['stretch', 'challenge'] });

// Structural invariants of a drawn dict tree: internal nodes split on
// feature 0 with a half-integer threshold, leaves hold an int in [0, 2].
function assertTree(node, depth, scope) {
  assert.ok(node && typeof node === 'object', `${scope}: node object`);
  if ('leaf' in node) {
    assert.deepEqual(Object.keys(node), ['leaf'], `${scope}: leaf keys`);
    assert.ok(Number.isInteger(node.leaf) && node.leaf >= 0 && node.leaf <= 2, `${scope}: leaf value`);
    return;
  }
  assert.ok(depth <= 1, `${scope}: depth bound`);
  assert.equal(node.feature, 0, `${scope}: feature`);
  assert.ok(node.threshold % 1 === 0.5, `${scope}: half-integer threshold`);
  assertTree(node.left, depth + 1, `${scope}.left`);
  assertTree(node.right, depth + 1, `${scope}.right`);
}

function assertPreds(preds, mMin, mMax, nMin, nMax, vMax, scope) {
  assert.ok(preds.length >= mMin && preds.length <= mMax, `${scope}: model count`);
  const n = preds[0].length;
  assert.ok(n >= nMin && n <= nMax, `${scope}: example count`);
  assert.ok(
    preds.every((row) => row.length === n && row.every((v) => Number.isInteger(v) && v >= 0 && v <= vMax)),
    `${scope}: 0/1 entries`,
  );
  return n;
}

function assertCompareData(entry, scope) {
  const n = entry.xs.length;
  assert.ok(n >= 4 && n <= 6, `${scope}: dataset size`);
  assert.deepEqual(entry.xs, Array.from({ length: n }, (_, i) => i + 1), `${scope}: xs 1..n`);
  assert.ok(entry.ys.length === n && entry.ys.every((v) => Number.isInteger(v) && v >= 0 && v <= 2), `${scope}: ys`);
  assert.ok(entry.models.length >= 2 && entry.models.length <= 3, `${scope}: model count`);
  assert.ok(
    entry.models.every((row) => row.length === n && row.every((v) => Number.isInteger(v) && v >= 0 && v <= 2)),
    `${scope}: model preds`,
  );
}

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const trio = mod.genEnsembleCase(seed, 'voting-tree-linear-rmse', mod.ENSEMBLE_CASES['voting-tree-linear-rmse']);
    assert.ok(trio.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(trio.parameters.tests.includes('seeded vote 1'), `${seed}: seeded checks`);
    assert.equal(trio.parameters.seedCases.length, 2, 'trio extraCount');
    for (const entry of trio.parameters.seedCases) {
      assertPreds(entry.preds, 2, 5, 3, 6, 1, 'trio.preds');
      assertTree(entry.tree, 0, 'trio.tree');
      assert.ok(Number.isInteger(entry.xval) && entry.xval >= 0 && entry.xval <= 8, 'trio: xval range');
      assertCompareData(entry, 'trio');
      assert.ok(trio.parameters.tests.includes('majority_vote(__p'), 'trio: vote literal baked');
      assert.ok(trio.parameters.tests.includes('seeded linear rmse'), 'trio: linear rmse check baked');
    }
    const flat = mod.genEnsembleCase(seed, 'voting-tie-and-tree', mod.ENSEMBLE_CASES['voting-tie-and-tree']);
    assert.ok(flat.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(flat.parameters.tests.includes('seeded vote 1'), `${seed}: seeded checks`);
    assert.equal(flat.parameters.seedCases.length, 2, 'flat extraCount');
    for (const entry of flat.parameters.seedCases) {
      const m = entry.preds.length;
      assert.ok(m === 2 || m === 4, 'flat: even model count');
      const n = assertPreds(entry.preds, 2, 4, 2, 5, 1, 'flat.preds');
      assert.ok(n >= 2 && n <= 5, 'flat: example count');
      assert.equal(
        entry.preds.filter((row) => row[0] === 1).length,
        m / 2,
        'flat: column 0 is an exact tie',
      );
      assertTree(entry.tree, 0, 'flat.tree');
      assert.ok('leaf' in entry.tree.left && 'leaf' in entry.tree.right, 'flat: depth-1 tree');
      assert.ok(entry.tree.threshold >= 1.5 && entry.tree.threshold <= 5.5, 'flat: threshold range');
      assert.ok(
        [entry.tree.threshold - 1, entry.tree.threshold, entry.tree.threshold + 1.5].includes(entry.xval),
        'flat: xval on/near boundary',
      );
      assertCompareData(entry, 'flat');
      assert.equal(entry.rmsePred.length, entry.rmseY.length, 'flat: rmse vectors aligned');
      assert.ok(entry.rmsePred.length >= 2 && entry.rmsePred.length <= 4, 'flat: rmse length');
      assert.ok(
        entry.rmsePred.every((v) => Number.isInteger(v) && v >= 0 && v <= 3)
          && entry.rmseY.every((v) => Number.isInteger(v) && v >= 0 && v <= 3),
        'flat: rmse values',
      );
      assert.ok(flat.parameters.tests.includes('seeded vote tie'), 'flat: tie check baked');
      assert.ok(flat.parameters.tests.includes('seeded rmse funktion'), 'flat: rmse check baked');
    }
  }
});

test('family extras: contract competencies and case types', () => {
  assert.deepEqual(mod.ENSEMBLE_CONTRACT.competencyIds, ['c-ml-ensembles', 'c-numpy-basics']);
  assert.deepEqual(mod.ENSEMBLE_CONTRACT.caseTypes, [
    { caseId: 'voting-tree-linear-rmse', propertyTest: false },
    { caseId: 'voting-tie-and-tree', propertyTest: false },
  ]);
});
