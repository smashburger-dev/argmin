// Procedural family transform-tokenize-roundtrip: capsule gates.
// Run: node --test tests/procedural_tokenize_roundtrip_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  TOKENIZE_CASES,
  TOKENIZE_CONTRACT,
  genTokenizeCase,
  generateTokenizeFamily,
  solveTokenizeFamily,
  tokenizeCaseOk,
} from '../assets/js/core/procedural/transform-tokenize-roundtrip.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['char-encode-roundtrip', 'subword-unk-roundtrip'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/transform-tokenize-roundtrip.json'), 'utf8'));
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
    const def = TOKENIZE_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
    assert.deepEqual(body.parameters.packages, def.packages, `${caseId}: packages verbatim`);
  }
});

test('capsule shape: generated parameters satisfy tokenizeCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = TOKENIZE_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genTokenizeCase(seed, def, caseId);
      assert.ok(tokenizeCaseOk(generated.parameters, def, caseId), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const charVocab = new Set(['a', 'b', 'c', 'd', 'e', 'l', 'o', 's', 't', 'w']);
  const knownTokens = new Set(['<pad>', '<unk>', 'hello', 'world']);
  for (let seed = 0; seed < 200; seed += 1) {
    const core = genTokenizeCase(seed, TOKENIZE_CASES['char-encode-roundtrip'], 'char-encode-roundtrip');
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.words.length >= 1 && entry.words.length <= 3, 'core word count');
      for (const word of entry.words) {
        assert.ok(word.length >= 1 && word.length <= 5, 'core word length');
        assert.ok([...word].every((ch) => charVocab.has(ch)), `core char in vocab: ${word}`);
      }
    }
    const stretch = genTokenizeCase(seed, TOKENIZE_CASES['subword-unk-roundtrip'], 'subword-unk-roundtrip');
    for (const entry of stretch.parameters.seedCases) {
      assert.ok(entry.tokens.length >= 2 && entry.tokens.length <= 4, 'stretch token count');
      assert.ok(entry.tokens.every((t) => typeof t === 'string' && t.length > 0), 'stretch tokens non-empty');
      assert.ok(entry.tokens.some((t) => !knownTokens.has(t)) || entry.tokens.some((t) => knownTokens.has(t)), 'stretch token mix');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = TOKENIZE_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateTokenizeFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = TOKENIZE_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genTokenizeCase(seed, def, caseId), genTokenizeCase(seed, def, caseId), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = TOKENIZE_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateTokenizeFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveTokenizeFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(TOKENIZE_CONTRACT.familyId, 'transform-tokenize-roundtrip');
  assert.equal(TOKENIZE_CONTRACT.authorityMode, 'seeded');
  assert.equal(TOKENIZE_CONTRACT.activityType, 'python-code');
  assert.equal(TOKENIZE_CONTRACT.graderId, 'pyodide');
  assert.equal(TOKENIZE_CONTRACT.masteryEligible, true);
  assert.deepEqual(TOKENIZE_CONTRACT.difficultyProfiles, ['core', 'stretch']);
  assert.throws(() => generateTokenizeFamily({ seed: 0, caseId: 'char-encode-roundtrip', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateTokenizeFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannt/);
  assert.throws(() => generateTokenizeFamily({ seed: 0.5, caseId: 'char-encode-roundtrip', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveTokenizeFamily({}), /Kapselform/);
  assert.equal(FAMILY_SPEC.familyId, 'transform-tokenize-roundtrip');
});
