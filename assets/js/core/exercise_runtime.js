// Mastery evaluation over attempt history. Event construction lives in
// learning_event.mjs; this file must not write IndexedDB.

import {
  attemptInstanceKey, DEFAULT_REVIEW_PARAMS, MASTERY_MAX_HINTS, reviewStateFromAttempts,
} from './review_scheduler.js';
import { buildInstanceId } from '../domain/learning_event.mjs';

export { MASTERY_MAX_HINTS, buildInstanceId };

// Mastery policy (derived from ADR-0005, ADR-0008 and docs/authoring-guide.md §5
// — no new threshold introduced):
// - A revealed solution disqualifies only that generated instance. A new
//   seed or explicit cycle can produce fresh evidence.
// - A grader outcome with masteryEligible === false (manual-rubric) never
//   produces mastery, even when correct === true.
// - Up to MASTERY_MAX_HINTS hints keep mastery; a Teillösung reveals the
//   last hint and therefore counts as having used all hints.
// - TIME DIMENSION (ADR-0008 / LM-R1): a historical qualified hit stays
//   true, but current mastery expires per the review scheduler's expanding
//   slots (default +2/+5/+11 weeks after the last qualified hit). An
//   expired mastery renews through a new qualified review hit.

/** Pure mastery evaluation over the full attempt history of one exercise.
 *  `nowMs` (default: now) and `params` (default: DEFAULT_REVIEW_PARAMS)
 *  are injectable for deterministic tests. */
export function masteryFromAttempts(attempts, nowMs = Date.now(), params = DEFAULT_REVIEW_PARAMS, currentInstanceId = null) {
  if (!attempts.length) return { mastered: false, reason: 'no-attempts', locked: false };
  const st = reviewStateFromAttempts(attempts, nowMs, params, currentInstanceId);
  if (st.locked) return { mastered: false, reason: 'solution-revealed', locked: true };
  if (st.consolidated) {
    // Retained for import compatibility with the former explicit policy.
    return { mastered: true, reason: 'ok', locked: false, consolidated: true, qualifiedHitCount: st.qualifiedHitCount, lastQualifiedAt: st.lastQualifiedAt };
  }
  if (st.qualified) {
    if (nowMs <= st.validUntilMs) {
      return { mastered: true, reason: 'ok', locked: false, validUntilMs: st.validUntilMs, qualifiedHitCount: st.qualifiedHitCount, lastQualifiedAt: st.lastQualifiedAt };
    }
    return { mastered: false, reason: 'expired', locked: false, validUntilMs: st.validUntilMs, nextDueMs: st.nextDueMs, qualifiedHitCount: st.qualifiedHitCount, lastQualifiedAt: st.lastQualifiedAt };
  }
  const relevant = currentInstanceId
    ? attempts.filter((attempt) => attemptInstanceKey(attempt) === currentInstanceId)
    : attempts;
  const hintsExhausted = relevant.some((a) => (a.hintsUsed || 0) > MASTERY_MAX_HINTS);
  return { mastered: false, reason: hintsExhausted ? 'hints-exhausted' : 'not-solved', locked: false };
}
