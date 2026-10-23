// JSON-only answer envelope. Form values are canonical; steps are ordered
// model operations, never pointer coordinates, camera poses or SVG paths.
const record = (value) => value !== null && typeof value === 'object'
  && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const jsonArray = (value, depth) => value.length <= 128 && Array.from(value).every((item) => jsonValue(item, depth + 1));

function jsonValue(value, depth = 0) {
  if (depth > 8) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.length <= 4096;
  if (Array.isArray(value)) return jsonArray(value, depth);
  if (!record(value)) return false;
  return Object.entries(value).length <= 64 && Object.entries(value).every(([key, item]) => (
    !['__proto__', 'constructor', 'prototype'].includes(key) && jsonValue(item, depth + 1)
  ));
}

export function isSceneBuildAnswer(answer) {
  if (!record(answer)) return false;
  if (Object.keys(answer).sort().join(',') !== 'form,kind,schemaVersion,steps') return false;
  return answer.kind === 'scene-build' && answer.schemaVersion === 1
    && record(answer.form) && Array.isArray(answer.steps)
    && answer.steps.every(record) && jsonValue(answer);
}

export function validAttemptAnswer(attempt) {
  const scene = attempt.activityType === 'scene-build' || attempt.answer?.kind === 'scene-build';
  if (!scene) return true;
  if (attempt.answer == null) return ['hint-used', 'partial-solution', 'solution-revealed'].includes(attempt.eventType);
  return isSceneBuildAnswer(attempt.answer);
}

export function snapshotAttemptAnswer(input) {
  if (!validAttemptAnswer(input)) throw new Error('scene-build braucht Antwortformat v1 mit form und steps');
  return input.answer?.kind === 'scene-build' ? JSON.parse(JSON.stringify(input.answer)) : input.answer ?? null;
}
