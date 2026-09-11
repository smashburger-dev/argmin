// Procedural family reproduce-seeded-split: capsule gates.
// Run: node --test tests/procedural_seeded_split_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  SPLIT_CASES,
  SPLIT_CONTRACT,
  genSplitCase,
  generateSplitFamily,
  solveSplitFamily,
  splitCaseOk,
} from '../assets/js/core/procedural/reproduce-seeded-split.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['deterministic-split-numpy', 'kfold-indices-numpy'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/reproduce-seeded-split.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, CASE_IDS.length);
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
    const def = SPLIT_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.deepEqual(body.parameters.packages, def.packages, `${caseId}: packages verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy splitCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = SPLIT_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genSplitCase(seed, caseId, def);
      assert.ok(splitCaseOk(generated.parameters, caseId, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
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

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = SPLIT_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateSplitFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = SPLIT_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genSplitCase(seed, caseId, def), genSplitCase(seed, caseId, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = SPLIT_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateSplitFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveSplitFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(SPLIT_CONTRACT.familyId, 'reproduce-seeded-split');
  assert.equal(SPLIT_CONTRACT.familyGroup, 'reproduce-hash');
  assert.equal(SPLIT_CONTRACT.authorityMode, 'seeded');
  assert.equal(SPLIT_CONTRACT.activityType, 'python-code');
  assert.equal(SPLIT_CONTRACT.graderId, 'pyodide');
  assert.equal(SPLIT_CONTRACT.masteryEligible, true);
  assert.deepEqual(SPLIT_CONTRACT.difficultyProfiles, ['core']);
  assert.equal(FAMILY_SPEC.generate, generateSplitFamily);
  assert.equal(FAMILY_SPEC.solve, solveSplitFamily);
  assert.throws(() => generateSplitFamily({ seed: 0, caseId: 'deterministic-split-numpy', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateSplitFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateSplitFamily({ seed: 0.5, caseId: 'deterministic-split-numpy', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveSplitFamily({}), /Kapselform/);
});
