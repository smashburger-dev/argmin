// Procedural family optimize-tree-best-split: capsule gates (python-code).
// Run: node --test tests/procedural_tree_split_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/optimize-tree-best-split.mjs';
import {
  TREE_CASES,
  TREE_CONTRACT,
  genTreeCase,
} from '../assets/js/core/procedural/optimize-tree-best-split.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['gini-best-binary-split', 'gini-three-class-candidates'];

codeCapsuleSuite('optimize-tree-best-split', mod, [
  { caseId: 'gini-best-binary-split', difficulty: 'core' },
  { caseId: 'gini-three-class-candidates', difficulty: 'stretch' },
], { difficultyProfiles: ['core', 'stretch'] });

test('anchor extras: difficulty profiles stay pinned to the JSON cases', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-tree-best-split.json'), 'utf8'));
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.equal(body.difficultyProfile, TREE_CASES[caseId].difficulty, `${caseId}: difficulty`);
  }
});

test('capsule extras: seeded block marker and ref preludes stay emitted', () => {
  for (const caseId of CASE_IDS) {
    const def = TREE_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genTreeCase(seed, caseId, def);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('__ref_gini'), `${caseId}:${seed}: gini prelude`);
      assert.ok(generated.parameters.tests.includes('__ref_split'), `${caseId}:${seed}: split prelude`);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const binary = genTreeCase(seed, 'gini-best-binary-split', TREE_CASES['gini-best-binary-split']);
    assert.equal(binary.parameters.seedCases.length, 2, 'extraCount');
    for (const entry of binary.parameters.seedCases) {
      assert.ok(entry.x.length >= 4 && entry.x.length <= 6, 'x length');
      assert.ok(entry.x.every((v) => v >= 0 && v <= 9), 'x range');
      assert.ok(new Set(entry.x).size >= 2, 'x not degenerate');
      assert.equal(entry.y.length, entry.x.length, 'y aligned');
      assert.ok(entry.y.every((v) => v === 0 || v === 1), 'y binary');
    }
    const three = genTreeCase(seed, 'gini-three-class-candidates', TREE_CASES['gini-three-class-candidates']);
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

test('family extras: contract archetype, competencies and case types', () => {
  assert.equal(TREE_CONTRACT.taskArchetype, 'code-tests');
  assert.deepEqual(TREE_CONTRACT.competencyIds, ['c-ml-ensembles', 'c-numpy-basics']);
  assert.deepEqual(TREE_CONTRACT.caseTypes, [
    { caseId: 'gini-best-binary-split', propertyTest: false },
    { caseId: 'gini-three-class-candidates', propertyTest: false },
  ]);
});
