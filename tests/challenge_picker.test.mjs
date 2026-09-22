// Pure-function tests for the daily-challenge engine
// (assets/js/domain/challenge_picker.mjs). All timestamps and seeds are
// injected — no wall-clock dependency. The zone is pinned so the local-day
// assertions are exact: Europe/Berlin is UTC+2 (CEST) in September, so a
// 22:xx UTC instant is already the next local calendar day.
process.env.TZ = 'Europe/Berlin';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS,
  activeModuleIds,
  challengePool,
  challengeStreakDays,
  dailyCount,
  daySeed,
  daySeedUTC,
  effectiveWindow,
  pickDailyChallenges,
  solvedChallengeCount,
} from '../assets/js/domain/challenge_picker.mjs';
import { familySubseed } from '../assets/js/core/generator_draw_kit.mjs';

const T0 = Date.parse('2026-09-12T10:00:00.000Z'); // Saturday, 12:00 local
const LATE_UTC = Date.parse('2026-09-12T22:30:00.000Z'); // local 2026-09-13 00:30
const NEXT_LOCAL_NOON = Date.parse('2026-09-13T08:00:00.000Z'); // local 2026-09-13 10:00
const DAY_ISO = '2026-09-12';

const mod = (moduleId, { lessonIds = [], placements = [] } = {}) => ({
  moduleId, lessonIds, placements,
});
const placement = (familyId, role = 'curated') => ({ familyId, role });
const family = (familyId, cases, contract = null) => ({ familyId, contract, cases });
const challengeCase = (caseId, extra = {}) => ({
  caseId, difficultyProfile: 'challenge', masteryEligible: true, challengeEligible: true, ...extra,
});
const poolItem = (familyId, caseId, extra = {}) => ({
  familyId, caseId, difficulty: 'challenge', moduleIds: [], competencyIds: [], ...extra,
});
const attempt = (definitionId, occurredAt, over = {}) => ({ definitionId, occurredAt, ...over });

// --- daySeed -----------------------------------------------------------------

test('daySeed: same local day yields the same seed regardless of clock time', () => {
  // 00:30 UTC and 21:59 UTC both sit inside local 2026-09-12 (UTC+2).
  assert.equal(daySeed('2026-09-12T00:30:00.000Z'), daySeed('2026-09-12T21:59:59.999Z'));
  assert.equal(daySeed('2026-09-12T10:00:00.000Z'), daySeed(new Date(T0)));
  assert.equal(daySeed('2026-09-12T10:00:00.000Z'), daySeed(DAY_ISO));
});

test('daySeed: the day key is local — a late UTC evening is already tomorrow', () => {
  // Regression: under the old UTC key this instant seeded like 2026-09-12,
  // so the daily set rolled over at 01:59 local instead of at midnight.
  assert.equal(daySeed('2026-09-12T22:30:00.000Z'), daySeed('2026-09-13'));
  assert.notEqual(daySeed('2026-09-12T22:30:00.000Z'), daySeed(DAY_ISO));
  // Local midnight is the boundary: 21:59:59.999 UTC is still local 09-12,
  // 22:00:00.000 UTC is local 09-13 00:00.
  assert.notEqual(daySeed('2026-09-12T21:59:59.999Z'), daySeed('2026-09-12T22:00:00.000Z'));
});

test('daySeed: different days and namespaces differ; daySeedUTC stays the pre-fix alias', () => {
  assert.notEqual(daySeed('2026-09-12T21:59:59.999Z'), daySeed('2026-09-13T10:00:00.000Z'));
  assert.notEqual(daySeed(DAY_ISO, 'challenge/v1'), daySeed(DAY_ISO, 'challenge/v2'));
  assert.equal(daySeed(DAY_ISO), daySeed(DAY_ISO, 'challenge/v1'));
  assert.equal(daySeedUTC, daySeed);
});

test('daySeed: unparseable input throws instead of silently reshuffling', () => {
  assert.throws(() => daySeed('not a date'), /daySeed/);
  assert.throws(() => daySeed(new Date(Number.NaN)), /daySeed/);
});

// --- dailyCount ---------------------------------------------------------------

test('dailyCount: small pools are served whole, larger pools get a seeded 3-5', () => {
  assert.equal(dailyCount(123, 0), 0);
  assert.equal(dailyCount(123, 1), 1);
  assert.equal(dailyCount(123, 2), 2);
  for (let seed = 0; seed < 50; seed += 1) {
    const count = dailyCount(seed, 10);
    assert.ok(count >= 3 && count <= 5, `count ${count} outside 3-5`);
  }
  // The seeded spread is actually reached (not a constant).
  const counts = new Set(Array.from({ length: 50 }, (_, seed) => dailyCount(seed, 10)));
  assert.ok(counts.size > 1);
  // Pool 3 or 4 can legitimately ask for more than the pool holds — the
  // shortfall flag reports it downstream instead of clamping the want.
  assert.ok(dailyCount(1, 3) >= 3);
});

// --- effectiveWindow ----------------------------------------------------------

test('effectiveWindow: zero pool or count yields no window, otherwise capped floor', () => {
  assert.equal(effectiveWindow(0, 3), 0);
  assert.equal(effectiveWindow(10, 0), 0);
  assert.equal(effectiveWindow(10, 3), 3);
  assert.equal(effectiveWindow(90, 3), 30); // cap
  assert.equal(effectiveWindow(300, 4), 30); // cap
  assert.equal(effectiveWindow(7, 5), 1);
  assert.equal(effectiveWindow(10, 3, 2), 2); // explicit maxWindow wins
});

// --- activeModuleIds ----------------------------------------------------------

test('activeModuleIds: moduleTouch entry activates', () => {
  const modules = [mod('m-a'), mod('m-b')];
  const active = activeModuleIds({ modules, moduleTouchMs: { 'm-a': T0 } });
  assert.deepEqual([...active].sort(), ['m-a']);
});

test('activeModuleIds: an opened lesson activates its module', () => {
  const modules = [mod('m-a', { lessonIds: ['l-1', 'l-2'] }), mod('m-b', { lessonIds: ['l-3'] })];
  const active = activeModuleIds({ modules, openedLessonIds: new Set(['l-2']) });
  assert.deepEqual([...active].sort(), ['m-a']);
});

test('activeModuleIds: an attempt on a placed family activates (curated and practice-space)', () => {
  const modules = [
    mod('m-a', { placements: [placement('fam-1')] }),
    mod('m-b', { placements: [placement('fam-2', 'practice-space')] }),
    mod('m-c', { placements: [placement('fam-3')] }),
  ];
  const active = activeModuleIds({ modules, attemptFamilyIds: new Set(['fam-1', 'fam-2']) });
  assert.deepEqual([...active].sort(), ['m-a', 'm-b']);
});

test('activeModuleIds: garbage inputs never activate', () => {
  const modules = [mod('m-a'), mod('m-b', { lessonIds: ['l-1'] })];
  assert.equal(activeModuleIds({ modules, moduleTouchMs: { 'm-a': Number.NaN } }).size, 0);
  assert.equal(activeModuleIds({ modules }).size, 0);
  assert.equal(activeModuleIds({}).size, 0);
  // Arrays are accepted for the set-valued inputs.
  const active = activeModuleIds({ modules, openedLessonIds: ['l-1'], attemptFamilyIds: [] });
  assert.deepEqual([...active], ['m-b']);
});

// --- challengePool ------------------------------------------------------------

test('challengePool: only flagged cases of families placed by active modules', () => {
  const index = [
    family('fam-1', [challengeCase('c-1'), challengeCase('c-2'), { caseId: 'plain', difficultyProfile: 'core', masteryEligible: true }]),
    family('fam-2', [challengeCase('c-3')]),
    family('fam-3', [challengeCase('c-4')]),
  ];
  const modules = [
    mod('m-a', { placements: [placement('fam-1')] }),
    mod('m-b', { placements: [placement('fam-2', 'practice-space')] }),
    mod('m-c', { placements: [placement('fam-3')] }),
  ];
  const pool = challengePool(index, modules, new Set(['m-a', 'm-b']));
  assert.deepEqual(
    pool.map((item) => `${item.familyId}:${item.caseId}`),
    ['fam-1:c-1', 'fam-1:c-2', 'fam-2:c-3'],
  );
  for (const item of pool) assert.equal(item.difficulty, 'challenge');
  assert.deepEqual(pool[0].moduleIds, ['m-a']);
  assert.deepEqual(pool[2].moduleIds, ['m-b']);
});

test('challengePool: moduleIds aggregate every active module placing the family; contract competencyIds pass through', () => {
  const contract = { competencyIds: ['c-x', 'c-y'] };
  const index = [family('fam-1', [challengeCase('c-1')], contract)];
  const modules = [
    mod('m-a', { placements: [placement('fam-1')] }),
    mod('m-b', { placements: [placement('fam-1', 'practice-space')] }),
    mod('m-c', { placements: [placement('fam-1')] }), // inactive
  ];
  const pool = challengePool({ families: index }, modules, new Set(['m-b', 'm-a']));
  assert.equal(pool.length, 1);
  assert.deepEqual(pool[0].moduleIds, ['m-a', 'm-b']); // sorted
  assert.deepEqual(pool[0].competencyIds, ['c-x', 'c-y']);
});

test('challengePool: empty active set empties the pool even with flagged cases', () => {
  const index = [family('fam-1', [challengeCase('c-1')])];
  const modules = [mod('m-a', { placements: [placement('fam-1')] })];
  assert.equal(challengePool(index, modules, new Set()).length, 0);
  assert.equal(challengePool(index, [], new Set(['m-a'])).length, 0);
});

// --- pickDailyChallenges ------------------------------------------------------

const bigPool = Array.from({ length: 10 }, (_, index) => poolItem(`fam-${index}`, `case-${index}`));

test('pickDailyChallenges: deterministic per daySeed — same inputs, same set', () => {
  const seed = daySeed(DAY_ISO);
  const a = pickDailyChallenges({ daySeed: seed, pool: bigPool, nowMs: T0 });
  const b = pickDailyChallenges({ daySeed: seed, pool: [...bigPool].reverse(), nowMs: T0 });
  assert.deepEqual(a, b); // pool input order does not matter
  assert.equal(a.items.length, a.count);
  assert.equal(a.windowDays, effectiveWindow(10, a.count));
});

test('pickDailyChallenges: different days produce different sets (almost surely)', () => {
  const day1 = pickDailyChallenges({ daySeed: daySeed('2026-09-12'), pool: bigPool, nowMs: T0 });
  const day2 = pickDailyChallenges({ daySeed: daySeed('2026-09-13'), pool: bigPool, nowMs: T0 + DAY_MS });
  assert.notDeepEqual(day1.items, day2.items);
});

test('pickDailyChallenges: item seeds are familySubseed(seed, caseId, challenge, rankIndex)', () => {
  const seed = daySeed(DAY_ISO);
  const { items } = pickDailyChallenges({ daySeed: seed, pool: bigPool, nowMs: T0 });
  items.forEach((item, rankIndex) => {
    assert.equal(item.seed, familySubseed(seed, item.caseId, 'challenge', rankIndex));
    assert.equal(item.difficulty, 'challenge');
  });
});

test('pickDailyChallenges: definitionIds attempted inside the window are excluded', () => {
  const seed = daySeed(DAY_ISO);
  const full = pickDailyChallenges({ daySeed: seed, pool: bigPool, nowMs: T0 });
  const first = full.items[0];
  const history = [attempt(`${first.familyId}:${first.caseId}`, new Date(T0 - DAY_MS).toISOString())];
  const next = pickDailyChallenges({ daySeed: seed, pool: bigPool, history, nowMs: T0 });
  assert.ok(!next.items.some((item) => item.familyId === first.familyId && item.caseId === first.caseId));
  assert.equal(next.items.length, Math.min(full.count, 9));
});

test('pickDailyChallenges: attempts older than the window do not block', () => {
  const pool = bigPool.slice(0, 9); // count >= 3 → window = floor(9/count) <= 3
  const seed = daySeed(DAY_ISO);
  const { count, windowDays } = pickDailyChallenges({ daySeed: seed, pool, nowMs: T0 });
  assert.ok(windowDays <= 3);
  const history = pool.map((item) => attempt(
    `${item.familyId}:${item.caseId}`,
    new Date(T0 - (windowDays + 1) * DAY_MS).toISOString(),
  ));
  const result = pickDailyChallenges({ daySeed: seed, pool, history, nowMs: T0 });
  assert.equal(result.items.length, count);
  assert.equal(result.shortfall, false);
});

test('pickDailyChallenges: pool smaller than count flags shortfall without refill', () => {
  const pool = bigPool.slice(0, 3);
  // Find a daySeed that wants more than the pool holds (3 + seed%3 > 3).
  const wantSeed = Array.from({ length: 20 }, (_, value) => value).find((value) => dailyCount(value, 3) > 3);
  const result = pickDailyChallenges({ daySeed: wantSeed, pool, nowMs: T0 });
  assert.equal(result.count, dailyCount(wantSeed, 3));
  assert.equal(result.items.length, 3);
  assert.equal(result.shortfall, true);
});

test('pickDailyChallenges: history exhausting the window flags shortfall — no silent refill', () => {
  const pool = bigPool.slice(0, 6); // count 3-5, window = floor(6/count) = 1-2 days
  const seed = daySeed(DAY_ISO);
  const { count } = pickDailyChallenges({ daySeed: seed, pool, nowMs: T0 });
  const history = pool.slice(0, pool.length - 1).map((item) => attempt(
    `${item.familyId}:${item.caseId}`,
    new Date(T0 - 60 * 1000).toISOString(), // a minute ago — inside any window
  ));
  const result = pickDailyChallenges({ daySeed: seed, pool, history, nowMs: T0 });
  assert.equal(result.items.length, 1); // only the un-attempted case remains
  assert.equal(result.shortfall, true); // count was 3-5, 1 served, no refill
  assert.equal(result.count, count);
});

test('pickDailyChallenges: empty pool serves nothing; missing nowMs throws', () => {
  const result = pickDailyChallenges({ daySeed: 1, pool: [], nowMs: T0 });
  assert.deepEqual(result, { items: [], count: 0, windowDays: 0, shortfall: false });
  assert.throws(() => pickDailyChallenges({ daySeed: 1, pool: bigPool }), /nowMs/);
});

// --- challengeStreakDays --------------------------------------------------------

const challengeAttempt = (ms, over = {}) => ({
  definitionId: 'fam-1:c-1', context: 'challenge', eventType: 'attempt',
  correct: true, occurredAt: new Date(ms).toISOString(), ...over,
});
// Single-entry pool: the day's picked set is always {fam-1:c-1}.
const STREAK_POOL = [{ familyId: 'fam-1', caseId: 'c-1' }];
const streakDays = (attempts, nowMs) => challengeStreakDays({ attempts, pool: STREAK_POOL, nowMs });

test('challengeStreakDays: consecutive days with correct solves count back from today', () => {
  const attempts = [challengeAttempt(T0), challengeAttempt(T0 - DAY_MS), challengeAttempt(T0 - 2 * DAY_MS)];
  assert.equal(streakDays(attempts, T0), 3);
});

test('challengeStreakDays: an unfinished today does not break the streak', () => {
  const attempts = [challengeAttempt(T0 - DAY_MS), challengeAttempt(T0 - 2 * DAY_MS)];
  assert.equal(streakDays(attempts, T0), 2);
});

test('challengeStreakDays: a gap breaks the run', () => {
  const attempts = [challengeAttempt(T0), challengeAttempt(T0 - 2 * DAY_MS)];
  assert.equal(streakDays(attempts, T0), 1);
  assert.equal(streakDays([challengeAttempt(T0 - 2 * DAY_MS)], T0), 0);
});

test('challengeStreakDays: only correct solves count — a failed attempt never holds the streak', () => {
  // The tour promises "Tage in Folge löst": an attempt event without
  // correct === true does not count as a solved day.
  assert.equal(streakDays([challengeAttempt(T0 - DAY_MS, { correct: false })], T0), 0);
  const noFlag = challengeAttempt(T0 - DAY_MS, { correct: undefined });
  delete noFlag.correct; // legacy/imported record without a correctness flag
  assert.equal(streakDays([noFlag], T0), 0);
  // A failed today does not break the run either — today's grace applies
  // to any today without a correct solve.
  assert.equal(
    streakDays([challengeAttempt(T0, { correct: false }), challengeAttempt(T0 - DAY_MS)], T0),
    1,
  );
});

test('challengeStreakDays: only challenge-context attempt events count', () => {
  const moduleAttempt = challengeAttempt(T0, { context: undefined });
  delete moduleAttempt.context;
  const hintEvent = challengeAttempt(T0 - DAY_MS, { eventType: 'hint-used' });
  assert.equal(streakDays([moduleAttempt, hintEvent], T0), 0);
});

test('challengeStreakDays: days are local — a solve after local midnight counts for the new day', () => {
  // Europe/Berlin is UTC+2 in September: LATE_UTC (22:30 UTC) is already
  // local 2026-09-13, so it joins T0's local 2026-09-12 in a two-day run.
  const attempts = [challengeAttempt(LATE_UTC), challengeAttempt(T0)];
  assert.equal(streakDays(attempts, NEXT_LOCAL_NOON), 2);
});

test('challengeStreakDays: a solve outside the daily set does not count — ?from=challenge alone is not enough', () => {
  // The context flag is a URL flag; the streak must match the same "solved"
  // predicate as solvedChallengeCount — a correct, unrevealed attempt on a
  // definitionId that was actually in that day's picked set.
  const offSet = challengeAttempt(T0 - DAY_MS, { definitionId: 'fam-9:not-in-set' });
  assert.equal(streakDays([offSet], T0), 0);
  assert.equal(streakDays([challengeAttempt(T0 - DAY_MS)], T0), 1);
  // An off-set day counts as a gap: the chain does not reach the valid
  // solve two days back.
  assert.equal(streakDays([offSet, challengeAttempt(T0 - 2 * DAY_MS)], T0), 0);
});

test('challengeStreakDays: a revealed solve does not count — same predicate as solvedToday', () => {
  assert.equal(streakDays([challengeAttempt(T0 - DAY_MS, { revealedSolution: true })], T0), 0);
});

// --- solvedChallengeCount ------------------------------------------------------

test('solvedChallengeCount: correct challenge-context attempts on today count per item', () => {
  const items = [poolItem('fam-1', 'c-1'), poolItem('fam-2', 'c-2'), poolItem('fam-3', 'c-3')];
  const attempts = [
    challengeAttempt(T0), // fam-1:c-1 today
    challengeAttempt(T0, { definitionId: 'fam-2:c-2', seed: 999 }), // same case, other seed still counts
    challengeAttempt(T0 - DAY_MS, { definitionId: 'fam-3:c-3' }), // yesterday — does not count
    challengeAttempt(T0, { definitionId: 'fam-3:c-3', correct: false }), // failed — does not count
    challengeAttempt(T0, { definitionId: 'fam-1:c-1', context: 'module' }), // not challenge context
  ];
  assert.equal(solvedChallengeCount(items, attempts, T0), 2);
});

test('solvedChallengeCount: revealed solutions and non-attempt events do not count', () => {
  const items = [poolItem('fam-1', 'c-1')];
  assert.equal(solvedChallengeCount(items, [challengeAttempt(T0, { revealedSolution: true })], T0), 0);
  assert.equal(solvedChallengeCount(items, [challengeAttempt(T0, { eventType: 'solution-revealed' })], T0), 0);
  assert.equal(solvedChallengeCount(items, [], T0), 0);
});

test('solvedChallengeCount: "today" is the local day — a solve after local midnight counts for it', () => {
  const items = [poolItem('fam-1', 'c-1')];
  // LATE_UTC is UTC 2026-09-12 but local 2026-09-13 — under the old UTC key
  // it counted for 09-12 and was invisible the next morning.
  assert.equal(solvedChallengeCount(items, [challengeAttempt(LATE_UTC)], NEXT_LOCAL_NOON), 1);
  assert.equal(solvedChallengeCount(items, [challengeAttempt(LATE_UTC)], T0), 0);
});
