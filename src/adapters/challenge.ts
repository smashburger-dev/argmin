import { loadFamilyIndex } from './content-repository';
import {
  activeModuleIds,
  challengePool,
  challengeStreakDays,
  daySeedUTC,
  pickDailyChallenges,
  solvedChallengeCount,
} from '../../assets/js/domain/challenge_picker.mjs';
import type { CatalogData } from '../app/types';

// Challenge adapter (plan: .agents/plans/2026-09-09-challenge.md): reads the
// progress store once and hands plain data to the pure picker in
// assets/js/domain/challenge_picker.mjs. No UI, no React — the view layer
// calls loadChallengeSet and renders the result.

/** Store surface the adapter needs — the ProgressStore singleton satisfies
 *  it; tests can stub the two methods. */
export interface ChallengeProgressReader {
  allOf(store: 'attempts'): Promise<ChallengeAttemptRecord[]>;
  getSetting(key: string): Promise<unknown>;
}

/** Fields the challenge engine reads from an attempts-store record. All
 *  optional: pre-v3-shaped or externally imported records may lack
 *  definitionId/occurredAt/context, and `context` itself only exists on
 *  events written after the feature shipped. */
export interface ChallengeAttemptRecord {
  activityId?: string;
  definitionId?: string;
  exerciseId?: string;
  occurredAt?: string;
  ts?: string;
  context?: string;
  eventType?: string;
  correct?: boolean;
  revealedSolution?: boolean;
  seed?: number;
}

export interface ChallengeItem {
  familyId: string;
  caseId: string;
  difficulty: 'challenge';
  seed: number;
}

export interface ChallengeSet {
  items: ChallengeItem[];
  /** How many items the day wants (3–5, or fewer on a small pool). */
  count: number;
  /** No-repeat horizon in days (W shown in the UI). */
  windowDays: number;
  /** True when fewer than `count` items could be served — never refilled. */
  shortfall: boolean;
  /** Consecutive UTC days with a challenge-context attempt. */
  streak: number;
  /** Items of today's set already solved in challenge context today. */
  solvedToday: number;
}

const EMPTY_SET: ChallengeSet = { items: [], count: 0, windowDays: 0, shortfall: false, streak: 0, solvedToday: 0 };

const stringIds = (value: unknown): string[] => (
  Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
);

/** Keep only finite numeric touch entries (same cleaning as
 *  local-progress.ts — garbage values must not activate a module). */
const cleanTouch = (value: unknown): Record<string, number> => {
  if (typeof value !== 'object' || value === null) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => Number.isFinite(entry[1])),
  );
};

/** Assemble today's deterministic challenge set from progress state and the
 *  compiled catalog. `nowMs` is injectable for tests; the wall clock is the
 *  only default at this boundary. `progress === null` (non-browser runtimes)
 *  yields the empty set — the view renders its empty state. */
export async function loadChallengeSet(
  progress: ChallengeProgressReader | null,
  catalog: CatalogData,
  nowMs: number = Date.now(),
): Promise<ChallengeSet> {
  if (!progress) return EMPTY_SET;
  const [attempts, moduleTouch, lessonOpens, recentModules] = await Promise.all([
    progress.allOf('attempts'),
    progress.getSetting('moduleTouch'),
    progress.getSetting('lessonOpens'),
    progress.getSetting('recentModules'),
  ]);
  const records = Array.isArray(attempts) ? attempts : [];
  // recentModules members always carry a moduleTouch entry in practice
  // (recordModuleOpened writes both); merging them covers imported or
  // legacy state where only the recency list survived.
  const moduleTouchMs = cleanTouch(moduleTouch);
  for (const moduleId of stringIds(recentModules)) {
    if (!Number.isFinite(moduleTouchMs[moduleId])) moduleTouchMs[moduleId] = nowMs;
  }
  // activityId is the familyId for family attempts (familyEventInput);
  // the definitionId prefix is a defensive fallback for records that only
  // carry `family:case`.
  const attemptFamilyIds = new Set(
    records.flatMap((record) => {
      const ids = [];
      if (typeof record.activityId === 'string') ids.push(record.activityId);
      const prefix = typeof record.definitionId === 'string' ? record.definitionId.split(':')[0] : null;
      if (prefix) ids.push(prefix);
      return ids;
    }),
  );
  const activeIds = activeModuleIds({
    modules: catalog.learningModules,
    moduleTouchMs,
    openedLessonIds: new Set(stringIds(lessonOpens)),
    attemptFamilyIds,
  });
  const pool = challengePool(loadFamilyIndex(), catalog.learningModules, activeIds);
  // No-repeat looks at every attempt on the problem form — a case seen in a
  // module counts as seen for the challenge window too.
  const history = records.flatMap((record) => {
    const definitionId = record.definitionId || record.exerciseId;
    const occurredAt = record.occurredAt || record.ts;
    return typeof definitionId === 'string' && typeof occurredAt === 'string'
      ? [{ definitionId, occurredAt }]
      : [];
  });
  const set = pickDailyChallenges({ daySeed: daySeedUTC(new Date(nowMs)), pool, history, nowMs });
  return {
    ...set,
    streak: challengeStreakDays(records, nowMs),
    solvedToday: solvedChallengeCount(set.items, records, nowMs),
  };
}
