// LearningLedger: one write path for learner events. IndexedDB is an
// injected sink so a hosted append can dock later without changing callers.
// Policy rules stay in learning_policy.mjs; this module composes projections.

import { buildLearningEvent, isJournalWorthy } from '../domain/learning_event.mjs';
import { EvidenceEngine } from '../domain/evidence_engine.mjs';
import { buildReviewQueueEntries, resolveReviewParams } from './review_scheduler.js';
import { progress } from './progress_store.js';

export function evaluateLearningState(events, catalog, settings = {}, nowMs = Date.now()) {
  const params = resolveReviewParams(settings.reviewParams);
  const reviewsByDefinition = Object.fromEntries(
    buildReviewQueueEntries(events, nowMs, params).map((entry) => [entry.exerciseId, entry]),
  );
  const evidenceByCompetency = new EvidenceEngine(catalog.competencies).evaluateAll(events, nowMs);
  return { reviewsByDefinition, evidenceByCompetency };
}

export function createLearningLedger(ports) {
  const { appendEvent, addJournalEntry, getOrCreateCycle, afterCommit } = ports;

  async function append(event) {
    const committed = await appendEvent(event);
    if (addJournalEntry && isJournalWorthy(event)) {
      await addJournalEntry({
        exerciseId: event.definitionId || event.exerciseId,
        errorType: event.errorType,
        note: String(event.answer ?? '').slice(0, 200),
      });
    }
    if (afterCommit) await afterCommit(committed);
    return committed;
  }

  async function record(input) {
    const activityId = input.activityId || input.definitionId || input.exerciseId;
    const cycleId = input.cycleId || await getOrCreateCycle(activityId);
    return append(buildLearningEvent({ ...input, cycleId }));
  }

  return { append, record };
}

export function createBrowserLearningLedger(store = progress) {
  if (!store) return null;
  return createLearningLedger({
    appendEvent: (event) => store.addAttempt(event),
    addJournalEntry: (entry) => store.addJournalEntry(entry),
    getOrCreateCycle: (activityId) => store.getOrCreateCycle(activityId),
    afterCommit: () => { dispatchEvent(new CustomEvent('learning-progress-changed')); },
  });
}

export const learningLedger = createBrowserLearningLedger();
