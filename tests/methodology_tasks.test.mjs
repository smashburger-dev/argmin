import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';
import { graders } from '../assets/js/core/graders.js';
import { instantiateLegacyExercise } from '../assets/js/core/legacy_exercise_adapter.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';
import { routeForDefinition } from '../assets/js/domain/activity_route.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = compileContent({ projectRoot: root, profile: 'public' });
const definition = (id) => bundle.exerciseDefinitions.find((item) => item.definitionId === id);

test('algebra now spans generated advanced practice and a symbolic final boss', async () => {
  const instance = EXERCISE_FAMILIES.instantiate('transform-linear-equation-isolate', 7311, 'stretch', 'collect-x-terms-both-sides');
  assert.equal(instance.familyId, 'transform-linear-equation-isolate');
  assert.equal(instance.difficulty, 'stretch');
  assert.equal((await graders.deterministic.grade(instance, String(instance.expectedAnswer.value))).correct, true);
  const boss = EXERCISE_FAMILIES.instantiate('transform-expression-simplify-canonical', 7311, 'challenge', 'distribute-sign-constant-chain');
  assert.equal(boss.familyId, 'transform-expression-simplify-canonical');
  assert.equal(boss.difficulty, 'challenge');
  assert.equal(boss.graderId, 'pyodide-sympy');
});

test('advanced repair and reflection tasks close the Foundations transfer bridge', () => {
  const dataRepair = definition('f-data-code-repair-01');
  assert.equal(dataRepair.parameters.taskMode, 'repair');
  assert.ok(dataRepair.competencyIds.includes('c-python-collections'));
  assert.ok(dataRepair.competencyIds.includes('c-python-files-errors'));
  assert.equal(definition('f-git-merge-debug-01').difficulty, 3);
  assert.ok(bundle.familyActivities.some((activity) => activity.familyId === 'classify-error-hypothesis'));
  const meta = bundle.competencies.find((item) => item.competencyId === 'c-meta-learning');
  assert.equal(meta.evidencePolicy.delayedHitRequired, true);
  assert.equal(meta.evidencePolicy.minimumDistinctDefinitions, 2);
  assert.ok(bundle.projects[0].competencyIds.includes('c-python-reading'));
});

test('code repair is an advanced deterministic-test family in the existing Python contract', () => {
  const repair = definition('f-control-code-repair-01');
  assert.equal(repair.parameters.taskMode, 'repair');
  assert.match(repair.parameters.starterCode, /return result\.append/);
  assert.match(repair.parameters.tests, /Eingabe bleibt unverändert/);
  assert.deepEqual(repair.competencyIds, ['c-python-basics', 'c-python-reading', 'c-python-functions', 'c-python-control-flow', 'c-testing-debugging']);
  assert.equal(routeForDefinition(repair), '#/lab/f-control-code-repair-01');
  assert.equal(repair.masteryEligible, true);
});
