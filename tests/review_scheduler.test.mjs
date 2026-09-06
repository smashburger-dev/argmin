// Pure-function tests for the review scheduler (ADR-0008) and the timed
// mastery policy (LM-R1). All timestamps are injected — no wall-clock
// dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS, WEEK_MS, DEFAULT_REVIEW_PARAMS, MASTERY_MAX_HINTS, resolveReviewParams,
  reviewStateFromAttempts,
  buildReviewQueueEntry, buildReviewQueueEntries,
} from '../assets/js/core/review_scheduler.js';
import { masteryFromAttempts } from '../assets/js/core/exercise_runtime.js';
import { validateImportPayload } from '../assets/js/core/progress_store.js';

const T0 = Date.parse('2026-01-05T10:00:00.000Z'); // Monday
const at = (ts, over = {}) => ({
  exerciseId: 'w05-e1', seed: 511, answer: '1', correct: true,
  hintsUsed: 0, revealedSolution: false, masteryEligible: true, ts, ...over,
});
const hit = (tsMs, over = {}) => at(new Date(tsMs).toISOString(), over);
const miss = (tsMs, over = {}) => at(new Date(tsMs).toISOString(), { correct: false, ...over });

// --- expanding slots -----------------------------------------------------------

test('slots: first qualified hit schedules the review at +2 weeks (14 days, LM-R1 N)', () => {
  const st = reviewStateFromAttempts([hit(T0)], T0);
  assert.equal(st.qualified, true);
  assert.equal(st.qualifiedHitCount, 1);
  assert.equal(st.validUntilMs - T0, 2 * WEEK_MS);
  assert.equal(st.nextDueMs, st.validUntilMs);
  assert.equal(st.consolidated, false);
});

test('slots: second hit expands to +5 weeks, third to +11 weeks (OF-3 ladder)', () => {
  const t2 = T0 + 2 * WEEK_MS;
  const t3 = t2 + 5 * WEEK_MS;
  const s2 = reviewStateFromAttempts([hit(T0), hit(t2)], t3);
  assert.equal(s2.qualifiedHitCount, 2);
  assert.equal(s2.validUntilMs - t2, 5 * WEEK_MS);
  const s3 = reviewStateFromAttempts([hit(T0), hit(t2), hit(t3)], t3 + 1);
  assert.equal(s3.qualifiedHitCount, 3);
  assert.equal(s3.validUntilMs - t3, 11 * WEEK_MS);
});

test('slots: unsorted history is sorted by ts before the last hit is picked', () => {
  const t2 = T0 + 2 * WEEK_MS;
  const st = reviewStateFromAttempts([hit(t2), hit(T0)], t2 + 1);
  assert.equal(st.lastQualifiedAtMs, t2);
  assert.equal(st.validUntilMs - t2, 5 * WEEK_MS);
});

test('slots: fourth hit repeats the final interval under the default policy', () => {
  const t2 = T0 + 2 * WEEK_MS, t3 = t2 + 5 * WEEK_MS, t4 = t3 + 11 * WEEK_MS;
  const st = reviewStateFromAttempts([hit(T0), hit(t2), hit(t3), hit(t4)], t4 + 1);
  assert.equal(st.qualifiedHitCount, 4);
  assert.equal(st.consolidated, false);
  assert.equal(st.validUntilMs, t4 + 11 * WEEK_MS);
  assert.equal(st.nextDueMs, st.validUntilMs);
});

test('slots: postLadderPolicy repeat-last keeps the 11-week interval forever', () => {
  const t2 = T0 + 2 * WEEK_MS, t3 = t2 + 5 * WEEK_MS, t4 = t3 + 11 * WEEK_MS, t5 = t4 + 11 * WEEK_MS;
  const params = { ...DEFAULT_REVIEW_PARAMS, postLadderPolicy: 'repeat-last' };
  const st = reviewStateFromAttempts([hit(T0), hit(t2), hit(t3), hit(t4), hit(t5)], t5 + 1, params);
  assert.equal(st.consolidated, false);
  assert.equal(st.validUntilMs - t5, 11 * WEEK_MS);
});

test('slots: misses and hint events never advance the ladder', () => {
  const st = reviewStateFromAttempts([hit(T0), miss(T0 + WEEK_MS), at(new Date(T0 + 10).toISOString(), { event: 'hint-1', correct: false })], T0 + WEEK_MS);
  assert.equal(st.qualifiedHitCount, 1);
  assert.equal(st.validUntilMs - T0, 2 * WEEK_MS);
});

test('slots: attempts without ts are treated as fresh (legacy data never ages)', () => {
  const now = T0 + 100 * WEEK_MS;
  const st = reviewStateFromAttempts([{ exerciseId: 'w05-e1', correct: true }], now);
  assert.equal(st.qualifiedHitCount, 1);
  assert.equal(st.validUntilMs, now + 2 * WEEK_MS);
});

test('slots: nothing qualified -> no validity, no due date', () => {
  const st = reviewStateFromAttempts([miss(T0)], T0 + 99 * WEEK_MS);
  assert.equal(st.qualified, false);
  assert.equal(st.nextDueMs, null);
});

// --- timed mastery (LM-R1) -----------------------------------------------------

test('mastery: valid within the window, expired after it', () => {
  assert.equal(masteryFromAttempts([hit(T0)], T0 + 13 * DAY_MS).mastered, true);
  const s = masteryFromAttempts([hit(T0)], T0 + 14 * DAY_MS + 1);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'expired');
  assert.equal(s.locked, false);
  assert.equal(s.validUntilMs, T0 + 2 * WEEK_MS);
});

test('mastery: review hit renews validity at the next ladder interval', () => {
  const t2 = T0 + 2 * WEEK_MS + DAY_MS; // solved one day after expiry
  const s = masteryFromAttempts([hit(T0), hit(t2)], t2 + 4 * WEEK_MS);
  assert.equal(s.mastered, true);
  assert.equal(s.reason, 'ok');
  assert.equal(s.validUntilMs, t2 + 5 * WEEK_MS);
  assert.equal(masteryFromAttempts([hit(T0), hit(t2)], t2 + 5 * WEEK_MS + 1).reason, 'expired');
});

test('mastery: repeated history still expires after the final configured interval', () => {
  const t2 = T0 + 2 * WEEK_MS, t3 = t2 + 5 * WEEK_MS, t4 = t3 + 11 * WEEK_MS;
  const s = masteryFromAttempts([hit(T0), hit(t2), hit(t3), hit(t4)], t4 + 12 * WEEK_MS);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'expired');
  assert.equal(s.consolidated, undefined);
});

test('mastery: revealed solution locks even when time has passed (edge case)', () => {
  const t2 = T0 + 2 * WEEK_MS;
  const s = masteryFromAttempts([hit(T0), at(new Date(t2).toISOString(), { revealedSolution: true, correct: false, event: 'solution-revealed' }), hit(t2 + DAY_MS)], t2 + 2 * DAY_MS);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'solution-revealed');
  assert.equal(s.locked, true);
});

test('mastery: empty history stays no-attempts (edge case)', () => {
  const s = masteryFromAttempts([], T0);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'no-attempts');
});

test('mastery: hints-exhausted keeps blocking regardless of time (edge case)', () => {
  const s = masteryFromAttempts([hit(T0, { hintsUsed: 2 })], T0 + 1);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'hints-exhausted');
});

test('mastery: manual-rubric correctness never qualifies even fresh (edge case)', () => {
  const s = masteryFromAttempts([hit(T0, { masteryEligible: false })], T0 + 1);
  assert.equal(s.mastered, false);
  assert.equal(s.reason, 'not-solved');
});

// --- review params --------------------------------------------------------------

test('params: settings override merges partially and repairs invalid values', () => {
  const p = resolveReviewParams({ expandingSlotsWeeks: [1, 3, 7, 21] });
  assert.deepEqual(p.expandingSlotsWeeks, [1, 3, 7, 21]);
  assert.equal(p.postLadderPolicy, 'repeat-last');
  const bad = resolveReviewParams({ expandingSlotsWeeks: [], postLadderPolicy: 'nope' });
  assert.deepEqual(bad.expandingSlotsWeeks, DEFAULT_REVIEW_PARAMS.expandingSlotsWeeks);
  assert.equal(bad.postLadderPolicy, 'repeat-last');
  assert.deepEqual(resolveReviewParams({ expandingSlotsWeeks: [5, 2, 11] }).expandingSlotsWeeks, DEFAULT_REVIEW_PARAMS.expandingSlotsWeeks);
  assert.deepEqual(resolveReviewParams({ expandingSlotsWeeks: [2, 900] }).expandingSlotsWeeks, DEFAULT_REVIEW_PARAMS.expandingSlotsWeeks);
  assert.equal(resolveReviewParams(null), DEFAULT_REVIEW_PARAMS);
  assert.equal(resolveReviewParams('nope'), DEFAULT_REVIEW_PARAMS);
});

test('params: custom slots change the validity window (configurability proof)', () => {
  const params = { ...DEFAULT_REVIEW_PARAMS, expandingSlotsWeeks: [4, 8] };
  const st = reviewStateFromAttempts([hit(T0)], T0, params);
  assert.equal(st.validUntilMs - T0, 4 * WEEK_MS);
});

// --- reviewQueue records --------------------------------------------------------

test('queue: entry built from history, null when locked or nothing qualified', () => {
  const e = buildReviewQueueEntry('w05-e1', [hit(T0)], T0 + 1);
  assert.equal(e.exerciseId, 'w05-e1');
  assert.equal(e.qualifiedHitCount, 1);
  assert.equal(e.nextDueAt, new Date(T0 + 2 * WEEK_MS).toISOString());
  assert.equal(e.mode, 'expanding');
  assert.equal(buildReviewQueueEntry('w05-e1', [miss(T0)], T0), null);
  assert.equal(buildReviewQueueEntry('w05-e1', [hit(T0), at(new Date(T0 + 1).toISOString(), { revealedSolution: true, correct: false })], T0 + 2), null);
});

test('queue: backfill groups a raw attempts list per exercise (migration helper)', () => {
  const entries = buildReviewQueueEntries([
    hit(T0), miss(T0 + 1),
    at(new Date(T0 + 2).toISOString(), { exerciseId: 'w05-e2' }),
    at(new Date(T0 + 3).toISOString(), { exerciseId: 'w05-e2', correct: false }),
    at(new Date(T0 + 4).toISOString(), { exerciseId: 'w05-e3', correct: false, revealedSolution: true }),
    { broken: 'no exerciseId' },
  ], T0 + 5);
  assert.deepEqual(entries.map((e) => e.exerciseId).sort(), ['w05-e1', 'w05-e2']);
  const e2 = entries.find((e) => e.exerciseId === 'w05-e2');
  assert.equal(e2.qualifiedHitCount, 1);
  assert.equal(e2.mode, 'expanding');
});

// --- import payload compatibility (schemaVersion 3 only) ------------------------

const v3Attempt = () => ({
  ...hit(T0),
  eventId: 'event-1', installationId: 'install-1', eventType: 'attempt',
  activityId: 'w05-e1', activityVersion: '1', definitionId: 'w05-e1',
  instanceId: 'w05-e1:cycle-1:511', cycleId: 'cycle-1',
  competencyIds: ['c-linalg-matrices'], contentVersion: 'test-v3',
  occurredAt: new Date(T0).toISOString(), recordedAt: new Date(T0).toISOString(),
  evidenceEligible: true, exclusionCode: null,
});

const v3Payload = () => ({
  schemaVersion: 3,
  exportedAt: '2026-08-20T00:00:00.000Z',
  data: {
    weeks: [{ weekId: 'w05', selfMarked: true }],
    attempts: [v3Attempt()],
    journal: [],
    settings: [],
    meta: [],
    reviewQueue: [],
    plans: [],
    drafts: [],
  },
});

test('import: schemaVersion 1 payloads are rejected in-app', () => {
  const { ok, errors } = validateImportPayload({ ...v3Payload(), schemaVersion: 1 });
  assert.equal(ok, false);
  assert.ok(errors.some((e) => e.includes('schemaVersion')));
});

test('import: schemaVersion 3 payloads with reviewQueue rows validate', () => {
  const p = v3Payload();
  p.data.reviewQueue = [buildReviewQueueEntry('w05-e1', [hit(T0)], T0 + 1)];
  const { ok, errors } = validateImportPayload(p);
  assert.equal(ok, true, JSON.stringify(errors));
});

test('import: malformed reviewQueue rows are rejected', () => {
  const p = v3Payload();
  p.data.reviewQueue = [{ exerciseId: 'NO PE' }, 'string'];
  const { ok, errors } = validateImportPayload(p);
  assert.equal(ok, false);
  assert.ok(errors.some((e) => e.includes('reviewQueue[0]')));
  assert.ok(errors.some((e) => e.includes('reviewQueue[1]')));
});

// --- v3 import time fields (ADR-0015 two-timeline alignment) ------------------

test('time source: occurredAt wins when ts and occurredAt both parse', () => {
  const occurredAt = new Date(T0 - WEEK_MS).toISOString();
  const st = reviewStateFromAttempts([hit(T0, { occurredAt })], T0);
  assert.equal(st.lastQualifiedAtMs, T0 - WEEK_MS);
});

test('time source: attempts with occurredAt but no ts age correctly (no frozen mastery)', () => {
  // v3 imports guarantee occurredAt; ts is optional. The scheduler and the
  // Evidence timeline share learning_policy.eventTimeMs (occurredAt first).
  const old = hit(T0 - 40 * WEEK_MS, { ts: undefined, occurredAt: new Date(T0 - 40 * WEEK_MS).toISOString() });
  delete old.ts;
  const st = reviewStateFromAttempts([old], T0);
  assert.equal(st.lastQualifiedAtMs, T0 - 40 * WEEK_MS, 'occurredAt must be the time source when ts is absent');
  assert.ok(st.validUntilMs < T0, 'an old imported hit must be expired, not re-anchored to now');
});

test('time source: a garbage ts falls back to occurredAt before falling back to now', () => {
  const occurredAt = new Date(T0 - 30 * WEEK_MS).toISOString();
  const a = { ...hit(occurredAt), ts: 'not-a-date', occurredAt };
  const st = reviewStateFromAttempts([a], T0);
  assert.equal(st.lastQualifiedAtMs, Date.parse(occurredAt), 'valid occurredAt must win over an unparseable ts');
});

test('time source: attempts with no parseable time at all still default to now (legacy)', () => {
  const a = { ...hit(new Date(T0).toISOString()) };
  delete a.ts;
  const st = reviewStateFromAttempts([a], T0);
  assert.equal(st.lastQualifiedAtMs, T0);
});

test('params: maxHints outside the mastery policy is repaired, not honored', () => {
  assert.equal(resolveReviewParams({ maxHints: 99 }).maxHints, MASTERY_MAX_HINTS, 'maxHints above the policy constant falls back');
  assert.equal(resolveReviewParams({ maxHints: -1 }).maxHints, MASTERY_MAX_HINTS, 'negative maxHints falls back');
  assert.equal(resolveReviewParams({ maxHints: 'x' }).maxHints, MASTERY_MAX_HINTS, 'non-numeric maxHints falls back');
  const with99 = reviewStateFromAttempts([hit(T0, { hintsUsed: 7 })], T0, { maxHints: 99 });
  assert.equal(with99.qualified, false, 'a 7-hint attempt never qualifies regardless of an imported maxHints override');
});
