// Daily-challenge engine: pure functions that turn the compiled family
// index, module activity signals and attempt history into a deterministic
// per-local-day challenge set (plan: .agents/plans/2026-09-09-challenge.md).
// No I/O, no Date.now() defaults — every input is injected so Node tests
// are deterministic (stricter than assets/js/core/review_scheduler.js, which
// keeps Date.now() defaults at its exported call sites).
// Self-contained on purpose: importing generator_draw_kit would pull the
// family-core chunk into the challenge path — and its mid-init cycle back
// into the FamilyExerciseView chunk crashes the built bundle. The seed
// format below must stay byte-identical to familySubseed() so challenge
// draws share the instance-seed space; tests/challenge_picker.test.mjs
// pins that equivalence.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const CHALLENGE_DIFFICULTY = 'challenge';
export const CHALLENGE_CONTEXT = 'challenge';
export const DEFAULT_CHALLENGE_NAMESPACE = 'challenge/v1';
export const MAX_NO_REPEAT_WINDOW_DAYS = 30;

/** FNV-1a over UTF-16 code units → uint32. Same hash parameters as the
 *  byte-pinned familySubseed; kept local so the ranking-key format
 *  (`${daySeed}:${definitionId}`) stays independent of the
 *  `seed|case|difficulty|attempt` instance-seed format. */
const fnv1a = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value, width) => String(value).padStart(width, '0');

/** Local calendar day 'YYYY-MM-DD' from a timestamp or Date: the learner's
 *  "today" flips at local midnight, not at UTC midnight (the old UTC key
 *  rolled the day over at 01:00/02:00 local time for German users). */
const localDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
};

const asSet = (value) => (value instanceof Set ? value : new Set(value || []));

const definitionIdOf = (item) => `${item.familyId}:${item.caseId}`;

/**
 * @typedef {object} ChallengeModuleInput
 * @property {string} [moduleId]
 * @property {string[]} [lessonIds]
 * @property {Array<{ familyId?: string }>} [placements]
 *
 * @typedef {object} ChallengeFamilyIndexEntry
 * @property {string} [familyId]
 * @property {Record<string, unknown> | null} [contract]
 * @property {Array<{ caseId?: string, challengeEligible?: boolean }>} [cases]
 *
 * @typedef {object} ChallengePoolEntry
 * @property {string} familyId
 * @property {string} caseId
 * @property {'challenge'} difficulty
 * @property {string[]} moduleIds
 * @property {string[]} competencyIds
 *
 * @typedef {object} ChallengeHistoryEntry
 * @property {string} [definitionId]
 * @property {string} [occurredAt]
 * @property {string} [ts]
 *
 * @typedef {object} ChallengeAttemptInput
 * @property {string} [context]
 * @property {string} [eventType]
 * @property {boolean} [correct]
 * @property {boolean} [revealedSolution]
 * @property {string} [definitionId]
 * @property {string} [exerciseId]
 * @property {string} [occurredAt]
 * @property {string} [ts]
 *
 * @typedef {object} DailyChallengeResult
 * @property {Array<{ familyId: string, caseId: string, difficulty: 'challenge', seed: number }>} items
 * @property {number} count
 * @property {number} windowDays
 * @property {boolean} shortfall
 */

/** Stable seed for one LOCAL calendar day: FNV-1a over
 *  `${namespace}:${YYYY-MM-DD}`. Accepts a Date, an ISO timestamp or a bare
 *  'YYYY-MM-DD' day key (used verbatim — day-level input needs no clock
 *  resolution and cannot be shifted by timezone parsing). Date/timestamp
 *  input resolves to the local calendar day, so the daily set changes at
 *  local midnight. Determinism is per local day — intended. Throws on
 *  unparseable input: a wrong day seed would silently reshuffle the set.
 * @param {string | Date} dateIso
 * @param {string} [namespace]
 * @returns {number} uint32 day seed */
export function daySeed(dateIso, namespace = DEFAULT_CHALLENGE_NAMESPACE) {
  let day;
  if (dateIso instanceof Date) {
    if (!Number.isFinite(dateIso.getTime())) throw new Error('daySeed: invalid Date');
    day = localDayKey(dateIso);
  } else if (typeof dateIso === 'string' && DATE_ONLY_RE.test(dateIso)) {
    day = dateIso;
  } else {
    const ms = Date.parse(dateIso);
    if (!Number.isFinite(ms)) throw new Error(`daySeed: unparseable date ${JSON.stringify(dateIso)}`);
    day = localDayKey(ms);
  }
  return fnv1a(`${namespace}:${day}`);
}

// Back-compat alias kept for existing call sites: despite the name, the
// day key is the LOCAL calendar day — the UTC derivation was the bug.
export const daySeedUTC = daySeed;

/** Problems served per day: pools too small to fill the minimum serve what
 *  they have (count is a non-negative integer even for odd pool sizes),
 *  otherwise a day-seeded 3–5.
 * @param {number} daySeed
 * @param {number} poolSize
 * @returns {number} */
export function dailyCount(daySeed, poolSize) {
  const size = Number.isFinite(poolSize) ? Math.floor(poolSize) : 0;
  if (size < 3) return Math.max(0, size);
  return 3 + ((daySeed >>> 0) % 3);
}

/** No-repeat horizon in days: 0 when nothing can be served, otherwise the
 *  pool covers `floor(poolSize / count)` distinct days, capped at
 *  maxWindow.
 * @param {number} poolSize
 * @param {number} count
 * @param {number} [maxWindow]
 * @returns {number} */
export function effectiveWindow(poolSize, count, maxWindow = MAX_NO_REPEAT_WINDOW_DAYS) {
  if (!Number.isFinite(poolSize) || !Number.isFinite(count) || poolSize <= 0 || count <= 0) return 0;
  return Math.min(maxWindow, Math.floor(poolSize / count));
}

/** A module is active once the learner engaged with it: a finite
 *  moduleTouch timestamp, any of its lessonIds opened, or any attempt on a
 *  family it places (curated and practice-space placements both count).
 *  Non-finite touch values are ignored — a NaN entry from legacy/imported
 *  state must not activate a module. Set-valued inputs also accept arrays.
 * @param {{ modules?: ChallengeModuleInput[], moduleTouchMs?: Record<string, number>, openedLessonIds?: Set<string> | string[], attemptFamilyIds?: Set<string> | string[] }} [input]
 * @returns {Set<string>} */
export function activeModuleIds({ modules = [], moduleTouchMs = {}, openedLessonIds = new Set(), attemptFamilyIds = new Set() } = {}) {
  const opened = asSet(openedLessonIds);
  const attempted = asSet(attemptFamilyIds);
  const active = new Set();
  for (const module of modules || []) {
    if (!module || typeof module.moduleId !== 'string') continue;
    const touched = Number.isFinite(moduleTouchMs?.[module.moduleId]);
    const lessonOpened = (module.lessonIds || []).some((id) => opened.has(id));
    const familyAttempted = (module.placements || []).some((placement) => placement && attempted.has(placement.familyId));
    if (touched || lessonOpened || familyAttempted) active.add(module.moduleId);
  }
  return active;
}

/** Cases flagged `challengeEligible === true` in the compiled family index,
 *  restricted to families placed by at least one ACTIVE module. `moduleIds`
 *  lists every active module placing the family (curated or practice-space).
 *  `competencyIds` comes from the index-level family contract — the index
 *  drops per-case competencyIds, so contract:null (procedural) families
 *  yield []. familyIndex accepts the index object or its families array.
 * @param {{ families?: ChallengeFamilyIndexEntry[] } | ChallengeFamilyIndexEntry[]} familyIndex
 * @param {ChallengeModuleInput[]} [modules]
 * @param {Set<string> | string[]} [activeIds]
 * @returns {ChallengePoolEntry[]} */
export function challengePool(familyIndex, modules = [], activeIds = new Set()) {
  const families = Array.isArray(familyIndex) ? familyIndex : (familyIndex?.families || []);
  const active = asSet(activeIds);
  const modulesByFamily = new Map();
  for (const module of modules || []) {
    if (!module || !active.has(module.moduleId)) continue;
    for (const placement of module.placements || []) {
      if (typeof placement?.familyId !== 'string') continue;
      let ids = modulesByFamily.get(placement.familyId);
      if (!ids) modulesByFamily.set(placement.familyId, (ids = new Set()));
      ids.add(module.moduleId);
    }
  }
  const pool = [];
  const seen = new Set();
  for (const family of families) {
    if (typeof family?.familyId !== 'string') continue;
    const moduleIds = [...(modulesByFamily.get(family.familyId) || [])].sort();
    if (!moduleIds.length) continue;
    const competencyIds = Array.isArray(family.contract?.competencyIds) ? [...family.contract.competencyIds] : [];
    for (const entry of family.cases || []) {
      if (entry?.challengeEligible !== true || typeof entry.caseId !== 'string') continue;
      const definitionId = `${family.familyId}:${entry.caseId}`;
      if (seen.has(definitionId)) continue;
      seen.add(definitionId);
      pool.push({
        familyId: family.familyId,
        caseId: entry.caseId,
        difficulty: CHALLENGE_DIFFICULTY,
        moduleIds,
        competencyIds,
      });
    }
  }
  return pool;
}

/** Deterministic daily set. Eligible pool entries are ranked by
 *  FNV-1a(`${daySeed}:${definitionId}`) — stable regardless of pool input
 *  order — and the first `count` are taken. Each item's instance seed is
 *  fnv1a(seed|caseId|difficulty|attempt) — the same byte format
 *  familySubseed() uses — so challenge draws live in the same seed space
 *  as module placements. A definitionId
 *  with an attempt inside the last `windowDays` (boundary inclusive;
 *  future-dated attempts count as seen) is excluded and NEVER refilled —
 *  the shortfall flag reports `items.length < count` instead.
 * @param {{ daySeed: number, pool?: ChallengePoolEntry[], history?: ChallengeHistoryEntry[], nowMs: number }} input
 * @returns {DailyChallengeResult} */
export function pickDailyChallenges({ daySeed, pool = [], history = [], nowMs } = {}) {
  if (!Number.isFinite(nowMs)) {
    throw new Error('pickDailyChallenges: nowMs must be a finite number (inject the clock)');
  }
  const entries = (pool || []).filter((item) => typeof item?.familyId === 'string' && typeof item?.caseId === 'string');
  const count = dailyCount(daySeed, entries.length);
  const windowDays = effectiveWindow(entries.length, count);
  const cutoff = nowMs - windowDays * DAY_MS;
  const recent = new Set();
  for (const event of history || []) {
    const at = Date.parse(event?.occurredAt ?? event?.ts);
    if (typeof event?.definitionId === 'string' && Number.isFinite(at) && at >= cutoff) {
      recent.add(event.definitionId);
    }
  }
  const ranked = entries
    .filter((item) => !recent.has(definitionIdOf(item)))
    .map((item, index) => ({ item, rank: fnv1a(`${daySeed >>> 0}:${definitionIdOf(item)}`), index }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);
  const items = ranked.slice(0, count).map(({ item }, rankIndex) => ({
    familyId: item.familyId,
    caseId: item.caseId,
    difficulty: CHALLENGE_DIFFICULTY,
    seed: fnv1a(`${daySeed >>> 0}|${item.caseId}|${CHALLENGE_DIFFICULTY}|${rankIndex}`),
  }));
  return { items, count, windowDays, shortfall: items.length < count };
}

const isAttemptEvent = (event) => (event?.eventType ?? 'attempt') === 'attempt';

/** Consecutive local days with at least one SOLVED challenge item, counted
 *  back from today — "solved" means the same predicate as
 *  solvedChallengeCount: a correct, unrevealed attempt in challenge context
 *  whose definitionId belonged to that day's picked set. Self-labelling a
 *  route with ?from=challenge is not enough — the set membership check
 *  keeps the streak honest (variants of a set item share its definitionId
 *  and still count). Today gets the usual streak grace: an unfinished
 *  today does not break the run. The cursor steps by calendar date
 *  (setDate), not by fixed 24h — a millisecond step can skip a 23-hour
 *  day across DST. Past-day sets are reconstructed from the same pool and
 *  the history that existed before that day — an approximation when the
 *  pool itself changed, conservative rather than inflated.
 * @param {{ attempts?: ChallengeAttemptInput[], pool?: ChallengePoolEntry[], history?: ChallengeHistoryEntry[], nowMs: number }} input
 * @returns {number} */
export function challengeStreakDays({ attempts, pool = [], history = [], nowMs } = {}) {
  if (!Number.isFinite(nowMs)) return 0;
  const solvedByDay = new Map();
  for (const event of attempts || []) {
    if (event?.context !== CHALLENGE_CONTEXT || !isAttemptEvent(event) || event.correct !== true) continue;
    if (event.revealedSolution === true) continue;
    const definitionId = event.definitionId || event.exerciseId;
    const at = Date.parse(event.occurredAt ?? event.ts);
    if (typeof definitionId !== 'string' || !Number.isFinite(at)) continue;
    const key = localDayKey(at);
    if (!solvedByDay.has(key)) solvedByDay.set(key, new Set());
    solvedByDay.get(key).add(definitionId);
  }
  const setsByDay = new Map();
  const itemsForDay = (key) => {
    if (!setsByDay.has(key)) {
      const [year, month, day] = key.split('-').map(Number);
      const dayMs = new Date(year, month - 1, day, 12).getTime();
      const priorHistory = (history || []).filter(
        (entry) => Number.isFinite(Date.parse(entry?.occurredAt ?? entry?.ts)) && Date.parse(entry.occurredAt ?? entry.ts) <= dayMs,
      );
      const set = pickDailyChallenges({ daySeed: daySeed(key), pool, history: priorHistory, nowMs: dayMs });
      setsByDay.set(key, new Set(set.items.map(definitionIdOf)));
    }
    return setsByDay.get(key);
  };
  const dayCounts = (key) => {
    const solved = solvedByDay.get(key);
    if (!solved) return false;
    const items = itemsForDay(key);
    return [...solved].some((id) => items.has(id));
  };
  const cursor = new Date(nowMs);
  if (!dayCounts(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dayCounts(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** How many of today's picked items were solved in challenge context on
 *  this local day: a correct, unrevealed attempt event whose definitionId
 *  matches `familyId:caseId`. The seed is intentionally not required — a
 *  same-case solve under any seed counts (callers wanting per-seed stats
 *  can still match exactly).
 * @param {Array<{ familyId: string, caseId: string }>} items
 * @param {ChallengeAttemptInput[]} attempts
 * @param {number} nowMs
 * @returns {number} */
export function solvedChallengeCount(items, attempts, nowMs) {
  if (!Number.isFinite(nowMs)) return 0;
  const today = localDayKey(nowMs);
  const solved = new Set();
  for (const event of attempts || []) {
    if (event?.context !== CHALLENGE_CONTEXT || event.correct !== true || !isAttemptEvent(event)) continue;
    if (event.revealedSolution === true) continue;
    const at = Date.parse(event.occurredAt ?? event.ts);
    if (!Number.isFinite(at) || localDayKey(at) !== today) continue;
    const definitionId = event.definitionId || event.exerciseId;
    if (typeof definitionId === 'string') solved.add(definitionId);
  }
  return (items || []).filter((item) => solved.has(definitionIdOf(item))).length;
}
