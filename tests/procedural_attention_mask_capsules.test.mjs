// Procedural family construct-attention-mask: capsule gates.
// Run: node --test tests/procedural_attention_mask_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ATTENTION_MASK_CASES,
  ATTENTION_MASK_CONTRACT,
  FAMILY_SPEC,
  attentionMaskCaseOk,
  genAttentionMaskCase,
  generateAttentionMaskFamily,
  solveAttentionMaskFamily,
} from '../assets/js/core/procedural/construct-attention-mask.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['construct-causal-padding-mask', 'construct-padding-mask-softmax'];

// Shared domain invariants for one drawn seed entry.
function assertEntryDomains(entry, caseId) {
  assert.ok(Number.isInteger(entry.L) && entry.L >= 2 && entry.L <= 5, `${caseId}: L range`);
  assert.ok(entry.lengths.length >= 1 && entry.lengths.length <= 3, `${caseId}: lengths count`);
  assert.ok(
    entry.lengths.every((v) => Number.isInteger(v) && v >= 0 && v <= entry.L),
    `${caseId}: lengths within [0, L]`,
  );
  assert.ok(entry.scores.length >= 1 && entry.scores.length <= 2, `${caseId}: score rows`);
  const cols = entry.scores[0].length;
  assert.ok(cols >= 2 && cols <= 4, `${caseId}: score cols`);
  assert.ok(
    entry.scores.every((row) => row.length === cols && row.every((v) => Number.isInteger(v) && v >= -6 && v <= 6)),
    `${caseId}: score values`,
  );
  assert.equal(entry.mask.length, entry.scores.length, `${caseId}: mask rows match`);
  assert.ok(
    entry.mask.every((row) => row.length === cols && row.every((v) => v === true || v === false)),
    `${caseId}: mask shape/values`,
  );
  assert.ok(entry.mask.every((row) => row.some(Boolean)), `${caseId}: every mask row keeps a visible cell`);
  assert.equal(entry.badLengths.length, entry.lengths.length, `${caseId}: badLengths length`);
  assert.equal(
    entry.badLengths.filter((v) => v < 0 || v > entry.L).length,
    1,
    `${caseId}: exactly one out-of-range length`,
  );
}

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/construct-attention-mask.json'), 'utf8'));
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
    const def = ATTENTION_MASK_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy attentionMaskCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = ATTENTION_MASK_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genAttentionMaskCase(seed, def);
      assert.ok(attentionMaskCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('seeded softmax 1'), `${caseId}:${seed}: seeded checks`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const full = genAttentionMaskCase(seed, ATTENTION_MASK_CASES['construct-causal-padding-mask']);
    for (const entry of full.parameters.seedCases) {
      assert.ok(Number.isInteger(entry.n) && entry.n >= 2 && entry.n <= 6, 'n range');
      assertEntryDomains(entry, 'construct-causal-padding-mask');
      assert.ok(full.parameters.tests.includes(`causal_mask(${entry.n})`), `${seed}: n literal baked`);
    }
    const pair = genAttentionMaskCase(seed, ATTENTION_MASK_CASES['construct-padding-mask-softmax']);
    for (const entry of pair.parameters.seedCases) {
      assertEntryDomains(entry, 'construct-padding-mask-softmax');
      assert.equal(entry.n, undefined, 'pair case draws no causal size');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = ATTENTION_MASK_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateAttentionMaskFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = ATTENTION_MASK_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genAttentionMaskCase(seed, def), genAttentionMaskCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = ATTENTION_MASK_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateAttentionMaskFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveAttentionMaskFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(ATTENTION_MASK_CONTRACT.familyId, 'construct-attention-mask');
  assert.equal(ATTENTION_MASK_CONTRACT.familyGroup, 'construct-program');
  assert.equal(ATTENTION_MASK_CONTRACT.authorityMode, 'seeded');
  assert.equal(ATTENTION_MASK_CONTRACT.activityType, 'python-code');
  assert.equal(ATTENTION_MASK_CONTRACT.graderId, 'pyodide');
  assert.equal(ATTENTION_MASK_CONTRACT.masteryEligible, true);
  assert.deepEqual(ATTENTION_MASK_CONTRACT.difficultyProfiles, ['stretch', 'core']);
  assert.deepEqual(ATTENTION_MASK_CONTRACT.competencyIds, ['c-dl-attention', 'c-numpy-basics']);
  assert.deepEqual(ATTENTION_MASK_CONTRACT.caseTypes, [
    { caseId: 'construct-causal-padding-mask', propertyTest: false },
    { caseId: 'construct-padding-mask-softmax', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateAttentionMaskFamily);
  assert.equal(FAMILY_SPEC.solve, solveAttentionMaskFamily);
  assert.throws(() => generateAttentionMaskFamily({ seed: 0, caseId: 'construct-causal-padding-mask', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateAttentionMaskFamily({ seed: 0, caseId: 'nope', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateAttentionMaskFamily({ seed: 0.5, caseId: 'construct-padding-mask-softmax', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveAttentionMaskFamily({}), /Kapselform/);
});
