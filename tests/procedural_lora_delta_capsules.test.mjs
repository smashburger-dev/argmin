// Procedural family formula-lora-delta-apply: capsule gates.
// Run: node --test tests/procedural_lora_delta_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/formula-lora-delta-apply.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

// The case defs do not carry `packages`; the JSON anchors pin it to ['numpy'],
// so the suite surface adds it for the verbatim anchor check.
const suiteMod = {
  ...mod,
  LORA_CASES: Object.fromEntries(
    Object.entries(mod.LORA_CASES).map(([id, def]) => [id, { ...def, packages: ['numpy'] }]),
  ),
};

codeCapsuleSuite('formula-lora-delta-apply', suiteMod, [
  { caseId: 'lora-delta-apply', difficulty: 'core' },
  { caseId: 'lora-delta-scaled-update', difficulty: 'stretch' },
], { difficultyProfiles: ['core', 'stretch'] });

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const core = mod.genLoraCase(seed, 'lora-delta-apply', mod.LORA_CASES['lora-delta-apply']);
    assert.ok(core.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.rank >= 1 && entry.rank <= 3, 'core rank');
      assert.equal(entry.A.length, entry.rank, 'core A rows = rank');
      assert.equal(entry.B[0].length, entry.rank, 'core B cols = rank');
      assert.equal(entry.B.length, entry.W.length, 'core dOut consistent');
      assert.equal(entry.W[0].length, entry.A[0].length, 'core dIn consistent');
      assert.equal(entry.alpha % entry.rank, 0, 'core alpha multiple of rank (exact scaling)');
      assert.ok(entry.A.flat().every((v) => v >= -3 && v <= 4), 'core A range');
    }
    const stretch = mod.genLoraCase(seed, 'lora-delta-scaled-update', mod.LORA_CASES['lora-delta-scaled-update']);
    assert.ok(stretch.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
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

test('family extras: spec carries the family id', () => {
  assert.equal(mod.FAMILY_SPEC.familyId, 'formula-lora-delta-apply');
});
