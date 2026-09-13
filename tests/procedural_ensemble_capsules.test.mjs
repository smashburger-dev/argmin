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
    const challenge = mod.genEnsembleCase(seed, 'voting-tie-and-tree', mod.ENSEMBLE_CASES['voting-tie-and-tree']);
    assert.ok(challenge.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(challenge.parameters.tests.includes('seeded vote 1'), `${seed}: seeded checks`);
    assert.equal(challenge.parameters.seedCases.length, 2, 'challenge extraCount');
    for (const entry of challenge.parameters.seedCases) {
      const m = entry.preds.length;
      assert.ok(m === 2 || m === 4, 'challenge: even model count');
      assertPreds(entry.preds, 2, 4, 3, 6, 1, 'challenge.preds');
      assert.equal(
        entry.preds.filter((row) => row[0] === 1).length,
        m / 2,
        'challenge: column 0 is an exact tie',
      );
      assertTree(entry.tree, 0, 'challenge.tree');
      assert.ok(!('leaf' in entry.tree.left), 'challenge: left child splits again');
      assert.ok('leaf' in entry.tree.right, 'challenge: right child is a leaf');
      assert.ok(
        'leaf' in entry.tree.left.left && 'leaf' in entry.tree.left.right,
        'challenge: depth-2 tree',
      );
      assert.ok(Number.isInteger(entry.xval) && entry.xval >= 0 && entry.xval <= 8, 'challenge: xval range');
      assertCompareData(entry, 'challenge');
      assert.ok(challenge.parameters.tests.includes('seeded vote tie'), 'challenge: tie check baked');
      assert.ok(challenge.parameters.tests.includes('seeded linear rmse'), 'challenge: linear rmse check baked');
    }
  }
});

test('challenge case: trio substance, tie rule only in prompt and tests', () => {
  const trio = mod.ENSEMBLE_CASES['voting-tree-linear-rmse'];
  const challenge = mod.ENSEMBLE_CASES['voting-tie-and-tree'];
  assert.ok(!challenge.starterCode.includes('tie'), 'starter leaves the tie rule unstated');
  assert.ok(challenge.prompt.includes('Gleichstand'), 'prompt carries the tie rule');
  assert.ok(
    challenge.baseTests.startsWith('__check("tie counts as one", majority_vote([[1, 0], [0, 0]]) == [1, 0])'),
    'base tests open with the tie check',
  );
  assert.ok(challenge.baseTests.endsWith(trio.baseTests), 'trio base block appended');
  assert.equal(challenge.referenceSolver, trio.referenceSolver, 'shared reference solver');
  assert.equal(challenge.fullSolution, trio.fullSolution, 'shared full solution');
  assert.equal(challenge.prompt, trio.prompt, 'shared prompt');
});

test('family extras: contract competencies and case types', () => {
  assert.deepEqual(mod.ENSEMBLE_CONTRACT.competencyIds, ['c-ml-ensembles', 'c-numpy-basics']);
  assert.deepEqual(mod.ENSEMBLE_CONTRACT.caseTypes, [
    { caseId: 'voting-tree-linear-rmse', propertyTest: false },
    { caseId: 'voting-tie-and-tree', propertyTest: false },
  ]);
});
