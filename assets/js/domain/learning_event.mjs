// Canonical learning-event shape. Cycle and instance keys are built here,
// not in views or graders. This module must not touch IndexedDB.

import { MASTERY_MAX_HINTS } from './learning_policy.mjs';

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

export function buildLearningEvent(input = {}) {
  const definitionId = input.definitionId || input.exerciseId || input.activityId;
  const activityId = input.activityId || definitionId;
  const cycleId = input.cycleId;
  const eventType = input.eventType;
  if (!cycleId) throw new Error('Learning event requires cycleId');
  if (!eventType) throw new Error('Learning event requires eventType');
  const seed = input.seed ?? 0;
  const revealedSolution = Boolean(input.revealedSolution) || eventType === 'solution-revealed';
  const masteryEligible = eventType === 'attempt' && input.masteryEligible === true;
  const evidenceEligible = Boolean(input.correct)
    && masteryEligible
    && (input.hintsUsed || 0) <= MASTERY_MAX_HINTS
    && !revealedSolution;
  return {
    exerciseId: input.exerciseId || definitionId,
    activityId,
    activityVersion: String(input.activityVersion ?? 1),
    definitionId,
    instanceId: buildInstanceId(definitionId, cycleId, seed),
    cycleId,
    competencyIds: [...(input.competencyIds || [])],
    eventType,
    seed,
    answer: input.answer ?? null,
    durationMs: input.durationMs ?? 0,
    hintsUsed: input.hintsUsed || 0,
    correct: Boolean(input.correct),
    masteryEligible,
    evidenceEligible,
    errorType: input.errorType ?? null,
    revealedSolution,
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
    ...('event' in input ? { event: input.event } : {}),
  };
}
