import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';
import { graders } from '../assets/js/core/graders.js';
import { instantiateLegacyExercise } from '../assets/js/core/legacy_exercise_adapter.mjs';

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
  const exercises = bundle.exerciseDefinitions.filter((item) => item.competencyIds.includes('c-linalg-systems'));
  assert.ok(exercises.some((item) => item.difficulty === 1));
  assert.ok(exercises.some((item) => item.difficulty === 2));
  assert.ok(exercises.some((item) => item.difficulty === 3));
  assert.ok(exercises.some((item) => item.difficulty >= 4));
  assert.ok(exercises.some((item) => item.generatorId === 'genColumnCombination'));
});

test('new deterministic tasks accept the authored answers and reject distractors', async () => {
  const choice = definition('f-linalg-column-choice-01');
  assert.equal((await graders.deterministic.grade(choice, 'both-one')).correct, true);
  assert.equal((await graders.deterministic.grade(choice, 'first-only')).correct, false);
  const diagnosis = definition('f-linalg-rank-system-debug-01');
  assert.equal((await graders.deterministic.grade(diagnosis, 'rank-two-free')).correct, true);
  assert.equal((await graders.deterministic.grade(diagnosis, 'contradiction')).correct, false);
  const generated = instantiateLegacyExercise(definition('f-linalg-column-vector-01'), 9211);
  assert.equal((await graders.deterministic.grade(generated, generated.expectedAnswer.solution.join(','))).correct, true);
});

test('final-boss Python task declares executable deterministic tests', () => {
  const boss = definition('f-linalg-final-boss-01');
  assert.equal(boss.activityType, 'python-code');
  assert.equal(boss.graderId, 'pyodide');
  assert.deepEqual(boss.parameters.packages, ['numpy']);
  assert.match(boss.parameters.tests, /gauss_rank/);
  assert.match(boss.parameters.tests, /inkompatible Shapes abgelehnt/);
  assert.equal(boss.masteryEligible, true);
});
