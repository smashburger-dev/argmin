// Procedural family fit-mlp-val-curve-argmin: capsule gates.
// Run: node --test tests/procedural_mlp_val_curve_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/fit-mlp-val-curve-argmin.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

// The case defs do not carry `packages`; the JSON anchors pin it to ['numpy'],
// so the suite surface adds it for the verbatim anchor check.
const suiteMod = {
  ...mod,
  VAL_CURVE_CASES: Object.fromEntries(
    Object.entries(mod.VAL_CURVE_CASES).map(([id, def]) => [id, { ...def, packages: ['numpy'] }]),
  ),
};

codeCapsuleSuite('fit-mlp-val-curve-argmin', suiteMod, [
  { caseId: 'mlp-val-curve-argmin', difficulty: 'challenge' },
], { familyGroup: 'fit-model', difficultyProfiles: ['challenge'] });

test('seeded draws stay inside the declared domains', () => {
  const def = mod.VAL_CURVE_CASES['mlp-val-curve-argmin'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = mod.genValCurveCase(seed, 'mlp-val-curve-argmin', def);
    assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.equal(generated.parameters.seedCases.length, 2, 'extraCount');
    for (const [i, entry] of generated.parameters.seedCases.entries()) {
      assert.ok(Number.isInteger(entry.dataSeed) && entry.dataSeed >= 1 && entry.dataSeed <= 9999, 'dataSeed range');
      assert.ok(Number.isInteger(entry.n) && entry.n >= 120 && entry.n <= 260, 'n range');
      assert.ok(Number.isInteger(entry.d) && entry.d >= 2 && entry.d <= 5, 'd range');
      assert.ok(Number.isInteger(entry.hidden) && entry.hidden >= 4 && entry.hidden <= 12, 'hidden range');
      assert.ok(entry.lr >= 0.005 && entry.lr <= 0.02, 'lr range');
      assert.ok(Number.isInteger(entry.epochs) && entry.epochs >= 40 && entry.epochs <= 80, 'epochs range');
      assert.ok(Number.isInteger(entry.trainSeed) && entry.trainSeed >= 1 && entry.trainSeed <= 9999, 'trainSeed range');
      assert.ok(entry.altSeed - entry.trainSeed >= 1 && entry.altSeed - entry.trainSeed <= 9, 'altSeed offset');
      assert.ok(entry.badFraction === 0.0 || entry.badFraction === 1.0, 'badFraction boundary');
      // the drawn literals are baked into the test block
      const index = i + 1;
      assert.ok(generated.parameters.tests.includes(`np.random.default_rng(${entry.dataSeed})`), `${seed}:${index}: dataSeed literal`);
      assert.ok(
        generated.parameters.tests.includes(`${entry.hidden}, ${entry.lr}, ${entry.epochs}, ${entry.trainSeed}`),
        `${seed}:${index}: call args literal`,
      );
      assert.ok(generated.parameters.tests.includes(`val_fraction=${entry.badFraction}.0`), `${seed}:${index}: badFraction literal`);
    }
  }
});

test('family extras: contract competencies and case types', () => {
  assert.deepEqual(mod.VAL_CURVE_CONTRACT.competencyIds, ['c-dl-training', 'c-dl-autograd']);
  assert.deepEqual(mod.VAL_CURVE_CONTRACT.caseTypes, [
    { caseId: 'mlp-val-curve-argmin', propertyTest: false },
  ]);
});
