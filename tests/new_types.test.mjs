// Grader + schema tests for the LM-R4 pilot types (parsons, code-trace,
// predict-output) and the LM-R5 worked-example stage (studying neither
// qualifies nor locks mastery).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { graders } from '../assets/js/core/graders.js';
import { masteryFromAttempts } from '../assets/js/core/exercise_runtime.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const w05 = JSON.parse(readFileSync(join(root, 'content/exercises/w05.json'), 'utf8'));
const byId = (id) => w05.exercises.find((e) => e.exerciseId === id);
const det = graders.deterministic;

// --- schema sanity of the pilots ------------------------------------------------

test('pilots: e14-e16 exist with new types and all required fields', () => {
  for (const [id, type] of [['w05-e14', 'parsons'], ['w05-e15', 'code-trace'], ['w05-e16', 'predict-output']]) {
    const e = byId(id);
    assert.ok(e, id + ' fehlt');
    assert.equal(e.type, type);
    assert.equal(e.locale, 'de');
    assert.equal(e.grader, 'deterministic');
    for (const f of ['skillIds', 'prompt', 'parameters', 'deterministicSeed', 'tolerancePolicy', 'hints', 'fullSolution', 'difficulty', 'estimatedMinutes', 'sourceLineage', 'license', 'validationStatus', 'testedSeedCount']) {
      assert.ok(e[f] !== undefined, `${id}: ${f} fehlt`);
    }
  }
});

test('parsons schema: solution is a permutation subset of the fragments, initial order covers all', () => {
  const e = byId('w05-e14');
  const ids = e.parameters.fragments.map((f) => f.id);
  const sol = e.expectedAnswer.solutionOrder;
  const dis = e.expectedAnswer.distractors;
  assert.deepEqual([...sol, ...dis].sort(), [...ids].sort(), 'solution + distractors = fragments');
  assert.equal(new Set(sol).size, sol.length, 'no duplicates in solution');
  assert.deepEqual([...e.parameters.initialOrder].sort(), [...ids].sort(), 'initial order = permutation of all fragments');
});

// --- parsons grader ---------------------------------------------------------------

test('parsons: correct order without distractors passes', async () => {
  const e = byId('w05-e14');
  const r = await det.grade(e, [...e.expectedAnswer.solutionOrder]);
  assert.equal(r.correct, true);
  assert.equal(r.errorType, null);
});

test('parsons: included distractor fails with a diagnosis', async () => {
  const e = byId('w05-e14');
  const r = await det.grade(e, ['p1', 'p2', 'p3', 'p4', 'd1']);
  assert.equal(r.correct, false);
  assert.equal(r.errorType, 'wrong-order');
  assert.match(r.diagnosis, /Distraktor/);
});

test('parsons: right lines in wrong order reports the first differing position', async () => {
  const e = byId('w05-e14');
  const r = await det.grade(e, ['p1', 'p3', 'p2', 'p4', 'p5']);
  assert.equal(r.correct, false);
  assert.match(r.diagnosis, /Position 2/);
});

test('parsons: missing lines are named; junk input never throws', async () => {
  const e = byId('w05-e14');
  const r = await det.grade(e, ['p1', 'p2']);
  assert.match(r.diagnosis, /p3/);
  const junk = await det.grade(e, 'nonsense');
  assert.equal(junk.correct, false);
  const empty = await det.grade(e, null);
  assert.equal(empty.correct, false);
});

test('malformed rubric, vector and Parsons contracts fail closed', async () => {
  const rubric = await graders['manual-rubric'].grade({ parameters: { minWords: 1 }, rubric: [] }, { text: 'Text', checks: [] });
  assert.equal(rubric.correct, false);
  assert.equal(rubric.errorType, 'grader-error');
  const vector = await det.grade({ activityType: 'vector', parameters: { A: 'invalid', b: null }, deterministicSeed: 1 }, '(1, 2)');
  assert.equal(vector.correct, false);
  assert.equal(vector.errorType, 'grader-error');
  const parsons = await det.grade({ activityType: 'parsons', expectedAnswer: {} }, []);
  assert.equal(parsons.correct, false);
  assert.equal(parsons.errorType, 'grader-error');
});

// --- code-trace grader --------------------------------------------------------------

test('code-trace: hand-traced values verified against an independent simulation', async () => {
  const e = byId('w05-e15');
  // independent re-simulation of the authored snippet (indices, not values)
  const spalte1 = [2, 1], spalte2 = [1, 3], x = [1, 2];
  const b0 = x[0] * spalte1[0] + x[1] * spalte2[0];
  const b1 = x[0] * spalte1[1] + x[1] * spalte2[1];
  assert.deepEqual(e.parameters.variables.map((v) => v.value), [b0, b1]);
  const r = await det.grade(e, { b0: String(b0), b1: String(b1) });
  assert.equal(r.correct, true);
});

test('code-trace: one wrong variable fails and names it; non-integers are invalid input', async () => {
  const e = byId('w05-e15');
  const r = await det.grade(e, { b0: '5', b1: '7' });
  assert.equal(r.correct, false);
  assert.equal(r.errorType, 'wrong-value');
  assert.match(r.diagnosis, /b0/);
  const inv = await det.grade(e, { b0: 'fast vier', b1: '7' });
  assert.equal(inv.errorType, 'invalid-input');
  assert.equal(inv.correct, false);
});

// --- predict-output grader ------------------------------------------------------------

test('predict-output: authored output verified by simulation; whitespace-tolerant match', async () => {
  const e = byId('w05-e16');
  const A = [[2, 1], [1, 3]], x = [2, -1];
  const zeilen = [];
  for (let i = 0; i < 2; i++) zeilen.push(A[i][0] * x[0] + A[i][1] * x[1]);
  const expected = '[' + zeilen.join(', ') + ']';
  assert.equal(e.expectedAnswer.output, expected);
  const ok = await det.grade(e, expected);
  assert.equal(ok.correct, true);
  const spaced = await det.grade(e, '  [ 3 ,   -1 ]  ');
  assert.equal(spaced.correct, true, 'normalization collapses whitespace');
});

test('predict-output: wrong output and empty input are rejected', async () => {
  const e = byId('w05-e16');
  const wrong = await det.grade(e, '[3, -1, 5]');
  assert.equal(wrong.correct, false);
  assert.equal(wrong.errorType, 'wrong-output');
  // element-count mismatch fires the authored rule; other wrong answers
  // get the generic element-wise diagnosis
  assert.match(wrong.diagnosis, /genau zwei Einträge|elementweise/);
  const wrongVals = await det.grade(e, '[4, 7]');
  assert.match(wrongVals.diagnosis, /elementweise/);
  const empty = await det.grade(e, '');
  assert.equal(empty.errorType, 'invalid-input');
});

// --- worked-example mastery neutrality (LM-R5) -------------------------------------------

test('worked example: studying neither qualifies nor locks mastery', () => {
  const T0 = Date.parse('2026-01-05T10:00:00.000Z');
  const studied = {
    exerciseId: 'w05-e14', correct: false, masteryEligible: false,
    event: 'studied', hintsUsed: 0, revealedSolution: false, ts: new Date(T0).toISOString(),
  };
  // only studying: nothing solved
  let s = masteryFromAttempts([studied], T0 + 1);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'not-solved');
  assert.equal(s.locked, false);
  // studying followed by a clean solve: mastery works normally
  const hit = { ...studied, correct: true, masteryEligible: true, event: undefined, ts: new Date(T0 + 10).toISOString() };
  s = masteryFromAttempts([studied, hit], T0 + 20);
  assert.equal(s.mastered, true);
  assert.equal(s.reason, 'ok');
});

test('worked example: schema fields on the pilot (steps, subgoalLabels, completion slots)', () => {
  const we = byId('w05-e14').workedExample;
  assert.ok(we.title);
  assert.ok(we.steps.length >= 3);
  for (const s of we.steps) {
    assert.ok(s.subgoalLabel, 'every step carries a subgoal label (@margulieux<subgoals><2012>)');
    if (s.completion) {
      assert.ok(s.completion.prompt && s.completion.answer, 'completion slot needs prompt + answer');
    }
  }
  assert.ok(we.steps.some((s) => s.completion), 'fading needs at least one completion slot');
});
