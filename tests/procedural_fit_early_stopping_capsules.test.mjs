// Procedural family fit-early-stopping-roundtrip: capsule gates.
// Run: node --test tests/procedural_fit_early_stopping_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/fit-early-stopping-roundtrip.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

// The case defs do not carry `packages`; the JSON anchors pin it to ['numpy'],
// so the suite surface adds it for the verbatim anchor check.
const suiteMod = {
  ...mod,
  EARLY_STOP_CASES: Object.fromEntries(
    Object.entries(mod.EARLY_STOP_CASES).map(([id, def]) => [id, { ...def, packages: ['numpy'] }]),
  ),
};

codeCapsuleSuite('fit-early-stopping-roundtrip', suiteMod, [
  { caseId: 'early-stopping-roundtrip', difficulty: 'stretch' },
  { caseId: 'early-stopping-min-delta-roundtrip', difficulty: 'stretch' },
], { difficultyProfiles: ['stretch', 'core'] });

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const roundtrip = mod.genEarlyStopCase(seed, 'early-stopping-roundtrip', mod.EARLY_STOP_CASES['early-stopping-roundtrip']);
    assert.ok(roundtrip.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(roundtrip.parameters.tests.includes('__ref_early_stop'), `${seed}: ref copy embedded`);
    for (const entry of roundtrip.parameters.seedCases) {
      assert.ok(entry.curve.length >= 5 && entry.curve.length <= 9, 'curve length');
      assert.ok(entry.curve.every((v) => v >= 0.3 && v <= 3.0), 'curve range');
      assert.ok(entry.patience >= 0 && entry.patience <= 3, 'patience range');
      assert.deepEqual(Object.keys(entry.model), ['W1', 'b1', 'W2', 'b2'], 'model keys');
      assert.ok(entry.model.W1.length >= 2 && entry.model.W1.length <= 4, 'W1 rows');
      assert.equal(entry.model.b1.length, entry.model.W1[0].length, 'b1 matches W1 cols');
      assert.equal(entry.model.W2.length, entry.model.W1[0].length, 'W2 rows match hidden');
      assert.equal(entry.model.b2.length, 1, 'b2 scalar');
    }
    const minDelta = mod.genEarlyStopCase(seed, 'early-stopping-min-delta-roundtrip', mod.EARLY_STOP_CASES['early-stopping-min-delta-roundtrip']);
    assert.ok(minDelta.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(minDelta.parameters.tests.includes('__ref_early_stop'), `${seed}: ref copy embedded`);
    for (const entry of minDelta.parameters.seedCases) {
      assert.ok(entry.curve.length >= 5 && entry.curve.length <= 9, 'curve length');
      assert.ok(entry.patience >= 1 && entry.patience <= 3, 'patience range');
      assert.ok(entry.minDelta >= 0.005 && entry.minDelta <= 0.05, 'min_delta range');
      assert.deepEqual(Object.keys(entry.model), ['w', 'b'], 'model keys');
      assert.equal(entry.model.w.length, 1, 'w single row');
      assert.equal(entry.model.b.length, 1, 'b scalar');
    }
  }
});

test('family extras: contract competencies and case types', () => {
  assert.deepEqual(mod.EARLY_STOP_CONTRACT.competencyIds, ['c-dl-regularization', 'c-ml-cv']);
  assert.deepEqual(mod.EARLY_STOP_CONTRACT.caseTypes, [
    { caseId: 'early-stopping-roundtrip', propertyTest: false },
    { caseId: 'early-stopping-min-delta-roundtrip', propertyTest: false },
  ]);
});
