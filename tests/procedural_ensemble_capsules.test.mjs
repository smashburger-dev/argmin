// Procedural family construct-ensemble-predictor-comparison: capsule gates.
// Run: node --test tests/procedural_ensemble_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENSEMBLE_CASES,
  ENSEMBLE_CONTRACT,
  FAMILY_SPEC,
  ensembleCaseOk,
  genEnsembleCase,
  generateEnsembleFamily,
  solveEnsembleFamily,
} from '../assets/js/core/procedural/construct-ensemble-predictor-comparison.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['voting-tree-linear-rmse', 'voting-tie-and-tree'];

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

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/construct-ensemble-predictor-comparison.json'), 'utf8'));
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
    const def = ENSEMBLE_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy ensembleCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = ENSEMBLE_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genEnsembleCase(seed, def);
      assert.ok(ensembleCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('seeded vote 1'), `${caseId}:${seed}: seeded checks`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const trio = genEnsembleCase(seed, ENSEMBLE_CASES['voting-tree-linear-rmse']);
    assert.equal(trio.parameters.seedCases.length, 2, 'trio extraCount');
    for (const entry of trio.parameters.seedCases) {
      assertPreds(entry.preds, 2, 5, 3, 6, 1, 'trio.preds');
      assertTree(entry.tree, 0, 'trio.tree');
      assert.ok(Number.isInteger(entry.xval) && entry.xval >= 0 && entry.xval <= 8, 'trio: xval range');
      assertCompareData(entry, 'trio');
      assert.ok(trio.parameters.tests.includes('majority_vote(__p'), 'trio: vote literal baked');
      assert.ok(trio.parameters.tests.includes('seeded linear rmse'), 'trio: linear rmse check baked');
    }
    const flat = genEnsembleCase(seed, ENSEMBLE_CASES['voting-tie-and-tree']);
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

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = ENSEMBLE_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateEnsembleFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = ENSEMBLE_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genEnsembleCase(seed, def), genEnsembleCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = ENSEMBLE_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateEnsembleFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveEnsembleFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(ENSEMBLE_CONTRACT.familyId, 'construct-ensemble-predictor-comparison');
  assert.equal(ENSEMBLE_CONTRACT.familyGroup, 'construct-program');
  assert.equal(ENSEMBLE_CONTRACT.authorityMode, 'seeded');
  assert.equal(ENSEMBLE_CONTRACT.activityType, 'python-code');
  assert.equal(ENSEMBLE_CONTRACT.graderId, 'pyodide');
  assert.equal(ENSEMBLE_CONTRACT.masteryEligible, true);
  assert.deepEqual(ENSEMBLE_CONTRACT.difficultyProfiles, ['stretch', 'challenge']);
  assert.deepEqual(ENSEMBLE_CONTRACT.competencyIds, ['c-ml-ensembles', 'c-numpy-basics']);
  assert.deepEqual(ENSEMBLE_CONTRACT.caseTypes, [
    { caseId: 'voting-tree-linear-rmse', propertyTest: false },
    { caseId: 'voting-tie-and-tree', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateEnsembleFamily);
  assert.equal(FAMILY_SPEC.solve, solveEnsembleFamily);
  assert.throws(() => generateEnsembleFamily({ seed: 0, caseId: 'voting-tree-linear-rmse', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generateEnsembleFamily({ seed: 0, caseId: 'nope', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateEnsembleFamily({ seed: 0.5, caseId: 'voting-tie-and-tree', difficulty: 'challenge' }), /Seed/);
  assert.throws(() => solveEnsembleFamily({}), /Kapselform/);
});
