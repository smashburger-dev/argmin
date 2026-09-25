import test from 'node:test';
import assert from 'node:assert/strict';
import { generateScalarProductFamily } from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';
import './helpers/register_static_cases.mjs';



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
  assert.deepEqual(sys.competencyIds, ['c-linalg-gauss', 'c-linalg-systems']);
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
