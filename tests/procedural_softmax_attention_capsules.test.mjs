// Procedural family optimize-softmax-attention-mask: capsule gates (python-code).
// Run: node --test tests/procedural_softmax_attention_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors. (procedural_attention_mask_capsules
// covers the sibling family construct-attention-mask.)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/optimize-softmax-attention-mask.mjs';
import {
  ATTN_CASES,
  genAttnCase,
} from '../assets/js/core/procedural/optimize-softmax-attention-mask.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const CASE_IDS = ['scaled-dot-product-attention', 'toy-forward-pass'];

const intMat = (m, lo, hi) => m.every((row) => row.every((v) => Number.isInteger(v) && v >= lo && v <= hi));

codeCapsuleSuite('optimize-softmax-attention-mask', mod, [
  { caseId: 'scaled-dot-product-attention', difficulty: 'core' },
  { caseId: 'toy-forward-pass', difficulty: 'stretch' },
], { familyGroup: 'optimize-update', difficultyProfiles: ['core', 'stretch'] });

test('capsule extras: seeded block marker stays emitted', () => {
  for (const caseId of CASE_IDS) {
    const def = ATTN_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genAttnCase(seed, caseId, def);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
    }
  }
});

test('seeded attention draws stay inside the declared domains', () => {
  const def = ATTN_CASES['scaled-dot-product-attention'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genAttnCase(seed, 'scaled-dot-product-attention', def);
    generated.parameters.seedCases.forEach((entry, i) => {
      const index = i + 1;
      const n = entry.Q.length;
      const dK = entry.Q[0].length;
      const m = entry.K.length;
      const dV = entry.V[0].length;
      assert.ok(n >= 2 && n <= 4, 'n range');
      assert.ok(m >= 2 && m <= 4, 'm range');
      assert.ok(dK >= 2 && dK <= 4, 'd_k range');
      assert.ok(dV >= 1 && dV <= 3, 'd_v range');
      assert.ok(entry.K.every((row) => row.length === dK), 'K cols match d_k');
      assert.ok(entry.V.length === m, 'V rows match m');
      assert.ok(intMat(entry.Q, -3, 3) && intMat(entry.K, -3, 3), 'Q/K int range');
      assert.ok(intMat(entry.V, -5, 5), 'V int range');
      if (entry.mask === null) {
        assert.ok(!generated.parameters.tests.includes(`seeded attn maske ${index}`), 'no mask check for null mask');
      } else {
        assert.equal(entry.mask.length, n, 'mask rows');
        assert.ok(entry.mask.every((row) => row.length === m), 'mask cols');
        assert.ok(entry.mask.every((row) => row.some((v) => v === true)), 'every query row keeps a visible key');
        assert.ok(generated.parameters.tests.includes(`seeded attn maske ${index}`), 'mask check emitted for drawn mask');
      }
    });
    assert.ok(generated.parameters.tests.includes('seeded attn 1'), 'attn seeded check emitted');
  }
});

test('seeded toy-forward draws stay inside the declared domains', () => {
  const def = ATTN_CASES['toy-forward-pass'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genAttnCase(seed, 'toy-forward-pass', def);
    for (const entry of generated.parameters.seedCases) {
      assert.ok(entry.ids.length >= 1 && entry.ids.length <= 4, 'ids length');
      assert.ok(entry.ids.every((v) => Number.isInteger(v) && v >= 0 && v <= 5), 'ids in vocab range');
      assert.ok(generated.parameters.tests.includes(`toy_forward([${entry.ids.join(', ')}], WEIGHTS)`), 'ids literal baked');
    }
    assert.ok(generated.parameters.tests.includes('seeded forward 1'), 'toy seeded check emitted');
  }
});
