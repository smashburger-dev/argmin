// Characterization tests for the EXISTING behavior contract of the W1-W2
// group-A competencies (c-python-basics, c-python-reading, c-python-functions,
// c-python-control-flow). Session B adds seed generators for these
// competencies; these tests pin the current observable grading, adapter, and
// seed-reproducibility behavior so it cannot silently change.
//
// Scope (real execution paths, not data shape only):
//   1. content/exercises/w01.json + w02.json exercises of the target
//      competencies, graded through graders.deterministic.grade with the
//      authored correct answer and with counterexamples. Pyodide exercises
//      are never executed in Node (no worker) — structural checks only.
//   2. content/exercise-definitions/foundations/ definitions whose
//      competencyIds are a subset of the target set: schema-conformant fields
//      plus correct/wrong grading through the real grader.
//   3. Prompt-leak: numeric seeded exercises must not carry the expected
//      value as a standalone number in the stored prompt.
//   4. Deterministic seeds: adaptLegacyExercise + instantiateLegacyExercise
//      reproduce the stored parameters/expected at deterministicSeed; the
//      seeded w01 generators resolve identically through the registry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { graders } from '../assets/js/core/graders.js';
import { adaptLegacyExercise, instantiateLegacyExercise } from '../assets/js/core/legacy_exercise_adapter.mjs';
import { resolveSeedGenerator } from '../assets/js/core/seed_generator_registry.mjs';
import { genLinearEquation, genPowerExpr, genLogExpr } from '../assets/js/core/w01_generators.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (...parts) => JSON.parse(readFileSync(join(root, ...parts), 'utf8'));

const TARGET_COMPETENCIES = new Set([
  'c-python-basics',
  'c-python-reading',
  'c-python-functions',
  'c-python-control-flow',
]);
const GRADED_TYPES = new Set(['python-code', 'predict-output', 'code-trace', 'parsons', 'single-choice']);

const weeks = ['w01', 'w02'].map((weekId) => {
  const doc = readJson('content', 'exercises', `${weekId}.json`);
  return { weekId, doc, exercises: doc.exercises };
});
const legacyById = new Map(weeks.flatMap((w) => w.exercises).map((e) => [e.exerciseId, e]));
const byId = (id) => {
  const exercise = legacyById.get(id);
  assert.ok(exercise, `${id} fehlt in w01/w02`);
  return exercise;
};

// Every w01/w02 exercise that touches a target competency and has a
// deterministic (Node-executable) or structurally checkable type.
const inScope = weeks
  .flatMap((w) => w.exercises.map((e) => ({ exercise: e, weekId: w.weekId })))
  .filter(({ exercise }) => GRADED_TYPES.has(exercise.type) && exercise.skillIds?.some((c) => TARGET_COMPETENCIES.has(c)));

// Authored correct answers, derived from expectedAnswer/parameters exactly the
// way the deterministic graders resolve them (never hardcoded copies).
function authoredAnswer(exercise) {
  if (exercise.type === 'predict-output') return exercise.expectedAnswer.output;
  if (exercise.type === 'code-trace') {
    return Object.fromEntries(exercise.parameters.variables.map((v) => [v.name, String(v.value)]));
  }
  if (exercise.type === 'parsons') return [...exercise.expectedAnswer.solutionOrder];
  if (exercise.type === 'single-choice') return exercise.choices.find((c) => c.correct).id;
  return undefined;
}

// ---------------------------------------------------------------------------
// 1. Legacy w01/w02 exercises: grading contract
// ---------------------------------------------------------------------------
test('group A scope: the eight known w01/w02 exercises are covered and none is pyodide', () => {
  const ids = inScope.map(({ exercise }) => exercise.exerciseId).sort();
  assert.deepEqual(ids, ['w01-e3', 'w01-e4', 'w01-e5', 'w01-e6', 'w01-e7', 'w02-e1', 'w02-e2', 'w02-e3']);
  for (const { exercise } of inScope) {
    assert.equal(exercise.grader, 'deterministic', `${exercise.exerciseId}: grader changed`);
    assert.equal(exercise.locale, 'de', `${exercise.exerciseId}: locale changed`);
    assert.ok(Number.isSafeInteger(exercise.deterministicSeed), `${exercise.exerciseId}: seed invalid`);
  }
});

test('w01-e3 (predict-output, basics+reading): exact output "15 10" grades correct, mutations do not', async () => {
  const e = byId('w01-e3');
  const ok = await graders.deterministic.grade(e, '15 10');
  assert.deepEqual(
    { correct: ok.correct, verdictText: ok.verdictText, errorType: ok.errorType },
    { correct: true, verdictText: 'Richtig — genau diese Ausgabe.', errorType: null },
  );
  // Wrong value (+1 on the first output value).
  const wrong = await graders.deterministic.grade(e, '16 10');
  assert.equal(wrong.correct, false);
  assert.equal(wrong.errorType, 'wrong-output');
  // Whitespace inside the line is normalized, newlines are not.
  assert.equal((await graders.deterministic.grade(e, '  15   10  ')).correct, true);
  assert.equal((await graders.deterministic.grade(e, '15\t10')).correct, true);
  assert.equal((await graders.deterministic.grade(e, '15\n10')).correct, false);
  // Comma instead of space: element count differs, authored rule fires.
  const comma = await graders.deterministic.grade(e, '15,10');
  assert.equal(comma.correct, false);
  assert.equal(comma.diagnosis, 'print(a, b) gibt zwei Werte aus, getrennt durch ein Leerzeichen.');
  // Empty answer is invalid input.
  const empty = await graders.deterministic.grade(e, '   ');
  assert.deepEqual(
    { correct: empty.correct, errorType: empty.errorType },
    { correct: false, errorType: 'invalid-input' },
  );
});

test('w01-e4 (code-trace, basics+reading): {x:5, y:6, z:11} correct, +1 mutations rejected with feedback rules', async () => {
  const e = byId('w01-e4');
  const ok = await graders.deterministic.grade(e, { x: '5', y: '6', z: '11' });
  assert.deepEqual(
    { correct: ok.correct, verdictText: ok.verdictText, errorType: ok.errorType },
    { correct: true, verdictText: 'Richtig — alle Variablenwerte stimmen.', errorType: null },
  );
  // Single wrong variable (+1): generic trace feedback.
  const single = await graders.deterministic.grade(e, { x: '6', y: '6', z: '11' });
  assert.equal(single.correct, false);
  assert.equal(single.errorType, 'wrong-value');
  assert.equal(single.diagnosis, 'Falsche Werte für: x. Tipp: Zeile für Zeile neu durchgehen und nach jeder Zuweisung den neuen Wert notieren.');
  // x AND z wrong (+1 each): the authored combined rule fires.
  const combined = await graders.deterministic.grade(e, { x: '6', y: '6', z: '12' });
  assert.equal(combined.correct, false);
  assert.equal(combined.diagnosis, 'Achtung: x wird in Zeile 3 überschrieben (y − 1), bevor z berechnet wird — z nutzt das NEUE x.');
  // Non-integer and missing variables are invalid input, not wrong values.
  const invalid = await graders.deterministic.grade(e, { x: '5', y: 'abc', z: '11' });
  assert.deepEqual(
    { correct: invalid.correct, verdictText: invalid.verdictText, errorType: invalid.errorType },
    { correct: false, verdictText: "'y' ist keine ganze Zahl — der getracete Wert ist immer ganzzahlig.", errorType: 'invalid-input' },
  );
  const missing = await graders.deterministic.grade(e, { x: '5', z: '11' });
  assert.equal(missing.errorType, 'invalid-input');
});

test('w01-e5 (code-trace, functions+reading): {ergebnis:10, zwischenspeicher:19} correct, rule fires on ergebnis', async () => {
  const e = byId('w01-e5');
  const ok = await graders.deterministic.grade(e, { ergebnis: '10', zwischenspeicher: '19' });
  assert.equal(ok.correct, true);
  assert.equal(ok.errorType, null);
  // Only ergebnis wrong (+1): the authored rule for value:ergebnis fires
  // (the rule key matches the wrong-variable list exactly).
  const wrong = await graders.deterministic.grade(e, { ergebnis: '11', zwischenspeicher: '19' });
  assert.equal(wrong.correct, false);
  assert.equal(wrong.errorType, 'wrong-value');
  assert.equal(wrong.diagnosis, 'verdopple_minus_eins(4) = 7, danach + 3 aus dem zweiten Argument von kombiniere.');
  // Both wrong: generic trace feedback (rule key no longer matches).
  const both = await graders.deterministic.grade(e, { ergebnis: '11', zwischenspeicher: '20' });
  assert.equal(both.correct, false);
  assert.equal(both.diagnosis, 'Falsche Werte für: ergebnis, zwischenspeicher. Tipp: Zeile für Zeile neu durchgehen und nach jeder Zuweisung den neuen Wert notieren.');
});

test('w01-e6 (predict-output, functions+reading): exact output "12 14" grades correct, mutation does not', async () => {
  const e = byId('w01-e6');
  const ok = await graders.deterministic.grade(e, '12 14');
  assert.equal(ok.correct, true);
  assert.equal(ok.verdictText, 'Richtig — genau diese Ausgabe.');
  const wrong = await graders.deterministic.grade(e, '13 14');
  assert.deepEqual(
    { correct: wrong.correct, errorType: wrong.errorType },
    { correct: false, errorType: 'wrong-output' },
  );
});

test('w01-e7 (parsons, basics): solution order accepted; distractor, missing, and swap each give their diagnosis', async () => {
  const e = byId('w01-e7');
  const sol = e.expectedAnswer.solutionOrder;
  assert.deepEqual(sol, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  assert.deepEqual(e.expectedAnswer.distractors, ['d1', 'd2']);
  // Structural: initialOrder contains every fragment exactly once.
  assert.deepEqual([...e.parameters.initialOrder].sort(), [...sol, 'd1', 'd2'].sort());
  assert.equal(new Set(e.parameters.initialOrder).size, e.parameters.initialOrder.length);
  const ok = await graders.deterministic.grade(e, [...sol]);
  assert.equal(ok.correct, true);
  assert.equal(ok.verdictText, 'Richtig — die Zeilenfolge ist vollständig und korrekt.');
  // Distractor kept in place of a solution line.
  const distractor = await graders.deterministic.grade(e, ['p1', 'p2', 'd1', 'p4', 'p5', 'p6']);
  assert.equal(distractor.correct, false);
  assert.equal(distractor.errorType, 'wrong-order');
  assert.equal(distractor.diagnosis, 'Mindestens eine Zeile gehört nicht zur Lösung (Distraktor) — prüfe, welche Zeile das Programm beschädigen würde.');
  // Missing tail line.
  const missing = await graders.deterministic.grade(e, sol.slice(0, 5));
  assert.equal(missing.correct, false);
  assert.equal(missing.diagnosis, 'Es fehlen Zeilen: p6.');
  // Pure order swap of p4/p5.
  const swap = await graders.deterministic.grade(e, ['p1', 'p2', 'p3', 'p5', 'p4', 'p6']);
  assert.equal(swap.correct, false);
  assert.equal(swap.diagnosis, 'Die Reihenfolge stimmt ab Position 4 nicht.');
});

test('w02-e1 (predict-output, control-flow+collections): expected answer is list notation with both lines', async () => {
  const e = byId('w02-e1');
  const ok = await graders.deterministic.grade(e, "['Lernp', 'KI-tfo']");
  assert.deepEqual(
    { correct: ok.correct, verdictText: ok.verdictText, errorType: ok.errorType },
    { correct: true, verdictText: 'Richtig — genau diese Ausgabe.', errorType: null },
  );
  // List-repr spacing is normalized.
  assert.equal((await graders.deterministic.grade(e, "[ 'Lernp' ,'KI-tfo' ]")).correct, true);
  assert.equal((await graders.deterministic.grade(e, "['Lernp', 'KI-tfo']\n")).correct, true);
  // Wrong slice value, reversed order, and raw (non-list) output are wrong.
  assert.equal((await graders.deterministic.grade(e, "['Lernp', 'KI-l']")).correct, false);
  assert.equal((await graders.deterministic.grade(e, "['KI-tfo', 'Lernp']")).correct, false);
  assert.equal((await graders.deterministic.grade(e, 'Lernp\nKI-tfo')).correct, false);
  const wrong = await graders.deterministic.grade(e, "['Lernp', 'KI-tf']");
  assert.equal(wrong.errorType, 'wrong-output');
});

test('w02-e2 (predict-output, control-flow+collections): expected answer is list-wrapped "otp"; raw and reversed strings are wrong', async () => {
  const e = byId('w02-e2');
  assert.equal((await graders.deterministic.grade(e, "['otp']")).correct, true);
  assert.equal((await graders.deterministic.grade(e, 'otp')).correct, false);
  assert.equal((await graders.deterministic.grade(e, "['pto']")).correct, false);
  assert.equal((await graders.deterministic.grade(e, "['tpo']")).correct, false);
});

test('w02-e3 (single-choice, control-flow): "a" correct, wrong choice carries immutable-feedback diagnosis, unknown id is invalid', async () => {
  const e = byId('w02-e3');
  const ok = await graders.deterministic.grade(e, 'a');
  assert.deepEqual(
    { correct: ok.correct, verdictText: ok.verdictText, errorType: ok.errorType, diagnosis: ok.diagnosis },
    { correct: true, verdictText: 'Richtig begründet.', errorType: null, diagnosis: null },
  );
  const b = await graders.deterministic.grade(e, 'b');
  assert.equal(b.correct, false);
  assert.equal(b.errorType, 'wrong-choice');
  assert.equal(b.diagnosis, 'Zeichenweise Zuweisung funktioniert bei Listen, nicht bei Strings — Strings sind immutable.');
  const c = await graders.deterministic.grade(e, 'c');
  assert.equal(c.correct, false);
  assert.equal(c.diagnosis, 'Einfügen wäre ebenfalls eine Änderung des bestehenden Strings — genau das verbietet Immutabilität.');
  const unknown = await graders.deterministic.grade(e, 'zz');
  assert.deepEqual(
    { correct: unknown.correct, verdictText: unknown.verdictText, errorType: unknown.errorType },
    { correct: false, verdictText: 'Bitte eine Auswahl treffen.', errorType: 'invalid-input' },
  );
});

test('every in-scope legacy exercise accepts its authored answer through the real grader', async () => {
  for (const { exercise } of inScope) {
    if (exercise.grader === 'pyodide') continue; // structurally covered below
    const result = await graders.deterministic.grade(exercise, authoredAnswer(exercise));
    assert.equal(result.correct, true, `${exercise.exerciseId}: authored answer no longer grades correct`);
    assert.equal(result.errorType, null, `${exercise.exerciseId}: correct grading must carry no errorType`);
  }
});

// ---------------------------------------------------------------------------
// 2. Foundations definitions with competencyIds ⊆ target set
// ---------------------------------------------------------------------------
const foundationsDir = join(root, 'content', 'exercise-definitions', 'foundations');
const definitionSchema = readJson('schemas', 'exercise-definition.schema.json');
const subsetDefinitions = readdirSync(foundationsDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(foundationsDir, f), 'utf8')))
  .filter((d) => Array.isArray(d.competencyIds) && d.competencyIds.length > 0 && d.competencyIds.every((c) => TARGET_COMPETENCIES.has(c)));

test('foundations subset discovery finds the three known control definitions', () => {
  const ids = subsetDefinitions.map((d) => d.definitionId).sort();
  assert.ok(
    ['f-control-choice-01', 'f-control-parsons-01', 'f-control-trace-01'].every((id) => ids.includes(id)),
    `subset definitions missing: ${ids.join(', ')}`,
  );
});

test('foundations subset definitions carry all schema-required fields with valid enum values', () => {
  const props = definitionSchema.properties;
  for (const d of subsetDefinitions) {
    for (const field of definitionSchema.required) {
      assert.ok(d[field] !== undefined, `${d.definitionId}: schema-required field ${field} missing`);
    }
    assert.ok(props.activityType.enum.includes(d.activityType), `${d.definitionId}: activityType off-enum`);
    assert.ok(props.graderId.enum.includes(d.graderId), `${d.definitionId}: graderId off-enum`);
    assert.ok(Number.isInteger(d.deterministicSeed), `${d.definitionId}: seed not an integer`);
    for (const c of d.competencyIds) {
      assert.match(c, new RegExp(props.competencyIds.items.pattern), `${d.definitionId}: bad competency id ${c}`);
    }
    assert.equal(typeof d.prompt, 'string');
    assert.ok(d.fullSolution.length > 0, `${d.definitionId}: fullSolution (reference solution text) missing`);
    assert.equal(d.locale, 'de');
  }
});

test('f-control-choice-01: "for-values" correct, distractors wrong; authored rule now fires (Session-B grammar fix)', async () => {
  const d = subsetDefinitions.find((x) => x.definitionId === 'f-control-choice-01');
  const ok = await graders.deterministic.grade(d, 'for-values');
  assert.deepEqual(
    { correct: ok.correct, verdictText: ok.verdictText, errorType: ok.errorType },
    { correct: true, verdictText: 'Richtig begründet.', errorType: null },
  );
  const wrong = await graders.deterministic.grade(d, 'while-true');
  assert.deepEqual(
    { correct: wrong.correct, errorType: wrong.errorType },
    { correct: false, errorType: 'wrong-choice' },
  );
  // Session B: the rule was rewritten from the dead bare key `while-true`
  // into valid grammar — wrong choices now get the authored diagnosis.
  assert.equal(typeof wrong.diagnosis, 'string');
  assert.ok(wrong.diagnosis.length > 20, 'authored diagnosis must fire');
  assert.equal((await graders.deterministic.grade(d, 'recursive')).correct, false);
  assert.equal((await graders.deterministic.grade(d, 'if-only')).correct, false);
  const unknown = await graders.deterministic.grade(d, 'for-value');
  assert.deepEqual({ correct: unknown.correct, errorType: unknown.errorType }, { correct: false, errorType: 'invalid-input' });
});

test('f-control-parsons-01: solution order correct; duplicate-length, distractor, missing, reversed each characterized', async () => {
  const d = subsetDefinitions.find((x) => x.definitionId === 'f-control-parsons-01');
  const sol = d.expectedAnswer.solutionOrder;
  assert.deepEqual(sol, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  assert.equal((await graders.deterministic.grade(d, [...sol])).correct, true);
  // Pure count anomaly (duplicated p6): the authored order-length-mismatch rule fires.
  const dup = await graders.deterministic.grade(d, [...sol, 'p6']);
  assert.equal(dup.correct, false);
  assert.equal(dup.errorType, 'wrong-order');
  assert.equal(dup.diagnosis, 'Die Lösung enthält genau sechs Zeilen.');
  const distractor = await graders.deterministic.grade(d, ['p1', 'p2', 'd1', 'p3', 'p4', 'p5', 'p6']);
  assert.equal(distractor.correct, false);
  assert.equal(distractor.diagnosis, 'Mindestens eine Zeile gehört nicht zur Lösung (Distraktor) — prüfe, welche Zeile das Programm beschädigen würde.');
  const missing = await graders.deterministic.grade(d, sol.slice(0, 5));
  assert.equal(missing.correct, false);
  assert.equal(missing.diagnosis, 'Es fehlen Zeilen: p6.');
  const reversed = await graders.deterministic.grade(d, [...sol].reverse());
  assert.equal(reversed.correct, false);
  assert.equal(reversed.diagnosis, 'Die Reihenfolge stimmt ab Position 1 nicht.');
});

test('f-control-trace-01: {summe:-1, wert:7} correct; +1 mutations rejected, value:summe rule fires', async () => {
  const d = subsetDefinitions.find((x) => x.definitionId === 'f-control-trace-01');
  const ok = await graders.deterministic.grade(d, { summe: '3', wert: '7' });
  assert.deepEqual(
    { correct: ok.correct, verdictText: ok.verdictText, errorType: ok.errorType },
    { correct: true, verdictText: 'Richtig — alle Variablenwerte stimmen.', errorType: null },
  );
  const totalOnly = await graders.deterministic.grade(d, { summe: '0', wert: '7' });
  assert.equal(totalOnly.correct, false);
  assert.equal(totalOnly.errorType, 'wrong-value');
  assert.equal(totalOnly.diagnosis, 'Prüfe summe nach jedem der drei Läufe, ohne es neu auf null zu setzen.');
  const both = await graders.deterministic.grade(d, { summe: '0', wert: '3' });
  assert.equal(both.correct, false);
  assert.equal(both.diagnosis, 'Falsche Werte für: summe, wert. Tipp: Zeile für Zeile neu durchgehen und nach jeder Zuweisung den neuen Wert notieren.');
});

// ---------------------------------------------------------------------------
// 3. Pyodide exercises: structural contract only (no worker in Node)
// ---------------------------------------------------------------------------
test('pyodide definitions touching the target competencies ship non-empty tests and a reference solution', () => {
  // control-repair is not a strict subset (adds c-testing-debugging) but its
  // competencyIds include all four target competencies, so it belongs to the
  // group-A contract surface.
  const d = readJson('content', 'exercise-definitions', 'foundations', 'control-repair.json');
  assert.ok(d.competencyIds.every((c) => TARGET_COMPETENCIES.has(c) || c === 'c-testing-debugging'));
  assert.equal(d.graderId, 'pyodide');
  assert.equal(typeof d.parameters.tests, 'string');
  assert.ok(d.parameters.tests.trim().length > 0, 'f-control-code-repair-01: parameters.tests must not be empty');
  // Every test references the required function; the reference solver text exists.
  assert.equal(d.expectedAnswer.requiredFunction, 'positive_values');
  assert.ok(d.parameters.tests.includes('positive_values'));
  assert.ok(d.fullSolution.includes('def positive_values'), 'reference solver missing from fullSolution');
  assert.ok(d.fullSolution.includes('return result'));
  assert.ok(Array.isArray(d.parameters.packages));
});

test('no w01/w02 legacy exercise of the target competencies uses the pyodide grader', () => {
  for (const { exercise } of inScope) {
    assert.notEqual(exercise.grader, 'pyodide', `${exercise.exerciseId}: unexpected pyodide grader — extend the structural checks`);
  }
});

// ---------------------------------------------------------------------------
// 4. Deterministic seeds: adapter round-trip and generator reproducibility
// ---------------------------------------------------------------------------
test('static group-A exercises: adapt + instantiate at deterministicSeed reproduces the stored instance', () => {
  for (const { exercise, weekId } of inScope) {
    const definition = adaptLegacyExercise(exercise, weekId);
    assert.equal(definition.definitionId, exercise.exerciseId);
    assert.equal(definition.deterministicSeed, exercise.deterministicSeed);
    assert.deepEqual(definition.competencyIds, exercise.skillIds);
    assert.equal(definition.generatorId, null, `${exercise.exerciseId}: static exercise must not gain a generator`);
    const instance = instantiateLegacyExercise(definition);
    assert.equal(instance.seed, exercise.deterministicSeed);
    assert.equal(instance.instanceId, `${exercise.exerciseId}:${exercise.deterministicSeed}`);
    assert.equal(instance.grader, 'deterministic');
    assert.equal(instance.activityType, exercise.type);
    assert.deepEqual(instance.parameters, exercise.parameters);
    assert.deepEqual(instance.choices, exercise.choices || []);
    assert.deepEqual(instance.expectedAnswer, exercise.expectedAnswer);
  }
});

test('static group-A instances grade correct through the instance path', async () => {
  for (const { exercise, weekId } of inScope) {
    const instance = instantiateLegacyExercise(adaptLegacyExercise(exercise, weekId));
    const result = await graders.deterministic.grade(instance, authoredAnswer(instance));
    assert.equal(result.correct, true, `${exercise.exerciseId}: instance no longer grades correct`);
  }
});

test('seeded w01 exercises: generator(deterministicSeed) equals registry resolution and the stored defaults', () => {
  const seeded = [
    ['w01-e8', genLinearEquation],
    ['w01-e9', genPowerExpr],
    ['w01-e10', genLogExpr],
  ];
  for (const [id, directGenerator] of seeded) {
    const e = byId(id);
    const generatorId = e.expectedAnswer.generator;
    assert.ok(e.parameters.seedGenerator === generatorId, `${id}: parameters.seedGenerator diverged from expectedAnswer.generator`);
    // Registry resolution is the same function as the direct w01 import.
    assert.equal(resolveSeedGenerator(generatorId), directGenerator, `${id}: registry maps ${generatorId} elsewhere`);
    const generated = resolveSeedGenerator(generatorId)(e.deterministicSeed);
    assert.equal(generated.expected, e.expectedAnswer.defaultExpected, `${id}: generator(${e.deterministicSeed}).expected !== defaultExpected`);
    assert.equal(e.prompt, generated.prompt, `${id}: stored prompt diverged from generator output at deterministicSeed`);
    // Reproducible across repeated calls and equal for the direct import.
    const again = resolveSeedGenerator(generatorId)(e.deterministicSeed);
    assert.deepEqual(again, generated);
    assert.deepEqual(directGenerator(e.deterministicSeed), generated);
    // Instantiating at deterministicSeed resolves the same expected value.
    const instance = instantiateLegacyExercise(adaptLegacyExercise(e, 'w01'));
    assert.equal(instance.expectedAnswer.value, e.expectedAnswer.defaultExpected);
    assert.deepEqual(instance.parameters, generated.parameters);
    assert.equal(instance.generatorId, generatorId);
  }
});

test('seeded w01 exercises: raw exercise grades correct at defaultExpected and wrong at +1', async () => {
  for (const id of ['w01-e8', 'w01-e9', 'w01-e10']) {
    const e = byId(id);
    const expected = e.expectedAnswer.defaultExpected;
    const ok = await graders.deterministic.grade(e, String(expected));
    assert.deepEqual(
      { correct: ok.correct, verdictText: ok.verdictText, errorType: ok.errorType },
      { correct: true, verdictText: 'Richtig.', errorType: null },
      `${id}: seeded grading at deterministicSeed broke`,
    );
    const wrong = await graders.deterministic.grade(e, String(expected + 1));
    assert.deepEqual(
      { correct: wrong.correct, verdictText: wrong.verdictText, errorType: wrong.errorType },
      { correct: false, verdictText: 'Nicht richtig.', errorType: 'wrong-value' },
    );
  }
});

// ---------------------------------------------------------------------------
// Prompt-leak: the expected value must not appear as a standalone number in
// the stored prompt (digit-boundary match, so "2" inside "25" does not count).
// ---------------------------------------------------------------------------
test('numeric seeded prompts do not leak the expected value as a standalone number', () => {
  const standalone = (prompt, value) => new RegExp(`(?<![0-9])${value}(?![0-9])`).test(String(prompt));
  for (const id of ['w01-e8', 'w01-e9', 'w01-e10']) {
    const e = byId(id);
    assert.equal(
      standalone(e.prompt, e.expectedAnswer.defaultExpected),
      false,
      `${id}: expected value ${e.expectedAnswer.defaultExpected} leaked into the prompt`,
    );
  }
});
