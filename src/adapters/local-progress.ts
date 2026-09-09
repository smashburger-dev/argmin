import { progress } from '../../assets/js/core/progress_store.js';
import { evaluateLearningState } from '../../assets/js/core/learning_ledger.mjs';
import { resolveReviewParams } from '../../assets/js/core/review_scheduler.js';
import { buildHistoryTimeline } from '../../assets/js/domain/history_timeline.mjs';
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

export interface LastAttempt {
  definitionId: string;
  occurredAt: string;
}

export interface HistoryEntry {
  kind: 'module' | 'lesson' | 'attempt';
  id: string;
  at: number;
}

type AttemptRecord = {
  definitionId?: string;
  exerciseId?: string;
  occurredAt?: string;
  ts?: string;
};

function latestAttempt(attempts: AttemptRecord[]): ProgressSnapshot['lastAttempt'] {
  return attempts.reduce<ProgressSnapshot['lastAttempt']>((latest, attempt) => {
    const definitionId = attempt.definitionId || attempt.exerciseId;
    const occurredAt = attempt.occurredAt || attempt.ts;
    const occurredAtMs = occurredAt ? Date.parse(occurredAt) : Number.NaN;
    if (!definitionId || !occurredAt || !Number.isFinite(occurredAtMs)) return latest;
    return !latest || occurredAtMs > Date.parse(latest.occurredAt) ? { definitionId, occurredAt } : latest;
  }, null);
}

/** Two retention timelines (ADR-0015): `dueReviews` is the task-review
 *  queue (one definition, nextDueAt from the expanding-slot scheduler),
 *  while `evidenceDueAt` is the aggregated competency freshness deadline
 *  from the EvidenceEngine (demonstrated → review_due after it lapses). */
export interface ProgressSnapshot {
  attemptsCount: number;
  attemptCounts: Record<string, number>;
  openedLessons: string[];
  recentModules: string[];
  recentLessons: string[];
  history: HistoryEntry[];
  creditedDefinitions: string[];
  lastAttempt: LastAttempt | null;
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
  attemptCounts: {},
  openedLessons: [],
  recentModules: [],
  recentLessons: [],
  history: [],
  creditedDefinitions: [],
  lastAttempt: null,
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
  const [attempts, journal, weeklyMinutes, trackId, reviewParams, lessonOpens, recentModules, recentLessons, moduleTouch, lessonTouch] = await Promise.all([
    progress.allOf('attempts'),
    progress.journal(),
    progress.getSetting('weeklyMinutes'),
    progress.getSetting('primaryTrack'),
    progress.getSetting('reviewParams'),
    progress.getSetting('lessonOpens'),
    progress.getSetting('recentModules'),
    progress.getSetting('recentLessons'),
    progress.getSetting('moduleTouch'),
    progress.getSetting('lessonTouch'),
  ]);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const evaluated = evaluateLearningState(attempts, catalog, { reviewParams }, nowMs);
  const dueReviews = (Object.values(evaluated.reviewsByDefinition) as DueReview[])
    .filter((entry) => typeof entry.nextDueAt === 'string' && entry.nextDueAt <= nowIso)
    .sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt));
  const evidence = evaluated.evidenceByCompetency as Record<string, { state: EvidenceState; dueAt: string | null }>;
  const lastAttempt = latestAttempt(attempts as AttemptRecord[]);
  const attemptCounts: Record<string, number> = {};
  for (const attempt of attempts as AttemptRecord[]) {
    const id = attempt.definitionId || attempt.exerciseId;
    if (id) attemptCounts[id] = (attemptCounts[id] ?? 0) + 1;
  }
  const openedLessons = Array.isArray(lessonOpens)
    ? lessonOpens.filter((id): id is string => typeof id === 'string')
    : [];
  const cleanIds = (value: unknown) => (Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []);
  const cleanTouch = (value: unknown): Record<string, number> => {
    if (typeof value !== 'object' || value === null) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number'));
  };
  // Report the slots the scheduler will actually use: an unvalidatable
  // stored list (descending, duplicates, > 52 weeks) is silently repaired
  // by resolveReviewParams — showing the raw stored value would claim a
  // configuration that is not in effect.
  const activeSlots = resolveReviewParams(reviewParams).expandingSlotsWeeks;
  return {
    attemptsCount: attempts.length,
    attemptCounts,
    openedLessons,
    recentModules: cleanIds(recentModules),
    recentLessons: cleanIds(recentLessons),
    history: buildHistoryTimeline({
      attempts: attempts as AttemptRecord[],
      moduleTouch: cleanTouch(moduleTouch),
      lessonTouch: cleanTouch(lessonTouch),
      recentLessons: cleanIds(recentLessons),
    }),
    creditedDefinitions: Object.keys(evaluated.reviewsByDefinition),
    lastAttempt,
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

async function unshiftRecent(key: string, id: string, cap: number): Promise<boolean> {
  if (!progress) return false;
  const stored = await progress.getSetting(key);
  const list = Array.isArray(stored) ? stored.filter((entry): entry is string => typeof entry === 'string') : [];
  const next = [id, ...list.filter((entry) => entry !== id)].slice(0, cap);
  if (next.length === list.length && next.every((entry, index) => entry === list[index])) return false;
  await progress.setSetting(key, next);
  return true;
}

export async function recordLessonOpened(lessonId: string): Promise<void> {
  if (!progress || !lessonId) return;
  const stored = await progress.getSetting('lessonOpens');
  const opened = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
  let changed = false;
  if (!opened.includes(lessonId)) {
    await progress.setSetting('lessonOpens', [...opened, lessonId]);
    changed = true;
  }
  if (await unshiftRecent('recentLessons', lessonId, 10)) changed = true;
  const touchStored = await progress.getSetting('lessonTouch');
  const touch: Record<string, number> = typeof touchStored === 'object' && touchStored !== null ? { ...(touchStored as Record<string, number>) } : {};
  touch[lessonId] = Date.now();
  await progress.setSetting('lessonTouch', touch);
  if (changed) dispatchEvent(new CustomEvent('learning-progress-changed'));
}

export async function recordModuleOpened(moduleId: string): Promise<void> {
  if (!progress || !moduleId) return;
  const stored = await progress.getSetting('recentModules');
  const slots = (Array.isArray(stored) ? stored.filter((entry): entry is string => typeof entry === 'string') : []).slice(0, 2);
  const touchStored = await progress.getSetting('moduleTouch');
  const touch: Record<string, number> = typeof touchStored === 'object' && touchStored !== null ? { ...(touchStored as Record<string, number>) } : {};
  touch[moduleId] = Date.now();
  await progress.setSetting('moduleTouch', touch);
  // Stabile Slots: Bereits sichtbare Module bleiben an ihrem Platz.
  if (slots.includes(moduleId)) return;
  const [first, second] = slots;
  let next: string[];
  if (first === undefined) {
    next = [moduleId];
  } else if (second === undefined) {
    next = [moduleId, first];
  } else {
    // Ein neues Modul ersetzt das am längsten nicht mehr geöffnete, an dessen Platz.
    next = (touch[first] ?? 0) <= (touch[second] ?? 0) ? [moduleId, second] : [first, moduleId];
  }
  await progress.setSetting('recentModules', next);
  dispatchEvent(new CustomEvent('learning-progress-changed'));
}

export async function loadOnboardingDone(): Promise<boolean> {
  if (!progress) return true;
  return (await progress.getSetting('onboardingDone')) === true;
}

export async function saveOnboardingDone(): Promise<void> {
  if (!progress) return;
  await progress.setSetting('onboardingDone', true);
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
