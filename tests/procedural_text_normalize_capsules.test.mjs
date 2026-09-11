// Procedural family validate-text-normalize-match: capsule gates.
// Run: node --test tests/procedural_text_normalize_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  TEXT_MATCH_CASES,
  TEXT_MATCH_CONTRACT,
  genTextMatchCase,
  generateTextMatchFamily,
  solveTextMatchFamily,
  textMatchCaseOk,
} from '../assets/js/core/procedural/validate-text-normalize-match.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['text-normalize-match'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/validate-text-normalize-match.json'), 'utf8'));
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
    const def = TEXT_MATCH_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.deepEqual(body.parameters.packages, def.packages, `${caseId}: packages verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy textMatchCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = TEXT_MATCH_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genTextMatchCase(seed, def);
      assert.ok(textMatchCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('seeded testbar 1'), `${caseId}:${seed}: seeded checks`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const def = TEXT_MATCH_CASES['text-normalize-match'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genTextMatchCase(seed, def);
    for (const entry of generated.parameters.seedCases) {
      assert.ok(typeof entry.frage === 'string' && entry.frage.length > 5, 'frage non-empty');
      const { text, uv, dv, kaputt } = entry.hypothesen;
      // well-formed hypothesis keeps the fixed word-index split intact
      assert.match(text, /^Je \S+ .+, desto \S+ .+/u, 'Je-desto shape');
      const kern = text.replace(/\.$/, '');
      const [front, back] = kern.split(', desto ');
      assert.ok(front.startsWith('Je '), 'front starts with Je');
      assert.equal(front.split(' ').slice(2).join(' ').toLowerCase(), uv, 'uv = words from index 2');
      assert.equal(back.split(' ').slice(1).join(' ').toLowerCase(), dv, 'dv = words from index 1');
      // malformed input must hit the ValueError path of the contract:
      // len(split(', desto ')) != 2 or the front part does not start 'Je '
      const kaputtParts = kaputt.split(', desto ');
      assert.ok(kaputtParts.length !== 2 || !kaputtParts[0].startsWith('Je '), 'kaputt is malformed');
      // drawn literals are baked into the emitted test block
      assert.ok(generated.parameters.tests.includes(JSON.stringify(entry.frage)), 'frage literal baked');
      assert.ok(generated.parameters.tests.includes(JSON.stringify(text)), 'hypothesis literal baked');
    }
    assert.ok(generated.parameters.tests.includes('__ref_is_testable'), 'ref copy emitted');
    assert.ok(generated.parameters.tests.includes('__ref_extract_variables'), 'ref copy emitted');
    assert.ok(generated.parameters.tests.includes('seeded je-desto fehler 1'), 'ValueError path check emitted');
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = TEXT_MATCH_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateTextMatchFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = TEXT_MATCH_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genTextMatchCase(seed, def), genTextMatchCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = TEXT_MATCH_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateTextMatchFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveTextMatchFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(TEXT_MATCH_CONTRACT.familyId, 'validate-text-normalize-match');
  assert.equal(TEXT_MATCH_CONTRACT.familyGroup, 'validate-contract');
  assert.equal(TEXT_MATCH_CONTRACT.authorityMode, 'seeded');
  assert.equal(TEXT_MATCH_CONTRACT.activityType, 'python-code');
  assert.equal(TEXT_MATCH_CONTRACT.graderId, 'pyodide');
  assert.equal(TEXT_MATCH_CONTRACT.masteryEligible, true);
  assert.deepEqual(TEXT_MATCH_CONTRACT.difficultyProfiles, ['core']);
  assert.equal(FAMILY_SPEC.generate, generateTextMatchFamily);
  assert.equal(FAMILY_SPEC.solve, solveTextMatchFamily);
  assert.throws(() => generateTextMatchFamily({ seed: 0, caseId: 'text-normalize-match', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateTextMatchFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateTextMatchFamily({ seed: 0.5, caseId: 'text-normalize-match', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveTextMatchFamily({}), /Kapselform/);
});
