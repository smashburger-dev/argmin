import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';
import { graders } from '../assets/js/core/graders.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const definitions = compileContent({ projectRoot: root, profile: 'public' }).exerciseDefinitions
  .filter((definition) => /^(f-algebra-(equivalence|debug)|f-control-(trace|parsons)|f-collections-|f-files-|f-testing-|f-git-(choice|parsons))/.test(definition.definitionId));

const answerFor = (definition) => {
  if (definition.activityType === 'single-choice') return definition.expectedAnswer.correctChoice;
  if (definition.activityType === 'parsons') return definition.expectedAnswer.solutionOrder;
  if (definition.activityType === 'predict-output') return definition.expectedAnswer.output;
  if (definition.activityType === 'code-trace') {
    return Object.fromEntries(definition.parameters.variables.map((variable) => [variable.name, String(variable.value)]));
  }
  throw new Error(`unsupported test type ${definition.activityType}`);
};

const wrongAnswerFor = (definition) => {
  if (definition.activityType === 'single-choice') return definition.choices.find((choice) => !choice.correct).id;
  if (definition.activityType === 'parsons') return [...definition.expectedAnswer.solutionOrder].reverse();
  if (definition.activityType === 'predict-output') return 'falsch';
  if (definition.activityType === 'code-trace') {
    return Object.fromEntries(definition.parameters.variables.map((variable) => [variable.name, String(variable.value + 1)]));
  }
};

test('Foundations adds twelve independently graded exercise definitions', () => {
  assert.equal(definitions.length, 12);
  assert.equal(new Set(definitions.map((definition) => definition.definitionId)).size, 12);
  assert.equal(definitions.every((definition) => definition.releaseStatus === 'solver-verified'), true);
});

test('predict-output keeps semantic token boundaries', async () => {
  const definition = definitions.find((item) => item.definitionId === 'f-collections-output-01');
  const exercise = definition;
  assert.equal((await graders.deterministic.grade(exercise, '2 2')).correct, true);
  assert.equal((await graders.deterministic.grade(exercise, '22')).correct, false);
  assert.equal((await graders.deterministic.grade(exercise, '2\n2')).correct, false);
});

test('every Foundations definition accepts its authored answer and rejects a counterexample', async () => {
  for (const definition of definitions) {
    const correct = await graders.deterministic.grade(definition, answerFor(definition));
    assert.equal(correct.correct, true, `${definition.definitionId}: authored answer failed`);
    const wrong = await graders.deterministic.grade(definition, wrongAnswerFor(definition));
    assert.equal(wrong.correct, false, `${definition.definitionId}: counterexample passed`);
    if (definition.activityType === 'single-choice') assert.ok(wrong.diagnosis, `${definition.definitionId}: authored choice feedback did not fire`);
  }
});
