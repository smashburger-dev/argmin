import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';
import { graders } from '../assets/js/core/graders.js';
import { instantiateLegacyExercise } from '../assets/js/core/legacy_exercise_adapter.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = compileContent({ projectRoot: root, profile: 'public' });
const definition = (id) => bundle.exerciseDefinitions.find((item) => item.definitionId === id);

test('all linear algebra and NumPy competencies have German lessons with public readings', () => {
  const competencyIds = ['c-linalg-matrices', 'c-linalg-systems', 'c-linalg-gauss', 'c-linalg-independence', 'c-numpy-basics'];
  const sourceIds = new Set(bundle.sources.map((source) => source.sourceId));
  for (const competencyId of competencyIds) {
    const lesson = bundle.lessons.find((item) => item.competencyIds.includes(competencyId));
    assert.ok(lesson, `${competencyId} has no lesson`);
    assert.ok(lesson.sourceRefs.length > 0, `${lesson.lessonId} has no reading`);
    for (const reference of lesson.sourceRefs) assert.ok(sourceIds.has(reference.sourceId));
  }
});

test('linear systems spans basic, core, advanced and final-boss activities', () => {
  const exercises = bundle.familyActivities.filter((item) => item.competencyIds.includes('c-linalg-systems'));
  assert.ok(exercises.some((item) => item.difficulty === 'core'));
  assert.ok(exercises.some((item) => item.difficulty === 'stretch'));
  assert.ok(exercises.some((item) => item.familyId === 'formula-scalar-product'));
});

test('new deterministic tasks accept the authored answers and reject distractors', async () => {
  const choice = EXERCISE_FAMILIES.instantiate('classify-column-combination', 0, 'intro', 'column-choice-authored');
  assert.equal((await EXERCISE_FAMILIES.grade(choice, 'both-one')).correct, true);
  assert.equal((await EXERCISE_FAMILIES.grade(choice, 'first-only')).correct, false);
  const diagnosis = EXERCISE_FAMILIES.instantiate('classify-rank-solution-case', 0, 'stretch', 'rank-system-authored');
  assert.equal((await EXERCISE_FAMILIES.grade(diagnosis, 'rank-two-free')).correct, true);
  assert.equal((await EXERCISE_FAMILIES.grade(diagnosis, 'contradiction')).correct, false);
  const generated = EXERCISE_FAMILIES.instantiate('formula-scalar-product', 9211, 'core', 'column-vector-authored');
  assert.equal((await EXERCISE_FAMILIES.grade(generated, generated.expectedAnswer.solution.join(','))).correct, true);
});

test('final-boss Python task declares executable deterministic tests', () => {
  const boss = EXERCISE_FAMILIES.instantiate('construct-matvec-shape-contract', 0, 'challenge', 'final-boss-authored');
  assert.equal(boss.activityType, 'python-code');
  assert.equal(boss.graderId, 'pyodide');
  assert.deepEqual(boss.parameters.packages, ['numpy']);
  assert.match(boss.parameters.tests, /gauss_rank/);
  assert.match(boss.parameters.tests, /inkompatible Shapes abgelehnt/);
  assert.equal(boss.masteryEligible, true);
});
