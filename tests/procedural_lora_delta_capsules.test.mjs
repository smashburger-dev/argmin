// Procedural family formula-lora-delta-apply: capsule gates.
// Run: node --test tests/procedural_lora_delta_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  LORA_CASES,
  LORA_CONTRACT,
  genLoraCase,
  generateLoraFamily,
  solveLoraFamily,
  loraCaseOk,
} from '../assets/js/core/procedural/formula-lora-delta-apply.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['lora-delta-apply', 'lora-delta-scaled-update'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/formula-lora-delta-apply.json'), 'utf8'));
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
    const def = LORA_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy loraCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = LORA_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genLoraCase(seed, def);
      assert.ok(loraCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const core = genLoraCase(seed, LORA_CASES['lora-delta-apply']);
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.rank >= 1 && entry.rank <= 3, 'core rank');
      assert.equal(entry.A.length, entry.rank, 'core A rows = rank');
      assert.equal(entry.B[0].length, entry.rank, 'core B cols = rank');
      assert.equal(entry.B.length, entry.W.length, 'core dOut consistent');
      assert.equal(entry.W[0].length, entry.A[0].length, 'core dIn consistent');
      assert.equal(entry.alpha % entry.rank, 0, 'core alpha multiple of rank (exact scaling)');
      assert.ok(entry.A.flat().every((v) => v >= -3 && v <= 4), 'core A range');
    }
    const stretch = genLoraCase(seed, LORA_CASES['lora-delta-scaled-update']);
    for (const entry of stretch.parameters.seedCases) {
      assert.ok(entry.rank >= 1 && entry.rank <= 2, 'stretch rank');
      assert.equal(entry.A.length, entry.rank, 'stretch A rows = rank');
      assert.equal(entry.B[0].length, entry.rank, 'stretch B cols = rank');
      assert.equal(entry.B.length, entry.W.length, 'stretch dOut consistent');
      assert.equal(entry.W[0].length, entry.A[0].length, 'stretch dIn consistent');
      assert.equal(entry.alpha % entry.rank, 0, 'stretch alpha multiple of rank');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = LORA_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateLoraFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = LORA_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genLoraCase(seed, def), genLoraCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = LORA_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateLoraFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveLoraFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(LORA_CONTRACT.familyId, 'formula-lora-delta-apply');
  assert.equal(LORA_CONTRACT.authorityMode, 'seeded');
  assert.equal(LORA_CONTRACT.activityType, 'python-code');
  assert.equal(LORA_CONTRACT.graderId, 'pyodide');
  assert.equal(LORA_CONTRACT.masteryEligible, true);
  assert.deepEqual(LORA_CONTRACT.difficultyProfiles, ['core', 'stretch']);
  assert.throws(() => generateLoraFamily({ seed: 0, caseId: 'lora-delta-apply', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateLoraFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannt/);
  assert.throws(() => generateLoraFamily({ seed: 0.5, caseId: 'lora-delta-apply', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveLoraFamily({}), /Kapselform/);
  assert.equal(FAMILY_SPEC.familyId, 'formula-lora-delta-apply');
});
