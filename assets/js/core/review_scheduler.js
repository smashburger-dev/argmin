// Review scheduler: pure functions that turn attempt history into timed
// mastery validity and review due dates (ADR-0008). One mode per OF-3:
//   - 'expanding': manually planned expanding-retrieval slots at
//     +2/+5/+11 weeks after the last qualified hit.
// No I/O, no Date.now() defaults beyond documented call sites — everything
// is injectable so Node tests are deterministic.
// Qualification (instance, time, hints, reveal) lives in learning_policy.mjs.

import {
  MASTERY_MAX_HINTS, clampMaxHints, eventTimeMs, instanceKey, isQualifiedHit, isSolutionReveal,
} from '../domain/learning_policy.mjs';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

export { MASTERY_MAX_HINTS, isQualifiedHit };
export const attemptInstanceKey = instanceKey;

/** All scheduling knobs in one place — no magic numbers at call sites.
 *  Intervals follow the OF-3 recommendation (week +2/+5/+11); the series is
 *  an explicit derivation, not a literature-backed dosage (OF-2, see ADR). */
export const DEFAULT_REVIEW_PARAMS = Object.freeze({
  mode: 'expanding',
  expandingSlotsWeeks: [2, 5, 11],
  // Behaviour after the last slot succeeded: keep repeating the final slot.
  // 'consolidate' remains import-compatible but is no longer the default.
  postLadderPolicy: 'repeat-last',
  maxHints: MASTERY_MAX_HINTS,
});

/** Merge a partial settings-store override onto the defaults (ADR-0008:
 *  decay parameters are configurable via content constant or settings). */
export function resolveReviewParams(override) {
  if (!override || typeof override !== 'object') return DEFAULT_REVIEW_PARAMS;
  const merged = { ...DEFAULT_REVIEW_PARAMS, ...override };
  if (!Array.isArray(merged.expandingSlotsWeeks) || !merged.expandingSlotsWeeks.length
    || !merged.expandingSlotsWeeks.every((w, index, slots) => Number.isFinite(w) && w > 0 && w <= 520 && (index === 0 || w > slots[index - 1]))) {
    merged.expandingSlotsWeeks = DEFAULT_REVIEW_PARAMS.expandingSlotsWeeks;
  }
  if (merged.postLadderPolicy !== 'consolidate' && merged.postLadderPolicy !== 'repeat-last') {
    merged.postLadderPolicy = DEFAULT_REVIEW_PARAMS.postLadderPolicy;
  }
  merged.maxHints = clampMaxHints(merged.maxHints);
  return merged;
}

/** Timed review state over one exercise's full attempt history.
 *  Returns (all fields null when nothing qualified yet):
 *  - qualifiedHitCount / lastQualifiedAt(Ms)
 *  - validUntilMs: mastery validity deadline (null when consolidated)
 *  - nextDueMs: when the exercise enters the review list (=== validUntilMs)
 *  - consolidated: ladder completed under postLadderPolicy 'consolidate' */
export function reviewStateFromAttempts(attempts, nowMs = Date.now(), params = DEFAULT_REVIEW_PARAMS, currentInstanceId = null) {
  const p = resolveReviewParams(params);
  const disqualifiedInstances = new Set(
    attempts.filter((attempt) => isSolutionReveal(attempt)).map(instanceKey),
  );
  const openAttempts = attempts.filter((attempt) => !disqualifiedInstances.has(instanceKey(attempt)));
  const hits = openAttempts
    .filter((attempt) => isQualifiedHit(attempt, p))
    .map((a) => ({ a, t: eventTimeMs(a, nowMs) }))
    .sort((x, y) => x.t - y.t);
  const currentInstanceOpen = currentInstanceId && !disqualifiedInstances.has(currentInstanceId);
  const locked = disqualifiedInstances.size > 0 && openAttempts.length === 0 && !currentInstanceOpen;
  if (!hits.length) {
    return { qualified: false, qualifiedHitCount: 0, lastQualifiedAtMs: null, lastQualifiedAt: null, validUntilMs: null, nextDueMs: null, consolidated: false, locked };
  }
  const last = hits[hits.length - 1];
  const slots = p.expandingSlotsWeeks;
  const count = hits.length;
  const ladderDone = count > slots.length;
  if (ladderDone && p.postLadderPolicy === 'consolidate') {
    return { qualified: true, qualifiedHitCount: count, lastQualifiedAtMs: last.t, lastQualifiedAt: new Date(last.t).toISOString(), validUntilMs: null, nextDueMs: null, consolidated: true, locked };
  }
  // Interval grows with every successful spaced retrieval ('repeat-last'
  // keeps the final slot for every later hit as well).
  const idx = Math.min(count - 1, slots.length - 1);
  const intervalMs = slots[idx] * WEEK_MS;
  const validUntilMs = last.t + intervalMs;
  return { qualified: true, qualifiedHitCount: count, lastQualifiedAtMs: last.t, lastQualifiedAt: new Date(last.t).toISOString(), validUntilMs, nextDueMs: validUntilMs, consolidated: false, locked };
}

/** One reviewQueue record (or null when the exercise has nothing to
 *  schedule: never qualified, locked by solution reveal, consolidated). */
export function buildReviewQueueEntry(exerciseId, attempts, nowMs = Date.now(), params = DEFAULT_REVIEW_PARAMS) {
  const st = reviewStateFromAttempts(attempts, nowMs, params);
  if (!st.qualified || st.locked) return null;
  return {
    exerciseId,
    lastQualifiedAt: st.lastQualifiedAt,
    qualifiedHitCount: st.qualifiedHitCount,
    nextDueAt: st.consolidated ? null : new Date(st.nextDueMs).toISOString(),
    consolidated: st.consolidated,
    mode: 'expanding',
    updatedAt: new Date(nowMs).toISOString(),
  };
}

/** Backfill helper: one record per exerciseId across a raw attempts list. */
export function buildReviewQueueEntries(attempts, nowMs = Date.now(), params = DEFAULT_REVIEW_PARAMS) {
  const byExercise = new Map();
  for (const a of attempts || []) {
    if (!a || typeof a.exerciseId !== 'string') continue;
    if (!byExercise.has(a.exerciseId)) byExercise.set(a.exerciseId, []);
    byExercise.get(a.exerciseId).push(a);
  }
  const out = [];
  for (const [exerciseId, list] of byExercise) {
    const entry = buildReviewQueueEntry(exerciseId, list, nowMs, params);
    if (entry) out.push(entry);
  }
  return out;
}
