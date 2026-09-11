// Procedural family optimize-multi-head-attention: capsule gates.
// Run: node --test tests/procedural_mha_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/optimize-multi-head-attention.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The case defs do not carry `packages`; the JSON anchors pin it to ['numpy'],
// so the suite surface adds it for the verbatim anchor check.
const suiteMod = {
  ...mod,
  MHA_CASES: Object.fromEntries(
    Object.entries(mod.MHA_CASES).map(([id, def]) => [id, { ...def, packages: ['numpy'] }]),
  ),
};

codeCapsuleSuite('optimize-multi-head-attention', suiteMod, [
  { caseId: 'multi-head-attention', difficulty: 'challenge' },
], { difficultyProfiles: ['challenge'] });

test('anchor extras: difficulty profile, contract competencies and case types', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-multi-head-attention.json'), 'utf8'));
  const body = doc.cases.find((item) => item.caseId === 'multi-head-attention');
  assert.equal(body.difficultyProfile, mod.MHA_CASES['multi-head-attention'].difficulty, 'difficulty');
  assert.deepEqual(mod.MHA_CONTRACT.competencyIds, ['c-dl-attention', 'c-numpy-basics']);
  assert.deepEqual(mod.MHA_CONTRACT.caseTypes, [
    { caseId: 'multi-head-attention', propertyTest: false },
  ]);
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = mod.genMhaCase(seed, 'multi-head-attention', mod.MHA_CASES['multi-head-attention']);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(generated.parameters.tests.includes('seeded mha 1'), `${seed}: seeded check emitted`);
    assert.equal(generated.parameters.seedCases.length, 2, 'extraCount');
    for (const entry of generated.parameters.seedCases) {
      const { shape, X, Wq, Wk, Wv, Wo, mask } = entry;
      assert.ok(shape.n >= 2 && shape.n <= 4, 'seq len range');
      assert.ok(shape.d >= 2 && shape.d <= 8, 'd_model range');
      assert.ok(shape.h >= 1 && shape.h <= 4, 'n_heads range');
      assert.equal(shape.d % shape.h, 0, 'd_model divisible by n_heads');
      assert.equal(X.length, shape.n, 'X rows = n');
      for (const row of X) {
        assert.equal(row.length, shape.d, 'X cols = d');
        assert.ok(row.every((v) => v >= -2 && v <= 2), 'X range');
      }
      for (const [name, W, lo, hi] of [['Wq', Wq, -1, 1], ['Wk', Wk, -1, 1], ['Wv', Wv, -2, 2], ['Wo', Wo, -1, 1]]) {
        assert.equal(W.length, shape.d, `${name} rows = d`);
        for (const row of W) {
          assert.equal(row.length, shape.d, `${name} cols = d`);
          assert.ok(row.every((v) => v >= lo && v <= hi), `${name} range`);
        }
      }
      if (mask === null) continue;
      assert.equal(mask.length, shape.n, 'mask rows = n');
      mask.forEach((row, i) => {
        assert.equal(row.length, shape.n, 'mask cols = n');
        assert.equal(row[i], true, `mask row ${i} keeps its diagonal key`);
        assert.ok(row.some(Boolean), `mask row ${i} keeps at least one key`);
      });
    }
  }
});
