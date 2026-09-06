// Grader + schema tests for canonical family activity types.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { graders } from '../assets/js/core/graders.js';
import { masteryFromAttempts } from '../assets/js/core/exercise_runtime.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const family = (file, caseId) => {
  const document = JSON.parse(readFileSync(join(root, 'content/families', file), 'utf8'));
  const item = document.cases.find((entry) => entry.caseId === caseId);
  assert.ok(item, `${caseId} fehlt`);
  return { ...item, exerciseId: `${document.familyId}:${caseId}`, type: item.activityType, grader: item.graderId, expectedAnswer: item.expected };
};
const parsons = () => family('construct-freeze-assert-guard.json', 'freeze-assert-parsons');
const trace = () => family('trace-assignment-state.json', 'column-picture-trace');
const output = () => family('aggregate-evidence-rule-audit.json', 'final-diagnosis-trace');
const det = graders.deterministic;

test('parsons schema: solution is a permutation subset of the fragments, initial order covers all', () => {
  const e = parsons();
  const ids = e.parameters.fragments.map((f) => f.id);
  assert.deepEqual([...e.expectedAnswer.solutionOrder, ...e.expectedAnswer.distractors].sort(), [...ids].sort());
  assert.equal(new Set(e.expectedAnswer.solutionOrder).size, e.expectedAnswer.solutionOrder.length);
  assert.deepEqual([...e.parameters.initialOrder].sort(), [...ids].sort());
});

test('parsons: correct order without distractors passes', async () => {
  const r = await det.grade(parsons(), parsons().expectedAnswer.solutionOrder);
  assert.equal(r.correct, true);
  assert.equal(r.errorType, null);
});

test('parsons: included distractor fails with a diagnosis', async () => {
  const e = parsons();
  const r = await det.grade(e, [...e.expectedAnswer.solutionOrder, e.expectedAnswer.distractors[0]]);
  assert.equal(r.correct, false);
  assert.equal(r.errorType, 'wrong-order');
  assert.match(r.diagnosis, /Distraktor/);
});

test('parsons: right lines in wrong order reports a differing position', async () => {
  const e = parsons();
  const wrong = [...e.expectedAnswer.solutionOrder];
  [wrong[1], wrong[2]] = [wrong[2], wrong[1]];
  const r = await det.grade(e, wrong);
  assert.equal(r.correct, false);
  assert.match(r.diagnosis, /Position/);
});

test('parsons: missing lines are named; junk input never throws', async () => {
  const e = parsons();
  const r = await det.grade(e, e.expectedAnswer.solutionOrder.slice(0, 2));
  assert.match(r.diagnosis, /p\d/);
  assert.equal((await det.grade(e, 'nonsense')).correct, false);
  assert.equal((await det.grade(e, null)).correct, false);
});

test('malformed rubric, vector and Parsons contracts fail closed', async () => {
  const rubric = await graders['manual-rubric'].grade({ parameters: { minWords: 1 }, rubric: [] }, { text: 'Text', checks: [] });
  assert.equal(rubric.correct, false);
  assert.equal(rubric.errorType, 'grader-error');
  const vector = await det.grade({ activityType: 'vector', parameters: { A: 'invalid', b: null }, deterministicSeed: 1 }, '(1, 2)');
  assert.equal(vector.correct, false);
  assert.equal(vector.errorType, 'grader-error');
  const malformed = await det.grade({ activityType: 'parsons', expectedAnswer: {} }, []);
  assert.equal(malformed.correct, false);
  assert.equal(malformed.errorType, 'grader-error');
});

test('code-trace: hand-traced values verified against an independent simulation', async () => {
  const e = trace();
  const [b0, b1] = e.parameters.variables.map((variable) => variable.value);
  assert.deepEqual([b0, b1], [4, 7]);
  assert.equal((await det.grade(e, { b0: String(b0), b1: String(b1) })).correct, true);
});

test('code-trace: one wrong variable fails and names it; non-integers are invalid input', async () => {
  const e = trace();
  const r = await det.grade(e, { b0: '5', b1: '7' });
  assert.equal(r.correct, false);
  assert.equal(r.errorType, 'wrong-value');
  assert.match(r.diagnosis, /b0/);
  const inv = await det.grade(e, { b0: 'fast vier', b1: '7' });
  assert.equal(inv.errorType, 'invalid-input');
  assert.equal(inv.correct, false);
});

test('predict-output: authored output verified by simulation; whitespace-tolerant match', async () => {
  const e = output();
  const expected = e.expectedAnswer.output;
  assert.equal((await det.grade(e, expected)).correct, true);
  assert.equal((await det.grade(e, `  ${expected.replaceAll('\n', ' \n ')}  `)).correct, true);
});

test('predict-output: wrong output and empty input are rejected', async () => {
  const e = output();
  const wrong = await det.grade(e, 'falsch');
  assert.equal(wrong.correct, false);
  assert.equal(wrong.errorType, 'wrong-output');
  assert.equal((await det.grade(e, '')).errorType, 'invalid-input');
});

test('worked example: studying neither qualifies nor locks mastery', () => {
  const T0 = Date.parse('2026-01-05T10:00:00.000Z');
  const studied = { exerciseId: 'family:case', correct: false, masteryEligible: false, event: 'studied', hintsUsed: 0, revealedSolution: false, ts: new Date(T0).toISOString() };
  let s = masteryFromAttempts([studied], T0 + 1);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'not-solved');
  assert.equal(s.locked, false);
  const hit = { ...studied, correct: true, masteryEligible: true, event: undefined, ts: new Date(T0 + 10).toISOString() };
  s = masteryFromAttempts([studied, hit], T0 + 20);
  assert.equal(s.mastered, true);
  assert.equal(s.reason, 'ok');
});
