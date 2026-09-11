// Procedural family construct-attention-mask: capsule gates.
// Run: node --test tests/procedural_attention_mask_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/construct-attention-mask.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

// The case defs do not carry `packages`; the JSON anchors pin it to ['numpy'],
// so the suite surface adds it for the verbatim anchor check.
const suiteMod = {
  ...mod,
  ATTENTION_MASK_CASES: Object.fromEntries(
    Object.entries(mod.ATTENTION_MASK_CASES).map(([id, def]) => [id, { ...def, packages: ['numpy'] }]),
  ),
};

codeCapsuleSuite('construct-attention-mask', suiteMod, [
  { caseId: 'construct-causal-padding-mask', difficulty: 'stretch' },
  { caseId: 'construct-padding-mask-softmax', difficulty: 'core' },
], { familyGroup: 'construct-program', difficultyProfiles: ['stretch', 'core'] });

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

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const full = mod.genAttentionMaskCase(seed, 'construct-causal-padding-mask', mod.ATTENTION_MASK_CASES['construct-causal-padding-mask']);
    for (const entry of full.parameters.seedCases) {
      assert.ok(Number.isInteger(entry.n) && entry.n >= 2 && entry.n <= 6, 'n range');
      assertEntryDomains(entry, 'construct-causal-padding-mask');
      assert.ok(full.parameters.tests.includes(`causal_mask(${entry.n})`), `${seed}: n literal baked`);
    }
    const pair = mod.genAttentionMaskCase(seed, 'construct-padding-mask-softmax', mod.ATTENTION_MASK_CASES['construct-padding-mask-softmax']);
    for (const generated of [full, pair]) {
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('seeded softmax 1'), `${seed}: seeded checks`);
    }
    for (const entry of pair.parameters.seedCases) {
      assertEntryDomains(entry, 'construct-padding-mask-softmax');
      assert.equal(entry.n, undefined, 'pair case draws no causal size');
    }
  }
});

test('family extras: contract competencies and case types', () => {
  assert.deepEqual(mod.ATTENTION_MASK_CONTRACT.competencyIds, ['c-dl-attention', 'c-numpy-basics']);
  assert.deepEqual(mod.ATTENTION_MASK_CONTRACT.caseTypes, [
    { caseId: 'construct-causal-padding-mask', propertyTest: false },
    { caseId: 'construct-padding-mask-softmax', propertyTest: false },
  ]);
});
