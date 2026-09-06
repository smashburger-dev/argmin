// Characterization tests for the W2-W4 group-B content (collections, files,
// testing, git, meta-learning) and the EXISTING deterministic grader contract
// for code-trace, parsons, predict-output, single-choice and numeric answers.
//
// Purpose: another session extends code-trace towards collection step traces.
// These tests pin today's behavior so that every currently shipped integer
// code-trace exercise keeps grading exactly as before:
//   - integer-only answers (parseIntegerAnswer: trim + /^-?\d{1,6}$/),
//   - per-variable exact match, errorType 'wrong-value',
//   - 'invalid-input' with the variable-specific message for non-integers,
//   - diagnosis naming the wrong variables and the `value:<v>` feedback keys.
//
// Seams:
//   - week packs (content/exercises/w0x.json) are graded as-is through
//     graders.deterministic.grade — the same object ExerciseRuntime.check()
//     hands to the adapter (it only overrides deterministicSeed),
//   - foundations definitions go through compileContent (profile 'public'),
//     the production compile path the app loads,
//   - python-code exercises are checked structurally only; Pyodide is never
//     executed here.
//
// Red capability: every contract block either asserts both directions
// (accepted answer + rejected near-miss) or mutates the exercise in memory and
// asserts the grader detects the change.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { graders } from '../assets/js/core/graders.js';
import { compileContent } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const grade = graders.deterministic.grade;

const pack = (weekId) => JSON.parse(readFileSync(join(root, 'content/exercises', `${weekId}.json`), 'utf8')).exercises;
const byId = (exercises, id) => exercises.find((exercise) => exercise.exerciseId === id);
const ruleThen = (exercise, ifExpr) => {
  const rule = (exercise.feedbackRules || []).find((candidate) => candidate.if === ifExpr);
  assert.ok(rule, `expected authored rule "${ifExpr}"`);
  return rule.then;
};

// The w02 collections share of the pack: only exercises tagged with the
// c-python-collections skill (w02-e3 is control-flow only and stays out).
const w02Collections = pack('w02').filter((exercise) => (exercise.skillIds || []).includes('c-python-collections'));
const w03 = pack('w03');
const w04 = pack('w04');

// Foundations group B: the eleven non-group-A definitions (competencies
// outside the algebra/control group-A set). Loaded through the public compile
// path so the graded object is the one the app serves.
const compiledDefinitions = compileContent({ projectRoot: root, profile: 'public' }).exerciseDefinitions;
const groupB = compiledDefinitions.filter((definition) => /^f-(collections|files|testing|git|meta|data)-/.test(definition.definitionId));
const byDefinitionId = (id) => groupB.find((definition) => definition.definitionId === id);
// merge-debug and meta-error-log mark the correct answer only on the choice
// entry (no expectedAnswer.correctChoice) — derive it from choices.
const correctChoiceId = (definition) => {
  const correct = definition.choices.filter((choice) => choice.correct);
  assert.equal(correct.length, 1, `${definition.definitionId}: expected exactly one correct choice`);
  return correct[0].id;
};

// ---------------------------------------------------------------------------
// 1. w02 pack — collections share
// ---------------------------------------------------------------------------

test('w02 collections share is exactly the two predict-output exercises and grades repr answers', async () => {
  assert.deepEqual(w02Collections.map((exercise) => exercise.exerciseId), ['w02-e1', 'w02-e2']);
  assert.equal(w02Collections.every((exercise) => exercise.type === 'predict-output' && exercise.grader === 'deterministic'), true);

  const e1 = byId(w02Collections, 'w02-e1');
  // Authored answer is the literal Python list repr, one line.
  assert.equal((await grade(e1, "['Lernp', 'KI-tfo']")).correct, true);
  // List spacing is normalized: tight commas stay correct.
  assert.equal((await grade(e1, "['Lernp','KI-tfo']")).correct, true);
  // Order is semantic.
  const swapped = await grade(e1, "['KI-tfo', 'Lernp']");
  assert.equal(swapped.correct, false);
  assert.equal(swapped.errorType, 'wrong-output');
  // Whitespace-only answer is invalid input, not a wrong guess.
  const blank = await grade(e1, '   ');
  assert.equal(blank.correct, false);
  assert.equal(blank.errorType, 'invalid-input');
  assert.equal(blank.verdictText, 'Bitte die erwartete Ausgabe eingeben.');

  const e2 = byId(w02Collections, 'w02-e2');
  assert.equal((await grade(e2, "['otp']")).correct, true);
  const nearMiss = await grade(e2, "['pto']");
  assert.equal(nearMiss.correct, false);
  assert.equal(nearMiss.errorType, 'wrong-output');
  assert.equal(nearMiss.diagnosis, 'Vergleiche elementweise: Welche Werte kommen in die Ausgabe, und in welcher Reihenfolge?');
});

// ---------------------------------------------------------------------------
// 2. w03 pack
// ---------------------------------------------------------------------------

test('w03-e1 predict-output collapses inner whitespace but keeps token boundaries', async () => {
  const exercise = byId(w03, 'w03-e1');
  assert.equal((await grade(exercise, "['2 5 7']")).correct, true);
  assert.equal((await grade(exercise, "['2  5  7']")).correct, true);
  const merged = await grade(exercise, "['257']");
  assert.equal(merged.correct, false);
  assert.equal(merged.errorType, 'wrong-output');
});

test('w03-e2 single-choice: correct choice, authored feedback per choice id, unknown id invalid', async () => {
  const exercise = byId(w03, 'w03-e2');
  const right = await grade(exercise, 'a');
  assert.equal(right.correct, true);
  assert.equal(right.verdictText, 'Richtig begründet.');
  assert.equal(right.errorType, null);

  const wrongB = await grade(exercise, 'b');
  assert.equal(wrongB.correct, false);
  assert.equal(wrongB.errorType, 'wrong-choice');
  assert.equal(wrongB.diagnosis, ruleThen(exercise, "choice === 'b'"));

  // Session B: the invalid "choice === 'c' or choice === 'd'" key was split
  // into two grammar-valid rules — every wrong choice now gets its diagnosis.
  const wrongD = await grade(exercise, 'd');
  assert.equal(wrongD.correct, false);
  assert.equal(wrongD.errorType, 'wrong-choice');
  assert.equal(wrongD.diagnosis, ruleThen(exercise, "choice === 'd'"));

  const unknown = await grade(exercise, 'zz');
  assert.equal(unknown.correct, false);
  assert.equal(unknown.errorType, 'invalid-input');
  assert.equal(unknown.verdictText, 'Bitte eine Auswahl treffen.');
});

test('w03-e4 git single-choice fires authored feedback for every wrong choice', async () => {
  const exercise = byId(w03, 'w03-e4');
  assert.equal((await grade(exercise, 'a')).correct, true);
  for (const choiceId of ['b', 'c', 'd']) {
    const outcome = await grade(exercise, choiceId);
    assert.equal(outcome.correct, false, `w03-e4/${choiceId}`);
    assert.equal(outcome.errorType, 'wrong-choice', `w03-e4/${choiceId}`);
    assert.equal(outcome.diagnosis, ruleThen(exercise, `choice === '${choiceId}'`), `w03-e4/${choiceId}`);
  }
});

// ---------------------------------------------------------------------------
// 3. w04 pack
// ---------------------------------------------------------------------------

test('w04-e1 predict-output keeps the two-element list repr answer', async () => {
  const exercise = byId(w04, 'w04-e1');
  assert.equal((await grade(exercise, "['6', 'Abbruch: x muss positiv sein']")).correct, true);
  assert.equal((await grade(exercise, "['6','Abbruch: x muss positiv sein']")).correct, true);
  // Bare lines without the list notation are wrong.
  const bare = await grade(exercise, '6\nAbbruch: x muss positiv sein');
  assert.equal(bare.correct, false);
  assert.equal(bare.errorType, 'wrong-output');
});

test('w04-e2 numeric grades the exact integer and rejects non-integer input', async () => {
  const exercise = byId(w04, 'w04-e2');
  assert.equal((await grade(exercise, '5')).correct, true);
  // parseIntegerAnswer trims surrounding whitespace before matching.
  assert.equal((await grade(exercise, ' 5 ')).correct, true);

  const wrong = await grade(exercise, '6');
  assert.equal(wrong.correct, false);
  assert.equal(wrong.errorType, 'wrong-value');
  // Authored rules use "value == 4" / "value > 5" — the grader only matches
  // "value === <n>", so no diagnosis fires today.
  assert.equal(wrong.diagnosis, null);

  for (const raw of ['2.5', 'abc', '']) {
    const invalid = await grade(exercise, raw);
    assert.equal(invalid.correct, false, `w04-e2 raw=${JSON.stringify(raw)}`);
    assert.equal(invalid.errorType, 'invalid-input');
    assert.equal(invalid.verdictText, 'Bitte eine ganze Zahl eingeben.');
  }
});

test('w03-e3 and w04-e3 python-code exercises are structurally gradable (no Pyodide run)', () => {
  for (const exercise of [byId(w03, 'w03-e3'), byId(w04, 'w04-e3')]) {
    assert.equal(exercise.grader, 'pyodide', `${exercise.exerciseId}: grader`);
    assert.equal(exercise.type, 'python-code', `${exercise.exerciseId}: type`);
    assert.equal(typeof exercise.parameters.tests, 'string', `${exercise.exerciseId}: parameters.tests`);
    assert.ok(exercise.parameters.tests.trim().length > 0, `${exercise.exerciseId}: empty tests`);
    assert.equal(typeof exercise.expectedAnswer.referenceSolver, 'string', `${exercise.exerciseId}: referenceSolver`);
    assert.ok(exercise.expectedAnswer.referenceSolver.trim().length > 0, `${exercise.exerciseId}: empty referenceSolver`);
  }
});

// ---------------------------------------------------------------------------
// 4. foundations group B — the eleven non-group-A definitions
// ---------------------------------------------------------------------------

test('group B is exactly the thirteen collections/files/testing/git/meta/data definitions', () => {
  assert.deepEqual([...groupB].map((definition) => definition.definitionId).sort(), [
    'f-collections-choice-01',
    'f-collections-output-01',
    'f-data-code-repair-01',
    'f-files-choice-01',
    'f-files-parsons-01',
    'f-git-choice-01',
    'f-git-merge-debug-01',
    'f-git-next-action-01',
    'f-git-parsons-01',
    'f-meta-error-classify-01',
    'f-meta-error-log-01',
    'f-testing-choice-01',
    'f-testing-parsons-01',
  ]);
  // Everything deterministic except the Pyodide-graded code repair.
  for (const definition of groupB) {
    const expected = definition.definitionId === 'f-data-code-repair-01' ? 'pyodide' : 'deterministic';
    assert.equal(definition.graderId, expected, `${definition.definitionId}: graderId`);
  }
});

test('f-data-code-repair-01 is structurally gradable: authored tests plus a required function contract', () => {
  const definition = byDefinitionId('f-data-code-repair-01');
  assert.equal(definition.activityType, 'python-code');
  assert.equal(typeof definition.parameters.tests, 'string');
  assert.ok(definition.parameters.tests.trim().length > 0, 'empty tests');
  // Deviates from the week-pack pattern: no referenceSolver, the contract is
  // the required function name checked by the authored tests.
  assert.equal(definition.expectedAnswer.kind, 'python-tests');
  assert.equal(definition.expectedAnswer.requiredFunction, 'inspect_rows');
  assert.equal(definition.expectedAnswer.referenceSolver, undefined);
});

test('group B single-choice definitions accept the correct choice and reject every distractor', async () => {
  const choiceDefinitions = groupB.filter((definition) => definition.activityType === 'single-choice');
  assert.deepEqual(choiceDefinitions.map((definition) => definition.definitionId).sort(), [
    'f-collections-choice-01',
    'f-files-choice-01',
    'f-git-choice-01',
    'f-git-merge-debug-01',
    'f-git-next-action-01',
    'f-meta-error-classify-01',
    'f-meta-error-log-01',
    'f-testing-choice-01',
  ]);

  for (const definition of choiceDefinitions) {
    const correctId = correctChoiceId(definition);
    // Where expectedAnswer.correctChoice exists it must agree with the
    // choice flag (merge-debug and meta-error-log ship without it).
    if (definition.expectedAnswer.correctChoice !== undefined) {
      assert.equal(definition.expectedAnswer.correctChoice, correctId, `${definition.definitionId}: correctChoice disagrees with choice flags`);
    }

    const right = await grade(definition, correctId);
    assert.equal(right.correct, true, `${definition.definitionId}: authored answer failed`);
    assert.equal(right.verdictText, 'Richtig begründet.');

    for (const choice of definition.choices.filter((candidate) => !candidate.correct)) {
      const wrong = await grade(definition, choice.id);
      assert.equal(wrong.correct, false, `${definition.definitionId}/${choice.id}: distractor passed`);
      assert.equal(wrong.errorType, 'wrong-choice');
      assert.equal(wrong.verdictText, 'Nicht richtig.');
      // Definitions authored as `choice !== '<correct>'` get their feedback
      // for every wrong choice.
      const differsRule = (definition.feedbackRules || []).find((rule) => rule.if === `choice !== '${correctId}'`);
      if (differsRule) {
        assert.equal(wrong.diagnosis, differsRule.then, `${definition.definitionId}/${choice.id}`);
      }
    }

    const unknown = await grade(definition, 'does-not-exist');
    assert.equal(unknown.correct, false, `${definition.definitionId}: unknown choice id accepted`);
    assert.equal(unknown.errorType, 'invalid-input');
    assert.equal(unknown.verdictText, 'Bitte eine Auswahl treffen.');
  }
});

test('git-merge-debug and meta-error-log fire authored feedback after the Session-B grammar fix', async () => {
  // Session B: the bare rule keys ("ours", "copy-solution") were rewritten
  // as `choice !== '<correct>'` rules — wrong answers now carry feedback.
  for (const definitionId of ['f-git-merge-debug-01', 'f-meta-error-log-01']) {
    const definition = byDefinitionId(definitionId);
    const wrongChoice = definition.choices.find((choice) => !choice.correct);
    const outcome = await grade(definition, wrongChoice.id);
    assert.equal(outcome.correct, false);
    assert.equal(outcome.errorType, 'wrong-choice');
    assert.equal(typeof outcome.diagnosis, 'string', `${definitionId}: authored diagnosis must fire`);
    assert.ok(outcome.diagnosis.length > 20, `${definitionId}: diagnosis is substantive`);
  }
});

test('f-collections-output-01 grades the authored output and rejects token-merging near misses', async () => {
  const definition = byDefinitionId('f-collections-output-01');
  assert.equal(definition.activityType, 'predict-output');
  assert.equal((await grade(definition, '2 2')).correct, true);
  assert.equal((await grade(definition, '22')).correct, false);
  assert.equal((await grade(definition, '2\n2')).correct, false);
  const wrong = await grade(definition, 'falsch');
  assert.equal(wrong.errorType, 'wrong-output');
});

test('group B parsons definitions accept the solution order and reject reordered answers', async () => {
  for (const definitionId of ['f-files-parsons-01', 'f-testing-parsons-01', 'f-git-parsons-01']) {
    const definition = byDefinitionId(definitionId);
    const solution = definition.expectedAnswer.solutionOrder;
    assert.ok(Array.isArray(solution) && solution.length > 0, `${definitionId}: no solutionOrder`);
    assert.ok(Array.isArray(definition.expectedAnswer.distractors) && definition.expectedAnswer.distractors.length > 0,
      `${definitionId}: no distractors`);

    const right = await grade(definition, solution);
    assert.equal(right.correct, true, `${definitionId}: solution failed`);
    assert.equal(right.verdictText, 'Richtig — die Zeilenfolge ist vollständig und korrekt.');

    const reversed = await grade(definition, [...solution].reverse());
    assert.equal(reversed.correct, false, `${definitionId}: reversed order passed`);
    assert.equal(reversed.errorType, 'wrong-order');
  }
});

// ---------------------------------------------------------------------------
// 5. code-trace contract (the backward-compatibility core for session B)
// ---------------------------------------------------------------------------

const traceExercise = {
  exerciseId: 'synthetic-trace',
  type: 'code-trace',
  activityType: 'code-trace',
  deterministicSeed: 1,
  parameters: {
    snippet: 'x = 5\ny = x + 9',
    variables: [
      { name: 'x', value: 5 },
      { name: 'y', value: 14 },
    ],
  },
  feedbackRules: [],
};
const traceAnswers = { x: '5', y: '14' };

test('code-trace: correct integer answers grade correct with the exact success verdict', async () => {
  const outcome = await grade(traceExercise, { x: '5', y: '14' });
  assert.equal(outcome.correct, true);
  assert.equal(outcome.verdictText, 'Richtig — alle Variablenwerte stimmen.');
  assert.equal(outcome.errorType, null);
  assert.equal(outcome.diagnosis, null);
});

test('code-trace: answer strings are trimmed, coerced from numbers, and accept negatives/leading zeros', async () => {
  // parseIntegerAnswer trims surrounding whitespace before the integer regex.
  assert.equal((await grade(traceExercise, { x: ' 5 ', y: ' 14 ' })).correct, true);
  // Non-string values are stringified first (collectAnswer reads input values).
  assert.equal((await grade(traceExercise, { x: 5, y: 14 })).correct, true);
  const negative = { ...traceExercise, parameters: { ...traceExercise.parameters, variables: [{ name: 'z', value: -3 }] } };
  assert.equal((await grade(negative, { z: '-3' })).correct, true);
  assert.equal((await grade(negative, { z: '-000003' })).correct, true);
});

test('code-trace: non-integer values are rejected as invalid-input with the variable-specific message', async () => {
  for (const raw of ['2.5', 'abc', '', '+5', '1e3', '1234567']) {
    const outcome = await grade(traceExercise, { x: raw, y: '14' });
    assert.equal(outcome.correct, false, `code-trace raw=${JSON.stringify(raw)}`);
    assert.equal(outcome.errorType, 'invalid-input', `code-trace raw=${JSON.stringify(raw)}`);
    assert.equal(outcome.verdictText, `'x' ist keine ganze Zahl — der getracete Wert ist immer ganzzahlig.`,
      `code-trace raw=${JSON.stringify(raw)}`);
  }
});

test('code-trace: the first invalid variable in parameter order is reported', async () => {
  const outcome = await grade(traceExercise, { x: 'abc', y: '2.5' });
  assert.equal(outcome.errorType, 'invalid-input');
  assert.equal(outcome.verdictText, `'x' ist keine ganze Zahl — der getracete Wert ist immer ganzzahlig.`);
});

test('code-trace: missing answers (absent key, empty object, null) are invalid-input', async () => {
  // The first variable in parameter order without a valid answer is reported:
  // x when the whole answer object is missing/empty, y when only y is absent.
  const missingY = await grade(traceExercise, { x: '5' });
  assert.equal(missingY.correct, false);
  assert.equal(missingY.errorType, 'invalid-input');
  assert.equal(missingY.verdictText, `'y' ist keine ganze Zahl — der getracete Wert ist immer ganzzahlig.`);
  for (const answer of [{}, null]) {
    const outcome = await grade(traceExercise, answer);
    assert.equal(outcome.correct, false, `code-trace answer=${JSON.stringify(answer)}`);
    assert.equal(outcome.errorType, 'invalid-input', `code-trace answer=${JSON.stringify(answer)}`);
    assert.equal(outcome.verdictText, `'x' ist keine ganze Zahl — der getracete Wert ist immer ganzzahlig.`,
      `code-trace answer=${JSON.stringify(answer)}`);
  }
});

test('code-trace: a wrong value yields wrong-value and a diagnosis naming the variable', async () => {
  const outcome = await grade(traceExercise, { x: '5', y: '15' });
  assert.equal(outcome.correct, false);
  assert.equal(outcome.verdictText, 'Nicht richtig.');
  assert.equal(outcome.errorType, 'wrong-value');
  assert.equal(outcome.diagnosis, 'Falsche Werte für: y. Tipp: Zeile für Zeile neu durchgehen und nach jeder Zuweisung den neuen Wert notieren.');
});

test('code-trace: multiple wrong variables are all named, joined with ", "', async () => {
  const outcome = await grade(traceExercise, { x: '6', y: '15' });
  assert.equal(outcome.errorType, 'wrong-value');
  assert.equal(outcome.diagnosis, 'Falsche Werte für: x, y. Tipp: Zeile für Zeile neu durchgehen und nach jeder Zuweisung den neuen Wert notieren.');
});

test('code-trace: authored feedback keys are value:<var> and value:<v1>+value:<v2>', async () => {
  const withRules = {
    ...traceExercise,
    feedbackRules: [
      { if: 'value:y', then: 'RULE-SINGLE' },
      { if: 'value:x+value:y', then: 'RULE-JOIN' },
    ],
  };
  assert.equal((await grade(withRules, { x: '5', y: '0' })).diagnosis, 'RULE-SINGLE');
  assert.equal((await grade(withRules, { x: '0', y: '0' })).diagnosis, 'RULE-JOIN');
});

test('code-trace: extra answer keys outside parameters.variables are ignored', async () => {
  const outcome = await grade(traceExercise, { x: '5', y: '14', extra: 'not-an-integer' });
  assert.equal(outcome.correct, true);
});

test('code-trace: mutating the expected value flips a previously correct answer to wrong-value (red capability)', async () => {
  const mutated = {
    ...traceExercise,
    parameters: {
      ...traceExercise.parameters,
      variables: [
        { name: 'x', value: 6 },
        { name: 'y', value: 14 },
      ],
    },
  };
  const outcome = await grade(mutated, traceAnswers);
  assert.equal(outcome.correct, false);
  assert.equal(outcome.errorType, 'wrong-value');
  assert.ok(outcome.diagnosis.includes('x'), 'diagnosis must name the mutated variable');
});

// ---------------------------------------------------------------------------
// 6. parsons contract
// ---------------------------------------------------------------------------

const parsonsExercise = {
  exerciseId: 'synthetic-parsons',
  type: 'parsons',
  activityType: 'parsons',
  deterministicSeed: 1,
  parameters: { fragments: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'd1' }] },
  expectedAnswer: { solutionOrder: ['p1', 'p2', 'p3'], distractors: ['d1'] },
  feedbackRules: [{ if: 'order-length-mismatch', then: 'RULE-LEN' }],
};

test('parsons: the exact solution order grades correct with the exact success verdict', async () => {
  const outcome = await grade(parsonsExercise, ['p1', 'p2', 'p3']);
  assert.equal(outcome.correct, true);
  assert.equal(outcome.verdictText, 'Richtig — die Zeilenfolge ist vollständig und korrekt.');
  assert.equal(outcome.errorType, null);
});

test('parsons: a distractor in the answer yields wrong-order with the distractor diagnosis', async () => {
  const outcome = await grade(parsonsExercise, ['p1', 'p2', 'd1']);
  assert.equal(outcome.correct, false);
  assert.equal(outcome.errorType, 'wrong-order');
  assert.equal(outcome.diagnosis, 'Mindestens eine Zeile gehört nicht zur Lösung (Distraktor) — prüfe, welche Zeile das Programm beschädigen würde.');
});

test('parsons: a missing line is named explicitly', async () => {
  const outcome = await grade(parsonsExercise, ['p1', 'p3']);
  assert.equal(outcome.correct, false);
  assert.equal(outcome.errorType, 'wrong-order');
  assert.equal(outcome.diagnosis, 'Es fehlen Zeilen: p2.');
});

test('parsons: pure misordering reports the first wrong position, 1-based', async () => {
  const first = await grade(parsonsExercise, ['p2', 'p1', 'p3']);
  assert.equal(first.errorType, 'wrong-order');
  assert.equal(first.diagnosis, 'Die Reihenfolge stimmt ab Position 1 nicht.');
  const second = await grade(parsonsExercise, ['p1', 'p3', 'p2']);
  assert.equal(second.errorType, 'wrong-order');
  assert.equal(second.diagnosis, 'Die Reihenfolge stimmt ab Position 2 nicht.');
});

test('parsons: duplicated lines (no distractor, nothing missing) fire the order-length-mismatch rule', async () => {
  const outcome = await grade(parsonsExercise, ['p1', 'p1', 'p2', 'p3']);
  assert.equal(outcome.correct, false);
  assert.equal(outcome.errorType, 'wrong-order');
  assert.equal(outcome.diagnosis, 'RULE-LEN');
});

test('parsons: a non-array answer is wrong-order without a diagnosis', async () => {
  const outcome = await grade(parsonsExercise, null);
  assert.equal(outcome.correct, false);
  assert.equal(outcome.errorType, 'wrong-order');
  assert.equal(outcome.diagnosis, null);
});

test('parsons: group B definitions name distractor, missing line and position in their diagnoses', async () => {
  for (const definitionId of ['f-files-parsons-01', 'f-testing-parsons-01', 'f-git-parsons-01']) {
    const definition = byDefinitionId(definitionId);
    const solution = definition.expectedAnswer.solutionOrder;
    const distractor = definition.expectedAnswer.distractors[0];

    const withDistractor = await grade(definition, [...solution.slice(0, solution.length - 1), distractor]);
    assert.equal(withDistractor.correct, false, `${definitionId}: distractor variant passed`);
    assert.equal(withDistractor.errorType, 'wrong-order');
    assert.ok(withDistractor.diagnosis.includes('Distraktor'), `${definitionId}: distractor diagnosis`);

    const missingFirst = await grade(definition, solution.slice(1));
    assert.equal(missingFirst.correct, false, `${definitionId}: missing-line variant passed`);
    assert.equal(missingFirst.diagnosis, `Es fehlen Zeilen: ${solution[0]}.`, `${definitionId}: missing-line diagnosis`);

    const swapped = await grade(definition, [solution[1], solution[0], ...solution.slice(2)]);
    assert.equal(swapped.correct, false, `${definitionId}: swapped variant passed`);
    assert.equal(swapped.diagnosis, 'Die Reihenfolge stimmt ab Position 1 nicht.', `${definitionId}: position diagnosis`);
  }
});

test('parsons: mutating the solution order in memory flips a previously correct answer (red capability)', async () => {
  const mutated = {
    ...parsonsExercise,
    expectedAnswer: { ...parsonsExercise.expectedAnswer, solutionOrder: ['p2', 'p1', 'p3'] },
  };
  const outcome = await grade(mutated, ['p1', 'p2', 'p3']);
  assert.equal(outcome.correct, false);
  assert.equal(outcome.errorType, 'wrong-order');
});

// ---------------------------------------------------------------------------
// 7. predict-output normalization contract
// ---------------------------------------------------------------------------

const outputExercise = (output, feedbackRules = []) => ({
  exerciseId: 'synthetic-output',
  type: 'predict-output',
  activityType: 'predict-output',
  deterministicSeed: 1,
  expectedAnswer: { kind: 'output-lines', output },
  feedbackRules,
});

test('predict-output: runs of spaces collapse to one, token boundaries stay semantic', async () => {
  const exercise = outputExercise('14 7\n3');
  assert.equal((await grade(exercise, '14 7\n3')).correct, true);
  assert.equal((await grade(exercise, '14  7\n3')).correct, true);
  assert.equal((await grade(exercise, '14  7   \n  3')).correct, true);
  const merged = await grade(exercise, '147\n3');
  assert.equal(merged.correct, false);
  assert.equal(merged.errorType, 'wrong-output');
});

test('predict-output: list-repr spacing after brackets and around commas is normalized', async () => {
  const exercise = outputExercise('[1, 2]\n[3]');
  assert.equal((await grade(exercise, '[1,2]\n[3]')).correct, true);
  assert.equal((await grade(exercise, '[ 1 ,  2 ]\n[ 3 ]')).correct, true);
});

test('predict-output: interior blank lines are semantic, leading and trailing ones are dropped', async () => {
  const withBlank = outputExercise('a\n\nb');
  assert.equal((await grade(withBlank, 'a\n\nb')).correct, true);
  // Collapsing the interior blank line away changes the output.
  assert.equal((await grade(withBlank, 'a\nb')).correct, false);
  const plain = outputExercise('a\nb');
  assert.equal((await grade(plain, '\n\na\nb\n\n')).correct, true);
  assert.equal((await grade(plain, 'a\nb\n')).correct, true);
});

test('predict-output: null, empty and whitespace-only answers are invalid-input', async () => {
  for (const raw of [null, '', '   ', '\n']) {
    const outcome = await grade(outputExercise('a'), raw);
    assert.equal(outcome.correct, false, `predict-output raw=${JSON.stringify(raw)}`);
    assert.equal(outcome.errorType, 'invalid-input');
    assert.equal(outcome.verdictText, 'Bitte die erwartete Ausgabe eingeben.');
  }
});

test('predict-output: comma-count mismatch fires the element-count-mismatch rule, otherwise the default hint', async () => {
  const exercise = outputExercise('1, 2, 3', [{ if: 'element-count-mismatch', then: 'RULE-COUNT' }]);
  const shorter = await grade(exercise, '1, 2');
  assert.equal(shorter.errorType, 'wrong-output');
  assert.equal(shorter.diagnosis, 'RULE-COUNT');
  const sameCount = await grade(exercise, '1, 2, 4');
  assert.equal(sameCount.diagnosis, 'Vergleiche elementweise: Welche Werte kommen in die Ausgabe, und in welcher Reihenfolge?');
});

test('predict-output: mutating the expected output in memory flips a previously correct answer (red capability)', async () => {
  const mutated = outputExercise('14 8\n3');
  const outcome = await grade(mutated, '14 7\n3');
  assert.equal(outcome.correct, false);
  assert.equal(outcome.errorType, 'wrong-output');
});
