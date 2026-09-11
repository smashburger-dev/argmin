// Procedural family aggregate-parity-threshold-selection: capsule gates (python-code).
// Run: node --test tests/procedural_parity_threshold_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/aggregate-parity-threshold-selection.mjs';
import {
  PARITY_THRESHOLD_CASES,
  genParityThresholdCase,
} from '../assets/js/core/procedural/aggregate-parity-threshold-selection.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('aggregate-parity-threshold-selection', mod, [
  { caseId: 'parity-threshold-selection', difficulty: 'stretch' },
], { familyGroup: 'aggregate-count', difficultyProfiles: ['stretch'] });

test('seeded draws stay inside the declared domains', () => {
  const def = PARITY_THRESHOLD_CASES['parity-threshold-selection'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genParityThresholdCase(seed, 'parity-threshold-selection', def);
    for (const entry of generated.parameters.seedCases) {
      assert.ok(entry.kandidaten.length >= 3 && entry.kandidaten.length <= 5, 'kandidaten count');
      const schwellen = entry.kandidaten.map((k) => k.schwelle);
      assert.ok(schwellen.every((s) => s >= 0.3 && s <= 0.9 && Math.abs(s * 100 - Math.round(s * 100)) < 1e-9), 'schwelle grid');
      assert.ok(new Set(schwellen).size === schwellen.length, 'schwellen distinct');
      assert.ok(schwellen.every((s, i) => i === 0 || schwellen[i - 1] < s), 'schwellen ascending');
      for (const k of entry.kandidaten) {
        assert.ok(k.selrate.a >= 0.5 && k.selrate.a <= 0.95, 'selrate a range');
        assert.ok(k.selrate.b >= 0.5 && k.selrate.b <= 0.95, 'selrate b range');
        assert.ok(k.f1 >= 0.6 && k.f1 <= 0.92, 'f1 range');
      }
      assert.equal(entry.bands.length, 2, 'two bands per draw');
      assert.ok(entry.bands.every((b) => b >= 0.02 && b <= 0.25), 'band range');
      assert.ok(entry.cost.tokenIn % 1000 === 0 && entry.cost.tokenIn >= 10000 && entry.cost.tokenIn <= 500000, 'tokenIn');
      assert.ok(entry.cost.tokenOut % 1000 === 0 && entry.cost.tokenOut >= 10000 && entry.cost.tokenOut <= 500000, 'tokenOut');
      assert.ok(entry.cost.preisIn >= 0.5 && entry.cost.preisIn <= 6.0, 'preisIn');
      assert.ok(entry.cost.preisOut >= 0.5 && entry.cost.preisOut <= 6.0, 'preisOut');
    }
  }
});

test('seeded test block: seeded markers stay embedded in the emitted tests', () => {
  const def = PARITY_THRESHOLD_CASES['parity-threshold-selection'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genParityThresholdCase(seed, 'parity-threshold-selection', def);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(generated.parameters.tests.includes('seeded sweep a 1'), `${seed}: seeded checks`);
  }
});
