// Procedural family reproduce-canonical-hash-verify: capsule gates.
// Run: node --test tests/procedural_canonical_hash_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  HASH_CASES,
  HASH_CONTRACT,
  genHashCase,
  generateHashFamily,
  hashCaseOk,
  solveHashFamily,
} from '../assets/js/core/procedural/reproduce-canonical-hash-verify.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['canonical-hash-verify'];

const ANSWER_POOL = [
  'Die Lieferzeit betraegt 3 Werktage.',
  'Die Frist endet nach 30 Tagen.',
  'Der Vertrag laeuft 12 Monate.',
  'Die Garantie deckt Herstellungsfehler ab.',
  'Die Rueckgabe ist 14 Tage lang moeglich.',
  'Der Support antwortet innerhalb von 24 Stunden.',
  'Die Kuendigungsfrist betraegt 4 Wochen.',
  'Die Aktivierung erfolgt nach der Anmeldung.',
];
const SOURCE_POOL = ['faq-3', 'vertrag-1', 'vertrag-2', 'agb-7', 'handbuch-2'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/reproduce-canonical-hash-verify.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 1);
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
    const def = HASH_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.deepEqual(body.parameters.packages, [], `${caseId}: packages verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: solution verbatim`);
  }
});

test('capsule shape: generated parameters satisfy hashCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = HASH_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genHashCase(seed, def);
      assert.ok(hashCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('__ref_build_golden'), `${caseId}:${seed}: inline oracle`);
      assert.ok(generated.parameters.tests.includes('hashlib.sha256'), `${caseId}:${seed}: digest recomputed inline`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const def = HASH_CASES['canonical-hash-verify'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genHashCase(seed, def);
    assert.equal(generated.parameters.seedCases.length, 3, 'three draws per capsule');
    for (const entry of generated.parameters.seedCases) {
      assert.ok(entry.entries.length >= 2 && entry.entries.length <= 5, 'entry count 2-5');
      const ids = entry.entries.map((e) => e.id);
      assert.equal(new Set(ids).size, ids.length, 'ids unique');
      for (const item of entry.entries) {
        assert.match(item.id, /^(faq|vertrag|agb|handbuch)-\d{2}$/, `id shape: ${item.id}`);
        assert.ok(ANSWER_POOL.includes(item.antwort), `antwort pool: ${item.antwort}`);
        assert.ok(item.quellen.length >= 1 && item.quellen.length <= 2, 'quellen 1-2');
        assert.equal(new Set(item.quellen).size, item.quellen.length, 'quellen unique');
        assert.ok(item.quellen.every((q) => SOURCE_POOL.includes(q)), 'quellen domain');
      }
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = HASH_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateHashFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = HASH_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genHashCase(seed, def), genHashCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = HASH_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateHashFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveHashFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(HASH_CONTRACT.familyId, 'reproduce-canonical-hash-verify');
  assert.equal(HASH_CONTRACT.authorityMode, 'seeded');
  assert.equal(HASH_CONTRACT.taskArchetype, 'code-test');
  assert.equal(HASH_CONTRACT.activityType, 'python-code');
  assert.equal(HASH_CONTRACT.graderId, 'pyodide');
  assert.equal(HASH_CONTRACT.masteryEligible, true);
  assert.deepEqual(HASH_CONTRACT.difficultyProfiles, ['core']);
  assert.deepEqual(HASH_CONTRACT.competencyIds, ['c-python-functions', 'c-research-capstone']);
  assert.equal(FAMILY_SPEC.generate, generateHashFamily);
  assert.throws(() => generateHashFamily({ seed: 0, caseId: 'canonical-hash-verify', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateHashFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateHashFamily({ seed: 0.5, caseId: 'canonical-hash-verify', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveHashFamily({}), /Kapselform/);
});
