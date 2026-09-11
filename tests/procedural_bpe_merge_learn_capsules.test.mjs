// Procedural family optimize-bpe-merge-learn: capsule gates.
// Run: node --test tests/procedural_bpe_merge_learn_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  LEARN_CASES,
  LEARN_CONTRACT,
  genLearnCase,
  generateLearnFamily,
  learnCaseOk,
  solveLearnFamily,
} from '../assets/js/core/procedural/optimize-bpe-merge-learn.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['bpe-merge-learn'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-bpe-merge-learn.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 1);
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.ok(body, `${caseId}: anchor missing`);
    const def = LEARN_CASES[caseId];
    assert.equal(body.difficultyProfile, def.difficulty, `${caseId}: difficulty`);
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.kind, 'reference-solver');
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
    assert.deepEqual(body.parameters.packages, def.packages, `${caseId}: packages verbatim`);
    assert.ok(body.parameters.tests.includes('__check'), `${caseId}: base tests preserved`);
  }
});

test('capsule shape: generated parameters satisfy learnCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = LEARN_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genLearnCase(seed, def);
      assert.ok(learnCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('def __ref_learn('), `${caseId}:${seed}: ref preamble`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const def = LEARN_CASES['bpe-merge-learn'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genLearnCase(seed, def);
    assert.equal(generated.parameters.seedCases.length, 3, 'extraCount');
    for (const entry of generated.parameters.seedCases) {
      assert.ok(entry.corpus.length >= 4 && entry.corpus.length <= 12, `corpus length: ${entry.corpus.length}`);
      const counts = new Map();
      for (const word of entry.corpus) {
        assert.match(word, /^[abelnorstw]{3,5}$/, `word shape: ${word}`);
        counts.set(word, (counts.get(word) || 0) + 1);
      }
      // every stem repeats at least twice so a merge with count >= 2 exists
      for (const count of counts.values()) {
        assert.ok(count >= 2, 'each stem repeated >= 2');
      }
      assert.ok(counts.size >= 2 && counts.size <= 4, `distinct stems: ${counts.size}`);
      assert.ok(entry.numMerges >= 2 && entry.numMerges <= 6, `numMerges: ${entry.numMerges}`);
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = LEARN_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateLearnFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = LEARN_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genLearnCase(seed, def), genLearnCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = LEARN_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateLearnFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveLearnFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(LEARN_CONTRACT.familyId, 'optimize-bpe-merge-learn');
  assert.equal(LEARN_CONTRACT.authorityMode, 'seeded');
  assert.equal(LEARN_CONTRACT.activityType, 'python-code');
  assert.equal(LEARN_CONTRACT.graderId, 'pyodide');
  assert.equal(LEARN_CONTRACT.masteryEligible, true);
  assert.deepEqual(LEARN_CONTRACT.difficultyProfiles, ['challenge']);
  assert.deepEqual(LEARN_CONTRACT.competencyIds, ['c-dl-tokenizer', 'c-python-collections']);
  assert.deepEqual(LEARN_CONTRACT.caseTypes, [{ caseId: 'bpe-merge-learn', propertyTest: false }]);
  assert.equal(FAMILY_SPEC.generate, generateLearnFamily);
  assert.equal(FAMILY_SPEC.solve, solveLearnFamily);
  assert.throws(() => generateLearnFamily({ seed: 0, caseId: 'bpe-merge-learn', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateLearnFamily({ seed: 0, caseId: 'nope', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generateLearnFamily({ seed: 1.5, caseId: 'bpe-merge-learn', difficulty: 'challenge' }), /Seed/);
  assert.throws(() => solveLearnFamily({}), /Kapselform/);
});
