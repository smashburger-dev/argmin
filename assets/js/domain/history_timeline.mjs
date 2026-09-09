// Mixed recency timeline for the Learn history rail. Pure: callers pass
// attempt records plus touch maps, no store access here.
/**
 * @param {{ attempts?: Array<{ definitionId?: string, exerciseId?: string, occurredAt?: string, ts?: string }>, moduleTouch?: Record<string, number>, lessonTouch?: Record<string, number>, recentLessons?: string[], limit?: number }} [input]
 * @returns {Array<{ kind: 'attempt' | 'lesson' | 'module', id: string, at: number }>}
 */
export function buildHistoryTimeline({ attempts = [], moduleTouch = {}, lessonTouch = {}, recentLessons = [], limit = 10 } = {}) {
  const entries = [];
  const seenAttempts = new Set();
  const byTime = attempts
    .map((attempt) => ({
      id: attempt.definitionId || attempt.exerciseId,
      at: Date.parse(attempt.occurredAt || attempt.ts || ''),
    }))
    .filter((entry) => entry.id && Number.isFinite(entry.at))
    .sort((left, right) => right.at - left.at);
  for (const entry of byTime) {
    if (seenAttempts.has(entry.id)) continue;
    seenAttempts.add(entry.id);
    entries.push({ kind: 'attempt', id: entry.id, at: entry.at });
  }
  for (const [id, at] of Object.entries(moduleTouch)) {
    if (Number.isFinite(at)) entries.push({ kind: 'module', id, at });
  }
  for (const [id, at] of Object.entries(lessonTouch)) {
    if (Number.isFinite(at)) entries.push({ kind: 'lesson', id, at });
  }
  // Lesson opens from before timestamps existed keep their stored order
  // at the end instead of dropping out of the history.
  for (const id of recentLessons) {
    if (typeof id === 'string' && lessonTouch[id] == null) entries.push({ kind: 'lesson', id, at: 0 });
  }
  return entries.sort((left, right) => right.at - left.at).slice(0, Math.max(0, limit));
}
