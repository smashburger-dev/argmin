// Canonical learning-event shape. Cycle and instance keys are built here,
// not in views or graders. This module must not touch IndexedDB.

import { MASTERY_MAX_HINTS } from './learning_policy.mjs';
import { snapshotAttemptAnswer } from './scene_answer.mjs';

export { MASTERY_MAX_HINTS };

export const buildInstanceId = (definitionId, cycleId, seed) => `${definitionId}:${cycleId}:${seed ?? 0}`;

export function isJournalWorthy(event) {
  return Boolean(event)
    && event.correct === false
    && Boolean(event.errorType)
    && event.errorType !== 'invalid-input';
}

export function journalFromAttempts(events) {
  return (events || []).filter(isJournalWorthy).map((event) => ({
    exerciseId: event.definitionId || event.exerciseId,
    errorType: event.errorType,
    note: String(event.answer ?? '').slice(0, 200),
    ts: event.occurredAt || event.ts || null,
    eventId: event.eventId || null,
  }));
}

function eventIdentity(input) {
  const definitionId = input.definitionId || input.exerciseId || input.activityId;
  const activityId = input.activityId || definitionId;
  const seed = input.seed ?? 0;
  return {
    exerciseId: input.exerciseId || definitionId, activityId, definitionId, seed,
    activityVersion: String(input.activityVersion ?? 1),
    instanceId: buildInstanceId(definitionId, input.cycleId, seed),
  };
}

function eventEligibility(input, eventType) {
  const revealedSolution = Boolean(input.revealedSolution) || eventType === 'solution-revealed';
  const masteryEligible = eventType === 'attempt' && input.masteryEligible === true;
  const evidenceEligible = Boolean(input.correct)
    && masteryEligible
    && (input.hintsUsed || 0) <= MASTERY_MAX_HINTS
    && !revealedSolution;
  return { revealedSolution, masteryEligible, evidenceEligible };
}

function optionalEventFields(input) {
  return {
    ...(input.activityType === 'scene-build' ? { activityType: input.activityType } : {}),
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
    ...(input.context ? { context: String(input.context) } : {}),
    ...('event' in input ? { event: input.event } : {}),
  };
}

export function buildLearningEvent(input = {}) {
  const { cycleId, eventType } = input;
  if (!cycleId) throw new Error('Learning event requires cycleId');
  if (!eventType) throw new Error('Learning event requires eventType');
  return {
    ...eventIdentity(input),
    cycleId,
    competencyIds: [...(input.competencyIds || [])],
    eventType,
    answer: snapshotAttemptAnswer(input),
    durationMs: input.durationMs ?? 0,
    hintsUsed: input.hintsUsed || 0,
    correct: Boolean(input.correct),
    ...eventEligibility(input, eventType),
    errorType: input.errorType ?? null,
    ...optionalEventFields(input),
  };
}
