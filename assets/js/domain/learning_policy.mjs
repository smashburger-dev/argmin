// Shared qualification rules for review slots and competency freshness.
// Projections stay in ReviewScheduler and EvidenceEngine; this module must
// not import either of them (cycle) and must not touch IndexedDB.

export const MASTERY_MAX_HINTS = 1;

export function clampMaxHints(value) {
  if (!Number.isInteger(value) || value < 0 || value > MASTERY_MAX_HINTS) return MASTERY_MAX_HINTS;
  return value;
}

function parseTime(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

/** Canonical v3 time is occurredAt. Unparseable values are skipped so a
 *  garbage occurredAt does not hide a valid ts, and a garbage ts does not
 *  hide a valid occurredAt. Callers pass `nowMs` (review) or `null`
 *  (evidence drops the event) when nothing parses. */
export function eventTimeMs(event, fallbackMs = null) {
  for (const candidate of [event?.occurredAt, event?.ts]) {
    const time = parseTime(candidate);
    if (time !== null) return time;
  }
  return fallbackMs;
}

/** instanceId wins. Fallback is the same triple the runtime writes:
 *  definition (or exerciseId), cycle, seed. */
export function instanceKey(event) {
  if (event?.instanceId) return event.instanceId;
  return `${event?.definitionId || event?.exerciseId || 'unknown'}:${event?.cycleId || 'legacy'}:${event?.seed ?? 0}`;
}

export function isSolutionReveal(event) {
  return Boolean(event?.revealedSolution) || event?.eventType === 'solution-revealed';
}

export function isQualifiedHit(event, options = {}) {
  const maxHints = clampMaxHints(options.maxHints ?? MASTERY_MAX_HINTS);
  return Boolean(
    event
    && event.correct === true
    && event.masteryEligible !== false
    && event.evidenceEligible !== false
    && (event.hintsUsed || 0) <= maxHints,
  );
}
