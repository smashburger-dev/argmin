// Pure-function tests for the mastery policy and the import validation.
// These modules touch IndexedDB only through the browser-only `progress`
// singleton, which is null in Node — the tested functions are side-effect
// free by design.
import test from 'node:test';
import assert from 'node:assert/strict';
import { masteryFromAttempts, MASTERY_MAX_HINTS } from '../assets/js/core/exercise_runtime.js';
import { validateImportPayload, SCHEMA_VERSION } from '../assets/js/core/progress_store.js';

const attempt = (over = {}) => ({
  exerciseId: 'w05-e1', seed: 511, answer: '1', correct: true,
  hintsUsed: 0, revealedSolution: false, masteryEligible: true, ...over,
});

// --- mastery policy ----------------------------------------------------------

test('mastery: clean correct attempt qualifies', () => {
  assert.equal(masteryFromAttempts([attempt()]).mastered, true);
});

test('mastery: incorrect attempts never qualify', () => {
  const s = masteryFromAttempts([attempt({ correct: false }), attempt({ correct: false })]);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'not-solved');
});

test(`mastery: up to ${MASTERY_MAX_HINTS} hint(s) allowed, more block mastery`, () => {
  assert.equal(masteryFromAttempts([attempt({ hintsUsed: 1 })]).mastered, true);
  const s = masteryFromAttempts([attempt({ hintsUsed: 2 })]);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'hints-exhausted');
});

test('mastery: a Teillösung (event partial, all hints) blocks mastery', () => {
  const partial = attempt({ correct: false, hintsUsed: 2, event: 'partial' });
  const s = masteryFromAttempts([partial, attempt({ hintsUsed: 2 })]);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'hints-exhausted');
});

test('mastery: earlier revealed solution locks mastery even for later clean attempts', () => {
  const history = [
    attempt({ correct: false, answer: null, revealedSolution: true, event: 'solution-revealed' }),
    attempt(), // later, clean and correct
  ];
  const s = masteryFromAttempts(history);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'solution-revealed');
  assert.equal(s.locked, true);
});

test('mastery: a solution reveal disqualifies only the same instance', () => {
  const history = [
    attempt({ instanceId: 'w05-e1:cycle-a:511', correct: false, answer: null, revealedSolution: true, event: 'solution-revealed' }),
    attempt({ instanceId: 'w05-e1:cycle-a:512', seed: 512 }),
  ];
  const s = masteryFromAttempts(history);
  assert.equal(s.mastered, true);
  assert.equal(s.locked, false);
});

test('mastery: grader outcome with masteryEligible false never masters (manual-rubric)', () => {
  const s = masteryFromAttempts([attempt({ masteryEligible: false })]);
  assert.equal(s.mastered, false);
});

test('mastery: empty history is not mastered', () => {
  const s = masteryFromAttempts([]);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'no-attempts');
});

// --- import validation --------------------------------------------------------

const validPayload = () => ({
  schemaVersion: SCHEMA_VERSION,
  exportedAt: '2026-08-24T00:00:00.000Z',
  data: {
    weeks: [{ weekId: 'w05', selfMarked: true }],
    attempts: [{
      ...attempt(),
      eventId: 'event-1', installationId: 'install-1', eventType: 'attempt',
      activityId: 'w05-e1', activityVersion: '1', definitionId: 'w05-e1',
      instanceId: 'w05-e1:cycle-1:511', cycleId: 'cycle-1',
      competencyIds: ['c-linalg-matrices'], contentVersion: 'test-v3',
      occurredAt: '2026-08-24T00:00:00.000Z', recordedAt: '2026-08-24T00:00:00.000Z',
      evidenceEligible: true, exclusionCode: null,
    }],
    journal: [{ exerciseId: 'w05-e1', errorType: 'wrong-value', ts: '2026-08-24' }],
    settings: [{ key: 'theme', value: 'light' }],
    meta: [{ k: 'migrated', v: { found: false } }],
    plans: [], drafts: [],
  },
});

test('import: valid roundtrip payload passes', () => {
  const { ok, errors } = validateImportPayload(validPayload());
  assert.equal(ok, true, JSON.stringify(errors));
});

test('import: missing store is rejected', () => {
  const p = validPayload();
  delete p.data.weeks;
  const { ok, errors } = validateImportPayload(p);
  assert.equal(ok, false);
  assert.ok(errors.some((e) => e.includes('weeks')));
});

test('import: wrong-typed store is rejected (string instead of array)', () => {
  const p = validPayload();
  p.data.weeks = 'not-an-array';
  const { ok, errors } = validateImportPayload(p);
  assert.equal(ok, false);
  assert.ok(errors.some((e) => e.includes('weeks') && e.includes('Array')));
});

test('import: invalid records are rejected per store', () => {
  const p = validPayload();
  p.data.weeks = [{ weekId: 'nope' }, { selfMarked: true }, 'string'];
  p.data.attempts = [{ exerciseId: 'w05-e1', correct: 'yes' }];
  const { ok, errors } = validateImportPayload(p);
  assert.equal(ok, false);
  assert.ok(errors.some((e) => e.includes('weeks[0]')));
  assert.ok(errors.some((e) => e.includes('weeks[1]')));
  assert.ok(errors.some((e) => e.includes('weeks[2]')));
  assert.ok(errors.some((e) => e.includes('attempts[0]')));
});

test('import: unknown schema version is rejected', () => {
  const p = validPayload();
  p.schemaVersion = 999;
  const { ok, errors } = validateImportPayload(p);
  assert.equal(ok, false);
  assert.ok(errors.some((e) => e.includes('schemaVersion')));
});

test('import: non-object payloads are rejected without throwing', () => {
  assert.equal(validateImportPayload(null).ok, false);
  assert.equal(validateImportPayload('json').ok, false);
  assert.equal(validateImportPayload([1, 2]).ok, false);
  assert.equal(validateImportPayload({ schemaVersion: 1 }).ok, false); // data missing
});
