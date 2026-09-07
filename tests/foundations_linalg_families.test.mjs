import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LINALG_DIFFICULTY_PROFILES,
  SCALAR_PRODUCT_CONTRACT,
  generateScalarProductFamily,
  solveScalarProduct,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';
import { sanitizePublicValue } from '../tools/public_content.mjs';
import './helpers/register_static_cases.mjs';
import { legacyOracle } from './helpers/legacy_oracle.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATIC_SOURCES = {
  'matmul-entry-w05-e1': 'w05-e1',
  'matmul-entry-w05-e12': 'w05-e12',
  'dot-product-w05-e13': 'w05-e13',
  'dot-product-w05-e3': 'w05-e3',
};



test('static cases pin w05 definitions byte-identically', () => {
  const w05 = legacyOracle.weeks.w05;
  for (const [caseId, exerciseId] of Object.entries(STATIC_SOURCES)) {
    const definition = w05.exercises.find((entry) => entry.exerciseId === exerciseId);
    const generated = generateScalarProductFamily({ seed: 511, caseId, difficulty: 'core' });
    assert.equal(generated.prompt, definition.prompt, `${caseId}: Prompt`);
    assert.equal(generated.fullSolution, definition.fullSolution, `${caseId}: Lösung`);
    assert.deepEqual(generated.parameters.A ?? null, definition.parameters.A ?? null, `${caseId}: A`);
    assert.deepEqual(generated.parameters.B ?? null, definition.parameters.B ?? null, `${caseId}: B`);
    assert.deepEqual(generated.parameters.u ?? null, definition.parameters.u ?? null, `${caseId}: u`);
    assert.deepEqual(generated.parameters.v ?? null, definition.parameters.v ?? null, `${caseId}: v`);
    assert.deepEqual(generated.parameters.entry ?? null, definition.parameters.entry ?? null, `${caseId}: entry`);
  }
});



test('seeded profiles hold their numeric bounds', () => {
  const peak = (parameters) => Math.max(
    ...parameters.A.flat().map((value) => Math.abs(value)),
    ...parameters.B.flat().map((value) => Math.abs(value)),
  );
  for (const seed of [5, 9, 13]) {
    const intro = generateScalarProductFamily({ seed, caseId: 'matmul-entry-seeded', difficulty: 'intro' });
    assert.ok(peak(intro.parameters) <= 2, `intro klein (seed ${seed})`);
    const challenge = generateScalarProductFamily({ seed, caseId: 'matmul-entry-seeded', difficulty: 'challenge' });
    assert.ok(peak(challenge.parameters) >= 4, `challenge groß (seed ${seed})`);
  }
});





test('seeded linalg cases solve, grade and hold profile bounds', async () => {
  for (const [familyId, caseId] of [
    ['formula-det2-independence', 'det2-seeded-columns'],
    ['transform-system-2x2-elimination', 'system-seeded-2x2'],
    ['validate-shape-contract', 'shapes-seeded-predict'],
  ]) {
    for (const difficulty of ['intro', 'core', 'stretch', 'challenge']) {
      const instance = EXERCISE_FAMILIES.instantiate(familyId, 11, difficulty, caseId);
      assert.ok(instance.prompt.length > 20, `${familyId}: Prompt`);
      assert.equal(instance.masteryEligible, true, `${familyId}: Mastery`);
    }
  }
  const det = EXERCISE_FAMILIES.instantiate('formula-det2-independence', 11, 'core', 'det2-seeded-columns');
  const detRight = await EXERCISE_FAMILIES.grade(det, String(det.expectedAnswer.value));
  assert.equal(detRight.correct, true);
  const sys = EXERCISE_FAMILIES.instantiate('transform-system-2x2-elimination', 11, 'core', 'system-seeded-2x2');
  const [x, y] = sys.expectedAnswer.solution;
  const sysRight = await EXERCISE_FAMILIES.grade(sys, `(${x}, ${y})`);
  assert.equal(sysRight.correct, true);
  const sysSwapped = await EXERCISE_FAMILIES.grade(sys, `(${y}, ${x})`);
  assert.equal(sysSwapped.correct, x === y ? true : false);
  const shape = EXERCISE_FAMILIES.instantiate('validate-shape-contract', 11, 'core', 'shapes-seeded-predict');
  const shapeRight = await EXERCISE_FAMILIES.grade(shape, shape.expectedAnswer.output);
  assert.equal(shapeRight.correct, true);
});

test('rationale case grades word count and self-assessment without a worker', async () => {
  const instance = EXERCISE_FAMILIES.instantiate('formula-scalar-product', 7, 'core', 'product-definition-rationale');
  const short = await EXERCISE_FAMILIES.grade(instance, { text: 'zu kurz', checks: [] });
  assert.equal(short.correct, false);
  assert.equal(short.errorType, 'invalid-input');
  const full = await EXERCISE_FAMILIES.grade(instance, {
    text: Array.from({ length: 30 }, (_, index) => `wort${index}`).join(' '),
    checks: ['r1', 'r2', 'r3', 'r4'],
  });
  assert.equal(full.correct, true);
  assert.equal(full.masteryEligible, false);
});
