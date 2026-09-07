import { progress } from '../../assets/js/core/progress_store.js';
import { evaluateLearningState } from '../../assets/js/core/learning_ledger.mjs';
import { resolveReviewParams } from '../../assets/js/core/review_scheduler.js';
import type { CatalogData, EvidenceState } from '../app/types';

export interface DueReview {
  exerciseId: string;
  nextDueAt: string;
  qualifiedHitCount: number;
}

export interface JournalEntry {
  id?: number;
  ts: string;
  exerciseId: string;
  errorType: string;
}

/** Two retention timelines (ADR-0015): `dueReviews` is the task-review
 *  queue (one definition, nextDueAt from the expanding-slot scheduler),
 *  while `evidenceDueAt` is the aggregated competency freshness deadline
 *  from the EvidenceEngine (demonstrated → review_due after it lapses). */
export interface ProgressSnapshot {
  attemptsCount: number;
  dueReviews: DueReview[];
  scheduledReviewCount: number;
  journal: JournalEntry[];
  evidenceStates: Record<string, EvidenceState>;
  evidenceDueAt: Record<string, string | null>;
  weeklyMinutes: number;
  trackId: string;
  reviewSlotsWeeks: number[];
}

const emptySnapshot = (catalog: CatalogData): ProgressSnapshot => ({
  attemptsCount: 0,
  dueReviews: [],
  scheduledReviewCount: 0,
  journal: [],
  evidenceStates: Object.fromEntries(catalog.competencies.map((item) => [item.competencyId, 'unassessed'])),
  evidenceDueAt: Object.fromEntries(catalog.competencies.map((item) => [item.competencyId, null])),
  weeklyMinutes: 180,
  trackId: 'common-core',
  reviewSlotsWeeks: [2, 5, 11],
});

export async function loadProgressSnapshot(catalog: CatalogData): Promise<ProgressSnapshot> {
  if (!progress) return emptySnapshot(catalog);
  const [attempts, journal, weeklyMinutes, trackId, reviewParams] = await Promise.all([
    progress.allOf('attempts'),
    progress.journal(),
    progress.getSetting('weeklyMinutes'),
    progress.getSetting('primaryTrack'),
    progress.getSetting('reviewParams'),
  ]);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const evaluated = evaluateLearningState(attempts, catalog, { reviewParams }, nowMs);
  const dueReviews = (Object.values(evaluated.reviewsByDefinition) as DueReview[])
    .filter((entry) => typeof entry.nextDueAt === 'string' && entry.nextDueAt <= nowIso)
    .sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt));
  const evidence = evaluated.evidenceByCompetency as Record<string, { state: EvidenceState; dueAt: string | null }>;
  // Report the slots the scheduler will actually use: an unvalidatable
  // stored list (descending, duplicates, > 52 weeks) is silently repaired
  // by resolveReviewParams — showing the raw stored value would claim a
  // configuration that is not in effect.
  const activeSlots = resolveReviewParams(reviewParams).expandingSlotsWeeks;
  return {
    attemptsCount: attempts.length,
    dueReviews,
    scheduledReviewCount: Object.keys(evaluated.reviewsByDefinition).length,
    journal: journal as ProgressSnapshot['journal'],
    evidenceStates: Object.fromEntries(Object.entries(evidence).map(([id, value]) => [id, value.state as EvidenceState])),
    evidenceDueAt: Object.fromEntries(Object.entries(evidence).map(([id, value]) => [id, value.dueAt ?? null])),
    weeklyMinutes: Number.isFinite(Number(weeklyMinutes)) ? Number(weeklyMinutes) : 180,
    trackId: catalog.tracks.some((track) => track.trackId === trackId) ? trackId : 'common-core',
    reviewSlotsWeeks: activeSlots,
  };
}

export async function saveLearningPreferences(weeklyMinutes: number, trackId: string, reviewSlotsWeeks: number[]): Promise<void> {
  if (!progress) return;
  await Promise.all([
    progress.setSetting('weeklyMinutes', weeklyMinutes),
    progress.setSetting('primaryTrack', trackId),
    progress.setSetting('reviewParams', { expandingSlotsWeeks: reviewSlotsWeeks }),
  ]);
  await progress.rebuildReviewQueue();
  dispatchEvent(new CustomEvent('learning-progress-changed'));
}
