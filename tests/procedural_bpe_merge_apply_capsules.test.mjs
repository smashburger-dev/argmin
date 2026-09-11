// Procedural family transform-bpe-merge-apply: capsule gates.
// Run: node --test tests/procedural_bpe_merge_apply_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  BPE_CASES,
  BPE_CONTRACT,
  genBpeCase,
  generateBpeFamily,
  solveBpeFamily,
  bpeCaseOk,
} from '../assets/js/core/procedural/transform-bpe-merge-apply.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['bpe-merge-apply', 'bpe-merge-tie-order'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/transform-bpe-merge-apply.json'), 'utf8'));
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
    const def = BPE_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
    assert.deepEqual(body.parameters.packages, def.packages, `${caseId}: packages verbatim`);
  }
});

test('capsule shape: generated parameters satisfy bpeCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = BPE_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genBpeCase(seed, def, caseId);
      assert.ok(bpeCaseOk(generated.parameters, def, caseId), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const wordChars = new Set(['a', 'b', 'e', 'l', 'o', 's', 't', 'w']);
  const tieChars = new Set(['a', 'b', 'c']);
  for (let seed = 0; seed < 200; seed += 1) {
    const core = genBpeCase(seed, BPE_CASES['bpe-merge-apply'], 'bpe-merge-apply');
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.word.length >= 3 && entry.word.length <= 6, 'word length');
      assert.ok([...entry.word].every((ch) => wordChars.has(ch)), 'word alphabet');
      assert.ok(entry.merges.length >= 2 && entry.merges.length <= 4, 'merge count');
      assert.ok(entry.merges.every(([a, b]) => a.length >= 1 && b.length >= 1), 'merge pairs non-empty');
    }
    const tie = genBpeCase(seed, BPE_CASES['bpe-merge-tie-order'], 'bpe-merge-tie-order');
    for (const entry of tie.parameters.seedCases) {
      assert.ok(entry.symbols.length >= 3 && entry.symbols.length <= 6, 'symbols length');
      assert.ok(entry.symbols.every((s) => tieChars.has(s)), 'symbols alphabet');
      assert.ok(entry.merges.length >= 1 && entry.merges.length <= 3, 'tie merge count');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = BPE_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateBpeFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = BPE_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genBpeCase(seed, def, caseId), genBpeCase(seed, def, caseId), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = BPE_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateBpeFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveBpeFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(BPE_CONTRACT.familyId, 'transform-bpe-merge-apply');
  assert.equal(BPE_CONTRACT.authorityMode, 'seeded');
  assert.equal(BPE_CONTRACT.activityType, 'python-code');
  assert.equal(BPE_CONTRACT.graderId, 'pyodide');
  assert.equal(BPE_CONTRACT.masteryEligible, true);
  assert.deepEqual(BPE_CONTRACT.difficultyProfiles, ['stretch', 'core']);
  assert.throws(() => generateBpeFamily({ seed: 0, caseId: 'bpe-merge-apply', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateBpeFamily({ seed: 0, caseId: 'nope', difficulty: 'stretch' }), /Unbekannt/);
  assert.throws(() => generateBpeFamily({ seed: 0.5, caseId: 'bpe-merge-apply', difficulty: 'stretch' }), /Seed/);
  assert.throws(() => solveBpeFamily({}), /Kapselform/);
  assert.equal(FAMILY_SPEC.familyId, 'transform-bpe-merge-apply');
});
