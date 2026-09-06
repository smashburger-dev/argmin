import test from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISE_FAMILIES, familyHint } from '../assets/js/domain/exercise_registry.mjs';

const summaryOf = (familyId) => EXERCISE_FAMILIES.get(familyId).summary;

test('level 1 returns the curated family strategy', () => {
  const instance = EXERCISE_FAMILIES.instantiate('classify-string-immutability', 7, 'core');
  assert.equal(
    familyHint({ summary: summaryOf('classify-string-immutability'), activityType: instance.activityType }, { level: 1 }),
    summaryOf('classify-string-immutability'),
  );
});

test('level 2 eliminates one distractor for single-choice', () => {
  const instance = EXERCISE_FAMILIES.instantiate('classify-string-immutability', 7, 'core');
  const hint = familyHint(
    { summary: 'x', activityType: 'single-choice', choices: instance.choices },
    { level: 2 },
  );
  const eliminated = instance.choices.find((choice) => hint.includes(choice.text));
  assert.ok(eliminated);
  assert.equal(eliminated.correct, false);
});

test('level 2 points numeric answers up or down after a wrong attempt', () => {
  const instance = EXERCISE_FAMILIES.instantiate('transform-linear-equation-isolate', 5, 'intro', 'two-step-seeded-retrieval');
  const want = instance.expectedAnswer.value;
  const base = { summary: 'x', activityType: 'numeric', expectedAnswer: instance.expectedAnswer };
  assert.equal(familyHint(base, { level: 2, answer: String(want - 3), correct: false }), 'Gesucht ist eine größere Zahl.');
  assert.equal(familyHint(base, { level: 2, answer: String(want + 3), correct: false }), 'Gesucht ist eine kleinere Zahl.');
  assert.equal(familyHint(base, { level: 2, answer: 'keine-zahl', correct: false }), null);
  assert.equal(familyHint(base, { level: 2, answer: String(want), correct: true }), null);
});

test('level 2 names the first parsons line after a wrong attempt', () => {
  const instance = EXERCISE_FAMILIES.instantiate('construct-test-structure-aaa', 5, 'intro', 'arrange-act-assert');
  const hint = familyHint(
    {
      summary: 'x',
      activityType: 'parsons',
      parameters: instance.parameters,
      expectedAnswer: instance.expectedAnswer,
    },
    { level: 2, correct: false },
  );
  const firstId = instance.expectedAnswer.solutionOrder[0];
  const firstText = instance.parameters.fragments.find((fragment) => fragment.id === firstId).text;
  assert.equal(hint, `Beginne mit: „${firstText}“.`);
});

test('level 2 points at the first deviating trace row', () => {
  const instance = EXERCISE_FAMILIES.instantiate('trace-assignment-state', 7, 'core', 'reassign-two-variables-print');
  assert.equal(
    familyHint(
      { summary: 'x', activityType: 'predict-output', traceTable: instance.traceTable },
      { level: 2, firstBadRow: 1 },
    ),
    'Rechne Zeile 2 neu, der Rest steht.',
  );
  assert.equal(
    familyHint({ summary: 'x', activityType: 'predict-output' }, { level: 2, firstBadRow: 1 }),
    null,
  );
});

test('unknown levels and missing summaries return null', () => {
  assert.equal(familyHint({ summary: '', activityType: 'numeric' }, { level: 1 }), null);
  assert.equal(familyHint({ summary: 'x', activityType: 'numeric' }, { level: 3 }), null);
});
