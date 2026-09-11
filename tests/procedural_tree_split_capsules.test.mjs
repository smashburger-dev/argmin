// Procedural family optimize-tree-best-split: capsule gates.
// Run: node --test tests/procedural_tree_split_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  TREE_CASES,
  TREE_CONTRACT,
  genTreeCase,
  generateTreeFamily,
  solveTreeFamily,
  treeCaseOk,
} from '../assets/js/core/procedural/optimize-tree-best-split.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['gini-best-binary-split', 'gini-three-class-candidates'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-tree-best-split.json'), 'utf8'));
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
    const def = TREE_CASES[caseId];
    assert.equal(body.difficultyProfile, def.difficulty, `${caseId}: difficulty`);
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy treeCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = TREE_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genTreeCase(seed, def);
      assert.ok(treeCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('__ref_gini'), `${caseId}:${seed}: gini prelude`);
      assert.ok(generated.parameters.tests.includes('__ref_split'), `${caseId}:${seed}: split prelude`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const binary = genTreeCase(seed, TREE_CASES['gini-best-binary-split']);
    assert.equal(binary.parameters.seedCases.length, 2, 'extraCount');
    for (const entry of binary.parameters.seedCases) {
      assert.ok(entry.x.length >= 4 && entry.x.length <= 6, 'x length');
      assert.ok(entry.x.every((v) => v >= 0 && v <= 9), 'x range');
      assert.ok(new Set(entry.x).size >= 2, 'x not degenerate');
      assert.equal(entry.y.length, entry.x.length, 'y aligned');
      assert.ok(entry.y.every((v) => v === 0 || v === 1), 'y binary');
    }
    const three = genTreeCase(seed, TREE_CASES['gini-three-class-candidates']);
    assert.equal(three.parameters.seedCases.length, 2, 'extraCount');
    for (const entry of three.parameters.seedCases) {
      assert.ok(entry.x.length >= 4 && entry.x.length <= 6, 'x length');
      assert.ok(entry.x.every((v) => v >= 0 && v <= 4), 'x range');
      assert.ok(new Set(entry.x).size >= 2, 'x not degenerate');
      assert.equal(entry.y.length, entry.x.length, 'y aligned');
      assert.ok(entry.y.every((v) => v >= 0 && v <= 2), 'y three classes');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = TREE_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateTreeFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = TREE_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genTreeCase(seed, def), genTreeCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = TREE_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateTreeFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveTreeFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(TREE_CONTRACT.familyId, 'optimize-tree-best-split');
  assert.equal(TREE_CONTRACT.authorityMode, 'seeded');
  assert.equal(TREE_CONTRACT.activityType, 'python-code');
  assert.equal(TREE_CONTRACT.graderId, 'pyodide');
  assert.equal(TREE_CONTRACT.masteryEligible, true);
  assert.deepEqual(TREE_CONTRACT.difficultyProfiles, ['core', 'stretch']);
  assert.deepEqual(TREE_CONTRACT.competencyIds, ['c-ml-ensembles', 'c-numpy-basics']);
  assert.deepEqual(TREE_CONTRACT.caseTypes, [
    { caseId: 'gini-best-binary-split', propertyTest: false },
    { caseId: 'gini-three-class-candidates', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateTreeFamily);
  assert.equal(FAMILY_SPEC.solve, solveTreeFamily);
  assert.throws(() => generateTreeFamily({ seed: 0, caseId: 'gini-best-binary-split', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateTreeFamily({ seed: 0, caseId: 'gini-three-class-candidates', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateTreeFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateTreeFamily({ seed: 1.5, caseId: 'gini-best-binary-split', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveTreeFamily({}), /Kapselform/);
});
